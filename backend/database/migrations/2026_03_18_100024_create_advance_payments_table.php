<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('advance_payments', function (Blueprint $table) {
            $table->id('adv_pay_id');
            $table->unsignedBigInteger('reg_id');
            $table->string('description', 255);
            $table->decimal('adv_pay_amt', 13, 2)->default(0.00);
            $table->timestamps();

            $table->index('reg_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('advance_payments');
    }
};
