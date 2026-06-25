<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AdvancePayment;
use App\Models\Student;
use App\Models\StudentAssessment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdvancePaymentController extends Controller
{
    /**
     * List advance payments — optionally filtered by student.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AdvancePayment::with('student:reg_id,lname,fname,mname,student_id');

        if ($regId = $request->query('reg_id')) {
            $query->where('reg_id', $regId);
        }

        $items = $query->orderByDesc('adv_pay_id')
            ->paginate($request->query('per_page', 50));

        return response()->json($items);
    }

    /**
     * Record an advance payment / deposit.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reg_id'      => ['required', 'string', 'exists:students,public_id'],
            'description' => ['required', 'string', 'max:255'],
            'adv_pay_amt' => ['required', 'numeric', 'min:0.01'],
        ]);

        $student = Student::findByPublicIdOrFail($validated['reg_id']);

        $payment = AdvancePayment::create([
            'reg_id'      => $student->reg_id,
            'description' => $validated['description'],
            'adv_pay_amt' => $validated['adv_pay_amt'],
        ]);

        return response()->json(['data' => $payment->load('student:reg_id,lname,fname,mname')], 201);
    }

    /**
     * Apply an advance payment to a student assessment.
     */
    public function apply(Request $request, string $id): JsonResponse
    {
        $advance = AdvancePayment::findByPublicIdOrFail($id);

        $validated = $request->validate([
            'category_id'  => ['required', 'integer'],
            'particular_id' => ['required', 'integer'],
            'amount'       => ['required', 'numeric', 'min:0.01', 'max:' . $advance->adv_pay_amt],
        ]);

        return DB::transaction(function () use ($advance, $validated) {
            $sa = StudentAssessment::where('reg_id', $advance->reg_id)
                ->where('category_id', $validated['category_id'])
                ->where('particular_id', $validated['particular_id'])
                ->firstOrFail();

            $newPaid = (float) $sa->total_amt_paid + (float) $validated['amount'];
            $newBal = (float) $sa->total_amt_payable - ((float) $sa->total_amt_discount + $newPaid);
            $sa->update([
                'total_amt_paid' => $newPaid,
                'total_amt_bal'  => $newBal,
            ]);

            $remaining = (float) $advance->adv_pay_amt - (float) $validated['amount'];
            if ($remaining <= 0) {
                $advance->delete();
            } else {
                $advance->update(['adv_pay_amt' => $remaining]);
            }

            return response()->json([
                'message'   => 'Advance applied successfully.',
                'remaining' => max(0, $remaining),
            ]);
        });
    }

    /**
     * Cancel / delete an unused advance payment.
     */
    public function destroy(string $id): JsonResponse
    {
        $advance = AdvancePayment::findByPublicIdOrFail($id);
        $advance->delete();

        return response()->json(['message' => 'Advance payment deleted.']);
    }
}
