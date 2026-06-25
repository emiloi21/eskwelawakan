<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$r = DB::table('accounts_categories')
    ->select('description', 'coa_id', DB::raw('count(*) as cnt'))
    ->groupBy('description', 'coa_id')
    ->get();
echo json_encode($r);

echo "\n\nRevenue accounts: ";
$rev = DB::table('chart_of_accounts')
    ->where('account_type', 'Revenue')
    ->whereNotNull('parent_id')
    ->select('coa_id', 'account_name')
    ->get();
echo json_encode($rev);
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

// Students per school year
$counts = DB::table('students')
    ->select('schoolYear', DB::raw('count(*) as total'), DB::raw('min(reg_id) as min_id'), DB::raw('max(reg_id) as max_id'))
    ->groupBy('schoolYear')
    ->orderBy('schoolYear', 'desc')
    ->get();
echo "=== Students per School Year ===\n";
foreach ($counts as $c) echo "  {$c->schoolYear}: {$c->total}  (reg_id range: {$c->min_id} – {$c->max_id})\n";

// Created_at distribution — shows when seeder batches ran
echo "\n=== Creation date distribution ===\n";
$dates = DB::table('students')
    ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as cnt'))
    ->groupBy(DB::raw('DATE(created_at)'))
    ->orderBy('date')
    ->get();
foreach ($dates as $d) echo "  {$d->date}: {$d->cnt} records\n";

// Any lrn duplicates across all SYs (same student re-enrolled)?
$lrnDups = DB::table('students')
    ->select('lrn', DB::raw('count(*) as cnt'), DB::raw('count(distinct schoolYear) as sy_count'),
             DB::raw('group_concat(schoolYear order by schoolYear separator \',\') as sys'))
    ->groupBy('lrn')
    ->having('cnt', '>', 1)
    ->orderBy('cnt', 'desc')
    ->limit(5)
    ->get();
echo "\n=== Same LRN appearing in multiple SYs (legitimate re-enrollment, top 5) ===\n";
foreach ($lrnDups as $d) echo "  LRN={$d->lrn} appears {$d->cnt} times in SYs: {$d->sys}\n";
echo "Total LRNs in >1 SY: " . DB::table('students')->select('lrn')->groupBy('lrn')->havingRaw('count(*) > 1')->get()->count() . "\n";

// Break down one SY by created_at to see multiple insert batches
echo "\n=== SY 2025-2026 — reg_id gaps (seeder batch boundary) ===\n";
$ids = DB::table('students')->where('schoolYear', '2025-2026')
    ->orderBy('reg_id')->pluck('reg_id')->toArray();
$gaps = [];
for ($i = 1; $i < count($ids); $i++) {
    $gap = $ids[$i] - $ids[$i-1];
    if ($gap > 100) $gaps[] = "gap={$gap} after reg_id={$ids[$i-1]} (next={$ids[$i]})";
}
echo "Large gaps in reg_id sequence:\n";
foreach (array_slice($gaps, 0, 10) as $g) echo "  {$g}\n";
echo "Total students in 2025-2026: " . count($ids) . "\n";


use Illuminate\Support\Facades\DB;

// Students per school year
$counts = DB::table('students')
    ->select('schoolYear', DB::raw('count(*) as total'))
    ->groupBy('schoolYear')
    ->orderBy('schoolYear', 'desc')
    ->get();
echo "=== Students per School Year ===\n";
foreach ($counts as $c) echo "  {$c->schoolYear}: {$c->total}\n";

// LRN + schoolYear duplicates
$dups = DB::table('students')
    ->select('lrn', 'schoolYear', DB::raw('count(*) as cnt'))
    ->groupBy('lrn', 'schoolYear')
    ->havingRaw('count(*) > 1')
    ->orderBy('cnt', 'desc')
    ->limit(10)
    ->get();
$totalDupGroups = DB::table('students')
    ->select('lrn', 'schoolYear', DB::raw('count(*) as cnt'))
    ->groupBy('lrn', 'schoolYear')
    ->havingRaw('count(*) > 1')
    ->get()
    ->count();
echo "\n=== LRN+SY duplicate groups (top 10) ===\n";
foreach ($dups as $d) echo "  LRN={$d->lrn} SY={$d->schoolYear} count={$d->cnt}\n";
echo "Total LRN+SY dup groups: {$totalDupGroups}\n";

// How many total excess rows?
$excess = DB::table('students')
    ->select('lrn', 'schoolYear', DB::raw('count(*) - 1 as excess'))
    ->groupBy('lrn', 'schoolYear')
    ->havingRaw('count(*) > 1')
    ->get()
    ->sum('excess');
echo "Total excess rows to delete: {$excess}\n";

// Sample a duplicate to see what differs
if ($dups->isNotEmpty()) {
    $sample = $dups->first();
    $rows = DB::table('students')
        ->where('lrn', $sample->lrn)
        ->where('schoolYear', $sample->schoolYear)
        ->orderBy('reg_id')
        ->get(['reg_id', 'student_id', 'lname', 'fname', 'schoolYear', 'status', 'created_at']);
    echo "\n=== Sample duplicate rows (LRN={$sample->lrn} SY={$sample->schoolYear}) ===\n";
    foreach ($rows as $r) {
        echo "  reg_id={$r->reg_id} student_id={$r->student_id} name={$r->lname},{$r->fname} status={$r->status} created={$r->created_at}\n";
    }
}
