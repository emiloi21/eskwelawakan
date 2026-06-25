<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AssessmentDiscount;
use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\StudentOtherFee;
use App\Models\StudentPayment;
use App\Models\StudentPaymentData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LedgerController extends Controller
{
    /**
     * Student ledger — full billing breakdown.
     */
    public function show(string $regId): JsonResponse
    {
        $student = Student::findByPublicIdOrFail($regId);

        $assessments = StudentAssessment::with(['category', 'particular'])
            ->where('reg_id', $student->reg_id)
            ->where('par_stat', 'Active')
            ->orderBy('category_id')
            ->orderBy('particular_id')
            ->get();

        $payments = StudentPayment::where('reg_id', $student->reg_id)
            ->orderByDesc('trans_date')
            ->orderByDesc('trans_time')
            ->get();

        // Receipt-level data for void capability
        $receiptNums = $payments->pluck('receipt_num')->unique();
        $paymentData = StudentPaymentData::whereIn('receipt_num', $receiptNums)
            ->orderBy('entry_date')
            ->orderBy('trans_time')
            ->get();

        $otherFees = StudentOtherFee::where('reg_id', $student->reg_id)
            ->orderBy('schoolYear')
            ->get();

        $discounts = AssessmentDiscount::where('reg_id', $student->reg_id)->get();

        $activeAssessments = $assessments->where('par_stat', 'Active');
        $totals = [
            'total_payable'  => $activeAssessments->sum('total_amt_payable'),
            'total_discount' => $activeAssessments->sum('total_amt_discount'),
            'total_paid'     => $activeAssessments->sum('total_amt_paid'),
            'total_balance'  => $activeAssessments->sum('total_amt_bal'),
        ];

        return response()->json([
            'data' => [
                'student'      => $student,
                'assessments'  => $assessments,
                'payments'     => $payments,
                'payment_data' => $paymentData,
                'other_fees'   => $otherFees,
                'discounts'    => $discounts,
                'totals'       => $totals,
            ],
        ]);
    }

    /**
     * Get old account / other fees for a student.
     */
    public function otherFees(string $regId): JsonResponse
    {
        $student = Student::findByPublicIdOrFail($regId);

        $fees = StudentOtherFee::where('reg_id', $student->reg_id)
            ->orderBy('schoolYear')
            ->get();

        return response()->json(['data' => $fees]);
    }

    /**
     * Search students with balance info for the ledger view.
     */
    public function search(Request $request): JsonResponse
    {
        $query = Student::query();

        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('lname', 'LIKE', "%{$search}%")
                  ->orWhere('fname', 'LIKE', "%{$search}%")
                  ->orWhere('student_id', 'LIKE', "%{$search}%")
                  ->orWhere('reg_id', $search);
            });
        }

        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }

        $students = $query->select('reg_id', 'public_id', 'student_id', 'lname', 'fname', 'mname', 'dept', 'gradeLevel', 'strand', 'status', 'schoolYear')
            ->limit(25)
            ->get();

        // Append balance summary
        $students->each(function ($student) {
            $bal = StudentAssessment::where('reg_id', $student->reg_id)
                ->selectRaw('SUM(total_amt_payable) as payable, SUM(total_amt_paid) as paid, SUM(total_amt_bal) as balance')
                ->first();
            $student->total_payable = (float) ($bal->payable ?? 0);
            $student->total_paid = (float) ($bal->paid ?? 0);
            $student->total_balance = (float) ($bal->balance ?? 0);
        });

        return response()->json(['data' => $students]);
    }

    /**
     * Add a customized fee for a student.
     */
    public function storeOtherFee(Request $request, string $regId): JsonResponse
    {
        $student = Student::findByPublicIdOrFail($regId);

        $validated = $request->validate([
            'description'  => ['required', 'string', 'max:255'],
            'amount'       => ['required', 'numeric', 'min:0'],
            'account_code' => ['nullable', 'string', 'max:55'],
            'paymentTerm'  => ['nullable', 'string', 'max:55'],
            'status'       => ['nullable', 'string', 'max:20'],
        ]);

        // Prevent duplicate description for same student
        $exists = StudentOtherFee::where('reg_id', $student->reg_id)
            ->where('description', $validated['description'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'This customized fee already exists for this student.',
            ], 422);
        }

        return DB::transaction(function () use ($student, $validated) {
            $otherFee = StudentOtherFee::create([
                'reg_id'       => $student->reg_id,
                'category_id'  => 0,
                'account_code' => $validated['account_code'] ?? '',
                'description'  => $validated['description'],
                'amount'       => $validated['amount'],
                'status'       => $validated['status'] ?? 'Active',
                'paymentTerm'  => $validated['paymentTerm'] ?? 'Upon Enrollment',
                'schoolYear'   => $student->schoolYear,
            ]);

            // Also insert into student_assessments for billing
            StudentAssessment::create([
                'reg_id'             => $student->reg_id,
                'assessment_id'      => $student->assessment_id ?? 0,
                'category_id'        => 0,
                'particular_id'      => $otherFee->particular_id,
                'account_type'       => 'Customized Fee',
                'par_stat'           => $validated['status'] ?? 'Active',
                'total_amt_payable'  => $validated['amount'],
                'total_amt_discount' => 0,
                'total_amt_paid'     => 0,
                'total_amt_debit'    => 0,
                'total_amt_credit'   => 0,
                'total_amt_bal'      => $validated['amount'],
                'schoolYear'         => $student->schoolYear,
            ]);

            return response()->json(['data' => $otherFee], 201);
        });
    }

    /**
     * Delete a customized fee.
     */
    public function destroyOtherFee(string $id): JsonResponse
    {
        $fee = StudentOtherFee::findByPublicIdOrFail($id);

        // Check if any payments have been made against this fee
        $hasPaid = StudentAssessment::where('particular_id', $fee->particular_id)
            ->where('reg_id', $fee->reg_id)
            ->where('total_amt_paid', '>', 0)
            ->exists();

        if ($hasPaid) {
            return response()->json([
                'message' => 'Cannot delete — payments have been made against this fee.',
            ], 422);
        }

        DB::transaction(function () use ($fee) {
            StudentAssessment::where('reg_id', $fee->reg_id)
                ->where('particular_id', $fee->particular_id)
                ->where('category_id', 0)
                ->delete();

            $fee->delete();
        });

        return response()->json(['message' => 'Customized fee deleted.']);
    }
}
