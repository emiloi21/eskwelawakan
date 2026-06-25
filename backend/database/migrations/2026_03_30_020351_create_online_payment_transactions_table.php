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
        Schema::create('online_payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->integer('reg_id')->index();
            $table->string('paymongo_session_id', 100)->unique();
            $table->string('payment_intent_id', 100)->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('school_year', 20)->nullable();
            $table->string('semester', 20)->nullable();
            $table->enum('status', ['pending', 'paid', 'cancelled', 'failed'])->default('pending')->index();
            $table->string('receipt_num', 25)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('online_payment_transactions');
    }
};
