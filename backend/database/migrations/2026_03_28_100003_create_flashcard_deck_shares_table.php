<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('flashcard_deck_shares', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('deck_id');
            $table->unsignedBigInteger('class_id');         // classes.class_id
            $table->unsignedBigInteger('assigned_by_user_id');
            $table->timestamp('assigned_at')->useCurrent();

            $table->unique(['deck_id', 'class_id']);
            $table->index('class_id');
            $table->foreign('deck_id')->references('id')->on('flashcard_decks')->onDelete('cascade');
            $table->foreign('assigned_by_user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('flashcard_deck_shares');
    }
};
