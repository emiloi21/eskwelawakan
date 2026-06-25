<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessments_discounts', function (Blueprint $table) {
            $table->id('discount_id');
            $table->unsignedBigInteger('reg_id')->default(0);
            $table->unsignedBigInteger('acct_discount_id')->default(0);
            $table->string('account_code', 15)->default('-');
            $table->string('description', 255)->default('');
            $table->decimal('amount', 13, 2)->default(0.00);
            $table->decimal('percentage', 5, 2)->default(0.00);
            $table->decimal('amt_rcv_paid', 13, 2)->default(0.00);
            $table->unsignedBigInteger('deduct_category_id')->default(0);
            $table->unsignedBigInteger('deduct_particular_id')->default(0);
            $table->string('schoolYear', 9)->default('-');
            $table->string('type', 55)->default('-');
            $table->string('status', 55)->default('-');
            $table->timestamps();

            $table->index('reg_id');
            $table->index('schoolYear');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessments_discounts');
    }
};
