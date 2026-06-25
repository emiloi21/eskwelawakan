<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$parStats = DB::table('student_assessments')
    ->select('par_stat', DB::raw('count(*) as cnt'))
    ->groupBy('par_stat')
    ->get();

$sampleReg3 = DB::table('student_assessments')
    ->where('reg_id', 3)
    ->select('stud_assess_id','category_id','particular_id','par_stat','total_amt_payable','total_amt_paid','total_amt_bal','schoolYear')
    ->limit(5)->get();

// Paying students - check their assessments
$payingStudents = DB::table('student_payments')->select('reg_id')->groupBy('reg_id')->limit(5)->pluck('reg_id');
$payingAssessments = DB::table('student_assessments')
    ->whereIn('reg_id', $payingStudents)
    ->selectRaw('reg_id, SUM(total_amt_paid) as total_paid, SUM(total_amt_payable) as total_payable')
    ->groupBy('reg_id')
    ->get();

// Check if any paying students have assessments with par_stat != Active
$inactivePayingAssessments = DB::table('student_assessments')
    ->whereIn('reg_id', DB::table('student_payments')->select('reg_id')->groupBy('reg_id'))
    ->where('par_stat', '!=', 'Active')
    ->count();

// Students with payments but zero in assessments
$mismatch = DB::select("
    SELECT sp.reg_id, sp.amt_paid as sp_paid, COALESCE(sa.total_amt_paid,0) as sa_paid
    FROM (SELECT reg_id, SUM(amt_paid) as amt_paid FROM student_payments GROUP BY reg_id) sp
    LEFT JOIN (SELECT reg_id, SUM(total_amt_paid) as total_amt_paid FROM student_assessments WHERE par_stat='Active' GROUP BY reg_id) sa ON sa.reg_id = sp.reg_id
    WHERE ABS(sp.amt_paid - COALESCE(sa.total_amt_paid,0)) > 0.01
    LIMIT 5
");

echo json_encode([
    'par_stats' => $parStats,
    'sample_reg3' => $sampleReg3,
    'paying_assessments_sample' => $payingAssessments,
    'inactive_paying_assessments' => $inactivePayingAssessments,
    'mismatch_sample' => $mismatch,
], JSON_PRETTY_PRINT);
