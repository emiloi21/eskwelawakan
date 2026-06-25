<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Widens student_requirements.student_id from varchar(12) to varchar(25)
 * to match students.student_id which is varchar(25).
 * Without this, enrolled students whose IDs exceed 12 characters cannot
 * submit or upload enrollment requirement documents.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_requirements', function (Blueprint $table) {
            $table->string('student_id', 25)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('student_requirements', function (Blueprint $table) {
            $table->string('student_id', 12)->nullable()->change();
        });
    }
};
