<?php

namespace App\Services;

use App\Models\AssessmentPayable;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\SchoolPreference;
use App\Models\Student;
use App\Models\StudentPaymentData;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Generates double-entry journal entries for cashiering events.
 *
 * All automatic entries are posted immediately (status = Posted).
 * Returns null and logs a notice when GL accounts are not yet configured —
 * cashiering continues normally without an error.
 */
class GlJournalService
{
    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private function generateEntryNo(): string
    {
        $today = now()->format('Ymd');
        $seq   = JournalEntry::whereDate('created_at', today())->count() + 1;

        return 'JE-' . $today . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    private function prefs(): ?SchoolPreference
    {
        return SchoolPreference::first();
    }

    /**
     * Resolve the cash/bank COA for a given payment type string.
     */
    private function cashCoaId(string $paymentType, SchoolPreference $prefs): ?int
    {
        return match ($paymentType) {
            'Bank Transfer', 'Check' => $prefs->gl_bank_coa_id,
            'E-Wallet'               => $prefs->gl_ewallet_coa_id,
            'Voucher'                => $prefs->gl_voucher_coa_id,
            default                  => $prefs->gl_cash_coa_id,   // Cash
        };
    }

    private function postEntry(JournalEntry $entry, int $userId): void
    {
        $entry->update([
            'status'    => 'Posted',
            'posted_by' => $userId,
            'posted_at' => now(),
        ]);
    }

    // -----------------------------------------------------------------------
    // Assessment Assignment
    // DR: Accounts Receivable — Students
    // CR: Revenue account per fee category (categories.coa_id)
    // -----------------------------------------------------------------------

    /**
     * Record an A/R + Revenue journal entry when an assessment is assigned.
     *
     * Called after StudentAssessment rows are created for a student.
     *
     * @param  int  $assessmentId  The AccountsAssessment.assessment_id
     */
    public function recordAssessment(Student $student, int $assessmentId, string $schoolYear, int $createdBy): ?JournalEntry
    {
        $prefs = $this->prefs();

        if (! $prefs || ! $prefs->gl_ar_coa_id) {
            Log::info('GL: Skipping assessment entry — A/R COA not configured.');
            return null;
        }

        // Payables with their category's COA
        $payables = AssessmentPayable::with('category:category_id,description,coa_id')
            ->where('assessment_id', $assessmentId)
            ->get();

        // Aggregate credit amounts per revenue COA
        $revenueLines = [];
        foreach ($payables as $payable) {
            $coaId = $payable->category?->coa_id;
            if (! $coaId || (float) $payable->total_amt_payable <= 0) {
                continue;
            }
            $revenueLines[$coaId] = ($revenueLines[$coaId] ?? 0) + (float) $payable->total_amt_payable;
        }

        if (empty($revenueLines)) {
            Log::info('GL: Skipping assessment entry — no fee categories have a GL account mapped.');
            return null;
        }

        $totalAmount = array_sum($revenueLines);

        return DB::transaction(function () use ($prefs, $student, $schoolYear, $createdBy, $totalAmount, $revenueLines) {
            $entry = JournalEntry::create([
                'entry_no'       => $this->generateEntryNo(),
                'entry_date'     => now()->toDateString(),
                'description'    => "Assessment — {$student->lname}, {$student->fname} ({$schoolYear})",
                'reference_type' => 'assessment',
                'reference_id'   => (string) $student->public_id,
                'status'         => 'Draft',
                'schoolYear'     => $schoolYear,
                'created_by'     => $createdBy,
            ]);

            // DR: A/R
            JournalEntryLine::create([
                'je_id'  => $entry->je_id,
                'coa_id' => $prefs->gl_ar_coa_id,
                'debit'  => $totalAmount,
                'credit' => 0,
                'memo'   => "A/R — {$student->lname}, {$student->fname}",
            ]);

            // CR: Revenue per category
            foreach ($revenueLines as $coaId => $amount) {
                JournalEntryLine::create([
                    'je_id'  => $entry->je_id,
                    'coa_id' => $coaId,
                    'debit'  => 0,
                    'credit' => $amount,
                    'memo'   => "Revenue — {$student->lname}, {$student->fname}",
                ]);
            }

            $this->postEntry($entry, $createdBy);

            return $entry->fresh();
        });
    }

    // -----------------------------------------------------------------------
    // Payment Completion
    // DR: Cash / Bank / EWallet / Voucher account
    // CR: Accounts Receivable — Students
    // -----------------------------------------------------------------------

    /**
     * Record a cash-receipt journal entry when a payment is completed.
     *
     * @param  Collection<\App\Models\StudentPayment>  $payments  Active (non-voided) payment lines.
     */
    public function recordPayment(StudentPaymentData $paymentData, Collection $payments, int $createdBy): ?JournalEntry
    {
        $prefs = $this->prefs();

        if (! $prefs || ! $prefs->gl_ar_coa_id) {
            Log::info('GL: Skipping payment entry — GL accounts not configured.');
            return null;
        }

        $cashCoaId = $this->cashCoaId($paymentData->trans_payment_type ?? 'Cash', $prefs);

        if (! $cashCoaId) {
            Log::info("GL: Skipping payment entry — no COA mapped for payment type '{$paymentData->trans_payment_type}'.");
            return null;
        }

        $totalPaid = $payments->sum(fn ($p) => (float) $p->amt_paid);

        if ($totalPaid <= 0) {
            return null;
        }

        return DB::transaction(function () use ($prefs, $paymentData, $cashCoaId, $totalPaid, $createdBy) {
            $entry = JournalEntry::create([
                'entry_no'       => $this->generateEntryNo(),
                'entry_date'     => $paymentData->entry_date ?? now()->toDateString(),
                'description'    => "Payment received — O.R. #{$paymentData->receipt_num}",
                'reference_type' => 'payment',
                'reference_id'   => $paymentData->receipt_num,
                'status'         => 'Draft',
                'schoolYear'     => $paymentData->schoolYear ?? null,
                'created_by'     => $createdBy,
            ]);

            // DR: Cash / Bank / EWallet
            JournalEntryLine::create([
                'je_id'  => $entry->je_id,
                'coa_id' => $cashCoaId,
                'debit'  => $totalPaid,
                'credit' => 0,
                'memo'   => "O.R. #{$paymentData->receipt_num}",
            ]);

            // CR: A/R
            JournalEntryLine::create([
                'je_id'  => $entry->je_id,
                'coa_id' => $prefs->gl_ar_coa_id,
                'debit'  => 0,
                'credit' => $totalPaid,
                'memo'   => "O.R. #{$paymentData->receipt_num}",
            ]);

            $this->postEntry($entry, $createdBy);

            return $entry->fresh();
        });
    }

    // -----------------------------------------------------------------------
    // Payment Void (reversal)
    // DR: Accounts Receivable — Students
    // CR: Cash / Bank / EWallet / Voucher account
    // -----------------------------------------------------------------------

    /**
     * Record a reversal journal entry when a payment is voided.
     *
     * @param  Collection<\App\Models\StudentPayment>  $payments  The lines being voided.
     */
    public function recordVoid(StudentPaymentData $paymentData, Collection $payments, int $voidedBy): ?JournalEntry
    {
        $prefs = $this->prefs();

        if (! $prefs || ! $prefs->gl_ar_coa_id) {
            return null;
        }

        $cashCoaId = $this->cashCoaId($paymentData->trans_payment_type ?? 'Cash', $prefs);

        if (! $cashCoaId) {
            return null;
        }

        $totalPaid = $payments->sum(fn ($p) => (float) $p->amt_paid);

        if ($totalPaid <= 0) {
            return null;
        }

        return DB::transaction(function () use ($prefs, $paymentData, $cashCoaId, $totalPaid, $voidedBy) {
            $entry = JournalEntry::create([
                'entry_no'       => $this->generateEntryNo(),
                'entry_date'     => now()->toDateString(),
                'description'    => "Payment voided — O.R. #{$paymentData->receipt_num}",
                'reference_type' => 'payment',
                'reference_id'   => $paymentData->receipt_num,
                'status'         => 'Draft',
                'schoolYear'     => $paymentData->schoolYear ?? null,
                'created_by'     => $voidedBy,
            ]);

            // DR: A/R (reversal)
            JournalEntryLine::create([
                'je_id'  => $entry->je_id,
                'coa_id' => $prefs->gl_ar_coa_id,
                'debit'  => $totalPaid,
                'credit' => 0,
                'memo'   => "VOID O.R. #{$paymentData->receipt_num}",
            ]);

            // CR: Cash / Bank (reversal)
            JournalEntryLine::create([
                'je_id'  => $entry->je_id,
                'coa_id' => $cashCoaId,
                'debit'  => 0,
                'credit' => $totalPaid,
                'memo'   => "VOID O.R. #{$paymentData->receipt_num}",
            ]);

            $this->postEntry($entry, $voidedBy);

            return $entry->fresh();
        });
    }

    // -----------------------------------------------------------------------
    // Fiscal Year Closing
    // Entry 1: DR Revenue accounts → CR Income Summary
    // Entry 2: DR Income Summary  → CR Retained Earnings
    // -----------------------------------------------------------------------

    /**
     * Generate FY closing journal entries — closes all revenue to retained earnings.
     * Returns the two JournalEntry records created, or empty array if skipped.
     *
     * @return JournalEntry[]
     */
    public function recordFyClosing(string $schoolYear, int $userId): array
    {
        $prefs = $this->prefs();

        if (! $prefs || ! $prefs->gl_income_summary_coa_id || ! $prefs->gl_retained_coa_id) {
            Log::info('GL: Skipping FY closing entries — Income Summary or Retained Earnings COA not configured.');
            return [];
        }

        // Find all Revenue-type leaf accounts
        $revenueCoaIds = ChartOfAccount::where('account_type', 'Revenue')
            ->where('is_header', false)
            ->where('is_active', true)
            ->pluck('coa_id');

        if ($revenueCoaIds->isEmpty()) {
            return [];
        }

        // Net credit balance for each revenue account in this school year
        $revenueAmounts = JournalEntryLine::query()
            ->whereIn('coa_id', $revenueCoaIds)
            ->whereHas('journalEntry', fn ($q) => $q
                ->where('schoolYear', $schoolYear)
                ->where('status', 'Posted')
            )
            ->selectRaw('coa_id, SUM(credit) - SUM(debit) as net_credit')
            ->groupBy('coa_id')
            ->having('net_credit', '>', 0)
            ->get()
            ->keyBy('coa_id');

        if ($revenueAmounts->isEmpty()) {
            return [];
        }

        $totalRevenue = $revenueAmounts->sum('net_credit');

        return DB::transaction(function () use ($prefs, $revenueAmounts, $totalRevenue, $schoolYear, $userId) {
            // --- Entry 1: Close Revenue → Income Summary ---
            $je1 = JournalEntry::create([
                'entry_no'       => $this->generateEntryNo(),
                'entry_date'     => now()->toDateString(),
                'description'    => "FY Closing — Close Revenue to Income Summary ({$schoolYear})",
                'reference_type' => 'manual',
                'reference_id'   => $schoolYear,
                'status'         => 'Draft',
                'schoolYear'     => $schoolYear,
                'created_by'     => $userId,
            ]);

            foreach ($revenueAmounts as $coaId => $row) {
                JournalEntryLine::create([
                    'je_id'  => $je1->je_id,
                    'coa_id' => $coaId,
                    'debit'  => $row->net_credit,
                    'credit' => 0,
                    'memo'   => "Close to Income Summary",
                ]);
            }

            JournalEntryLine::create([
                'je_id'  => $je1->je_id,
                'coa_id' => $prefs->gl_income_summary_coa_id,
                'debit'  => 0,
                'credit' => $totalRevenue,
                'memo'   => "Income Summary ({$schoolYear})",
            ]);

            $this->postEntry($je1, $userId);

            // --- Entry 2: Close Income Summary → Retained Earnings ---
            $je2 = JournalEntry::create([
                'entry_no'       => $this->generateEntryNo(),
                'entry_date'     => now()->toDateString(),
                'description'    => "FY Closing — Close Income Summary to Retained Earnings ({$schoolYear})",
                'reference_type' => 'manual',
                'reference_id'   => $schoolYear,
                'status'         => 'Draft',
                'schoolYear'     => $schoolYear,
                'created_by'     => $userId,
            ]);

            JournalEntryLine::create([
                'je_id'  => $je2->je_id,
                'coa_id' => $prefs->gl_income_summary_coa_id,
                'debit'  => $totalRevenue,
                'credit' => 0,
                'memo'   => "Close Income Summary",
            ]);

            JournalEntryLine::create([
                'je_id'  => $je2->je_id,
                'coa_id' => $prefs->gl_retained_coa_id,
                'debit'  => 0,
                'credit' => $totalRevenue,
                'memo'   => "Retained Earnings ({$schoolYear})",
            ]);

            $this->postEntry($je2, $userId);

            return [$je1->fresh(), $je2->fresh()];
        });
    }
}
