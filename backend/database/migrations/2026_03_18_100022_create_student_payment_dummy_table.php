<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_payment_dummy', function (Blueprint $table) {
            $table->id('payment_id');
            $table->unsignedBigInteger('reg_id')->default(0);
            $table->string('lname', 55)->default('-');
            $table->string('fname', 55)->default('-');
            $table->string('receipt_num', 55)->default('-');
            $table->string('schoolYear', 9)->default('-');
            $table->string('semester', 15)->default('-');
            $table->string('payment_type', 55)->default('-');
            $table->unsignedBigInteger('method_id')->default(0);
            $table->unsignedBigInteger('assessment_id');
            $table->unsignedBigInteger('category_id')->default(0);
            $table->unsignedBigInteger('particular_id');
            $table->decimal('amt_payable', 13, 2)->default(0.00);
            $table->decimal('amt_paid', 13, 2)->default(0.00);
            $table->unsignedBigInteger('personnel_user_id')->default(0);
            $table->timestamps();

            $table->index('reg_id');
            $table->index('receipt_num');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_payment_dummy');
    }
};
