<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $tables = [
        'accounts_assessment_groups',
        'accounts_assessment_particulars',
    ];

    public function up(): void
    {
        // Step 1: Add nullable public_id column to each table
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && !Schema::hasColumn($table, 'public_id')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->string('public_id', 20)->nullable()->index();
                });
            }
        }

        // Step 2: Backfill existing rows
        foreach ($this->tables as $table) {
            if (!Schema::hasTable($table)) continue;

            $pk = DB::getSchemaBuilder()->getColumnListing($table)[0] ?? 'id';
            $rows = DB::table($table)->whereNull('public_id')->pluck($pk);

            foreach ($rows as $id) {
                $publicId = strtolower(Str::random(20));
                DB::table($table)->where($pk, $id)->update(['public_id' => $publicId]);
            }
        }

        // Step 3: Make the column unique
        foreach ($this->tables as $table) {
            if (!Schema::hasTable($table)) continue;
            if (!Schema::hasColumn($table, 'public_id')) continue;

            try {
                Schema::table($table, function (Blueprint $t) use ($table) {
                    $t->dropIndex("{$table}_public_id_index");
                    $t->unique('public_id');
                });
            } catch (\Exception $e) {
                // Index may not exist or already unique
            }
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'public_id')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropColumn('public_id');
                });
            }
        }
    }
};
