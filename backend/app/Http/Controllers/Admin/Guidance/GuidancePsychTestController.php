<?php

namespace App\Http\Controllers\Admin\Guidance;

use App\Http\Controllers\Controller;
use App\Models\GuidanceCaseRecord;
use App\Models\GuidancePsychTest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GuidancePsychTestController extends Controller
{
    public function index(string $casePublicId): JsonResponse
    {
        $case  = GuidanceCaseRecord::findByPublicIdOrFail($casePublicId);
        $tests = GuidancePsychTest::with('administeredBy')
            ->where('case_id', $case->id)
            ->orderByDesc('test_date')
            ->get();

        return response()->json($tests);
    }

    public function store(Request $request, string $casePublicId): JsonResponse
    {
        $case = GuidanceCaseRecord::findByPublicIdOrFail($casePublicId);
        $validated = $request->validate([
            'test_name'           => 'required|string|max:150',
            'test_date'           => 'required|date',
            'raw_score'           => 'nullable|numeric',
            'scaled_score'        => 'nullable|numeric',
            'score_interpretation' => 'nullable|string|max:100',
            'full_interpretation' => 'nullable|string|max:5000',
            'recommendations'     => 'nullable|string|max:2000',
            'feedback_given'      => 'nullable|boolean',
            'feedback_date'       => 'nullable|date',
        ]);

        $test = GuidancePsychTest::create([
            ...$validated,
            'case_id'         => $case->id,
            'reg_id'          => $case->reg_id,
            'administered_by' => Auth::id(),
        ]);

        return response()->json($test->load('administeredBy'), 201);
    }

    public function update(Request $request, string $casePublicId, string $testPublicId): JsonResponse
    {
        $case = GuidanceCaseRecord::findByPublicIdOrFail($casePublicId);
        $test = GuidancePsychTest::where('case_id', $case->id)
            ->where('public_id', $testPublicId)
            ->firstOrFail();

        $validated = $request->validate([
            'score_interpretation' => 'nullable|string|max:100',
            'full_interpretation' => 'nullable|string|max:5000',
            'recommendations'     => 'nullable|string|max:2000',
            'feedback_given'      => 'nullable|boolean',
            'feedback_date'       => 'nullable|date',
        ]);

        $test->update($validated);

        return response()->json($test->fresh('administeredBy'));
    }
}
