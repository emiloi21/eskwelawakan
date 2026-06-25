<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lms_quiz_questions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('assignment_id');
            $table->enum('type', ['multiple_choice', 'true_false', 'short_answer'])->default('multiple_choice');
            $table->longText('question');
            $table->unsignedTinyInteger('points')->default(1);
            $table->unsignedSmallInteger('order')->default(0);
            $table->timestamps();

            $table->foreign('assignment_id')->references('id')->on('lms_assignments')->cascadeOnDelete();
        });

        Schema::create('lms_quiz_choices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('question_id');
            $table->string('text');
            $table->boolean('is_correct')->default(false);
            $table->unsignedTinyInteger('order')->default(0);

            $table->foreign('question_id')->references('id')->on('lms_quiz_questions')->cascadeOnDelete();
        });

        Schema::create('lms_quiz_attempts', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('assignment_id');
            $table->unsignedBigInteger('student_reg_id');
            $table->unsignedTinyInteger('attempt_number')->default(1);
            $table->decimal('score', 6, 2)->nullable();
            $table->decimal('max_score', 6, 2)->nullable();
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->foreign('assignment_id')->references('id')->on('lms_assignments')->cascadeOnDelete();
            $table->foreign('student_reg_id')->references('reg_id')->on('students')->cascadeOnDelete();
            $table->unique(['assignment_id', 'student_reg_id', 'attempt_number'], 'lms_quiz_attempts_unique');
        });

        Schema::create('lms_quiz_answers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('attempt_id');
            $table->unsignedBigInteger('question_id');
            $table->unsignedBigInteger('choice_id')->nullable();   // for MC / TF
            $table->text('text_answer')->nullable();               // for short_answer
            $table->boolean('is_correct')->nullable();             // null = needs manual grading
            $table->decimal('points_earned', 5, 2)->nullable();

            $table->foreign('attempt_id')->references('id')->on('lms_quiz_attempts')->cascadeOnDelete();
            $table->foreign('question_id')->references('id')->on('lms_quiz_questions')->cascadeOnDelete();
            $table->foreign('choice_id')->references('id')->on('lms_quiz_choices')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lms_quiz_answers');
        Schema::dropIfExists('lms_quiz_attempts');
        Schema::dropIfExists('lms_quiz_choices');
        Schema::dropIfExists('lms_quiz_questions');
    }
};
