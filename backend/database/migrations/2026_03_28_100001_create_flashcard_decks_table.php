<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('flashcard_decks', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('owner_user_id');     // teacher who created it
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->json('tags')->nullable();                // array of category strings (max 3)
            $table->boolean('is_graded')->default(false);   // graded quiz vs self-study
            $table->boolean('is_pinned')->default(false);   // teacher can pin decks
            $table->timestamps();

            $table->index('owner_user_id');
            $table->foreign('owner_user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('flashcard_decks');
    }
};
