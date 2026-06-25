<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grades', function (Blueprint $table) {
            $table->id('grade_id');
            $table->unsignedBigInteger('reg_id');            // student
            $table->unsignedBigInteger('class_id');          // class/section
            $table->string('subject', 100);
            $table->string('school_year', 9);
            $table->string('semester', 50)->default('1st Semester');
            $table->decimal('q1', 5, 2)->nullable();         // 1st quarter
            $table->decimal('q2', 5, 2)->nullable();         // 2nd quarter
            $table->decimal('q3', 5, 2)->nullable();         // 3rd quarter
            $table->decimal('q4', 5, 2)->nullable();         // 4th quarter
            $table->decimal('final_grade', 5, 2)->nullable();
            $table->string('remarks', 50)->nullable();       // Passed, Failed, Incomplete, Dropped
            $table->timestamps();

            $table->unique(['reg_id', 'class_id', 'subject', 'school_year', 'semester'], 'grades_unique');
            $table->index('class_id');
            $table->index('reg_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grades');
    }
};
