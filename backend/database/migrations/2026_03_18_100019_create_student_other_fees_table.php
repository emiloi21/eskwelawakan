<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_other_fees', function (Blueprint $table) {
            $table->id('particular_id');
            $table->unsignedBigInteger('reg_id');
            $table->unsignedBigInteger('category_id');
            $table->string('account_code', 15);
            $table->string('description', 255)->comment('Description - OLD ACCOUNT SY YYYY-YY for converted balances');
            $table->decimal('amount', 13, 2);
            $table->string('status', 15);
            $table->integer('paymentTerm');
            $table->string('schoolYear', 9);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable();

            $table->index('reg_id');
            $table->index('category_id');
            $table->index('schoolYear');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_other_fees');
    }
};
