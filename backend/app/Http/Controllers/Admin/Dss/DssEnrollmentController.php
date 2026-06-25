<?php

namespace App\Http\Controllers\Admin\Dss;

use App\Http\Controllers\Controller;
use App\Models\SchoolYear;
use App\Services\Dss\DssEnrollmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DssEnrollmentController extends Controller
{
    public function __construct(
        private readonly DssEnrollmentService $enrollmentService,
    ) {}

    public function summary(Request $request): JsonResponse
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        $sy           = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');

        $total = $sy
            ? DB::table('students')->where('schoolYear', $sy)->whereIn('status', ['Enrolled', 'Active'])->count()
            : 0;

        return response()->json([
            'school_year_id' => $schoolYearId,
            'school_year'    => $sy,
            'total_enrolled' => $total,
        ]);
    }

    public function trends(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->enrollmentService->enrollmentTrendByYear()]);
    }

    public function gradeBreakdown(Request $request): JsonResponse
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        return response()->json(['data' => $this->enrollmentService->enrollmentByGradeLevel($schoolYearId)]);
    }

    public function sectionFillRates(Request $request): JsonResponse
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        return response()->json(['data' => $this->enrollmentService->sectionFillRates($schoolYearId)]);
    }

    public function projection(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->enrollmentService->enrollmentProjection()]);
    }

    private function activeSchoolYearId(): int
    {
        return (int) DB::table('school_years')->where('status', 'Active')->value('id');
    }
}
