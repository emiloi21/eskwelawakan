<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AccountsAssessment;
use App\Models\AssessmentPayable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssessmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AccountsAssessment::with('payables.category');

        if ($dept = $request->query('dept')) {
            $query->where('dept', $dept);
        }
        if ($grade = $request->query('gradeLevel')) {
            $query->where('gradeLevel', $grade);
        }
        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }
        if ($strand = $request->query('strand')) {
            $query->where('strand', $strand);
        }

        $assessments = $query->orderBy('dept')
            ->orderBy('gradeLevel')
            ->paginate($request->query('per_page', 50));

        return response()->json($assessments);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'dept'        => ['required', 'string', 'max:55'],
            'gradeLevels' => ['nullable', 'array', 'min:1'],
            'gradeLevels.*' => ['string', 'max:20'],
            'gradeLevel'  => ['nullable', 'string', 'max:20'],
            'strand'      => ['nullable', 'string', 'max:55'],
            'major'       => ['nullable', 'string', 'max:55'],
            'schoolYear'  => ['required', 'string', 'max:9'],
            'coverage'    => ['nullable', 'string', 'max:55'],
            'description' => ['required', 'string', 'max:255'],
        ]);

        $validated['strand'] = $validated['strand'] ?? 'N/A';
        $validated['major'] = $validated['major'] ?? 'N/A';
        $validated['coverage'] = $validated['coverage'] ?? '-';

        $gradeLevels = $validated['gradeLevels'] ?? ($validated['gradeLevel'] ? [$validated['gradeLevel']] : []);
        unset($validated['gradeLevels']);

        if (empty($gradeLevels)) {
            return response()->json(['message' => 'At least one grade level is required.'], 422);
        }

        $created = [];
        foreach ($gradeLevels as $grade) {
            $data = array_merge($validated, ['gradeLevel' => $grade]);
            $created[] = AccountsAssessment::create($data);
        }

        if (count($created) === 1) {
            return response()->json(['data' => $created[0]->load('payables.category')], 201);
        }

        return response()->json([
            'data' => $created,
            'message' => count($created) . ' assessments created.',
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $assessment = AccountsAssessment::with(['payables.category', 'studentAssessments'])
            ->where('public_id', $id)->firstOrFail();

        return response()->json(['data' => $assessment]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $assessment = AccountsAssessment::findByPublicIdOrFail($id);

        $validated = $request->validate([
            'dept'        => ['sometimes', 'string', 'max:55'],
            'gradeLevel'  => ['sometimes', 'string', 'max:20'],
            'strand'      => ['nullable', 'string', 'max:55'],
            'major'       => ['nullable', 'string', 'max:55'],
            'schoolYear'  => ['sometimes', 'string', 'max:9'],
            'coverage'    => ['nullable', 'string', 'max:55'],
            'description' => ['sometimes', 'string', 'max:255'],
        ]);

        $assessment->update($validated);

        return response()->json(['data' => $assessment->fresh('payables.category')]);
    }

    public function destroy(string $id): JsonResponse
    {
        $assessment = AccountsAssessment::findByPublicIdOrFail($id);

        $hasStudents = $assessment->studentAssessments()
            ->where('total_amt_paid', '>', 0)
            ->exists();

        if ($hasStudents) {
            return response()->json([
                'message' => 'Cannot delete assessment with existing student payments.',
            ], 422);
        }

        $assessment->studentAssessments()->delete();
        AssessmentPayable::where('assessment_id', $assessment->assessment_id)->delete();
        $assessment->delete();

        return response()->json(['message' => 'Assessment deleted.']);
    }

    /**
     * Link / update categories for this assessment (assessment payables).
     */
    public function settings(string $id): JsonResponse
    {
        $assessment = AccountsAssessment::findByPublicIdOrFail($id);

        $payables = AssessmentPayable::with('category.catParticulars.particular')
            ->where('assessment_id', $assessment->assessment_id)
            ->get();

        return response()->json([
            'data' => [
                'assessment' => $assessment,
                'payables'   => $payables,
            ],
        ]);
    }

    /**
     * Remove a single category link (payable) from this assessment.
     */
    public function removePayable(string $assessmentId, string $payableId): JsonResponse
    {
        $assessment = AccountsAssessment::findByPublicIdOrFail($assessmentId);

        $payable = AssessmentPayable::where('assessment_id', $assessment->assessment_id)
            ->where('public_id', $payableId)
            ->firstOrFail();

        $payable->delete();

        $assessment->recalculateTotal();

        return response()->json(['message' => 'Category removed from assessment.']);
    }

    public function saveSettings(Request $request, string $id): JsonResponse
    {
        $assessment = AccountsAssessment::findByPublicIdOrFail($id);

        $validated = $request->validate([
            'category_ids'   => ['required', 'array'],
            'category_ids.*' => ['integer', 'exists:accounts_categories,category_id'],
        ]);

        // Sync: remove old payables not in the new list, add new ones
        AssessmentPayable::where('assessment_id', $assessment->assessment_id)
            ->whereNotIn('category_id', $validated['category_ids'])
            ->delete();

        foreach ($validated['category_ids'] as $categoryId) {
            AssessmentPayable::updateOrCreate(
                ['assessment_id' => $assessment->assessment_id, 'category_id' => $categoryId],
                [
                    'total_amt_payable' => \App\Models\AccountsCategory::where('category_id', $categoryId)->value('totalAmount') ?? 0,
                    'schoolYear'        => $assessment->schoolYear,
                ]
            );
        }

        $assessment->recalculateTotal();

        return response()->json(['message' => 'Assessment settings saved.']);
    }
}
