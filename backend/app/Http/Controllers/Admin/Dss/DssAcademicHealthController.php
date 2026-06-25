<?php

namespace App\Http\Controllers\Admin\Dss;

use App\Http\Controllers\Controller;
use App\Models\StudentIntervention;
use App\Services\Dss\DssAcademicHealthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DssAcademicHealthController extends Controller
{
    public function __construct(
        private readonly DssAcademicHealthService $academicService,
    ) {}

    public function summary(Request $request): JsonResponse
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        $rates        = $this->academicService->promotionRetentionRates($schoolYearId);

        $totalPromoted = array_sum(array_column($rates, 'promoted'));
        $totalRetained = array_sum(array_column($rates, 'retained'));
        $totalStudents = array_sum(array_column($rates, 'total'));
        $atRiskCount   = $this->academicService->flagAtRiskStudents($schoolYearId)->count();

        return response()->json(['data' => [
            'total_students'      => $totalStudents,
            'total_promoted'      => $totalPromoted,
            'total_retained'      => $totalRetained,
            'at_risk_count'       => $atRiskCount,
            'avg_promotion_rate'  => $totalStudents > 0 ? round(($totalPromoted / $totalStudents) * 100, 1) : 0,
            'avg_retention_rate'  => $totalStudents > 0 ? round(($totalRetained / $totalStudents) * 100, 1) : 0,
        ]]);
    }

    public function promotionRates(Request $request): JsonResponse
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        return response()->json(['data' => $this->academicService->promotionRetentionRates($schoolYearId)]);
    }

    public function gradeDistribution(Request $request): JsonResponse
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        $gradeLevel   = $request->query('grade_level');
        return response()->json(['data' => $this->academicService->gradeDistribution($schoolYearId, $gradeLevel)]);
    }

    public function atRiskStudents(Request $request): JsonResponse
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        $students     = $this->academicService->flagAtRiskStudents($schoolYearId);
        return response()->json(['data' => $students->values()]);
    }

    public function subjectPerformance(Request $request): JsonResponse
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        return response()->json(['data' => $this->academicService->subjectPerformance($schoolYearId)]);
    }

    public function storeIntervention(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_id'            => 'required|integer|exists:students,reg_id',
            'school_year_id'        => 'nullable|integer|exists:school_years,id',
            'flagged_reason'        => 'nullable|string|max:2000',
            'notes'                 => 'nullable|string|max:2000',
            'intervention_status'   => ['nullable', Rule::in(['flagged', 'under_intervention', 'resolved'])],
        ]);

        $schoolYearId = $validated['school_year_id'] ?? $this->activeSchoolYearId();
        $flaggedReason = $validated['flagged_reason'] ?? 'Flagged by administrator';

        $intervention = StudentIntervention::create([
            'student_id'          => $validated['student_id'],
            'school_year_id'      => $schoolYearId,
            'flagged_reason'      => $flaggedReason,
            'notes'               => $validated['notes'] ?? null,
            'flagged_by'          => auth()->id(),
            'intervention_status' => $validated['intervention_status'] ?? 'flagged',
        ]);

        activity()->causedBy(auth()->user())->log("Created intervention for student ID {$validated['student_id']}.");

        return response()->json($intervention, 201);
    }

    public function updateIntervention(Request $request, string $publicId): JsonResponse
    {
        $intervention = StudentIntervention::findByPublicIdOrFail($publicId);

        $validated = $request->validate([
            'intervention_status' => ['nullable', Rule::in(['flagged', 'under_intervention', 'resolved'])],
            'notes'               => 'nullable|string|max:2000',
        ]);

        if (($validated['intervention_status'] ?? null) === 'resolved' && $intervention->intervention_status !== 'resolved') {
            $validated['resolved_at'] = now();
        }

        $intervention->update($validated);

        activity()->causedBy(auth()->user())->log("Updated intervention {$publicId}.");

        return response()->json($intervention);
    }

    public function exportAtRisk(Request $request): \Illuminate\Http\Response
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        $students     = $this->academicService->flagAtRiskStudents($schoolYearId);

        $csv  = "Student Name,Grade Level,Section,Flag Reasons,Status\n";
        foreach ($students as $s) {
            $csv .= sprintf(
                '"%s","%s","%s","%s","%s"' . "\n",
                $s['student_name'],
                $s['grade_level'],
                $s['section'],
                implode('; ', $s['flag_reasons']),
                $s['intervention_status'],
            );
        }

        return response($csv, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="at-risk-students.csv"',
        ]);
    }

    private function activeSchoolYearId(): int
    {
        return (int) DB::table('school_years')->where('status', 'Active')->value('id');
    }
}
