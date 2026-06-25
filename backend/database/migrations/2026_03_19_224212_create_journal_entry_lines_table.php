<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('journal_entry_lines', function (Blueprint $table) {
            $table->id('jel_id');
            $table->unsignedBigInteger('je_id');
            $table->unsignedBigInteger('coa_id');
            $table->decimal('debit', 15, 2)->default(0);
            $table->decimal('credit', 15, 2)->default(0);
            $table->string('memo', 255)->nullable();
            $table->timestamps();

            $table->foreign('je_id')->references('je_id')->on('journal_entries')->cascadeOnDelete();
            $table->foreign('coa_id')->references('coa_id')->on('chart_of_accounts');
            $table->index('coa_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('journal_entry_lines');
    }
};
