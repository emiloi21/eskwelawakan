<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── User Designations ─────────────────────────────────────────────────
        // A user (personnel) can hold multiple designations/roles simultaneously.
        // The users.access column remains the *primary* role used for the default portal.
        // Additional designations grant access to extra portals.
        Schema::create('user_designations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('designation', 60)->comment('One of the system access roles');
            $table->string('position_title', 100)->nullable()->comment('Custom title e.g. "Room Custodian"');
            $table->string('department', 100)->nullable();
            $table->boolean('is_primary')->default(false)->comment('The main/default role shown at login');
            $table->timestamps();

            $table->unique(['user_id', 'designation']);
            $table->index('user_id');
        });

        // ── GL Account Links ──────────────────────────────────────────────────
        // Link property categories to asset GL accounts for auto-JE on acquisition/disposal.
        Schema::table('property_categories', function (Blueprint $table) {
            $table->unsignedBigInteger('gl_asset_account_id')->nullable()
                ->comment('COA entry for the asset account (debit on acquisition)');
            $table->unsignedBigInteger('gl_accum_depr_account_id')->nullable()
                ->comment('COA entry for accumulated depreciation (credit on depreciation)');
            $table->unsignedBigInteger('gl_depr_expense_account_id')->nullable()
                ->comment('COA entry for depreciation expense (debit on depreciation)');
            $table->foreign('gl_asset_account_id')->references('coa_id')->on('chart_of_accounts')->nullOnDelete();
            $table->foreign('gl_accum_depr_account_id')->references('coa_id')->on('chart_of_accounts')->nullOnDelete();
            $table->foreign('gl_depr_expense_account_id')->references('coa_id')->on('chart_of_accounts')->nullOnDelete();
        });

        // Link consumable categories to GL accounts for auto-JE on supply fulfillment.
        Schema::table('consumable_categories', function (Blueprint $table) {
            $table->unsignedBigInteger('gl_asset_account_id')->nullable()
                ->comment('COA entry for supplies/inventory asset account');
            $table->unsignedBigInteger('gl_expense_account_id')->nullable()
                ->comment('COA entry for supplies expense (debit when issued)');
            $table->foreign('gl_asset_account_id')->references('coa_id')->on('chart_of_accounts')->nullOnDelete();
            $table->foreign('gl_expense_account_id')->references('coa_id')->on('chart_of_accounts')->nullOnDelete();
        });

        // ── Property Item Financial Fields ────────────────────────────────────
        Schema::table('property_items', function (Blueprint $table) {
            $table->enum('depreciation_method', ['Straight-Line', 'Double-Declining', 'None'])
                ->default('Straight-Line')
                ->after('useful_life_years');
            $table->decimal('salvage_value', 12, 2)->default(0)->after('depreciation_method');
            $table->decimal('accumulated_depreciation', 12, 2)->default(0)->after('salvage_value');
            $table->date('last_depreciation_date')->nullable()->after('accumulated_depreciation');
        });
    }

    public function down(): void
    {
        Schema::table('property_items', function (Blueprint $table) {
            $table->dropColumn(['depreciation_method', 'salvage_value', 'accumulated_depreciation', 'last_depreciation_date']);
        });
        Schema::table('consumable_categories', function (Blueprint $table) {
            $table->dropForeign(['gl_asset_account_id']);
            $table->dropForeign(['gl_expense_account_id']);
            $table->dropColumn(['gl_asset_account_id', 'gl_expense_account_id']);
        });
        Schema::table('property_categories', function (Blueprint $table) {
            $table->dropForeign(['gl_asset_account_id']);
            $table->dropForeign(['gl_accum_depr_account_id']);
            $table->dropForeign(['gl_depr_expense_account_id']);
            $table->dropColumn(['gl_asset_account_id', 'gl_accum_depr_account_id', 'gl_depr_expense_account_id']);
        });
        Schema::dropIfExists('user_designations');
    }
};
