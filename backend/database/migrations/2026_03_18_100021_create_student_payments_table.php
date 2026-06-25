<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_payments', function (Blueprint $table) {
            $table->id('payment_id');
            $table->unsignedBigInteger('reg_id')->default(0);
            $table->string('lname', 55)->default('-');
            $table->string('fname', 55)->default('-');
            $table->string('receipt_num', 55)->default('-');
            $table->string('schoolYear', 9)->default('-');
            $table->string('semester', 15)->default('-');
            $table->string('payment_type', 55)->default('-');
            $table->unsignedBigInteger('method_id')->default(0)->comment('discount_id for A/R | A/P Trans');
            $table->unsignedBigInteger('category_id')->default(0);
            $table->unsignedBigInteger('particular_id');
            $table->decimal('amt_payable', 13, 2)->default(0.00);
            $table->decimal('amt_paid', 13, 2)->default(0.00);
            $table->string('trans_date', 10)->default('-');
            $table->dateTime('trans_time')->useCurrent();
            $table->string('status', 15)->default('-');
            $table->string('void_remarks', 255)->default('-');
            $table->unsignedBigInteger('personnel_user_id')->default(0);
            $table->timestamps();

            $table->index('reg_id');
            $table->index('receipt_num');
            $table->index('schoolYear');
            $table->index('status');
            $table->index('personnel_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_payments');
    }
};
