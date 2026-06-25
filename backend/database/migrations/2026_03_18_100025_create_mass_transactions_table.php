<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mass_transactions', function (Blueprint $table) {
            $table->id('mt_id');
            $table->string('massTransCode', 10)->default('-');
            $table->unsignedBigInteger('discount_id')->default(0);
            $table->string('payment_term', 15)->default('-');
            $table->decimal('payment_amt', 13, 2)->default(0.00);
            $table->unsignedBigInteger('personnel_user_id');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mass_transactions');
    }
};
