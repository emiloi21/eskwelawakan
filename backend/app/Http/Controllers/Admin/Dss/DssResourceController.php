<?php

namespace App\Http\Controllers\Admin\Dss;

use App\Http\Controllers\Controller;
use App\Services\Dss\DssResourceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DssResourceController extends Controller
{
    public function __construct(
        private readonly DssResourceService $resourceService,
    ) {}

    public function facultyLoad(Request $request): JsonResponse
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        return response()->json(['data' => $this->resourceService->facultyLoadAnalysis($schoolYearId)]);
    }

    public function classroomUtilization(Request $request): JsonResponse
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        return response()->json(['data' => $this->resourceService->classroomUtilization($schoolYearId)]);
    }

    public function materialsInventory(Request $request): JsonResponse
    {
        $schoolYearId = (int) $request->query('school_year_id', $this->activeSchoolYearId());
        return response()->json(['data' => $this->resourceService->materialsInventory($schoolYearId)]);
    }

    private function activeSchoolYearId(): int
    {
        return (int) DB::table('school_years')->where('status', 'Active')->value('id');
    }
}
