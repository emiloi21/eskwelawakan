<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Per-position default salary rates ────────────────────────────────
        Schema::create('payroll_position_rates', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('position_id')->unique();
            $table->decimal('basic_monthly_pay', 10, 2)->default(0);
            $table->decimal('transportation_allowance', 10, 2)->default(0);
            $table->decimal('rice_allowance', 10, 2)->default(0);
            $table->decimal('clothing_allowance', 10, 2)->default(0);
            $table->decimal('communication_allowance', 10, 2)->default(0);
            $table->decimal('medical_allowance', 10, 2)->default(0);
            $table->timestamps();

            $table->foreign('position_id')->references('id')->on('hrms_positions')->cascadeOnDelete();
        });

        // ── Per-employee salary settings (overrides position rates) ──────────
        Schema::create('payroll_salary_settings', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('personnel_id')->unique();
            $table->enum('pay_frequency', ['monthly', 'semi-monthly'])->default('semi-monthly');
            $table->decimal('basic_monthly_pay', 10, 2)->default(0);
            $table->decimal('transportation_allowance', 10, 2)->default(0);
            $table->decimal('rice_allowance', 10, 2)->default(0);
            $table->decimal('clothing_allowance', 10, 2)->default(0);
            $table->decimal('communication_allowance', 10, 2)->default(0);
            $table->decimal('medical_allowance', 10, 2)->default(0);
            $table->string('other_allowance_label', 80)->nullable();
            $table->decimal('other_allowance', 10, 2)->default(0);
            $table->decimal('sss_loan_monthly', 10, 2)->default(0);
            $table->decimal('pagibig_loan_monthly', 10, 2)->default(0);
            $table->decimal('salary_advance_monthly', 10, 2)->default(0);
            $table->date('effective_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('personnel_id')->references('id')->on('hrms_personnel')->cascadeOnDelete();
        });

        // ── Payroll templates ─────────────────────────────────────────────────
        Schema::create('payroll_templates', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('name', 100);
            $table->enum('type', ['regular', '13th_month', 'mid_year_bonus', 'year_end_bonus', 'custom'])->default('regular');
            $table->text('description')->nullable();
            // Earnings to include
            $table->boolean('include_basic')->default(true);
            $table->boolean('include_transportation')->default(true);
            $table->boolean('include_rice')->default(true);
            $table->boolean('include_clothing')->default(false);
            $table->boolean('include_communication')->default(false);
            $table->boolean('include_medical')->default(false);
            $table->boolean('include_other_allowance')->default(false);
            // Custom earning (e.g. bonus amount or special pay)
            $table->string('custom_earning_label', 100)->nullable();
            $table->boolean('custom_earning_taxable')->default(true);
            // Deductions to apply
            $table->boolean('deduct_sss')->default(true);
            $table->boolean('deduct_philhealth')->default(true);
            $table->boolean('deduct_pagibig')->default(true);
            $table->boolean('deduct_tax')->default(true);
            $table->boolean('deduct_loans')->default(true);
            // Special computation flags
            $table->boolean('auto_compute_thirteenth')->default(false); // compute from YTD basic / 12
            $table->boolean('allow_individual_override')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // ── Payroll periods / runs ────────────────────────────────────────────
        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('template_id');
            $table->string('school_year', 20);
            $table->string('period_label', 100);
            $table->date('period_start');
            $table->date('period_end');
            $table->date('payout_date')->nullable();
            $table->enum('status', ['draft', 'for_approval', 'approved', 'posted'])->default('draft')->index();
            // Cached totals
            $table->decimal('total_basic_pay', 12, 2)->default(0);
            $table->decimal('total_allowances', 12, 2)->default(0);
            $table->decimal('total_gross_pay', 12, 2)->default(0);
            $table->decimal('total_sss_employee', 12, 2)->default(0);
            $table->decimal('total_philhealth_employee', 12, 2)->default(0);
            $table->decimal('total_pagibig_employee', 12, 2)->default(0);
            $table->decimal('total_withholding_tax', 12, 2)->default(0);
            $table->decimal('total_other_deductions', 12, 2)->default(0);
            $table->decimal('total_net_pay', 12, 2)->default(0);
            $table->decimal('total_employer_sss', 12, 2)->default(0);
            $table->decimal('total_employer_philhealth', 12, 2)->default(0);
            $table->decimal('total_employer_pagibig', 12, 2)->default(0);
            // Workflow
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->unsignedBigInteger('posted_by')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->unsignedBigInteger('je_id')->nullable(); // FK journal_entries
            $table->text('approval_notes')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('template_id')->references('id')->on('payroll_templates');
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('posted_by')->references('id')->on('users')->nullOnDelete();
        });

        // ── Per-employee payroll items ────────────────────────────────────────
        Schema::create('payroll_items', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('payroll_period_id')->index();
            $table->unsignedBigInteger('personnel_id')->index();
            // Earnings
            $table->decimal('basic_pay', 10, 2)->default(0);        // period pay (monthly / semi-monthly)
            $table->decimal('transportation_allowance', 10, 2)->default(0);
            $table->decimal('rice_allowance', 10, 2)->default(0);
            $table->decimal('clothing_allowance', 10, 2)->default(0);
            $table->decimal('communication_allowance', 10, 2)->default(0);
            $table->decimal('medical_allowance', 10, 2)->default(0);
            $table->decimal('other_allowance', 10, 2)->default(0);
            $table->string('other_allowance_label', 80)->nullable();
            $table->decimal('custom_earning', 10, 2)->default(0); // bonus / 13th / custom
            $table->string('custom_earning_label', 100)->nullable();
            $table->decimal('overtime_hours', 5, 2)->default(0);
            $table->decimal('overtime_pay', 10, 2)->default(0);
            $table->decimal('gross_pay', 10, 2)->default(0); // computed
            // Gov deductions – employee side
            $table->decimal('sss_employee', 10, 2)->default(0);
            $table->decimal('philhealth_employee', 10, 2)->default(0);
            $table->decimal('pagibig_employee', 10, 2)->default(0);
            $table->decimal('withholding_tax', 10, 2)->default(0);
            // Gov contributions – employer side (for GL)
            $table->decimal('sss_employer', 10, 2)->default(0);
            $table->decimal('philhealth_employer', 10, 2)->default(0);
            $table->decimal('pagibig_employer', 10, 2)->default(0);
            // Other deductions
            $table->decimal('sss_loan', 10, 2)->default(0);
            $table->decimal('pagibig_loan', 10, 2)->default(0);
            $table->decimal('salary_advance', 10, 2)->default(0);
            $table->decimal('other_deductions', 10, 2)->default(0);
            $table->string('other_deductions_label', 80)->nullable();
            // Attendance adjustments
            $table->decimal('days_worked', 5, 2)->nullable();      // null = full period
            $table->decimal('late_hours', 5, 2)->default(0);
            $table->decimal('absent_deduction', 10, 2)->default(0);
            // Totals
            $table->decimal('total_employee_deductions', 10, 2)->default(0); // computed
            $table->decimal('net_pay', 10, 2)->default(0);                   // computed
            // Flags
            $table->boolean('is_included')->default(true);
            $table->boolean('is_manually_edited')->default(false);
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->unique(['payroll_period_id', 'personnel_id'], 'payroll_items_period_person_unique');
            $table->foreign('payroll_period_id')->references('id')->on('payroll_periods')->cascadeOnDelete();
            $table->foreign('personnel_id')->references('id')->on('hrms_personnel')->cascadeOnDelete();
        });

        // ── SSS contribution brackets ─────────────────────────────────────────
        Schema::create('payroll_sss_brackets', function (Blueprint $table) {
            $table->id();
            $table->decimal('salary_from', 10, 2);
            $table->decimal('salary_to', 10, 2)->nullable(); // null = no upper limit
            $table->decimal('msc', 10, 2);                  // Monthly Salary Credit
            $table->decimal('employee_contribution', 10, 2);
            $table->decimal('employer_contribution', 10, 2);
            $table->decimal('ec_contribution', 10, 2)->default(10); // Employment Compensation (employer flat)
            $table->decimal('wisp_employee', 10, 2)->default(0);    // Mandatory Provident Fund
            $table->decimal('wisp_employer', 10, 2)->default(0);
            $table->smallInteger('effective_year')->default(2025);
            $table->index('effective_year');
        });

        // ── PhilHealth configuration ──────────────────────────────────────────
        Schema::create('payroll_philhealth_config', function (Blueprint $table) {
            $table->id();
            $table->decimal('rate_percent', 5, 2)->default(5.00);       // total premium rate %
            $table->decimal('min_monthly_premium', 10, 2)->default(500.00);
            $table->decimal('max_monthly_premium', 10, 2)->default(5000.00);
            $table->smallInteger('effective_year')->default(2025);
            $table->index('effective_year');
        });

        // ── Pag-IBIG configuration ────────────────────────────────────────────
        Schema::create('payroll_pagibig_config', function (Blueprint $table) {
            $table->id();
            $table->decimal('low_salary_threshold', 10, 2)->default(1500.00);
            $table->decimal('low_employee_rate', 5, 4)->default(0.0100);  // 1%
            $table->decimal('high_employee_rate', 5, 4)->default(0.0200); // 2%
            $table->decimal('employer_rate', 5, 4)->default(0.0200);      // 2%
            $table->decimal('max_employee_contribution', 10, 2)->default(100.00);
            $table->decimal('max_employer_contribution', 10, 2)->default(100.00);
            $table->smallInteger('effective_year')->default(2025);
            $table->index('effective_year');
        });

        // ── BIR withholding tax brackets (monthly taxable income) ─────────────
        Schema::create('payroll_tax_brackets', function (Blueprint $table) {
            $table->id();
            $table->decimal('income_from', 12, 2);
            $table->decimal('income_to', 12, 2)->nullable(); // null = no upper bound
            $table->decimal('base_tax', 10, 2)->default(0);
            $table->decimal('rate_percent', 5, 2)->default(0);   // applied to excess over income_from
            $table->smallInteger('effective_year')->default(2025);
            $table->index('effective_year');
        });

        // ── COA account mapping for payroll GL integration ────────────────────
        Schema::create('payroll_coa_map', function (Blueprint $table) {
            $table->id();
            $table->string('account_key', 60)->unique(); // e.g. 'salaries_expense'
            $table->string('label', 100);
            $table->unsignedBigInteger('coa_id')->nullable();
            $table->timestamps();

            $table->foreign('coa_id')->references('coa_id')->on('chart_of_accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_coa_map');
        Schema::dropIfExists('payroll_tax_brackets');
        Schema::dropIfExists('payroll_pagibig_config');
        Schema::dropIfExists('payroll_philhealth_config');
        Schema::dropIfExists('payroll_sss_brackets');
        Schema::dropIfExists('payroll_items');
        Schema::dropIfExists('payroll_periods');
        Schema::dropIfExists('payroll_templates');
        Schema::dropIfExists('payroll_salary_settings');
        Schema::dropIfExists('payroll_position_rates');
    }
};
