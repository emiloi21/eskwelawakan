<?php

namespace App\Http\Controllers\Admin\Dss;

use App\Http\Controllers\Controller;
use App\Models\EarlyWarning;
use App\Models\DssRecommendation;
use App\Models\SchoolPreference;
use App\Services\Dss\DssEnrollmentService;
use App\Services\Dss\DssAcademicHealthService;
use App\Services\Dss\DssResourceService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class DssReportsController extends Controller
{
    public function __construct(
        private readonly DssEnrollmentService     $enrollmentService,
        private readonly DssAcademicHealthService $academicService,
        private readonly DssResourceService       $resourceService,
    ) {}

    public function enrollmentReport(Request $request): Response
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        $sy           = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');
        $data         = $this->enrollmentService->enrollmentByGradeLevel($schoolYearId);
        $trend        = $this->enrollmentService->enrollmentTrendByYear();
        $school       = SchoolPreference::first();

        $pdf = Pdf::loadView('dss.reports.enrollment', compact('data', 'trend', 'school', 'sy'))
                  ->setPaper('a4', 'portrait');

        return $pdf->download("enrollment-report-{$sy}.pdf");
    }

    public function promotionRetentionReport(Request $request): Response
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        $sy           = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');
        $data         = $this->academicService->promotionRetentionRates($schoolYearId);
        $school       = SchoolPreference::first();

        $pdf = Pdf::loadView('dss.reports.promotion-retention', compact('data', 'school', 'sy'))
                  ->setPaper('a4', 'portrait');

        return $pdf->download("promotion-retention-{$sy}.pdf");
    }

    public function atRiskReport(Request $request): Response
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        $sy           = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');
        $data         = $this->academicService->flagAtRiskStudents($schoolYearId)->values()->toArray();
        $school       = SchoolPreference::first();

        $pdf = Pdf::loadView('dss.reports.at-risk', compact('data', 'school', 'sy'))
                  ->setPaper('a4', 'portrait');

        return $pdf->download("at-risk-students-{$sy}.pdf");
    }

    public function facultyLoadReport(Request $request): Response
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        $sy           = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');
        $data         = $this->resourceService->facultyLoadAnalysis($schoolYearId);
        $school       = SchoolPreference::first();

        $pdf = Pdf::loadView('dss.reports.faculty-load', compact('data', 'school', 'sy'))
                  ->setPaper('a4', 'portrait');

        return $pdf->download("faculty-load-{$sy}.pdf");
    }

    public function classroomUtilizationReport(Request $request): Response
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        $sy           = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');
        $data         = $this->resourceService->classroomUtilization($schoolYearId);
        $school       = SchoolPreference::first();

        $pdf = Pdf::loadView('dss.reports.classroom-utilization', compact('data', 'school', 'sy'))
                  ->setPaper('a4', 'landscape');

        return $pdf->download("classroom-utilization-{$sy}.pdf");
    }

    public function materialsInventoryReport(Request $request): Response
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        $sy           = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');
        $data         = $this->resourceService->materialsInventory($schoolYearId);
        $school       = SchoolPreference::first();

        $pdf = Pdf::loadView('dss.reports.materials-inventory', compact('data', 'school', 'sy'))
                  ->setPaper('a4', 'portrait');

        return $pdf->download("materials-inventory-{$sy}.pdf");
    }

    public function warningsLogReport(Request $request): Response
    {
        $data   = EarlyWarning::orderBy('triggered_at', 'desc')->get();
        $school = SchoolPreference::first();

        $pdf = Pdf::loadView('dss.reports.warnings-log', compact('data', 'school'))
                  ->setPaper('a4', 'portrait');

        return $pdf->download('warnings-log.pdf');
    }

    public function recommendationsLogReport(Request $request): Response
    {
        $data   = DssRecommendation::orderBy('generated_at', 'desc')->get();
        $school = SchoolPreference::first();

        $pdf = Pdf::loadView('dss.reports.recommendations-log', compact('data', 'school'))
                  ->setPaper('a4', 'portrait');

        return $pdf->download('recommendations-log.pdf');
    }

    private function activeSchoolYearId(): int
    {
        return (int) DB::table('school_years')->where('status', 'Active')->value('id');
    }
}
