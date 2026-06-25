<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add structured code fields to chart_of_accounts
        Schema::table('chart_of_accounts', function (Blueprint $table) {
            $table->string('code_prefix', 10)->nullable()->after('account_code');
            $table->string('code_number', 10)->nullable()->after('code_prefix');
            $table->string('code_suffix', 5)->nullable()->after('code_number');
        });

        // Link particulars to chart_of_accounts
        Schema::table('accounts_particulars', function (Blueprint $table) {
            $table->unsignedBigInteger('coa_id')->nullable()->after('particular_id');
            $table->foreign('coa_id')->references('coa_id')->on('chart_of_accounts')->nullOnDelete();
            $table->index('coa_id');
        });
    }

    public function down(): void
    {
        Schema::table('accounts_particulars', function (Blueprint $table) {
            $table->dropForeign(['coa_id']);
            $table->dropIndex(['coa_id']);
            $table->dropColumn('coa_id');
        });

        Schema::table('chart_of_accounts', function (Blueprint $table) {
            $table->dropColumn(['code_prefix', 'code_number', 'code_suffix']);
        });
    }
};
