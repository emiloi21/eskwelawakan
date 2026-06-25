<?php

namespace Database\Seeders\Mock;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * MockAccountingPaymentsSeeder
 *
 * Seeds realistic accounting/payment data for SY 2025-2026 students:
 *
 *  1. accounts_assessment_groups — one per grade/strand (if absent)
 *  2. accounts_assessment_particulars — fee breakdown per group
 *  3. student_assessments — links each enrolled student to their fee payables
 *  4. student_payment_data + student_payments — ~60% of students have paid
 *     (full or partial); payment types: Cash/GCash/Bank Transfer/Check
 *  5. journal_entries + journal_entry_lines — one batched JE per payment day
 *
 * NOTE: This seeder reads from the existing accounts_assessments and
 * assessment_payables tables (seeded by DatabaseSeeder / TestDataSeeder).
 * If those tables are empty it will seed minimal assessment masters first.
 *
 * Idempotent: guards most tables with count() > N checks.
 */
class MockAccountingPaymentsSeeder extends Seeder
{
    private const SY  = '2025-2026';
    private const SEM = '1st Semester';

    private const SCHOOL_YEARS = ['2025-2026', '2024-2025', '2023-2024', '2022-2023', '2021-2022'];

    // Collection rate (%) by SY — older SYs are nearly fully paid
    private const PAYMENT_RATES = [
        '2025-2026' => 60,
        '2024-2025' => 75,
        '2023-2024' => 85,
        '2022-2023' => 90,
        '2021-2022' => 95,
    ];

    // ── Assessment fee schedule (PHP, per student per SY) ───────────────────
    // Format: [description, amount, category_label, paymentTerm]
    private const FEE_SCHEDULE = [
        'GS' => [
            ['Tuition Fee',          18000.00, 'Tuition', 10],
            ['Registration Fee',       500.00, 'Standard Fees', 1],
            ['Medical/Dental Fee',     400.00, 'Standard Fees', 1],
            ['Instructional Materials',800.00, 'Standard Fees', 1],
            ['Insurance Fee',          150.00, 'Non-standard Fees', 1],
            ['Miscellaneous',          300.00, 'Non-standard Fees', 1],
        ],
        'JHS' => [
            ['Tuition Fee',          22000.00, 'Tuition', 10],
            ['Registration Fee',       600.00, 'Standard Fees', 1],
            ['Medical/Dental Fee',     400.00, 'Standard Fees', 1],
            ['Library Fee',            300.00, 'Standard Fees', 1],
            ['Laboratory Fee',         400.00, 'Standard Fees', 1],
            ['Instructional Materials',900.00, 'Standard Fees', 1],
            ['Insurance Fee',          150.00, 'Non-standard Fees', 1],
            ['Computer and Internet Fee', 500.00, 'Non-standard Fees', 1],
            ['Miscellaneous',          350.00, 'Non-standard Fees', 1],
        ],
        'SHS' => [
            ['Tuition Fee',          25000.00, 'Tuition', 10],
            ['Registration Fee',       700.00, 'Standard Fees', 1],
            ['Medical/Dental Fee',     400.00, 'Standard Fees', 1],
            ['Library Fee',            350.00, 'Standard Fees', 1],
            ['Laboratory Fee',         500.00, 'Standard Fees', 1],
            ['Instructional Materials',1000.00, 'Standard Fees', 1],
            ['Developmental Fee',      500.00, 'Standard Fees', 1],
            ['Insurance Fee',          200.00, 'Non-standard Fees', 1],
            ['Computer and Internet Fee', 600.00, 'Non-standard Fees', 1],
            ['Miscellaneous',          400.00, 'Non-standard Fees', 1],
        ],
    ];

    // Payment methods: Cash (onsite) ~37%, GCash ~25%, Maya ~13%, Bank Transfer ~13%, Check ~12%
    private const PAYMENT_TYPES = ['Cash', 'Cash', 'Cash', 'GCash', 'GCash', 'Maya', 'Bank Transfer', 'Check'];

    // ── Entry point ──────────────────────────────────────────────────────────

