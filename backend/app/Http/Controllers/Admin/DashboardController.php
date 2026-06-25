<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\ClassModel;
use App\Models\StudentPayment;
use App\Models\User;
use App\Services\CacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $sy  = $request->query('sy', '');
        $sem = $request->query('sem', '');

        $data = Cache::remember(
            CacheService::adminDashboard($sy, $sem),
            CacheService::TTL_DASHBOARD,
            function () use ($sy, $sem) {
                $studentQuery = Student::query();
                $paymentQuery = StudentPayment::query();
                $classQuery   = ClassModel::query();

                if ($sy) {
                    $studentQuery->where('schoolYear', $sy);
                    $paymentQuery->where('schoolYear', $sy);
                    $classQuery->where('schoolYear', $sy);
                }
                if ($sem) {
                    $studentQuery->where('sem', $sem);
                    $paymentQuery->where('semester', $sem);
                    $classQuery->where('semester', $sem);
                }

                $totalStudents    = $studentQuery->count();
                $enrolledStudents = (clone $studentQuery)->where('status', 'Enrolled')->count();
                $totalClasses     = $classQuery->count();
                $totalUsers       = User::where('status', 'Active')->count();

                $totalPayments    = (clone $paymentQuery)->where('status', '!=', 'Void')->sum('amt_paid');
                $transactionCount = (clone $paymentQuery)->where('status', '!=', 'Void')->count();

                $byDepartment = Student::query()
                    ->when($sy, fn ($q) => $q->where('schoolYear', $sy))
                    ->when($sem, fn ($q) => $q->where('sem', $sem))
                    ->where('status', 'Enrolled')
                    ->selectRaw("CASE WHEN dept = 'Junior High' THEN 'Junior High School' ELSE dept END as dept, COUNT(*) as count")
                    ->groupBy(DB::raw("CASE WHEN dept = 'Junior High' THEN 'Junior High School' ELSE dept END"))
                    ->pluck('count', 'dept');

                $byStatus = Student::query()
                    ->when($sy, fn ($q) => $q->where('schoolYear', $sy))
                    ->when($sem, fn ($q) => $q->where('sem', $sem))
                    ->selectRaw('status, COUNT(*) as count')
                    ->groupBy('status')
                    ->pluck('count', 'status');

                return [
                    'stats' => [
                        'total_students'    => $totalStudents,
                        'enrolled_students' => $enrolledStudents,
                        'total_classes'     => $totalClasses,
                        'total_users'       => $totalUsers,
                        'total_payments'    => (float) $totalPayments,
                        'transaction_count' => $transactionCount,
                    ],
                    'by_department' => $byDepartment,
                    'by_status'     => $byStatus,
                ];
            }
        );

        return response()->json($data);
    }
}
