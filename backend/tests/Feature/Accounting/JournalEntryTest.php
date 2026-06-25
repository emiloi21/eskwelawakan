<?php

namespace Tests\Feature\Accounting;

use App\Models\ChartOfAccount;
use Tests\TestCase;

/**
 * Journal Entry tests
 *
 * Workflows:
 * - Create COA account
 * - Create balanced journal entry (Draft)
 * - Unbalanced debits/credits → 422
 * - Post a draft journal entry
 * - Void a posted journal entry
 * - Non-authorized role is rejected
 */
class JournalEntryTest extends TestCase
{
    /** Create two COA accounts for debit/credit usage and return their integer coa_ids */
    private function makeTwoAccounts(): array
    {
        $debitAcc = ChartOfAccount::create([
            'account_code' => 'TEST-1001',
            'account_name' => 'Cash on Hand',
            'account_type' => 'Asset',
        ]);

        $creditAcc = ChartOfAccount::create([
            'account_code' => 'TEST-4001',
            'account_name' => 'Tuition Revenue',
            'account_type' => 'Revenue',
        ]);

        return [$debitAcc->coa_id, $creditAcc->coa_id];
    }

    // ── COA ───────────────────────────────────────────────────────────────────

    public function test_admin_can_create_coa_account(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/accounting/chart-of-accounts', [
            'account_code' => 'CASH-001',
            'account_name' => 'Petty Cash',
            'account_type' => 'Asset',
        ])->assertStatus(201)
            ->assertJsonPath('data.account_code', 'CASH-001');
    }

    public function test_duplicate_account_code_returns_422(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/accounting/chart-of-accounts', [
            'account_code' => 'DUP-001',
            'account_name' => 'First Account',
            'account_type' => 'Asset',
        ]);

        $this->postJson('/api/accounting/chart-of-accounts', [
            'account_code' => 'DUP-001',
            'account_name' => 'Second Account',
            'account_type' => 'Liability',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['account_code']);
    }

    // ── Create Journal Entry ──────────────────────────────────────────────────

    public function test_can_create_balanced_journal_entry(): void
    {
        $this->actAs('Administrator');
        [$debitId, $creditId] = $this->makeTwoAccounts();

        $this->postJson('/api/accounting/journal-entries', [
            'entry_date'  => '2025-07-01',
            'description' => 'Test entry',
            'schoolYear'  => '2025-2026',
            'lines' => [
                ['coa_id' => $debitId,  'debit' => 1000, 'credit' => 0],
                ['coa_id' => $creditId, 'debit' => 0,    'credit' => 1000],
            ],
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'Draft');
    }

    public function test_unbalanced_journal_entry_returns_422(): void
    {
        $this->actAs('Administrator');
        [$debitId, $creditId] = $this->makeTwoAccounts();

        $this->postJson('/api/accounting/journal-entries', [
            'entry_date'  => '2025-07-01',
            'description' => 'Unbalanced entry',
            'lines' => [
                ['coa_id' => $debitId,  'debit' => 1500, 'credit' => 0],
                ['coa_id' => $creditId, 'debit' => 0,    'credit' => 1000],
            ],
        ])->assertStatus(422);
    }

    public function test_entry_with_zero_debit_and_zero_credit_line_fails(): void
    {
        $this->actAs('Administrator');
        [$debitId, $creditId] = $this->makeTwoAccounts();

        $this->postJson('/api/accounting/journal-entries', [
            'entry_date'  => '2025-07-01',
            'description' => 'Zero line entry',
            'lines' => [
                ['coa_id' => $debitId,  'debit' => 0, 'credit' => 0],
                ['coa_id' => $creditId, 'debit' => 0, 'credit' => 0],
            ],
        ])->assertStatus(422);
    }

    // ── Post Journal Entry ────────────────────────────────────────────────────

    public function test_admin_can_post_draft_journal_entry(): void
    {
        $this->actAs('Administrator');
        [$debitId, $creditId] = $this->makeTwoAccounts();

        $created = $this->postJson('/api/accounting/journal-entries', [
            'entry_date'  => '2025-07-01',
            'description' => 'Entry to post',
            'lines' => [
                ['coa_id' => $debitId,  'debit' => 500, 'credit' => 0],
                ['coa_id' => $creditId, 'debit' => 0,   'credit' => 500],
            ],
        ])->json('data');

        $this->postJson("/api/accounting/journal-entries/{$created['public_id']}/post")
            ->assertOk()
            ->assertJsonPath('data.status', 'Posted');
    }

    // ── Void Journal Entry ────────────────────────────────────────────────────

    public function test_admin_can_void_posted_journal_entry(): void
    {
        $this->actAs('Administrator');
        [$debitId, $creditId] = $this->makeTwoAccounts();

        $created = $this->postJson('/api/accounting/journal-entries', [
            'entry_date'  => '2025-07-02',
            'description' => 'Entry to void',
            'lines' => [
                ['coa_id' => $debitId,  'debit' => 200, 'credit' => 0],
                ['coa_id' => $creditId, 'debit' => 0,   'credit' => 200],
            ],
        ])->json('data');

        $this->postJson("/api/accounting/journal-entries/{$created['public_id']}/post");

        $this->postJson("/api/accounting/journal-entries/{$created['public_id']}/void", [
            'reason' => 'Test void reason',
        ])->assertOk()
            ->assertJsonPath('data.status', 'Voided');
    }

    // ── Role guard ────────────────────────────────────────────────────────────

    public function test_registrar_cannot_create_journal_entry(): void
    {
        $this->actAs('Registrar');

        $this->postJson('/api/accounting/journal-entries', [
            'entry_date'  => '2025-07-01',
            'description' => 'Not allowed',
            'lines'       => [],
        ])->assertStatus(403);
    }
}
