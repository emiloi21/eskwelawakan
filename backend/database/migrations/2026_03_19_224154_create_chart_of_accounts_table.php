<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('chart_of_accounts', function (Blueprint $table) {
            $table->id('coa_id');
            $table->string('account_code', 20)->unique();
            $table->string('account_name', 150);
            $table->enum('account_type', ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']);
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->string('description', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_header')->default(false);
            $table->decimal('normal_balance', 15, 2)->default(0);
            $table->string('schoolYear', 15)->nullable();
            $table->timestamps();

            $table->foreign('parent_id')->references('coa_id')->on('chart_of_accounts')->nullOnDelete();
            $table->index('account_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chart_of_accounts');
    }
};
