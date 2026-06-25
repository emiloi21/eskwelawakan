<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('billing', function (Blueprint $table) {
            $table->id('billing_id');
            $table->unsignedBigInteger('reg_id');
            $table->unsignedBigInteger('category_id')->default(0);
            $table->decimal('amt_payable', 13, 2)->default(0.00);
            $table->decimal('amt_paid', 13, 2)->default(0.00);
            $table->string('receipt_num', 15)->default('-');
            $table->decimal('amt_billed', 13, 2)->default(0.00);
            $table->string('remarks', 255)->default('-');
            $table->string('schoolYear', 9)->default('-');
            $table->timestamps();

            $table->index('reg_id');
            $table->index('schoolYear');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('billing');
    }
};
