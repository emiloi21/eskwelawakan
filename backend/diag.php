<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$s = App\Models\Student::where('public_id','fx25dhjlznkdhowkxvl1')->first();
if (!$s) { echo "STUDENT NOT FOUND\n"; exit; }
echo "STUDENT: gradeLevel=[{$s->gradeLevel}] strand=[{$s->strand}] major=[{$s->major}] schoolYear=[{$s->schoolYear}]\n";

echo "\nALL ASSESSMENTS:\n";
$a = App\Models\AccountsAssessment::select('description','gradeLevel','strand','major','schoolYear')->get();
foreach ($a as $x) {
    echo "  [{$x->description}] gradeLevel=[{$x->gradeLevel}] strand=[{$x->strand}] major=[{$x->major}] schoolYear=[{$x->schoolYear}]\n";
}

echo "\nMATCH TEST (same gradeLevel+schoolYear, ignore strand/major):\n";
$matches = App\Models\AccountsAssessment::where('gradeLevel', $s->gradeLevel)
    ->where('schoolYear', $s->schoolYear)
    ->get();
echo "Found: " . $matches->count() . "\n";
foreach ($matches as $x) {
    echo "  [{$x->description}]\n";
}
