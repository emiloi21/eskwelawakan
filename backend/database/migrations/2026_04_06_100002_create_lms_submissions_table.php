<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lms_submissions', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->foreignId('assignment_id')->constrained('lms_assignments')->cascadeOnDelete();
            $table->unsignedBigInteger('student_reg_id');          // FK → students.reg_id
            $table->enum('status', ['assigned', 'turned_in', 'graded', 'returned', 'late'])
                  ->default('assigned');
            $table->text('student_note')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->decimal('score', 6, 2)->nullable();
            $table->text('feedback')->nullable();
            $table->timestamp('graded_at')->nullable();
            $table->foreignId('graded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['assignment_id', 'student_reg_id']);
            $table->foreign('student_reg_id')->references('reg_id')->on('students')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lms_submissions');
    }
};
