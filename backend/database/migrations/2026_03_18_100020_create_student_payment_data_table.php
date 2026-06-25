<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_payment_data', function (Blueprint $table) {
            $table->id('pay_data_id');
            $table->unsignedBigInteger('reg_id')->default(0);
            $table->string('receipt_num', 55)->default('-');
            $table->string('schoolYear', 9)->default('-');
            $table->string('semester', 15)->default('-');
            $table->string('trans_payment_type', 55)->default('Cash');
            $table->string('cv_payee', 255);
            $table->string('cv_bank_office', 255);
            $table->string('cv_number', 25);
            $table->string('remarks', 255);
            $table->string('entry_date', 10);
            $table->decimal('net_amt_payable', 13, 2)->default(0.00);
            $table->decimal('amt_tend', 13, 2)->default(0.00);
            $table->unsignedBigInteger('personnel_user_id')->default(0);
            $table->dateTime('trans_time')->useCurrent();
            $table->string('status', 15)->default('On Process');
            $table->timestamps();

            $table->index('reg_id');
            $table->index('receipt_num');
            $table->index('schoolYear');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_payment_data');
    }
};
