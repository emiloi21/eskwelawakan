<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\RefundRequest;
use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\StudentPayment;
use App\Models\StudentPaymentData;
use App\Models\StudentPaymentDummy;
use App\Services\ReceiptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RefundController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = RefundRequest::with([
            'student:reg_id,lname,fname,mname,student_id',
            'category:category_id,description',
        ]);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $refunds = $query->orderByDesc('date_time')
            ->paginate($request->query('per_page', 50));

        return response()->json($refunds);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reg_id'      => ['required', 'string', 'exists:students,public_id'],
            'category_id' => ['required', 'string', 'exists:accounts_categories,public_id'],
            'amt_excess'  => ['required', 'numeric', 'min:0.01'],
        ]);

        $user = $request->user();
        $student = Student::findByPublicIdOrFail($validated['reg_id']);
        $category = \App\Models\AccountsCategory::where('public_id', $validated['category_id'])->firstOrFail();

        $refund = RefundRequest::create([
            'reg_id'            => $student->reg_id,
            'category_id'       => $category->category_id,
            'amt_excess'        => $validated['amt_excess'],
            'date_time'         => now(),
            'personnel_user_id' => $user->id,
            'status'            => 'Pending',
        ]);

        return response()->json(['data' => $refund->load(['student', 'category'])], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $refund = RefundRequest::findByPublicIdOrFail($id);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:Pending,Approved,Released,Cancelled'],
        ]);

        if ($validated['status'] === 'Released' && $refund->status === 'Approved') {
            return DB::transaction(function () use ($refund, $validated, $request) {
                $refund->update(['status' => $validated['status']]);
                $this->processRefundPayment($refund, $request->user());
                return response()->json(['data' => $refund->fresh(['student', 'category'])]);
            });
        }

        $refund->update($validated);

        return response()->json(['data' => $refund->fresh(['student', 'category'])]);
    }

    private function processRefundPayment(RefundRequest $refund, $user): void
    {
        $student = Student::where('reg_id', $refund->reg_id)->first();
        if (!$student) {
            return;
        }

        $receiptNum = ReceiptService::generateReceiptNumber();

        $now = now();

        // Get the particulars for the refund category
        $assessments = StudentAssessment::where('reg_id', $refund->reg_id)
            ->where('category_id', $refund->category_id)
            ->get();

        $totalRefunded = 0;
        foreach ($assessments as $sa) {
            $refundAmt = min((float) $sa->total_amt_paid, (float) $refund->amt_excess - $totalRefunded);
            if ($refundAmt <= 0) {
                continue;
            }

            StudentPayment::create([
                'reg_id'            => $refund->reg_id,
                'lname'             => $student->lname,
                'fname'             => $student->fname,
                'receipt_num'       => $receiptNum,
                'schoolYear'        => $student->schoolYear,
                'semester'          => $student->sem ?? '-',
                'payment_type'      => 'Refund',
                'category_id'       => $sa->category_id,
                'particular_id'     => $sa->particular_id,
                'amt_payable'       => 0,
                'amt_paid'          => -$refundAmt,
                'trans_date'        => $now->toDateString(),
                'trans_time'        => $now,
                'status'            => '-',
                'personnel_user_id' => $user->id,
            ]);

            /** @var \App\Models\StudentAssessment $sa */
            $sa->update([
                'total_amt_credit' => (float) $sa->total_amt_credit + $refundAmt,
                'credit_id'        => $refund->refund_id,
            ]);

            $totalRefunded += $refundAmt;
            if ($totalRefunded >= $refund->amt_excess) {
                break;
            }
        }

        StudentPaymentData::create([
            'reg_id'             => $refund->reg_id,
            'receipt_num'        => $receiptNum,
            'schoolYear'         => $student->schoolYear,
            'semester'           => $student->sem ?? '-',
            'trans_payment_type' => 'Refund',
            'remarks'            => "Refund #{$refund->refund_id}",
            'entry_date'         => $now->toDateString(),
            'net_amt_payable'    => -$totalRefunded,
            'amt_tend'           => $totalRefunded,
            'personnel_user_id'  => $user->id,
            'trans_time'         => $now,
            'status'             => 'Completed',
        ]);
    }
}
