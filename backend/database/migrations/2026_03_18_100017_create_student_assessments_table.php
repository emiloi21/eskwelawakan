<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_assessments', function (Blueprint $table) {
            $table->id('stud_assess_id');
            $table->unsignedBigInteger('reg_id')->default(0);
            $table->unsignedBigInteger('assessment_id')->default(0);
            $table->unsignedBigInteger('category_id')->default(0);
            $table->unsignedBigInteger('particular_id');
            $table->string('account_type', 55)->nullable()->comment('NULL=Standard Assessment, Customized Fee=OLD ACCOUNT or manual fee');
            $table->string('par_stat', 10)->default('Active');
            $table->decimal('total_amt_payable', 13, 2)->default(0.00);
            $table->decimal('total_amt_discount', 13, 2)->default(0.00);
            $table->decimal('total_amt_paid', 13, 2)->default(0.00);
            $table->decimal('total_amt_debit', 13, 2)->default(0.00);
            $table->decimal('total_amt_credit', 13, 2)->default(0.00);
            $table->decimal('total_amt_bal', 13, 2)->default(0.00);
            $table->string('schoolYear', 9)->default('-');
            $table->unsignedBigInteger('debit_id')->default(0)->comment('Links to student_other_fees.particular_id when balance is converted to OLD ACCOUNT');
            $table->unsignedBigInteger('credit_id')->default(0);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable();

            $table->index('reg_id');
            $table->index('assessment_id');
            $table->index('category_id');
            $table->index('schoolYear');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_assessments');
    }
};
