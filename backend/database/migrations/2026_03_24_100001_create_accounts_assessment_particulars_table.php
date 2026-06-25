<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts_assessment_particulars', function (Blueprint $table) {
            $table->id('assessment_particular_id');
            $table->unsignedBigInteger('assessment_group_id')->default(0);
            $table->unsignedBigInteger('particular_id');
            $table->string('account_group', 55)->nullable();
            // account_code field removed - not applicable for assessment particulars
            $table->string('description', 255)->default('-');
            $table->decimal('amount', 13, 2);
            $table->string('status', 10)->default('Active');
            $table->integer('paymentTerm');
            $table->string('schoolYear', 9)->default('-');
            $table->string('semester', 55)->default('-');
            $table->timestamps();

            $table->index('assessment_group_id');
            $table->index('particular_id');
            $table->index('schoolYear');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts_assessment_particulars');
    }
};