    public function run(): void
    {
        $adminUserId = DB::table('users')->where('access', 'Administrator')->value('id') ?? 1;
        $acctUserId  = DB::table('users')->where('access', 'Accounting Staff')->value('id') ?? $adminUserId;

        $this->command->info("  Seeding assessment masters (all SYs)…");
        $assessmentMap = $this->seedAssessmentMasters();

        $this->command->info("  Seeding student assessment line items (all SYs)…");
        foreach (self::SCHOOL_YEARS as $sy) {
            $this->seedStudentAssessmentsForSy($sy, $assessmentMap);
        }

        $this->command->info("  Seeding payments for all school years…");
        foreach (self::SCHOOL_YEARS as $sy) {
            $rate = self::PAYMENT_RATES[$sy];
            $this->command->line("    SY {$sy} — {$rate}% collection rate");
            $this->seedPaymentsForSy($sy, $acctUserId, $rate);
        }

        $this->command->info("  Seeding journal entries for payment batches…");
        $this->seedJournalEntries($adminUserId);
    }

    // ── Assessment masters ───────────────────────────────────────────────────

    /**
     * Ensures accounts_assessment_groups + accounts_assessment_particulars
     * exist for GS / JHS / SHS (and SHS strands).
     *
     * Returns: [dept => assessment_group_id]
     */
    private function seedAssessmentMasters(): array
    {
        $deptGroupMap = [];

        // Grade School
        $deptGroupMap['Grade School'] = $this->upsertAssessmentGroup(
            'Grade School', 'N/A', self::SY, self::SEM,
            'Grade School Standard Assessment SY 2025-2026',
            self::FEE_SCHEDULE['GS']
        );

        // JHS per grade level
        foreach (['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'] as $grade) {
            $deptGroupMap[$grade] = $this->upsertAssessmentGroup(
                $grade, 'N/A', self::SY, '1st Semester',
                "{$grade} Junior High School Assessment SY 2025-2026",
                self::FEE_SCHEDULE['JHS']
            );
        }

        // SHS per strand
        $strands = ['STEM', 'ABM', 'HUMSS', 'Home Economics', 'ICT'];
        foreach (['Grade 11', 'Grade 12'] as $grade) {
            foreach ($strands as $strand) {
                $key = "{$grade}_{$strand}";
                $deptGroupMap[$key] = $this->upsertAssessmentGroup(
                    $grade, $strand, self::SY, self::SEM,
                    "{$grade} {$strand} Assessment SY 2025-2026",
                    self::FEE_SCHEDULE['SHS']
                );
            }
        }

        // Nursery / Preparatory
        foreach (['Nursery', 'Preparatory'] as $grade) {
            $deptGroupMap[$grade] = $this->upsertAssessmentGroup(
                $grade, 'N/A', self::SY, 'Full Year',
                "{$grade} Standard Assessment SY 2025-2026",
                self::FEE_SCHEDULE['GS']
            );
        }

        // Kinder + Grade 1-6 (Grade School)
        foreach (['Kinder', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'] as $grade) {
            $key = "GS_{$grade}";
            $deptGroupMap[$key] = $this->upsertAssessmentGroup(
                $grade, 'N/A', self::SY, 'Full Year',
                "{$grade} Grade School Assessment SY 2025-2026",
                self::FEE_SCHEDULE['GS']
            );
        }

        return $deptGroupMap;
    }

    private function upsertAssessmentGroup(
        string $gradeLevel,
        string $strand,
        string $sy,
        string $semester,
        string $description,
        array $fees
    ): int {
        $existing = DB::table('accounts_assessment_groups')
            ->where('gradeLevel', $gradeLevel)
            ->where('strand', $strand)
            ->where('schoolYear', $sy)
            ->value('assessment_group_id');

        if ($existing) {
            return $existing;
        }

        $totalAmount = array_sum(array_column($fees, 1));

        $groupId = DB::table('accounts_assessment_groups')->insertGetId([
            'gradeLevel'  => $gradeLevel,
            'strand'      => $strand,
            'major'       => 'N/A',
            'schoolYear'  => $sy,
            'semester'    => $semester,
            'description' => $description,
            'totalAmount' => $totalAmount,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        // Seed particulars for this group
        $particularCounter = DB::table('accounts_assessment_particulars')
            ->max('particular_id') ?? 0;

        foreach ($fees as [$feeDesc, $amount, $category, $term]) {
            $particularCounter++;
            DB::table('accounts_assessment_particulars')->insert([
                'assessment_group_id' => $groupId,
                'particular_id'       => $particularCounter,
                'account_group'       => $category,
                'description'         => $feeDesc,
                'amount'              => $amount,
                'status'              => 'Active',
                'paymentTerm'         => $term,
                'schoolYear'          => $sy,
                'semester'            => $semester,
                'created_at'          => now(),
                'updated_at'          => now(),
            ]);
        }

        return $groupId;
    }

    // ── Student assessment line items ────────────────────────────────────────

    /**
     * Build a lookup map: (gradeLevel, strand, accountGroup) → category_id
     * using accounts_categories (SY-agnostic — match by grade/strand/description).
     * account_group labels used by this seeder map to category descriptions:
     *   'Tuition'          → 'Tuition Fee'
     *   'Standard Fees'    → 'Standard Fees'
     *   'Non-standard Fees'→ 'Non-standard Fees'
     */
    private function buildCategoryLookup(): array
    {
        $map = [];
        $groupToDesc = [
            'Tuition'          => 'Tuition Fee',
            'Standard Fees'    => 'Standard Fees',
            'Non-standard Fees'=> 'Non-standard Fees',
            'Other Fees'       => 'Other Fees',
        ];

        $categories = DB::table('accounts_categories')
            ->select('category_id', 'gradeLevel', 'strand', 'description')
            ->get();

        foreach ($categories as $cat) {
            foreach ($groupToDesc as $groupLabel => $catDesc) {
                if (strcasecmp((string) $cat->description, $catDesc) === 0) {
                    $grade  = $cat->gradeLevel;
                    $strand = $cat->strand ?? 'N/A';
                    $key = "{$grade}|{$strand}|{$groupLabel}";
                    // Keep the first match (in case of duplicates across SYs)
                    if (!isset($map[$key])) {
                        $map[$key] = (int) $cat->category_id;
                    }
                }
            }
        }

        return $map;
    }

    private function seedStudentAssessmentsForSy(string $sy, array $assessmentMap): void
    {
        // Guard: skip if already more than 5000 SA rows exist for this SY
        $existingCount = DB::table('student_assessments')
            ->join('students', 'student_assessments.reg_id', '=', 'students.reg_id')
            ->where('students.schoolYear', $sy)
            ->count();

        if ($existingCount > 5000) {
            $this->command->line("  ⊘ Student assessments for {$sy} already seeded ({$existingCount} rows), skipping.");
            return;
        }

        $students = DB::table('students')
            ->where('schoolYear', $sy)
            ->where('status', 'Enrolled')
            ->select('reg_id', 'gradeLevel', 'strand', 'dept', 'schoolYear')
            ->get();

        $this->command->line("    SA {$sy}: {$students->count()} students to assess");

        // Build category lookup once for all students in this SY
        $categoryLookup = $this->buildCategoryLookup();

        $batch   = [];
        $inserted = 0;

        foreach ($students as $student) {
            $groupId = $this->resolveGroupId($student, $assessmentMap);
            if (!$groupId) {
                continue;
            }

            $grade  = $student->gradeLevel;
            $strand = $student->strand ?? 'N/A';

            $particulars = DB::table('accounts_assessment_particulars')
                ->where('assessment_group_id', $groupId)
                ->get();

            foreach ($particulars as $p) {
                $catKey    = "{$grade}|{$strand}|{$p->account_group}";
                $categoryId = $categoryLookup[$catKey] ?? 0;

                $batch[] = [
                    'reg_id'            => $student->reg_id,
                    'assessment_id'     => $groupId,
                    'category_id'       => $categoryId,
                    'particular_id'     => $p->particular_id,
                    'account_type'      => null,
                    'par_stat'          => 'Active',
                    'total_amt_payable' => $p->amount,
                    'total_amt_discount'=> 0.00,
                    'total_amt_paid'    => 0.00,
                    'total_amt_debit'   => 0.00,
                    'total_amt_credit'  => 0.00,
                    'total_amt_bal'     => $p->amount,
                    'schoolYear'        => $student->schoolYear,
                    'debit_id'          => 0,
                    'credit_id'         => 0,
                    'created_at'        => now(),
                    'updated_at'        => now(),
                ];
                $inserted++;

                if (count($batch) >= 200) {
                    DB::table('student_assessments')->insertOrIgnore($batch);
                    $batch = [];
                }
            }
        }

        if (!empty($batch)) {
            DB::table('student_assessments')->insertOrIgnore($batch);
        }

        $this->command->line("  ✓ Student assessment line items inserted: {$inserted}");
    }

    private function resolveGroupId(object $student, array $assessmentMap): ?int
    {
        $grade  = $student->gradeLevel;
        $strand = $student->strand ?? 'N/A';
        $dept   = $student->dept ?? '';

        if (in_array($grade, ['Nursery', 'Preparatory'])) {
            return $assessmentMap[$grade] ?? null;
        }
        if ($grade === 'Kinder' || in_array($grade, ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'])) {
            // Try grade-specific group first, fall back to generic GS group
            return $assessmentMap["GS_{$grade}"] ?? $assessmentMap['Grade School'] ?? null;
        }
        if (str_contains($dept, 'Grade School')) {
            return $assessmentMap['Grade School'] ?? null;
        }
        if (in_array($grade, ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'])) {
            return $assessmentMap[$grade] ?? null;
        }
        if (in_array($grade, ['Grade 11', 'Grade 12'])) {
            $key = "{$grade}_{$strand}";
            return $assessmentMap[$key] ?? $assessmentMap[$grade . '_STEM'] ?? null;
        }
        return null;
    }

    // ── Payments ─────────────────────────────────────────────────────────────

    private function seedPaymentsForSy(string $sy, int $acctUserId, int $ratePercent): void
    {
        $existingCount = DB::table('student_payment_data')
            ->where('schoolYear', $sy)
            ->count();

        if ($existingCount > 1000) {
            $this->command->line("    ⊘ Payments for {$sy} already seeded ({$existingCount} rows), skipping.");
            return;
        }

        $currentOr = DB::table('receipt_gen')->value('current_or') ?? 5000;
        $orNum     = (int) $currentOr + 1;

        $syStartYear = (int) substr($sy, 0, 4);
        $syStartDate = Carbon::create($syStartYear, 6, 9);

        $students = DB::table('students')
            ->where('schoolYear', $sy)
            ->where('status', 'Enrolled')
            ->select('reg_id', 'lname', 'fname', 'gradeLevel', 'dept', 'strand')
            ->get();

        $totalStudents = $students->count();
        $payCount      = 0;

        // Apply SY-specific collection rate
        $payers = $students->filter(fn() => mt_rand(1, 100) <= $ratePercent)->values();

        foreach ($payers as $student) {
            $assessItems = DB::table('student_assessments')
                ->where('reg_id', $student->reg_id)
                ->where('schoolYear', $sy)
                ->where('total_amt_bal', '>', 0)
                ->get();

            if ($assessItems->isEmpty()) {
                continue;
            }

            // Determine payment coverage: 40% pay all, 60% pay partial (tuition installment)
            $payAll = mt_rand(1, 100) <= 40;

            $receiptNum = 'OR-' . str_pad((string) $orNum, 6, '0', STR_PAD_LEFT);
            $orNum++;

            $payType    = self::PAYMENT_TYPES[mt_rand(0, count(self::PAYMENT_TYPES) - 1)];
            $transDate  = $syStartDate->copy()->addDays(mt_rand(0, 120))->toDateString();
            $semester   = self::SEM;

            // Calculate amounts
            $totalPayable = 0.0;
            $totalPaid    = 0.0;
            $paymentLines = [];

            foreach ($assessItems as $item) {
                $payable = (float) $item->total_amt_payable;
                $paid    = $payAll ? $payable : ($item->total_amt_discount > 0 ? $payable : min($payable, round($payable * (mt_rand(30, 80) / 100), 2)));

                $totalPayable += $payable;
                $totalPaid    += $paid;

                $paymentLines[] = [
                    'reg_id'           => $student->reg_id,
                    'lname'            => $student->lname,
                    'fname'            => $student->fname,
                    'receipt_num'      => $receiptNum,
                    'schoolYear'       => $sy,
                    'semester'         => $semester,
                    'payment_type'     => $payType,
                    'method_id'        => 0,
                    'category_id'      => (int) $item->category_id,
                    'particular_id'    => (int) $item->particular_id,
                    'amt_payable'      => $payable,
                    'amt_paid'         => $paid,
                    'trans_date'       => $transDate,
                    'trans_time'       => now()->toDateTimeString(),
                    'status'           => 'Paid',
                    'void_remarks'     => '-',
                    'personnel_user_id'=> $acctUserId,
                    'created_at'       => now(),
                    'updated_at'       => now(),
                ];
            }

            if (empty($paymentLines) || $totalPaid <= 0) {
                continue;
            }

            // Insert payment header
            DB::table('student_payment_data')->insert([
                'reg_id'               => $student->reg_id,
                'receipt_num'          => $receiptNum,
                'schoolYear'           => $sy,
                'semester'             => $semester,
                'trans_payment_type'   => $payType,
                'cv_payee'             => $student->lname . ', ' . $student->fname,
                'cv_bank_office'       => $payType === 'Cash' ? 'School Cashier' : 'Online',
                'cv_number'            => $receiptNum,
                'remarks'              => "Payment for SY {$sy} school fees.",
                'entry_date'           => $transDate,
                'net_amt_payable'      => round($totalPayable, 2),
                'amt_tend'             => round($totalPaid, 2),
                'personnel_user_id'    => $acctUserId,
                'trans_time'           => now()->toDateTimeString(),
                'status'               => 'Paid',
                'created_at'           => now(),
                'updated_at'           => now(),
            ]);

            // Insert payment lines in chunks
            foreach (array_chunk($paymentLines, 50) as $chunk) {
                DB::table('student_payments')->insert($chunk);
            }

            // Update student_assessments balances
            foreach ($assessItems as $item) {
                $paidForItem = 0.0;
                foreach ($paymentLines as $line) {
                    if ($line['particular_id'] === (int) $item->particular_id) {
                        $paidForItem = $line['amt_paid'];
                        break;
                    }
                }
                if ($paidForItem > 0) {
                    DB::table('student_assessments')
                        ->where('stud_assess_id', $item->stud_assess_id)
                        ->update([
                            'total_amt_paid'  => (float) $item->total_amt_paid + $paidForItem,
                            'total_amt_bal'   => max(0, (float) $item->total_amt_bal - $paidForItem),
                            'updated_at'      => now(),
                        ]);
                }
            }

            $payCount++;
        }

        DB::table('receipt_gen')->update(['current_or' => $orNum - 1]);

        $this->command->line("    ✓ {$sy}: payments for {$payCount}/{$totalStudents} students.");
    }

    // ── Journal entries ──────────────────────────────────────────────────────

    private function seedJournalEntries(int $adminUserId): void
    {
        if (DB::table('journal_entries')->count() > 5) {
            $this->command->line("  ⊘ Journal entries already seeded, skipping.");
            return;
        }

        // Prefer GL accounts configured in school_preferences; fall back to account_name lookups
        $prefs = DB::table('school_preferences')->select(
            'gl_cash_coa_id', 'gl_bank_coa_id', 'gl_ar_coa_id'
        )->first();

        $cashCoa = $prefs?->gl_cash_coa_id
            ?? DB::table('chart_of_accounts')->where('account_name', 'like', '%Cash on Hand%')->value('coa_id')
            ?? DB::table('chart_of_accounts')->where('account_type', 'Asset')->whereNotNull('parent_id')->orderBy('coa_id')->value('coa_id');

        $arCoa = $prefs?->gl_ar_coa_id
            ?? DB::table('chart_of_accounts')->where('account_name', 'like', '%Receivable%')->orderBy('coa_id')->value('coa_id')
            ?? $cashCoa;

        // Revenue: prefer a leaf-level Revenue account
        $tuitionCoa = DB::table('chart_of_accounts')
            ->where('account_type', 'Revenue')
            ->whereNotNull('parent_id')
            ->orderBy('coa_id')
            ->value('coa_id')
            ?? DB::table('chart_of_accounts')->where('account_type', 'Revenue')->orderBy('coa_id')->value('coa_id')
            ?? $cashCoa;

        $feesCoa    = $tuitionCoa;

        // Aggregate payments by day (first 10 unique transaction dates)
        $paymentDays = DB::table('student_payment_data')
            ->where('schoolYear', self::SY)
            ->selectRaw('entry_date, SUM(amt_tend) as total_collected')
            ->groupBy('entry_date')
            ->orderBy('entry_date')
            ->limit(10)
            ->get();

        $jeNum = 1000;
        foreach ($paymentDays as $day) {
            $total       = (float) $day->total_collected;
            $tuitionPart = round($total * 0.70, 2);
            $feesPart    = round($total - $tuitionPart, 2);
            $entryNo     = 'JE-' . str_pad((string) $jeNum++, 6, '0', STR_PAD_LEFT);

            $jeId = DB::table('journal_entries')->insertGetId([
                'entry_no'       => $entryNo,
                'entry_date'     => $day->entry_date,
                'description'    => 'Student fee collections for ' . $day->entry_date,
                'reference_type' => 'payment',
                'reference_id'   => $day->entry_date,
                'status'         => 'Posted',
                'schoolYear'     => self::SY,
                'created_by'     => $adminUserId,
                'posted_by'      => $adminUserId,
                'posted_at'      => now()->toDateTimeString(),
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);

            // Debit: Cash/Bank
            DB::table('journal_entry_lines')->insert([
                'je_id'      => $jeId,
                'coa_id'     => $cashCoa,
                'debit'      => $total,
                'credit'     => 0.00,
                'memo'       => "Cash collections — {$day->entry_date}",
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Credit: Tuition Income
            DB::table('journal_entry_lines')->insert([
                'je_id'      => $jeId,
                'coa_id'     => $tuitionCoa,
                'debit'      => 0.00,
                'credit'     => $tuitionPart,
                'memo'       => "Tuition income — {$day->entry_date}",
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Credit: School Fees Income
            DB::table('journal_entry_lines')->insert([
                'je_id'      => $jeId,
                'coa_id'     => $feesCoa,
                'debit'      => 0.00,
                'credit'     => $feesPart,
                'memo'       => "School fees income — {$day->entry_date}",
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Seed one outstanding A/R entry for unpaid balances
        $totalUnpaid = DB::table('student_assessments')
            ->where('schoolYear', self::SY)
            ->where('total_amt_bal', '>', 0)
            ->sum('total_amt_bal');

        if ($totalUnpaid > 0) {
            $jeId = DB::table('journal_entries')->insertGetId([
                'entry_no'       => 'JE-' . str_pad((string) $jeNum, 6, '0', STR_PAD_LEFT),
                'entry_date'     => Carbon::create(2025, 6, 9)->toDateString(),
                'description'    => 'Accounts receivable — outstanding student balances SY 2025-2026',
                'reference_type' => 'adjustment',
                'reference_id'   => self::SY,
                'status'         => 'Posted',
                'schoolYear'     => self::SY,
                'created_by'     => $adminUserId,
                'posted_by'      => $adminUserId,
                'posted_at'      => now()->toDateTimeString(),
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);

            DB::table('journal_entry_lines')->insert([
                'je_id'      => $jeId,
                'coa_id'     => $arCoa,
                'debit'      => round($totalUnpaid, 2),
                'credit'     => 0.00,
                'memo'       => 'Total outstanding student receivables as of enrollment',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('journal_entry_lines')->insert([
                'je_id'      => $jeId,
                'coa_id'     => $tuitionCoa,
                'debit'      => 0.00,
                'credit'     => round($totalUnpaid, 2),
                'memo'       => 'Contra — unbilled fee income deferred',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->command->line("  ✓ Journal entries inserted for " . $paymentDays->count() . " collection days.");
    }
}
