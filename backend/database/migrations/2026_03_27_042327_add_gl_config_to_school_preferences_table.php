<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add GL system account pointers to school_preferences.
     * Each column stores the coa_id of a specific system account.
     */
    public function up(): void
    {
        Schema::table('school_preferences', function (Blueprint $table) {
            $table->unsignedBigInteger('gl_ar_coa_id')->nullable()->after('fy_closed_by')
                ->comment('Accounts Receivable — Students');
            $table->unsignedBigInteger('gl_cash_coa_id')->nullable()->after('gl_ar_coa_id')
                ->comment('Cash on Hand (Cash payments)');
            $table->unsignedBigInteger('gl_bank_coa_id')->nullable()->after('gl_cash_coa_id')
                ->comment('Cash in Bank (Bank Transfer / Check payments)');
            $table->unsignedBigInteger('gl_ewallet_coa_id')->nullable()->after('gl_bank_coa_id')
                ->comment('E-Wallet Clearing account');
            $table->unsignedBigInteger('gl_voucher_coa_id')->nullable()->after('gl_ewallet_coa_id')
                ->comment('Voucher Clearing account');
            $table->unsignedBigInteger('gl_income_summary_coa_id')->nullable()->after('gl_voucher_coa_id')
                ->comment('Income Summary (temporary FY closing account)');
            $table->unsignedBigInteger('gl_retained_coa_id')->nullable()->after('gl_income_summary_coa_id')
                ->comment('Retained Earnings / School Fund');

            // Soft FK constraints (no cascade — preferences are a singleton row)
            $table->foreign('gl_ar_coa_id')->references('coa_id')->on('chart_of_accounts')->nullOnDelete();
            $table->foreign('gl_cash_coa_id')->references('coa_id')->on('chart_of_accounts')->nullOnDelete();
            $table->foreign('gl_bank_coa_id')->references('coa_id')->on('chart_of_accounts')->nullOnDelete();
            $table->foreign('gl_ewallet_coa_id')->references('coa_id')->on('chart_of_accounts')->nullOnDelete();
            $table->foreign('gl_voucher_coa_id')->references('coa_id')->on('chart_of_accounts')->nullOnDelete();
            $table->foreign('gl_income_summary_coa_id')->references('coa_id')->on('chart_of_accounts')->nullOnDelete();
            $table->foreign('gl_retained_coa_id')->references('coa_id')->on('chart_of_accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('school_preferences', function (Blueprint $table) {
            $table->dropForeign(['gl_ar_coa_id']);
            $table->dropForeign(['gl_cash_coa_id']);
            $table->dropForeign(['gl_bank_coa_id']);
            $table->dropForeign(['gl_ewallet_coa_id']);
            $table->dropForeign(['gl_voucher_coa_id']);
            $table->dropForeign(['gl_income_summary_coa_id']);
            $table->dropForeign(['gl_retained_coa_id']);
            $table->dropColumn([
                'gl_ar_coa_id', 'gl_cash_coa_id', 'gl_bank_coa_id',
                'gl_ewallet_coa_id', 'gl_voucher_coa_id',
                'gl_income_summary_coa_id', 'gl_retained_coa_id',
            ]);
        });
    }
};
