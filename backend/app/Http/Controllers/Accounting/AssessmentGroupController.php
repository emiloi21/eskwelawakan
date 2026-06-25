<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AccountsAssessmentGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssessmentGroupController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AccountsAssessmentGroup::withCount('assessmentParticulars');

        if ($grade = $request->query('gradeLevel')) {
            $query->where('gradeLevel', $grade);
        }
        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }
        if ($strand = $request->query('strand')) {
            $query->where('strand', $strand);
        }

        $assessments = $query->orderBy('gradeLevel')
            ->orderBy('description')
            ->paginate($request->query('per_page', 50));

        return response()->json($assessments);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'gradeLevels'  => ['nullable', 'array', 'min:1'],
            'gradeLevels.*' => ['string', 'max:20'],
            'gradeLevel'   => ['nullable', 'string', 'max:20'],
            'strand'       => ['nullable', 'string', 'max:55'],
            'major'        => ['nullable', 'string', 'max:55'],
            'schoolYear'   => ['required', 'string', 'max:9'],
            'semester'     => ['nullable', 'string', 'max:55'],
            'description'  => ['required', 'string', 'max:255'],
            'totalAmount'  => ['nullable', 'numeric', 'min:0'],
        ]);

        $validated['strand'] = $validated['strand'] ?? 'N/A';
        $validated['major'] = $validated['major'] ?? 'N/A';
        $validated['semester'] = $validated['semester'] ?? 'N/A';
        $validated['totalAmount'] = $validated['totalAmount'] ?? 0;

        $gradeLevels = $validated['gradeLevels'] ?? ($validated['gradeLevel'] ? [$validated['gradeLevel']] : []);
        unset($validated['gradeLevels']);

        if (empty($gradeLevels)) {
            return response()->json(['message' => 'At least one grade level is required.'], 422);
        }

        $created = [];
        foreach ($gradeLevels as $grade) {
            $data = array_merge($validated, ['gradeLevel' => $grade]);
            $created[] = AccountsAssessmentGroup::create($data);
        }

        if (count($created) === 1) {
            return response()->json(['data' => $created[0]], 201);
        }

        return response()->json([
            'data' => $created,
            'message' => count($created) . ' assessment groups created.',
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $assessment = AccountsAssessmentGroup::with('assessmentParticulars.particular')
            ->withCount('assessmentParticulars')
            ->where('public_id', $id)->firstOrFail();

        return response()->json(['data' => $assessment]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $assessment = AccountsAssessmentGroup::findByPublicIdOrFail($id);

        $validated = $request->validate([
            'gradeLevel'   => ['sometimes', 'string', 'max:20'],
            'strand'       => ['nullable', 'string', 'max:55'],
            'major'        => ['nullable', 'string', 'max:55'],
            'schoolYear'   => ['sometimes', 'string', 'max:9'],
            'semester'     => ['nullable', 'string', 'max:55'],
            'description'  => ['sometimes', 'string', 'max:255'],
        ]);

        $assessment->update($validated);

        return response()->json(['data' => $assessment->fresh()]);
    }

    public function destroy(string $id): JsonResponse
    {
        $assessment = AccountsAssessmentGroup::findByPublicIdOrFail($id);

        $hasPaidStudents = \App\Models\StudentAssessment::where('assessment_group_id', $assessment->assessment_group_id)
            ->where('total_amt_paid', '>', 0)
            ->exists();

        if ($hasPaidStudents) {
            return response()->json([
                'message' => 'Cannot delete assessment group with existing student payments.',
            ], 422);
        }

        $assessment->assessmentParticulars()->delete();
        $assessment->delete();

        return response()->json(['message' => 'Assessment group deleted.']);
    }

    /**
     * Get all particulars linked to this assessment group.
     */
    public function particulars(string $id): JsonResponse
    {
        $assessment = AccountsAssessmentGroup::findByPublicIdOrFail($id);

        $items = $assessment->assessmentParticulars()
            ->with('particular')
            ->orderBy('description')
            ->get();

        return response()->json(['data' => $items]);
    }
}
