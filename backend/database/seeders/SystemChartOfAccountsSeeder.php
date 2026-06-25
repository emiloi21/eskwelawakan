<?php

namespace Database\Seeders;

use App\Models\ChartOfAccount;
use App\Models\SchoolPreference;
use Illuminate\Database\Seeder;

/**
 * Seeds the minimum required system Chart of Accounts.
 *
 * These records are flagged is_system = true and cannot be
 * edited or deleted through the UI.
 *
 * After seeding, it also auto-wires the system accounts into
 * school_preferences so GL journal entries can be generated
 * immediately without manual configuration.
 *
 * Standard numbering follows the Phil. Government Accounting Manual (GAM)
 * simplified for a school environment.
 */
class SystemChartOfAccountsSeeder extends Seeder
{
    /**
     * System account definitions.
     * Each entry: [account_code, account_name, account_type, is_header, parent_code|null]
     *
     * @var array<array{0:string,1:string,2:string,3:bool,4:string|null}>
     */
    private array $accounts = [
        // ── Header accounts ──────────────────────────────────────────────
        ['1000', 'Assets',                            'Asset',     true,  null],
        ['1100', 'Cash and Cash Equivalents',         'Asset',     true,  '1000'],
        ['1200', 'Receivables',                       'Asset',     true,  '1000'],
        ['2000', 'Liabilities',                       'Liability', true,  null],
        ['3000', 'Equity',                            'Equity',    true,  null],
        ['4000', 'Revenue',                           'Revenue',   true,  null],
        ['5000', 'Expenses',                          'Expense',   true,  null],

        // ── Cash & Equivalents ────────────────────────────────────────────
        ['1101', 'Cash on Hand',                      'Asset',     false, '1100'],
        ['1102', 'Cash in Bank — Current Account',    'Asset',     false, '1100'],
        ['1103', 'E-Wallet Clearing',                 'Asset',     false, '1100'],
        ['1104', 'Voucher Clearing',                  'Asset',     false, '1100'],

        // ── Receivables ───────────────────────────────────────────────────
        ['1201', 'Accounts Receivable — Students',    'Asset',     false, '1200'],

        // ── Equity ────────────────────────────────────────────────────────
        ['3001', 'School Fund / Retained Surplus',    'Equity',    false, '3000'],
        ['3002', 'Income Summary',                    'Equity',    false, '3000'],

        // ── Revenue ──────────────────────────────────────────────────────
        ['4001', 'Tuition and Other School Fees',     'Revenue',   false, '4000'],

        // ── Expenses ─────────────────────────────────────────────────────
        ['5001', 'Salaries and Wages',                'Expense',   false, '5000'],
        ['5002', 'Utilities Expense',                 'Expense',   false, '5000'],
        ['5003', 'Supplies Expense',                  'Expense',   false, '5000'],
    ];

    public function run(): void
    {
        // Build lookup: code → id (after creation)
        $codeToId = [];

        foreach ($this->accounts as [$code, $name, $type, $isHeader, $parentCode]) {
            $parentId = $parentCode ? ($codeToId[$parentCode] ?? null) : null;

            $account = ChartOfAccount::updateOrCreate(
                ['account_code' => $code],
                [
                    'account_name'  => $name,
                    'account_type'  => $type,
                    'is_header'     => $isHeader,
                    'is_system'     => true,
                    'is_active'     => true,
                    'parent_id'     => $parentId,
                    'normal_balance' => 0,
                ]
            );

            $codeToId[$code] = $account->coa_id;
        }

        // ── Auto-wire into SchoolPreferences ────────────────────────────
        $prefs = SchoolPreference::first();
        if ($prefs) {
            $prefs->update([
                'gl_cash_coa_id'           => $codeToId['1101'],
                'gl_bank_coa_id'           => $codeToId['1102'],
                'gl_ewallet_coa_id'        => $codeToId['1103'],
                'gl_voucher_coa_id'        => $codeToId['1104'],
                'gl_ar_coa_id'             => $codeToId['1201'],
                'gl_retained_coa_id'       => $codeToId['3001'],
                'gl_income_summary_coa_id' => $codeToId['3002'],
            ]);
        }

        $this->command?->info('System COA accounts seeded (' . count($this->accounts) . ' accounts).');
    }
}
