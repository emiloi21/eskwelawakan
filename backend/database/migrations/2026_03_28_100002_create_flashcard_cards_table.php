<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('flashcard_cards', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('deck_id');
            $table->text('front');                          // question / front face (may contain {{blank}})
            $table->text('back')->nullable();               // answer / back face
            $table->string('category_tag', 100)->nullable();
            $table->boolean('has_cloze')->default(false);   // true if front contains {{...}}
            $table->string('image_front', 500)->nullable();
            $table->string('image_back', 500)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['deck_id', 'sort_order']);
            $table->foreign('deck_id')->references('id')->on('flashcard_decks')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('flashcard_cards');
    }
};
