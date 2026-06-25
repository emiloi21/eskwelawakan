<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AccountsAssessment;
use App\Models\StudentPayment;
use App\Models\StudentPaymentData;
use App\Models\StudentAssessment;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Collection summary — daily/monthly totals.
     */
    public function collectionSummary(Request $request): JsonResponse
    {
        $request->validate([
            'date_from'  => ['required', 'date'],
            'date_to'    => ['required', 'date'],
            'schoolYear' => ['nullable', 'string'],
        ]);

        $query = StudentPayment::where('status', '!=', 'Voided')
            ->whereBetween('trans_date', [$request->date_from, $request->date_to]);

        if ($sy = $request->schoolYear) {
            $query->where('schoolYear', $sy);
        }

        $daily = (clone $query)
            ->select('trans_date', DB::raw('SUM(amt_paid) as total_collected'), DB::raw('COUNT(DISTINCT receipt_num) as transaction_count'))
            ->groupBy('trans_date')
            ->orderBy('trans_date')
            ->get();

        $grandTotal = (clone $query)->sum('amt_paid');
        $totalTransactions = (clone $query)->distinct('receipt_num')->count('receipt_num');

        return response()->json([
            'data' => [
                'daily'              => $daily,
                'grand_total'        => (float) $grandTotal,
                'total_transactions' => $totalTransactions,
            ],
        ]);
    }

    /**
     * Collection by category.
     */
    public function categorySummary(Request $request): JsonResponse
    {
        $request->validate([
            'date_from'  => ['required', 'date'],
            'date_to'    => ['required', 'date'],
            'schoolYear' => ['nullable', 'string'],
        ]);

        $query = StudentPayment::where('status', '!=', 'Voided')
            ->whereBetween('trans_date', [$request->date_from, $request->date_to]);

        if ($sy = $request->schoolYear) {
            $query->where('schoolYear', $sy);
        }

        $summary = $query
            ->join('accounts_categories', 'student_payments.category_id', '=', 'accounts_categories.category_id')
            ->select(
                'accounts_categories.category_id',
                'accounts_categories.description as category_name',
                DB::raw('SUM(student_payments.amt_paid) as total_collected'),
                DB::raw('COUNT(*) as payment_count')
            )
            ->groupBy('accounts_categories.category_id', 'accounts_categories.description')
            ->orderByDesc('total_collected')
            ->get();

        return response()->json(['data' => $summary]);
    }

    /**
     * Collection by particular.
     */
    public function particularSummary(Request $request): JsonResponse
    {
        $request->validate([
            'date_from'  => ['required', 'date'],
            'date_to'    => ['required', 'date'],
            'schoolYear' => ['nullable', 'string'],
        ]);

        $query = StudentPayment::where('student_payments.status', '!=', 'Voided')
            ->whereBetween('trans_date', [$request->date_from, $request->date_to]);

        if ($sy = $request->schoolYear) {
            $query->where('student_payments.schoolYear', $sy);
        }

        $summary = $query
            ->join('accounts_particulars', 'student_payments.particular_id', '=', 'accounts_particulars.particular_id')
            ->select(
                'accounts_particulars.particular_id',
                'accounts_particulars.description as particular_name',
                'accounts_particulars.account_code',
                'accounts_particulars.account_group',
                DB::raw('SUM(student_payments.amt_paid) as total_collected'),
                DB::raw('COUNT(*) as payment_count')
            )
            ->groupBy('accounts_particulars.particular_id', 'accounts_particulars.description',
                'accounts_particulars.account_code', 'accounts_particulars.account_group')
            ->orderBy('accounts_particulars.account_group')
            ->orderByDesc('total_collected')
            ->get();

        return response()->json(['data' => $summary]);
    }

    /**
     * End-of-School-Year summary.
     */
    public function eosySummary(Request $request): JsonResponse
    {
        $sy = $request->validate(['schoolYear' => ['required', 'string']])['schoolYear'];

        $enrolled = Student::where('schoolYear', $sy)->where('status', 'Enrolled')->count();
        $withBalance = StudentAssessment::where('schoolYear', $sy)
            ->where('total_amt_bal', '>', 0)
            ->distinct('reg_id')
            ->count('reg_id');

        $totalPayable = StudentAssessment::where('schoolYear', $sy)->sum('total_amt_payable');
        $totalPaid = StudentAssessment::where('schoolYear', $sy)->sum('total_amt_paid');
        $totalDiscount = StudentAssessment::where('schoolYear', $sy)->sum('total_amt_discount');
        $totalBalance = StudentAssessment::where('schoolYear', $sy)->sum('total_amt_bal');

        $collectedTotal = StudentPayment::where('schoolYear', $sy)
            ->where('status', '!=', 'Voided')
            ->sum('amt_paid');

        return response()->json([
            'data' => [
                'school_year'      => $sy,
                'enrolled_count'   => $enrolled,
                'with_balance'     => $withBalance,
                'total_payable'    => (float) $totalPayable,
                'total_paid'       => (float) $totalPaid,
                'total_discount'   => (float) $totalDiscount,
                'total_balance'    => (float) $totalBalance,
                'total_collected'  => (float) $collectedTotal,
                'collection_rate'  => $totalPayable > 0 ? round(($totalPaid / $totalPayable) * 100, 2) : 0,
            ],
        ]);
    }

    /**
     * Exam permit data — students who meet payment threshold.
     */
    public function examPermits(Request $request): JsonResponse
    {
        $request->validate([
            'schoolYear' => ['required', 'string'],
            'dept'       => ['nullable', 'string'],
            'gradeLevel' => ['nullable', 'string'],
        ]);

        $query = Student::where('schoolYear', $request->schoolYear)
            ->where('status', 'Enrolled');

        if ($dept = $request->dept) {
            $query->where('dept', $dept);
        }
        if ($grade = $request->gradeLevel) {
            $query->where('gradeLevel', $grade);
        }

        $students = $query->select('reg_id', 'student_id', 'lname', 'fname', 'mname', 'dept', 'gradeLevel', 'strand', 'section')
            ->get();

        $students->each(function ($student) {
            $totals = StudentAssessment::where('reg_id', $student->reg_id)
                ->selectRaw('SUM(total_amt_payable) as payable, SUM(total_amt_paid) as paid, SUM(total_amt_bal) as balance')
                ->first();
            $student->total_payable = (float) ($totals->payable ?? 0);
            $student->total_paid = (float) ($totals->paid ?? 0);
            $student->total_balance = (float) ($totals->balance ?? 0);
            $student->payment_percentage = $student->total_payable > 0
                ? round(($student->total_paid / $student->total_payable) * 100, 2) : 0;
        });

        return response()->json(['data' => $students]);
    }

    /**
     * Exam Assessment — per-class clearance status for exam clearing.
     */
    public function examAssessment(Request $request): JsonResponse
    {
        $request->validate([
            'schoolYear' => ['required', 'string'],
            'dept'       => ['nullable', 'string'],
            'gradeLevel' => ['nullable', 'string'],
            'section'    => ['nullable', 'string'],
        ]);

        $query = Student::where('schoolYear', $request->schoolYear)->where('status', 'Enrolled');
        if ($dept = $request->dept) $query->where('dept', $dept);
        if ($grade = $request->gradeLevel) $query->where('gradeLevel', $grade);
        if ($section = $request->section) $query->where('section', $section);

        $students = $query->select('reg_id', 'student_id', 'lname', 'fname', 'gradeLevel', 'section')
            ->orderBy('lname')->get();

        $students->each(function ($s) {
            $totals = StudentAssessment::where('reg_id', $s->reg_id)
                ->selectRaw('SUM(total_amt_payable) as payable, SUM(total_amt_paid) as paid, SUM(total_amt_bal) as balance')
                ->first();
            $s->total_payable = (float) ($totals->payable ?? 0);
            $s->total_paid = (float) ($totals->paid ?? 0);
            $s->total_balance = (float) ($totals->balance ?? 0);
            $s->cleared = ((float) ($totals->balance ?? 0)) <= 0;
        });

        return response()->json(['data' => $students]);
    }

    /**
     * Transaction List — detailed list with date range.
     */
    public function transactionList(Request $request): JsonResponse
    {
        $request->validate([
            'date_from'  => ['required', 'date'],
            'date_to'    => ['required', 'date'],
            'schoolYear' => ['nullable', 'string'],
        ]);

        $query = StudentPaymentData::with('student:reg_id,lname,fname,mname,student_id')
            ->whereBetween('entry_date', [$request->date_from, $request->date_to]);

        if ($sy = $request->schoolYear) $query->where('schoolYear', $sy);

        $transactions = $query->orderBy('entry_date')->orderBy('receipt_num')->get();

        return response()->json(['data' => $transactions]);
    }

    /**
     * NS Collection Summary — non-student fee collection totals.
     */
    public function nsCollectionSummary(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => ['required', 'date'],
            'date_to'   => ['required', 'date'],
        ]);

        $query = StudentPayment::where('payment_type', 'Non-Student Fee')
            ->where('status', '!=', 'Voided')
            ->whereBetween('trans_date', [$request->date_from, $request->date_to]);

        $daily = (clone $query)
            ->select('trans_date', DB::raw('SUM(amt_paid) as total_collected'), DB::raw('COUNT(DISTINCT receipt_num) as transaction_count'))
            ->groupBy('trans_date')
            ->orderBy('trans_date')
            ->get();

        $grandTotal = (clone $query)->sum('amt_paid');

        return response()->json([
            'data' => [
                'daily'       => $daily,
                'grand_total' => (float) $grandTotal,
            ],
        ]);
    }

    /**
     * Monthly Assessment — installment tracked per student.
     */
    public function monthlyAssessment(Request $request): JsonResponse
    {
        $request->validate([
            'schoolYear' => ['required', 'string'],
            'dept'       => ['nullable', 'string'],
            'gradeLevel' => ['nullable', 'string'],
        ]);

        $query = Student::where('schoolYear', $request->schoolYear)->where('status', 'Enrolled');
        if ($dept = $request->dept) $query->where('dept', $dept);
        if ($grade = $request->gradeLevel) $query->where('gradeLevel', $grade);

        $students = $query->select('reg_id', 'student_id', 'lname', 'fname', 'gradeLevel', 'section')
            ->orderBy('lname')->get();

        $students->each(function ($s) {
            $s->assessments = StudentAssessment::where('reg_id', $s->reg_id)
                ->select('category_id', 'particular_id', 'total_amt_payable', 'total_amt_paid', 'total_amt_bal', 'total_amt_discount')
                ->get();
        });

        return response()->json(['data' => $students]);
    }

    /**
     * Student List by Assessment — students grouped by assessment profile.
     */
    public function studentsByAssessment(Request $request): JsonResponse
    {
        $request->validate([
            'schoolYear'    => ['required', 'string'],
            'assessment_id' => ['nullable', 'integer'],
        ]);

        $query = Student::where('schoolYear', $request->schoolYear)->where('status', 'Enrolled');

        if ($assessId = $request->assessment_id) {
            $regIds = StudentAssessment::where('assessment_id', $assessId)->distinct()->pluck('reg_id');
            $query->whereIn('reg_id', $regIds);
        }

        $students = $query->select('reg_id', 'student_id', 'lname', 'fname', 'mname', 'dept', 'gradeLevel', 'strand', 'section', 'assessment_id')
            ->orderBy('lname')->get();

        $assessments = AccountsAssessment::where('schoolYear', $request->schoolYear)->get(['assessment_id', 'description']);

        return response()->json([
            'data' => [
                'students'    => $students,
                'assessments' => $assessments,
            ],
        ]);
    }

    /**
     * Balance Aging Report — outstanding balances bucketed by days enrolled.
     * Aging is measured from the student's record creation date (enrollment proxy).
     * Buckets: current (0–30d), 31–60d, 61–90d, 90+d
     */
    public function balanceAging(Request $request): JsonResponse
    {
        $request->validate([
            'schoolYear' => ['required', 'string'],
            'dept'       => ['nullable', 'string'],
        ]);

        $query = Student::where('students.schoolYear', $request->schoolYear)
            ->whereIn('students.status', ['Enrolled', 'For Payment', 'For Accounts Assessment'])
            ->join('student_assessments', 'students.reg_id', '=', 'student_assessments.reg_id')
            ->select(
                'students.reg_id',
                'students.student_id',
                'students.lname',
                'students.fname',
                'students.dept',
                'students.gradeLevel',
                'students.section',
                'students.status',
                'students.created_at',
                DB::raw('SUM(student_assessments.total_amt_payable) as total_payable'),
                DB::raw('SUM(student_assessments.total_amt_paid) as total_paid'),
                DB::raw('SUM(student_assessments.total_amt_discount) as total_discount'),
                DB::raw('SUM(student_assessments.total_amt_bal) as total_balance'),
                DB::raw('DATEDIFF(NOW(), students.created_at) as days_aged')
            )
            ->groupBy(
                'students.reg_id', 'students.student_id', 'students.lname', 'students.fname',
                'students.dept', 'students.gradeLevel', 'students.section', 'students.status',
                'students.created_at'
            )
            ->having('total_balance', '>', 0);

        if ($dept = $request->dept) {
            $query->where('students.dept', $dept);
        }

        $rows = $query->orderByDesc('total_balance')->get();

        // Bucket summary
        $buckets = [
            'current'  => ['label' => '0–30 days',  'count' => 0, 'total' => 0.0],
            '31_60'    => ['label' => '31–60 days', 'count' => 0, 'total' => 0.0],
            '61_90'    => ['label' => '61–90 days', 'count' => 0, 'total' => 0.0],
            'over_90'  => ['label' => '90+ days',   'count' => 0, 'total' => 0.0],
        ];

        foreach ($rows as $row) {
            $days = (int) $row->days_aged;
            $bal  = (float) $row->total_balance;
            if ($days <= 30) {
                $key = 'current';
            } elseif ($days <= 60) {
                $key = '31_60';
            } elseif ($days <= 90) {
                $key = '61_90';
            } else {
                $key = 'over_90';
            }
            $buckets[$key]['count']++;
            $buckets[$key]['total'] += $bal;
            $row->bucket = $key;
        }

        return response()->json([
            'data' => [
                'rows'         => $rows,
                'buckets'      => array_values($buckets),
                'grand_total'  => round($rows->sum('total_balance'), 2),
                'total_count'  => $rows->count(),
            ],
        ]);
    }

    /**
     * Collection Trend — monthly collected vs total assessed for a school year.
     * Useful for revenue vs target comparison charts.
     */
    public function collectionTrend(Request $request): JsonResponse
    {
        $request->validate([
            'schoolYear' => ['required', 'string'],
        ]);

        $sy = $request->schoolYear;

        // Total assessed for this SY (the "target" / budget line)
        $totalAssessed  = (float) StudentAssessment::where('schoolYear', $sy)->sum('total_amt_payable');
        $totalDiscount  = (float) StudentAssessment::where('schoolYear', $sy)->sum('total_amt_discount');
        $netTarget      = max(0.0, $totalAssessed - $totalDiscount);

        // Monthly collected
        $monthly = StudentPayment::where('schoolYear', $sy)
            ->where('status', '!=', 'Voided')
            ->select(
                DB::raw('MONTH(trans_date) as month_num'),
                DB::raw('YEAR(trans_date) as year_num'),
                DB::raw('SUM(amt_paid) as collected')
            )
            ->groupBy('year_num', 'month_num')
            ->orderBy('year_num')
            ->orderBy('month_num')
            ->get()
            ->keyBy('month_num');

        $months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        $result = collect(range(1, 12))->map(function ($n) use ($months, $monthly) {
            return [
                'month'     => $months[$n - 1],
                'month_num' => $n,
                'collected' => (float) ($monthly->get($n)->collected ?? 0),
            ];
        });

        // Cumulative totals
        $cumulative = 0.0;
        $result = $result->map(function ($row) use (&$cumulative) {
            $cumulative += $row['collected'];
            $row['cumulative'] = round($cumulative, 2);
            return $row;
        });

        return response()->json([
            'data' => [
                'monthly'       => $result->values(),
                'total_assessed' => $totalAssessed,
                'net_target'     => $netTarget,
                'total_collected'=> round($result->sum('collected'), 2),
                'collection_rate'=> $netTarget > 0 ? round(($result->sum('collected') / $netTarget) * 100, 2) : 0,
            ],
        ]);
    }
}
