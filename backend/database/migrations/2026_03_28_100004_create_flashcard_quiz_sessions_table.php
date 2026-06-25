<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('flashcard_quiz_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('deck_id');
            $table->unsignedBigInteger('student_user_id');
            $table->json('quiz_types');                     // array: ['mc','tf','identification','cloze']
            $table->unsignedSmallInteger('total_questions')->default(0);
            $table->unsignedSmallInteger('correct_count')->default(0);
            $table->boolean('is_graded')->default(false);  // snapshot of deck.is_graded at time of quiz
            $table->enum('status', ['in_progress', 'completed'])->default('in_progress');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['student_user_id', 'deck_id']);
            $table->index('deck_id');
            $table->foreign('deck_id')->references('id')->on('flashcard_decks')->onDelete('cascade');
            $table->foreign('student_user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('flashcard_quiz_sessions');
    }
};
