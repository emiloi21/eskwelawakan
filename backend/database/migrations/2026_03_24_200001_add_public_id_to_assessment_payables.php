<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('assessment_payables', 'public_id')) {
            Schema::table('assessment_payables', function (Blueprint $t) {
                $t->string('public_id', 20)->nullable()->after('assess_payable_id');
            });
        }

        // Backfill existing rows
        $rows = DB::table('assessment_payables')->whereNull('public_id')->pluck('assess_payable_id');
        foreach ($rows as $id) {
            DB::table('assessment_payables')
                ->where('assess_payable_id', $id)
                ->update(['public_id' => strtolower(Str::random(20))]);
        }

        // Make unique
        try {
            Schema::table('assessment_payables', function (Blueprint $t) {
                $t->unique('public_id');
            });
        } catch (\Exception $e) {
            // Already unique
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('assessment_payables', 'public_id')) {
            Schema::table('assessment_payables', function (Blueprint $t) {
                $t->dropColumn('public_id');
            });
        }
    }
};
