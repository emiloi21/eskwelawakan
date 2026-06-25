<?php

namespace App\Http\Controllers\Registrar;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\StudentPayment;
use App\Services\CacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    /**
     * Enrollment trend — total & enrolled student counts per school year.
     * Returns the most recent (up to) 6 school years, sorted oldest → newest.
     *
     * GET /registrar/analytics/enrollment-trend
     */
    public function enrollmentTrend(Request $request): JsonResponse
    {
        $dept = $request->query('dept');

        $trend = Cache::remember(
            CacheService::analyticsTrend($dept),
            CacheService::TTL_ANALYTICS,
            function () use ($dept) {
                $rawTotal = Student::query()
                    ->when($dept, fn ($q) => $q->where('dept', $dept))
                    ->selectRaw('schoolYear, COUNT(*) as total')
                    ->groupBy('schoolYear')
                    ->pluck('total', 'schoolYear');

                $rawEnrolled = Student::query()
                    ->when($dept, fn ($q) => $q->where('dept', $dept))
                    ->where('status', 'Enrolled')
                    ->selectRaw('schoolYear, COUNT(*) as enrolled')
                    ->groupBy('schoolYear')
                    ->pluck('enrolled', 'schoolYear');

                $allSYs = $rawTotal->keys()
                    ->union($rawEnrolled->keys())
                    ->unique()
                    ->sortBy(fn ($sy) => (int) explode('-', $sy)[0])
                    ->values()
                    ->take(-6);

                return $allSYs->map(fn ($sy) => [
                    'school_year' => $sy,
                    'total'       => (int) ($rawTotal[$sy] ?? 0),
                    'enrolled'    => (int) ($rawEnrolled[$sy] ?? 0),
                ])->values();
            }
        );

        return response()->json(['data' => $trend]);
    }

    /**
     * Monthly payment collection for a given school year.
     * Returns 12 months Jan–Dec with collected amounts.
     *
     * GET /registrar/analytics/payment-by-month?school_year=2024-2025
     */
    public function paymentByMonth(Request $request): JsonResponse
    {
        $sy  = $request->query('school_year', '');
        $sem = $request->query('sem', '');

        $data = Cache::remember(
            CacheService::analyticsPayment($sy, $sem),
            CacheService::TTL_ANALYTICS,
            function () use ($sy, $sem) {
                $rows = StudentPayment::where('status', '!=', 'Void')
                    ->when($sy,  fn ($q) => $q->where('schoolYear', $sy))
                    ->when($sem, fn ($q) => $q->where('semester', $sem))
                    ->selectRaw('MONTH(trans_date) as month_num, SUM(amt_paid) as total')
                    ->groupBy('month_num')
                    ->orderBy('month_num')
                    ->get()
                    ->keyBy('month_num');

                $monthNames = [
                    1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr',
                    5 => 'May', 6 => 'Jun', 7 => 'Jul', 8 => 'Aug',
                    9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dec',
                ];

                return collect(range(1, 12))->map(fn ($m) => [
                    'month'     => $monthNames[$m],
                    'month_num' => $m,
                    'total'     => (float) ($rows[$m]?->total ?? 0),
                ]);
            }
        );

        return response()->json(['data' => $data]);
    }

    /**
     * Balance summary — total assessed, collected, outstanding for a given SY.
     *
     * GET /registrar/analytics/balance-summary?school_year=2024-2025&dept=...
     */
    public function balanceSummary(Request $request): JsonResponse
    {
        $sy   = $request->query('school_year', '');
        $dept = $request->query('dept');
        $sem  = $request->query('sem', '');

        $data = Cache::remember(
            CacheService::analyticsBalance($sy, $dept, $sem),
            CacheService::TTL_ANALYTICS,
            function () use ($sy, $dept, $sem) {
                $query = StudentAssessment::query()
                    ->join('students', 'student_assessments.reg_id', '=', 'students.reg_id')
                    ->when($sy,   fn ($q) => $q->where('students.schoolYear', $sy))
                    ->when($sem,  fn ($q) => $q->where('students.sem', $sem))
                    ->when($dept, fn ($q) => $q->where('students.dept', $dept))
                    ->where('student_assessments.par_stat', 'Active');

                $totals = $query->selectRaw(
                    'SUM(total_amt_payable) as total_assessed,
                     SUM(total_amt_discount) as total_discount,
                     SUM(total_amt_paid) as total_collected'
                )->first();

                $assessed       = (float) ($totals->total_assessed  ?? 0);
                $discount       = (float) ($totals->total_discount  ?? 0);
                $collected      = (float) ($totals->total_collected ?? 0);
                $outstanding    = max(0, $assessed - $discount - $collected);
                $collectionRate = $assessed > 0
                    ? round(($collected / ($assessed - $discount)) * 100, 1)
                    : 0;

                return [
                    'total_assessed'  => $assessed,
                    'total_discount'  => $discount,
                    'total_collected' => $collected,
                    'outstanding'     => $outstanding,
                    'collection_rate' => $collectionRate,
                ];
            }
        );

        return response()->json(['data' => $data]);
    }

    /**
     * Status breakdown for a given school year — count per enrollment status.
     *
     * GET /registrar/analytics/status-breakdown?school_year=2024-2025
     */
    public function statusBreakdown(Request $request): JsonResponse
    {
        $sy   = $request->query('school_year', '');
        $dept = $request->query('dept');
        $sem  = $request->query('sem', '');

        $rows = Cache::remember(
            CacheService::analyticsStatus($sy, $dept, $sem),
            CacheService::TTL_ANALYTICS,
            function () use ($sy, $dept, $sem) {
                return Student::query()
                    ->when($sy,   fn ($q) => $q->where('schoolYear', $sy))
                    ->when($sem,  fn ($q) => $q->where('sem', $sem))
                    ->when($dept, fn ($q) => $q->where('dept', $dept))
                    ->selectRaw('status, COUNT(*) as count')
                    ->groupBy('status')
                    ->orderByDesc('count')
                    ->get()
                    ->map(fn ($r) => [
                        'status' => $r->status,
                        'count'  => (int) $r->count,
                    ])
                    ->values();
            }
        );

        return response()->json(['data' => $rows]);
    }
}
