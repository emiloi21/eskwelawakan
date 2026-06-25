<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\StudentAssessment;
use App\Models\AccountsCatParticular;
use App\Models\AssessmentPayable;
use App\Models\Student;
use App\Models\StudentPayment;
use App\Models\AssessmentDiscount;
use App\Services\CacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StudentAssessmentController extends Controller
{
    /**
     * Get a student's billing/assessment items.
     */
    public function show(string $regId): JsonResponse
    {
        $student = Student::findByPublicIdOrFail($regId);

        $assessments = StudentAssessment::with(['category', 'assessment'])
            ->where('reg_id', $student->reg_id)
            ->orderBy('category_id')
            ->orderBy('particular_id')
            ->get();

        $totals = [
            'total_payable'  => $assessments->sum('total_amt_payable'),
            'total_discount' => $assessments->sum('total_amt_discount'),
            'total_paid'     => $assessments->sum('total_amt_paid'),
            'total_balance'  => $assessments->sum('total_amt_bal'),
        ];

        return response()->json([
            'data' => [
                'student'     => $student,
                'assessments' => $assessments,
                'totals'      => $totals,
            ],
        ]);
    }

    /**
     * Assign an assessment to a student — creates student_assessment rows
     * from the assessment's category → cat_particulars.
     */
    public function assign(Request $request, string $regId): JsonResponse
    {
        $student = Student::findByPublicIdOrFail($regId);

        $validated = $request->validate([
            'assessment_id' => ['required', 'integer', 'exists:accounts_assessments,assessment_id'],
        ]);

        $assessmentId = $validated['assessment_id'];

        $payables = AssessmentPayable::where('assessment_id', $assessmentId)->get();

        if ($payables->isEmpty()) {
            return response()->json([
                'message' => 'Assessment has no linked categories/payables.',
            ], 422);
        }

        return DB::transaction(function () use ($student, $assessmentId, $payables) {
            $created = 0;

            foreach ($payables as $payable) {
                $catParticulars = AccountsCatParticular::where('category_id', $payable->category_id)->get();

                foreach ($catParticulars as $cp) {
                    $exists = StudentAssessment::where('reg_id', $student->reg_id)
                        ->where('assessment_id', $assessmentId)
                        ->where('category_id', $payable->category_id)
                        ->where('particular_id', $cp->particular_id)
                        ->exists();

                    if (!$exists) {
                        StudentAssessment::create([
                            'reg_id'            => $student->reg_id,
                            'assessment_id'     => $assessmentId,
                            'category_id'       => $payable->category_id,
                            'particular_id'     => $cp->particular_id,
                            'par_stat'          => 'Active',
                            'total_amt_payable' => $cp->amount,
                            'total_amt_discount' => 0,
                            'total_amt_paid'    => 0,
                            'total_amt_debit'   => 0,
                            'total_amt_credit'  => 0,
                            'total_amt_bal'     => $cp->amount,
                            'schoolYear'        => $student->schoolYear,
                        ]);
                        $created++;
                    }
                }
            }

            // Update student assessment_id
            $student->update(['assessment_id' => $assessmentId]);

            return response()->json([
                'message' => "Assessment assigned. {$created} line items created.",
                'created' => $created,
            ]);
        });
    }

    /**
     * Update a single student assessment line item.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $sa = StudentAssessment::findByPublicIdOrFail($id);

        $validated = $request->validate([
            'total_amt_payable'  => ['sometimes', 'numeric', 'min:0'],
            'total_amt_discount' => ['sometimes', 'numeric', 'min:0'],
            'par_stat'           => ['sometimes', 'string', 'max:20'],
        ]);

        if (isset($validated['total_amt_payable']) || isset($validated['total_amt_discount'])) {
            $payable = $validated['total_amt_payable'] ?? $sa->total_amt_payable;
            $discount = $validated['total_amt_discount'] ?? $sa->total_amt_discount;
            $validated['total_amt_bal'] = $payable - ($discount + $sa->total_amt_paid);
        }

        $sa->update($validated);

        CacheService::bustPaymentStats();

        return response()->json(['data' => $sa->fresh()]);
    }

    /**
     * Change a student's assessment — voids old, assigns new.
     */
    public function changeAssessment(Request $request, string $regId): JsonResponse
    {
        $student = Student::findByPublicIdOrFail($regId);

        $validated = $request->validate([
            'assessment_id' => ['required', 'integer', 'exists:accounts_assessments,assessment_id'],
        ]);

        $newAssessmentId = $validated['assessment_id'];
        $sy = $student->schoolYear;

        return DB::transaction(function () use ($student, $newAssessmentId, $sy) {
            // 1. Delete existing student_assessments for this SY
            StudentAssessment::where('reg_id', $student->reg_id)
                ->where('schoolYear', $sy)
                ->delete();

            // 2. Void existing payments for this SY
            StudentPayment::where('reg_id', $student->reg_id)
                ->where('schoolYear', $sy)
                ->where('payment_type', '!=', 'Student Refund')
                ->update([
                    'status'       => 'Voided',
                    'void_remarks' => 'Change Assessment via Enrollment',
                ]);

            // 3. Delete discount assignments linked to voided payments
            $voidedMethodIds = StudentPayment::where('reg_id', $student->reg_id)
                ->where('schoolYear', $sy)
                ->where('status', 'Voided')
                ->pluck('method_id')
                ->filter();

            if ($voidedMethodIds->isNotEmpty()) {
                AssessmentDiscount::whereIn('discount_id', $voidedMethodIds)->delete();
            }

            // 4. Insert new assessment line items from payables → cat_particulars
            $payables = AssessmentPayable::where('assessment_id', $newAssessmentId)
                ->where('schoolYear', $sy)
                ->get();

            $created = 0;
            foreach ($payables as $payable) {
                $catParticulars = AccountsCatParticular::where('category_id', $payable->category_id)->get();
                foreach ($catParticulars as $cp) {
                    StudentAssessment::create([
                        'reg_id'             => $student->reg_id,
                        'assessment_id'      => $newAssessmentId,
                        'category_id'        => $payable->category_id,
                        'particular_id'      => $cp->particular_id,
                        'par_stat'           => 'Active',
                        'total_amt_payable'  => $cp->amount,
                        'total_amt_discount' => 0,
                        'total_amt_paid'     => 0,
                        'total_amt_debit'    => 0,
                        'total_amt_credit'   => 0,
                        'total_amt_bal'      => $cp->amount,
                        'schoolYear'         => $sy,
                    ]);
                    $created++;
                }
            }

            // 5. Re-insert other fees (customized fees)
            $otherFees = \App\Models\StudentOtherFee::where('reg_id', $student->reg_id)
                ->where('schoolYear', $sy)
                ->get();

            foreach ($otherFees as $of) {
                StudentAssessment::create([
                    'reg_id'             => $student->reg_id,
                    'assessment_id'      => $newAssessmentId,
                    'category_id'        => $of->category_id,
                    'particular_id'      => $of->particular_id,
                    'account_type'       => 'Customized Fee',
                    'par_stat'           => $of->status,
                    'total_amt_payable'  => $of->amount,
                    'total_amt_discount' => 0,
                    'total_amt_paid'     => 0,
                    'total_amt_debit'    => 0,
                    'total_amt_credit'   => 0,
                    'total_amt_bal'      => $of->amount,
                    'schoolYear'         => $sy,
                ]);
            }

            // 6. Update student's assessment_id
            $student->update(['assessment_id' => $newAssessmentId]);

            return response()->json([
                'message' => "Assessment changed. Previous transactions voided. {$created} new items created.",
                'created' => $created,
            ]);
        });
    }
}
