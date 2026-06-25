<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AccountsAssessmentParticular;
use App\Models\AccountsAssessmentGroup;
use App\Models\AccountsParticular;
use App\Models\StudentAssessment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssessmentParticularController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AccountsAssessmentParticular::with(['assessmentGroup', 'particular']);

        if ($groupId = $request->query('assessment_group_id')) {
            $query->where('assessment_group_id', $groupId);
        }
        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }

        $items = $query->orderBy('assessment_group_id')
            ->orderBy('description')
            ->paginate($request->query('per_page', 100));

        return response()->json($items);
    }

    /**
     * Link a particular to an assessment group and cascade to student assessments.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'assessment_group_id' => ['required', 'string', 'exists:accounts_assessment_groups,public_id'],
            'particular_id'       => ['required', 'string', 'exists:accounts_particulars,public_id'],
            'paymentTerm'         => ['nullable', 'string', 'max:55'],
        ]);

        $particular = AccountsParticular::where('public_id', $validated['particular_id'])->firstOrFail();
        $group = AccountsAssessmentGroup::where('public_id', $validated['assessment_group_id'])->firstOrFail();

        return DB::transaction(function () use ($validated, $particular, $group) {
            $assessmentParticular = AccountsAssessmentParticular::updateOrCreate(
                [
                    'assessment_group_id' => $group->assessment_group_id,
                    'particular_id'       => $particular->particular_id,
                ],
                [
                    'account_group' => $particular->account_group,
                    'description'   => $particular->description,
                    'amount'        => $particular->amount,
                    'status'        => $particular->status,
                    'paymentTerm'   => $validated['paymentTerm'] ?? '13',
                    'schoolYear'    => $group->schoolYear,
                    'semester'      => $particular->semester ?? '-',
                ]
            );

            $this->recalculateAssessmentTotal($group->assessment_group_id);
            $this->cascadeToStudentAssessments($group->assessment_group_id, $particular);

            return response()->json(['data' => $assessmentParticular->load(['assessmentGroup', 'particular'])], 201);
        });
    }

    /**
     * Bulk-link multiple particulars to an assessment group.
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'assessment_group_id' => ['required', 'string', 'exists:accounts_assessment_groups,public_id'],
            'particular_ids'      => ['required', 'array', 'min:1'],
            'particular_ids.*'    => ['string', 'exists:accounts_particulars,public_id'],
            'paymentTerm'         => ['nullable', 'string', 'max:55'],
        ]);

        $group = AccountsAssessmentGroup::where('public_id', $validated['assessment_group_id'])->firstOrFail();
        $particulars = AccountsParticular::whereIn('public_id', $validated['particular_ids'])->get();

        return DB::transaction(function () use ($validated, $particulars, $group) {
            $created = [];
            foreach ($particulars as $particular) {
                $created[] = AccountsAssessmentParticular::updateOrCreate(
                    [
                        'assessment_group_id' => $group->assessment_group_id,
                        'particular_id'       => $particular->particular_id,
                    ],
                    [
                        'account_group' => $particular->account_group,
                        'description'   => $particular->description,
                        'amount'        => $particular->amount,
                        'status'        => $particular->status,
                        'paymentTerm'   => $validated['paymentTerm'] ?? '13',
                        'schoolYear'    => $group->schoolYear,
                        'semester'      => $particular->semester ?? '-',
                    ]
                );
                $this->cascadeToStudentAssessments($group->assessment_group_id, $particular);
            }

            $this->recalculateAssessmentTotal($group->assessment_group_id);

            return response()->json([
                'data' => $created,
                'message' => count($created) . ' particulars linked.',
            ], 201);
        });
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $assessmentParticular = AccountsAssessmentParticular::findByPublicIdOrFail($id);

        $validated = $request->validate([
            'amount'      => ['sometimes', 'numeric', 'min:0'],
            'paymentTerm' => ['nullable', 'string', 'max:55'],
            'status'      => ['nullable', 'string', 'max:10'],
        ]);

        return DB::transaction(function () use ($assessmentParticular, $validated) {
            $assessmentParticular->update($validated);

            $this->recalculateAssessmentTotal($assessmentParticular->assessment_group_id);

            if (isset($validated['amount'])) {
                $particular = AccountsParticular::find($assessmentParticular->particular_id);
                if ($particular) {
                    $this->cascadeToStudentAssessments($assessmentParticular->assessment_group_id, $particular, $validated['amount']);
                }
            }

            return response()->json(['data' => $assessmentParticular->fresh(['assessmentGroup', 'particular'])]);
        });
    }

    public function destroy(string $id): JsonResponse
    {
        $assessmentParticular = AccountsAssessmentParticular::findByPublicIdOrFail($id);
        $groupId = $assessmentParticular->assessment_group_id;

        $hasPaid = StudentAssessment::where('assessment_group_id', $groupId)
            ->where('particular_id', $assessmentParticular->particular_id)
            ->where('total_amt_paid', '>', 0)
            ->exists();

        if ($hasPaid) {
            return response()->json([
                'message' => 'Cannot remove: students have payments on this particular.',
            ], 422);
        }

        return DB::transaction(function () use ($assessmentParticular, $groupId) {
            StudentAssessment::where('assessment_group_id', $groupId)
                ->where('particular_id', $assessmentParticular->particular_id)
                ->where('total_amt_paid', '<=', 0)
                ->delete();

            $assessmentParticular->delete();
            $this->recalculateAssessmentTotal($groupId);

            return response()->json(['message' => 'Assessment-particular link removed.']);
        });
    }

    private function recalculateAssessmentTotal(int $groupId): void
    {
        $total = AccountsAssessmentParticular::where('assessment_group_id', $groupId)->sum('amount');
        AccountsAssessmentGroup::where('assessment_group_id', $groupId)->update(['totalAmount' => $total]);
    }

    private function cascadeToStudentAssessments(int $groupId, AccountsParticular $particular, ?float $overrideAmount = null): void
    {
        $amount = $overrideAmount ?? $particular->amount;

        $students = StudentAssessment::where('assessment_group_id', $groupId)
            ->select('reg_id', 'assessment_id')
            ->distinct()
            ->get();

        foreach ($students as $row) {
            $existing = StudentAssessment::where('reg_id', $row->reg_id)
                ->where('assessment_group_id', $groupId)
                ->where('particular_id', $particular->particular_id)
                ->first();

            if ($existing) {
                $existing->update([
                    'total_amt_payable' => $amount,
                    'total_amt_bal'     => $amount - ($existing->total_amt_discount + $existing->total_amt_paid),
                ]);
            } else {
                StudentAssessment::create([
                    'reg_id'            => $row->reg_id,
                    'assessment_id'     => $row->assessment_id,
                    'assessment_group_id' => $groupId,
                    'particular_id'     => $particular->particular_id,
                    'par_stat'          => 'Active',
                    'total_amt_payable' => $amount,
                    'total_amt_bal'     => $amount,
                    'schoolYear'        => AccountsAssessmentGroup::where('assessment_group_id', $groupId)->value('schoolYear'),
                ]);
            }
        }
    }
}
