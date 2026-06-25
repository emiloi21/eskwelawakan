<?php

namespace App\Http\Controllers\Admin\Dss;

use App\Http\Controllers\Controller;
use App\Models\EarlyWarning;
use App\Models\DssRecommendation;
use App\Models\SchoolYear;
use App\Services\Dss\DssEnrollmentService;
use App\Services\Dss\DssAcademicHealthService;
use App\Services\Dss\DssResourceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DssDashboardController extends Controller
{
    public function __construct(
        private readonly DssEnrollmentService     $enrollmentService,
        private readonly DssAcademicHealthService $academicService,
        private readonly DssResourceService       $resourceService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $activeSy = SchoolYear::where('status', 'Active')->first();
        $sy       = $activeSy?->school_year;

        // Total enrolled current SY
        $totalEnrolled = $sy
            ? DB::table('students')->where('schoolYear', $sy)->whereIn('status', ['Enrolled', 'Active'])->count()
            : 0;

        // Previous SY enrolled
        $prevSy = DB::table('school_years')
            ->when($sy, fn ($q) => $q->where('school_year', '<', $sy))
            ->orderBy('school_year', 'desc')
            ->value('school_year');

        $prevEnrolled = $prevSy
            ? DB::table('students')->where('schoolYear', $prevSy)->whereIn('status', ['Enrolled', 'Active'])->count()
            : 0;

        $enrolledDelta    = $totalEnrolled - $prevEnrolled;
        $enrolledDeltaPct = $prevEnrolled > 0 ? round(($enrolledDelta / $prevEnrolled) * 100, 1) : 0;

        // Promotion / retention rates
        $promotionRate = 0;
        $retentionRate = 0;
        if ($activeSy) {
            $rates = $this->academicService->promotionRetentionRates($activeSy->id);
            $promotionRate = count($rates) > 0
                ? round(array_sum(array_column($rates, 'promotion_pct')) / count($rates), 1)
                : 0;
            $retentionRate = count($rates) > 0
                ? round(array_sum(array_column($rates, 'retention_pct')) / count($rates), 1)
                : 0;
        }

        // At-risk count
        $atRiskCount = $activeSy
            ? $this->academicService->flagAtRiskStudents($activeSy->id)->count()
            : 0;

        // Faculty load compliance
        $facultyLoads = $activeSy ? $this->resourceService->facultyLoadAnalysis($activeSy->id) : [];
        $totalFaculty = count($facultyLoads);
        $optimalFaculty = count(array_filter($facultyLoads, fn ($f) => $f['load_status'] === 'optimal'));
        $facultyLoadCompliancePct = $totalFaculty > 0
            ? round(($optimalFaculty / $totalFaculty) * 100, 1)
            : 0;

        // Classroom utilization avg
        $classroomUtils = $activeSy ? $this->resourceService->classroomUtilization($activeSy->id) : [];
        $classroomUtilPct = count($classroomUtils) > 0
            ? round(array_sum(array_column($classroomUtils, 'utilization_pct')) / count($classroomUtils), 1)
            : 0;

        // Enrollment trend (last 5 SYs)
        $enrollmentTrend = $this->enrollmentService->enrollmentTrendByYear();

        // Grade distribution
        $gradeDistribution = $activeSy
            ? $this->academicService->gradeDistribution($activeSy->id)
            : [];

        // Active alerts (unacknowledged)
        $activeAlerts = EarlyWarning::where('is_acknowledged', false)
            ->orderByRaw("FIELD(severity, 'critical', 'warning', 'info')")
            ->orderBy('triggered_at', 'desc')
            ->limit(10)
            ->get();

        // Recent recommendations
        $recentRecommendations = DssRecommendation::where('is_actioned', false)
            ->orderByRaw("FIELD(priority, 'high', 'medium', 'low')")
            ->orderBy('generated_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'kpi' => [
                'total_enrolled'              => $totalEnrolled,
                'enrolled_delta'              => $enrolledDelta,
                'enrolled_delta_pct'          => $enrolledDeltaPct,
                'promotion_rate'              => $promotionRate,
                'retention_rate'              => $retentionRate,
                'at_risk_count'               => $atRiskCount,
                'faculty_load_compliance_pct' => $facultyLoadCompliancePct,
                'classroom_utilization_pct'   => $classroomUtilPct,
            ],
            'enrollment_trend'       => $enrollmentTrend,
            'grade_distribution'     => $gradeDistribution,
            'active_alerts'          => $activeAlerts,
            'recent_recommendations' => $recentRecommendations,
            'active_school_year'     => $activeSy?->school_year,
        ]);
    }
}
