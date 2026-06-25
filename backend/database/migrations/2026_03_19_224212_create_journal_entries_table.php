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
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id('je_id');
            $table->string('entry_no', 30)->unique();
            $table->date('entry_date');
            $table->string('description', 255);
            $table->string('reference_type', 50)->nullable()->comment('payment, refund, adjustment, manual');
            $table->string('reference_id', 50)->nullable()->comment('receipt_num or other ref');
            $table->enum('status', ['Draft', 'Posted', 'Voided'])->default('Draft');
            $table->string('schoolYear', 15)->nullable();
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('posted_by')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users');
            $table->foreign('posted_by')->references('id')->on('users');
            $table->index(['entry_date', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('journal_entries');
    }
};
