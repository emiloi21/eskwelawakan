<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts_discount', function (Blueprint $table) {
            $table->id('acct_discount_id');
            $table->string('dept', 55)->default('-');
            $table->string('schoolYear', 9)->default('-');
            $table->string('account_code', 15)->default('-');
            $table->string('description', 255)->default('-');
            $table->decimal('amount', 13, 2)->default(0.00);
            $table->decimal('percentage', 4, 2)->default(0.00);
            $table->string('classification', 55)->default('-');
            $table->string('type', 25)->default('-');
            $table->timestamps();

            $table->index('schoolYear');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts_discount');
    }
};
