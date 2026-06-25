<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // SM-2 spaced repetition log — one row per user+card
        Schema::create('flashcard_sr_log', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('card_id');
            $table->decimal('ease_factor', 4, 2)->default(2.50);  // SM-2 E-Factor (min 1.3)
            $table->unsignedSmallInteger('interval_days')->default(1);
            $table->unsignedSmallInteger('repetitions')->default(0);
            $table->date('next_due');                             // date card is due for review
            $table->timestamp('last_reviewed_at')->nullable();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->unique(['user_id', 'card_id']);
            $table->index(['user_id', 'next_due']);
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('card_id')->references('id')->on('flashcard_cards')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('flashcard_sr_log');
    }
};
