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
        Schema::table('accounts_categories', function (Blueprint $table) {
            $table->unsignedBigInteger('coa_id')->nullable()->after('semester')->comment('Revenue GL account for this fee category');
            $table->foreign('coa_id')->references('coa_id')->on('chart_of_accounts')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('accounts_categories', function (Blueprint $table) {
            $table->dropForeign(['coa_id']);
            $table->dropColumn('coa_id');
        });
    }
};
