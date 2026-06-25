<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id('reg_id');
            $table->string('lrn', 12);
            $table->string('esc_id', 8)->default('0');
            $table->string('student_id', 25);
            $table->string('lname', 255);
            $table->string('fname', 255);
            $table->string('mname', 255);
            $table->string('suffix', 5);
            $table->string('bdMM', 2);
            $table->string('bdDD', 2);
            $table->string('bdYYYY', 4);
            $table->string('sex', 6);
            $table->integer('age')->default(0);
            $table->string('address_street', 55)->nullable();
            $table->string('address_brgy', 55)->nullable();
            $table->string('address_city_mun', 55)->nullable();
            $table->string('address_province', 55)->nullable();
            $table->string('guardian_lname', 55)->nullable();
            $table->string('guardian_fname', 55)->nullable();
            $table->string('guardian_contact', 25);
            $table->string('guardian_relation', 55);
            $table->string('g_address_street', 55)->nullable();
            $table->string('g_address_brgy', 55)->nullable();
            $table->string('g_address_city_mun', 55)->nullable();
            $table->string('g_address_province', 55)->nullable();
            $table->string('last_school', 255);
            $table->string('last_school_sy', 9);
            $table->string('last_school_type', 25);
            $table->integer('gen_average')->default(0);
            $table->unsignedBigInteger('class_id')->default(0);
            $table->string('dept', 55);
            $table->string('gradeLevel', 55);
            $table->string('strand', 55)->default('N/A');
            $table->string('major', 55)->default('N/A');
            $table->string('section', 55);
            $table->string('classification', 55);
            $table->string('schoolYear', 10);
            $table->string('sem', 25)->default('1st Semester');
            $table->string('appDate', 10);
            $table->string('appTime', 12);
            $table->unsignedBigInteger('assessment_id')->default(0);
            $table->string('status', 55)->default('For Accounts Assessment');
            $table->string('remarks', 190)->nullable();
            $table->string('stat_date', 10)->nullable();
            $table->unsignedBigInteger('prev_sy_reg_id')->default(0);
            $table->timestamps();

            $table->index('student_id');
            $table->index('lrn');
            $table->index('schoolYear');
            $table->index('status');
            $table->index('class_id');
            $table->index('dept');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
