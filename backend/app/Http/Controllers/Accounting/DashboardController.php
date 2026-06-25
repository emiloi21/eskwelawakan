<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\StudentPayment;
use App\Models\StudentPaymentData;
use App\Models\AccountsAssessment;
use App\Models\AccountsCategory;
use App\Models\RefundRequest;
use App\Services\CacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $sy  = $request->query('schoolYear', '');
        $sem = $request->query('sem', '');

        $data = Cache::remember(
            CacheService::accountingDashboard($sy, $sem),
            CacheService::TTL_ACCOUNTING,
            function () use ($sy, $sem) {
                // Total collections for this SY/sem
                $collectionsQuery = StudentPayment::where('status', '!=', 'Voided');
                if ($sy) {
                    $collectionsQuery->where('schoolYear', $sy);
                }
                if ($sem) {
                    $collectionsQuery->where('semester', $sem);
                }
                $totalCollected   = (float) $collectionsQuery->sum('amt_paid');
                $transactionCount = $collectionsQuery->distinct('receipt_num')->count('receipt_num');

                // Today's collections
                $todayCollected = (float) StudentPayment::where('status', '!=', 'Voided')
                    ->where('trans_date', now()->toDateString())
                    ->sum('amt_paid');

                $todayTransactions = StudentPayment::where('status', '!=', 'Voided')
                    ->where('trans_date', now()->toDateString())
                    ->distinct('receipt_num')
                    ->count('receipt_num');

                // Outstanding balances (StudentAssessment has no semester column)
                $balQuery = StudentAssessment::query();
                if ($sy) {
                    $balQuery->where('schoolYear', $sy);
                }
                $totalPayable  = (float) (clone $balQuery)->sum('total_amt_payable');
                $totalPaid     = (float) (clone $balQuery)->sum('total_amt_paid');
                $totalBalance  = (float) (clone $balQuery)->sum('total_amt_bal');

                $studentsWithBalance = (clone $balQuery)->where('total_amt_bal', '>', 0)
                    ->distinct('reg_id')
                    ->count('reg_id');

                // Assessment count
                $assessmentQuery = AccountsAssessment::query();
                if ($sy) {
                    $assessmentQuery->where('schoolYear', $sy);
                }
                $totalAssessments = $assessmentQuery->count();

                // Category count
                $categoryQuery = AccountsCategory::query();
                if ($sy) {
                    $categoryQuery->where('schoolYear', $sy);
                }
                $totalCategories = $categoryQuery->count();

                // Pending refunds
                $pendingRefunds = RefundRequest::where('status', 'Pending')->count();

                // Collection by department
                $collByDept = StudentPayment::where('student_payments.status', '!=', 'Voided')
                    ->when($sy,  fn ($q) => $q->where('student_payments.schoolYear', $sy))
                    ->when($sem, fn ($q) => $q->where('student_payments.semester', $sem))
                    ->join('students', 'student_payments.reg_id', '=', 'students.reg_id')
                    ->select('students.dept', DB::raw('SUM(student_payments.amt_paid) as total'))
                    ->groupBy('students.dept')
                    ->get()
                    ->pluck('total', 'dept');

                // Recent transactions
                $recentTransactions = StudentPaymentData::with('student:reg_id,lname,fname')
                    ->where('status', 'Completed')
                    ->orderByDesc('pay_data_id')
                    ->limit(10)
                    ->get();

                return [
                    'stats' => [
                        'total_collected'       => $totalCollected,
                        'transaction_count'     => $transactionCount,
                        'today_collected'       => $todayCollected,
                        'today_transactions'    => $todayTransactions,
                        'total_payable'         => $totalPayable,
                        'total_paid'            => $totalPaid,
                        'total_balance'         => $totalBalance,
                        'students_with_balance' => $studentsWithBalance,
                        'total_assessments'     => $totalAssessments,
                        'total_categories'      => $totalCategories,
                        'pending_refunds'       => $pendingRefunds,
                    ],
                    'collection_by_dept'  => $collByDept,
                    'recent_transactions' => $recentTransactions,
                ];
            }
        );

        return response()->json(['data' => $data]);
    }
}
