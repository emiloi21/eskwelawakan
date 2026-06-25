<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts_particulars', function (Blueprint $table) {
            $table->id('particular_id');
            $table->string('gradeLevel', 55)->default('-');
            $table->string('strand', 55)->default('N/A');
            $table->string('major', 55)->default('N/A');
            $table->string('schoolYear', 9)->default('-');
            $table->string('semester', 55)->default('-');
            $table->string('account_group', 55)->nullable();
            $table->string('account_code', 15)->default('-');
            $table->string('description', 255)->default('-');
            $table->decimal('amount', 13, 2)->default(0.00);
            $table->string('par_acct_class', 55)->default('Assessment Account');
            $table->string('status', 10)->default('Active');
            $table->timestamps();

            $table->index('schoolYear');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts_particulars');
    }
};
