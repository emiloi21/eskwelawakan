<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Find all accounts-related tables
$tables = DB::select("SHOW TABLES");
$accountsTables = array_filter(array_map(fn($t) => array_values((array)$t)[0], $tables), fn($t) => str_contains($t, 'account'));
echo "=== Accounts tables ===\n";
foreach ($accountsTables as $t) {
    $cols = Schema::getColumnListing($t);
    $cnt = DB::table($t)->count();
    echo "  $t (rows=$cnt): " . implode(', ', array_slice($cols, 0, 8)) . "\n";
}

echo "\n=== particular_id ranges ===\n";
foreach (['accounts_particulars', 'accounts_cat_particulars', 'accounts_assessment_particulars'] as $t) {
    if (Schema::hasTable($t)) {
        $min = DB::table($t)->min('particular_id');
        $max = DB::table($t)->max('particular_id');
        $cnt = DB::table($t)->count();
        echo "  $t: min=$min, max=$max, count=$cnt\n";
    } else {
        echo "  $t: TABLE NOT FOUND\n";
    }
}

echo "\n=== student_assessments particular_id range ===\n";
$saMin = DB::table('student_assessments')->min('particular_id');
$saMax = DB::table('student_assessments')->max('particular_id');
echo "  min=$saMin, max=$saMax\n";

echo "\n=== Sample mock student assessment + its particular in both tables ===\n";
$mockAssess = DB::table('student_assessments')->where('category_id', 0)->where('total_amt_paid', '>', 0)->select('reg_id','category_id','particular_id','total_amt_paid','schoolYear')->first();
if ($mockAssess) {
    echo "  Mock assessment (cat_id=0, paid>0): " . json_encode($mockAssess) . "\n";
    
    // Check in accounts_particulars
    if (Schema::hasTable('accounts_particulars')) {
        $inAccP = DB::table('accounts_particulars')->where('particular_id', $mockAssess->particular_id)->first();
        echo "  In accounts_particulars: " . ($inAccP ? json_encode($inAccP) : 'NOT FOUND') . "\n";
    }
    
    // Check in accounts_cat_particulars
    if (Schema::hasTable('accounts_cat_particulars')) {
        $inCatP = DB::table('accounts_cat_particulars')->where('particular_id', $mockAssess->particular_id)->first();
        echo "  In accounts_cat_particulars: " . ($inCatP ? json_encode($inCatP) : 'NOT FOUND') . "\n";
    }
    
    // Check in accounts_assessment_particulars 
    if (Schema::hasTable('accounts_assessment_particulars')) {
        $inAssP = DB::table('accounts_assessment_particulars')->where('particular_id', $mockAssess->particular_id)->first();
        echo "  In accounts_assessment_particulars: " . ($inAssP ? json_encode($inAssP) : 'NOT FOUND') . "\n";
    }
}

echo "\n=== Sample non-mock student assessment ===\n";
$normalAssess = DB::table('student_assessments')->where('category_id', '!=', 0)->where('total_amt_paid', '>', 0)->select('reg_id','category_id','particular_id','total_amt_paid','schoolYear')->first();
if ($normalAssess) {
    echo "  Normal assessment: " . json_encode($normalAssess) . "\n";
    if (Schema::hasTable('accounts_particulars')) {
        $inAccP = DB::table('accounts_particulars')->where('particular_id', $normalAssess->particular_id)->first();
        echo "  In accounts_particulars: " . ($inAccP ? json_encode((array)$inAccP) : 'NOT FOUND') . "\n";
    }
    if (Schema::hasTable('accounts_cat_particulars')) {
        $inCatP = DB::table('accounts_cat_particulars')->where('particular_id', $normalAssess->particular_id)->first();
        $cols = $inCatP ? array_slice((array)$inCatP, 0, 5) : null;
        echo "  In accounts_cat_particulars: " . ($inCatP ? json_encode($cols) : 'NOT FOUND') . "\n";
    }
}
