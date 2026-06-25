<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lms_assignments', function (Blueprint $table) {
            $table->unsignedBigInteger('flashcard_deck_id')->nullable()->after('allow_late');
            $table->foreign('flashcard_deck_id')->references('id')->on('flashcard_decks')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('lms_assignments', function (Blueprint $table) {
            $table->dropForeign(['flashcard_deck_id']);
            $table->dropColumn('flashcard_deck_id');
        });
    }
};
