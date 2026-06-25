<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('flashcard_quiz_answers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('session_id');
            $table->unsignedBigInteger('card_id');
            $table->enum('question_type', ['mc', 'tf', 'identification', 'cloze']);
            $table->json('question_data');                  // rendered question + options for MC
            $table->text('correct_answer');
            $table->text('student_answer')->nullable();
            $table->boolean('is_correct')->nullable();
            $table->timestamps();

            $table->index('session_id');
            $table->foreign('session_id')->references('id')->on('flashcard_quiz_sessions')->onDelete('cascade');
            $table->foreign('card_id')->references('id')->on('flashcard_cards')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('flashcard_quiz_answers');
    }
};
