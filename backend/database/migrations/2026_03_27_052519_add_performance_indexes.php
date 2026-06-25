<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // grades — new table, add search indexes
        Schema::table('grades', function (Blueprint $table) {
            $table->index('reg_id', 'idx_grades_reg_id');
            $table->index('school_year', 'idx_grades_sy');
        });

        // attendance — new table, add search indexes
        Schema::table('attendance', function (Blueprint $table) {
            $table->index('reg_id', 'idx_attendance_reg_id');
            $table->index('date', 'idx_attendance_date');
        });

        // classes — add adviser_id for teacher portal queries (schoolYear/dept already exist)
        Schema::table('classes', function (Blueprint $table) {
            $table->index('adviser_id', 'idx_classes_adviser_id');
        });
    }

    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            $table->dropIndex('idx_grades_reg_id');
            $table->dropIndex('idx_grades_sy');
        });
        Schema::table('attendance', function (Blueprint $table) {
            $table->dropIndex('idx_attendance_reg_id');
            $table->dropIndex('idx_attendance_date');
        });
        Schema::table('classes', function (Blueprint $table) {
            $table->dropIndex('idx_classes_adviser_id');
        });
    }
};
