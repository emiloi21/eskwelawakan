<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AssessmentDiscount;
use App\Models\MassTransaction;
use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\StudentPayment;
use App\Models\StudentPaymentData;
use App\Services\ReceiptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MassTransactionController extends Controller
{
    /**
     * List past mass transaction batches.
     */
    public function index(Request $request): JsonResponse
    {
        $batches = MassTransaction::selectRaw('massTransCode, COUNT(*) as student_count, SUM(payment_amt) as total_amount, MAX(created_at) as created_at')
            ->groupBy('massTransCode')
            ->orderByDesc('created_at')
            ->paginate($request->query('per_page', 20));

        return response()->json($batches);
    }

    /**
     * Select students for mass transaction from A/R list.
     */
    public function select(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'discount_ids'   => ['required', 'array', 'min:1'],
            'discount_ids.*' => ['integer', 'exists:assessments_discounts,discount_id'],
        ]);

        $code = strtoupper(Str::random(10));
        $user = $request->user();

        // Clean any previous mass trans for this user
        MassTransaction::where('personnel_user_id', $user->id)
            ->where('payment_amt', 0)
            ->delete();

        foreach ($validated['discount_ids'] as $discountId) {
            MassTransaction::create([
                'massTransCode'     => $code,
                'discount_id'       => $discountId,
                'payment_term'      => '-',
                'payment_amt'       => 0,
                'personnel_user_id' => $user->id,
            ]);
        }

        return response()->json(['data' => ['code' => $code]]);
    }

    /**
     * Review selected students for a mass transaction batch.
     */
    public function review(string $code): JsonResponse
    {
        $rows = MassTransaction::where('massTransCode', $code)->get();

        if ($rows->isEmpty()) {
            return response()->json(['message' => 'Batch not found.'], 404);
        }

        $discountIds = $rows->pluck('discount_id');
        $discounts = AssessmentDiscount::with('student:reg_id,lname,fname,mname,student_id,gradeLevel,dept')
            ->whereIn('discount_id', $discountIds)
            ->get()
            ->map(fn ($d) => [
                'discount_id'   => $d->discount_id,
                'reg_id'        => $d->reg_id,
                'student'       => $d->student,
                'description'   => $d->description,
                'amount'        => (float) $d->amount,
                'amt_rcv_paid'  => (float) $d->amt_rcv_paid,
                'balance'       => (float) $d->amount - (float) $d->amt_rcv_paid,
                'payment_amt'   => $rows->firstWhere('discount_id', $d->discount_id)?->payment_amt ?? 0,
                'payment_term'  => $rows->firstWhere('discount_id', $d->discount_id)?->payment_term ?? '-',
            ]);

        return response()->json(['data' => ['code' => $code, 'students' => $discounts]]);
    }

    /**
     * Update payment settings (amounts) for each student in the batch.
     */
    public function updateSettings(Request $request, string $code): JsonResponse
    {
        $validated = $request->validate([
            'items'                => ['required', 'array', 'min:1'],
            'items.*.discount_id'  => ['required', 'integer'],
            'items.*.payment_amt'  => ['required', 'numeric', 'min:0'],
            'items.*.payment_term' => ['nullable', 'string', 'max:15'],
        ]);

        foreach ($validated['items'] as $item) {
            MassTransaction::where('massTransCode', $code)
                ->where('discount_id', $item['discount_id'])
                ->update([
                    'payment_amt'  => $item['payment_amt'],
                    'payment_term' => $item['payment_term'] ?? '-',
                ]);
        }

        return response()->json(['message' => 'Settings updated.']);
    }

    /**
     * Complete the mass transaction — generate individual receipts per student.
     */
    public function complete(Request $request, string $code): JsonResponse
    {
        $validated = $request->validate([
            'amt_tend'           => ['required', 'numeric', 'min:0.01'],
            'trans_payment_type' => ['nullable', 'string', 'max:55'],
        ]);

        $rows = MassTransaction::where('massTransCode', $code)
            ->where('payment_amt', '>', 0)
            ->get();

        if ($rows->isEmpty()) {
            return response()->json(['message' => 'No items with payment amounts found.'], 422);
        }

        $user = $request->user();
        $now = now();
        $receipts = [];

        return DB::transaction(function () use ($rows, $validated, $user, $now, $code, &$receipts) {
            foreach ($rows as $mt) {
                $discount = AssessmentDiscount::find($mt->discount_id);
                if (!$discount) continue;

                $student = Student::where('reg_id', $discount->reg_id)->first();
                if (!$student) continue;

                $payAmt = (float) $mt->payment_amt;
                $balance = (float) $discount->amount - (float) $discount->amt_rcv_paid;

                // Check if this is a Tuition Fee category (allows overpayment)
                $isTuitionFee = $this->isTuitionFeeCategory($discount->deduct_category_id);
                
                if ($isTuitionFee) {
                    // Tuition Fee: No cap - allows advance payment (overpayment)
                    $amtPaid = $payAmt;
                } else {
                    // Non-tuition: Cap at balance
                    $amtPaid = min($payAmt, $balance);
                }

                if ($amtPaid <= 0) continue;

                // Generate receipt
                $receiptNum = ReceiptService::generateReceiptNumber();

                // Create payment data header
                StudentPaymentData::create([
                    'reg_id'             => $student->reg_id,
                    'receipt_num'        => $receiptNum,
                    'schoolYear'         => $student->schoolYear,
                    'semester'           => $student->sem ?? '-',
                    'trans_payment_type' => $validated['trans_payment_type'] ?? 'Cash',
                    'net_amt_payable'    => $amtPaid,
                    'amt_tend'           => $amtPaid,
                    'personnel_user_id'  => $user->id,
                    'entry_date'         => $now->toDateString(),
                    'trans_time'         => $now,
                    'status'             => 'Completed',
                ]);

                // Create payment line item
                StudentPayment::create([
                    'reg_id'            => $student->reg_id,
                    'lname'             => $student->lname,
                    'fname'             => $student->fname,
                    'receipt_num'       => $receiptNum,
                    'schoolYear'        => $student->schoolYear,
                    'semester'          => $student->sem ?? '-',
                    'payment_type'      => 'Post Billing - A/R',
                    'category_id'       => $discount->deduct_category_id,
                    'particular_id'     => $discount->deduct_particular_id,
                    'amt_payable'       => $amtPaid,
                    'amt_paid'          => $amtPaid,
                    'trans_date'        => $now->toDateString(),
                    'trans_time'        => $now,
                    'status'            => '-',
                    'personnel_user_id' => $user->id,
                ]);

                // Update student assessment balance
                $sa = StudentAssessment::where('reg_id', $student->reg_id)
                    ->where('particular_id', $discount->deduct_particular_id)
                    ->first();

                if ($sa) {
                    $sa->total_amt_paid += $amtPaid;
                    $sa->total_amt_bal   = $sa->total_amt_payable - ($sa->total_amt_discount + $sa->total_amt_paid);
                    $sa->save();
                }

                // Mark discount as paid
                $discount->amt_rcv_paid = ($discount->amt_rcv_paid ?? 0) + $amtPaid;
                $discount->save();

                // Mark mass transaction row as completed
                MassTransaction::where('massTransCode', $code)
                    ->where('discount_id', $mt->discount_id)
                    ->update(['status' => 'Completed']);

                $receipts[] = [
                    'reg_id'       => $student->reg_id,
                    'name'         => $student->full_name,
                    'receipt_num'  => $receiptNum,
                    'amount_paid'  => $amtPaid,
                ];
            }

            return response()->json([
                'message'  => 'Mass transaction completed.',
                'receipts' => $receipts,
            ]);
        });
    }

    /**
     * Check whether a category is a Tuition Fee (allows overpayment).
     */
    private function isTuitionFeeCategory(int $categoryId): bool
    {
        $cat = \App\Models\AccountsCategory::find($categoryId);
        return $cat && stripos($cat->name ?? '', 'tuition') !== false;
    }
}