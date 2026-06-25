<?php

namespace App\Http\Controllers;

use App\Models\SchoolYear;
use App\Models\SchoolPreference;
use App\Services\CacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class LookupController extends Controller
{
    /**
     * Return shared lookups available to all authenticated users.
     * Cached — invalidated whenever school years or preferences change.
     */
    public function index(): JsonResponse
    {
        $data = Cache::remember(CacheService::lookups(), CacheService::TTL_LOOKUPS, function () {
            $schoolYears = SchoolYear::orderByDesc('school_year')->pluck('school_year');
            $prefs = SchoolPreference::first();

            return [
                'school_years'       => $schoolYears,
                'active_school_year' => $prefs?->activeSchoolYear,
                'active_semester'    => $prefs?->activeSemester,
            ];
        });

        return response()->json(['data' => $data]);
    }
}
