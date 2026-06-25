<?php

namespace Database\Seeders;

use App\Models\AccountsParticular;
use App\Models\ChartOfAccount;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds accounts_particulars from the legacy 2025-2026 data,
 * linking each to the appropriate COA child account by suffix.
 *
 * Suffix A = Grade School, B = Junior High School, C = Senior High School.
 * Grade School and JHS use the same amounts (from JHS legacy data).
 */
class ParticularsFromLegacySeeder extends Seeder
{
    private const SCHOOL_YEAR = '2025-2026';
    private const SEMESTER    = '1st Semester';

    /**
     * Grade levels per department suffix.
     */
    private const GRADE_LEVELS = [
        'A' => ['Prekinder', 'Preparatory'],
        'B' => ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
        'C' => ['Grade 11', 'Grade 12'],
    ];

    /**
     * SHS strands — each Grade 11/12 combination gets one row per strand.
     */
    private const SHS_STRANDS = ['ABM', 'HUMSS', 'HE', 'ICT', 'STEM'];

    /**
     * Base fees with JHS amounts (used for both A and B suffixes).
     * Format: [legacy_code, account_group, description, jhs_amount]
     */
    private const BASE_FEES = [
        ['TF001',  'Tuition Fee',        'Tuition Fee - Regular',       9000.00],
        ['TF001',  'Tuition Fee',        'Tuition Fee - ESC',              0.00],
        ['SF001',  'Standard Fees',      'Registration Fee',              75.00],
        ['SF002',  'Standard Fees',      'Medical/Dental Fee',            75.00],
        ['SF003',  'Standard Fees',      'Library Fee',                  100.00],
        ['SF004',  'Standard Fees',      'Laboratory Fee',                98.00],
        ['SF005',  'Standard Fees',      'Instructional Materials',      225.00],
        ['SF006',  'Standard Fees',      'Developmental Fee',            250.00],
        ['SF007',  'Standard Fees',      'Athletic/Cultural Fee',        100.00],
        ['NSF001', 'Non-standard Fees',  'Insurance Fee',                 30.00],
        ['NSF002', 'Non-standard Fees',  'Learning Modules',            600.00],
        ['NSF003', 'Non-standard Fees',  'CEAP',                         20.00],
        ['NSF004', 'Non-standard Fees',  'COE',                         115.00],
        ['NSF005', 'Non-standard Fees',  'Students-MIS',                 10.00],
        ['NSF006', 'Non-standard Fees',  'Computer and Internet Fee',     0.00],
        ['NSF007', 'Non-standard Fees',  'Energy Fee',                  304.00],
        ['NSF008', 'Non-standard Fees',  'Miscellaneous',               575.00],
        ['NSF009', 'Non-standard Fees',  'NIDACS',                      200.00],
        ['NSF010', 'Non-standard Fees',  'AIM/Cathedral',                10.00],
        ['OF001',  'Other Fees',         'Guard Fee',                   300.00],
        ['OF002',  'Other Fees',         'LMS',                        1200.00],
        ['OF003',  'Other Fees',         'RFID',                        500.00],
    ];

    /**
     * Fees that DON'T apply to Grade School (suffix A).
     * These are only available for JHS and SHS.
     */
    private const JHS_SHS_ONLY = [
        'SF003', 'SF004', 'SF006', 'SF007',
        'NSF002', 'NSF003', 'NSF004', 'NSF005', 'NSF006', 'NSF007', 'NSF009',
        'OF001', 'OF002', 'OF003',
    ];

    /**
     * SHS amount overrides (where SHS differs from JHS).
     * Format: legacy_code => shs_amount
     */
    private const SHS_OVERRIDES = [
        'TF001_Tuition Fee - Regular' => 15000.00,
        'TF001_Tuition Fee - ESC'     => null, // SHS doesn't have ESC
        'TF001_Tuition Fee - PRIVP'   => 1000.00, // SHS-only fee
        'SF001'                        => 200.00,
        'SF002'                        => 200.00,
        'SF003'                        => 175.00,
        'SF004'                        => 175.00,
        'SF006'                        => 350.00,
        'NSF006'                       => 911.00,
    ];

    /**
     * Grade 10 exceptions (different from other JHS grades).
     */
    private const GRADE10_OVERRIDES = [
        'SF004' => 1009.00, // Laboratory Fee
    ];

    /**
     * Extra SHS-only fees (Lab fees for specific strands).
     */
    private const SHS_EXTRA_FEES = [
        // [code, group, description, amount, strands[]]
        ['SF007', 'Standard Fees', 'Laboratory Fee HE',  800.00, ['HE']],
        ['SF007', 'Standard Fees', 'Laboratory Fee ICT', 800.00, ['ICT', 'STEM']],
    ];

    public function run(): void
    {
        // Build COA lookup: account_code => coa_id
        $coaLookup = ChartOfAccount::pluck('coa_id', 'account_code')->toArray();

        $created = 0;
        $skipped = 0;

        DB::transaction(function () use ($coaLookup, &$created, &$skipped) {

            // ── A) GRADE SCHOOL (suffix A) ── use JHS amounts
            foreach (self::GRADE_LEVELS['A'] as $grade) {
                foreach (self::BASE_FEES as [$legacyCode, $group, $desc, $amount]) {
                    // Skip fees not available for Grade School
                    if (in_array($legacyCode, self::JHS_SHS_ONLY)) {
                        continue;
                    }

                    $coaCode = $this->buildCoaCode($legacyCode, 'A');
                    $coaId = $coaLookup[$coaCode] ?? null;

                    if ($this->exists($grade, 'N/A', $coaCode, $desc)) {
                        $skipped++;
                        continue;
                    }

                    AccountsParticular::create([
                        'coa_id'         => $coaId,
                        'gradeLevel'     => $grade,
                        'strand'         => 'N/A',
                        'major'          => 'N/A',
                        'schoolYear'     => self::SCHOOL_YEAR,
                        'semester'       => self::SEMESTER,
                        'account_group'  => $group,
                        'account_code'   => $coaCode,
                        'description'    => $desc,
                        'amount'         => $amount,
                        'par_acct_class' => 'Assessment Account',
                        'status'         => 'Active',
                    ]);
                    $created++;
                }
            }
            $this->command->info("  Grade School: done");

            // ── B) JUNIOR HIGH SCHOOL (suffix B) ── use JHS amounts
            foreach (self::GRADE_LEVELS['B'] as $grade) {
                foreach (self::BASE_FEES as [$legacyCode, $group, $desc, $amount]) {
                    $coaCode = $this->buildCoaCode($legacyCode, 'B');
                    $coaId = $coaLookup[$coaCode] ?? null;

                    // Grade 10 override
                    $finalAmount = $amount;
                    if ($grade === 'Grade 10' && isset(self::GRADE10_OVERRIDES[$legacyCode])) {
                        $finalAmount = self::GRADE10_OVERRIDES[$legacyCode];
                    }

                    if ($this->exists($grade, 'N/A', $coaCode, $desc)) {
                        $skipped++;
                        continue;
                    }

                    AccountsParticular::create([
                        'coa_id'         => $coaId,
                        'gradeLevel'     => $grade,
                        'strand'         => 'N/A',
                        'major'          => 'N/A',
                        'schoolYear'     => self::SCHOOL_YEAR,
                        'semester'       => self::SEMESTER,
                        'account_group'  => $group,
                        'account_code'   => $coaCode,
                        'description'    => $desc,
                        'amount'         => $finalAmount,
                        'par_acct_class' => 'Assessment Account',
                        'status'         => 'Active',
                    ]);
                    $created++;
                }
            }
            $this->command->info("  Junior High School: done");

            // ── C) SENIOR HIGH SCHOOL (suffix C) ── per strand
            foreach (self::GRADE_LEVELS['C'] as $grade) {
                foreach (self::SHS_STRANDS as $strand) {
                    // Base fees
                    foreach (self::BASE_FEES as [$legacyCode, $group, $desc, $jhsAmount]) {
                        $coaCode = $this->buildCoaCode($legacyCode, 'C');
                        $coaId = $coaLookup[$coaCode] ?? null;

                        // Check SHS overrides
                        $overrideKey = $legacyCode . '_' . $desc;
                        if (array_key_exists($overrideKey, self::SHS_OVERRIDES)) {
                            if (self::SHS_OVERRIDES[$overrideKey] === null) {
                                continue; // skip this fee for SHS
                            }
                            $finalAmount = self::SHS_OVERRIDES[$overrideKey];
                        } elseif (array_key_exists($legacyCode, self::SHS_OVERRIDES)) {
                            $finalAmount = self::SHS_OVERRIDES[$legacyCode];
                        } else {
                            $finalAmount = $jhsAmount;
                        }

                        if ($this->exists($grade, $strand, $coaCode, $desc)) {
                            $skipped++;
                            continue;
                        }

                        AccountsParticular::create([
                            'coa_id'         => $coaId,
                            'gradeLevel'     => $grade,
                            'strand'         => $strand,
                            'major'          => 'N/A',
                            'schoolYear'     => self::SCHOOL_YEAR,
                            'semester'       => self::SEMESTER,
                            'account_group'  => $group,
                            'account_code'   => $coaCode,
                            'description'    => $desc,
                            'amount'         => $finalAmount,
                            'par_acct_class' => 'Assessment Account',
                            'status'         => 'Active',
                        ]);
                        $created++;
                    }

                    // SHS PRIVP tuition (extra line)
                    $privpCode = $this->buildCoaCode('TF001', 'C');
                    $privpCoaId = $coaLookup[$privpCode] ?? null;
                    if (!$this->exists($grade, $strand, $privpCode, 'Tuition Fee - PRIVP')) {
                        AccountsParticular::create([
                            'coa_id'         => $privpCoaId,
                            'gradeLevel'     => $grade,
                            'strand'         => $strand,
                            'major'          => 'N/A',
                            'schoolYear'     => self::SCHOOL_YEAR,
                            'semester'       => self::SEMESTER,
                            'account_group'  => 'Tuition Fee',
                            'account_code'   => $privpCode,
                            'description'    => 'Tuition Fee - PRIVP',
                            'amount'         => 1000.00,
                            'par_acct_class' => 'Assessment Account',
                            'status'         => 'Active',
                        ]);
                        $created++;
                    } else {
                        $skipped++;
                    }

                    // Extra lab fees for specific strands
                    foreach (self::SHS_EXTRA_FEES as [$extraCode, $extraGroup, $extraDesc, $extraAmt, $extraStrands]) {
                        if (!in_array($strand, $extraStrands)) {
                            continue;
                        }

                        $coaCode = $this->buildCoaCode($extraCode, 'C');
                        $coaId = $coaLookup[$coaCode] ?? null;

                        if ($this->exists($grade, $strand, $coaCode, $extraDesc)) {
                            $skipped++;
                            continue;
                        }

                        AccountsParticular::create([
                            'coa_id'         => $coaId,
                            'gradeLevel'     => $grade,
                            'strand'         => $strand,
                            'major'          => 'N/A',
                            'schoolYear'     => self::SCHOOL_YEAR,
                            'semester'       => self::SEMESTER,
                            'account_group'  => $extraGroup,
                            'account_code'   => $coaCode,
                            'description'    => $extraDesc,
                            'amount'         => $extraAmt,
                            'par_acct_class' => 'Assessment Account',
                            'status'         => 'Active',
                        ]);
                        $created++;
                    }
                }
            }
            $this->command->info("  Senior High School: done");
        });

        $this->command->newLine();
        $this->command->info("Particulars seeded. Created: {$created} | Skipped (existing): {$skipped}");
    }

    /**
     * Convert legacy code (e.g. "NSF001") to COA child code (e.g. "NSF-001-B").
     */
    private function buildCoaCode(string $legacyCode, string $suffix): string
    {
        preg_match('/^([A-Z]+)(\d+)$/', $legacyCode, $m);
        return $m[1] . '-' . $m[2] . '-' . $suffix;
    }

    /**
     * Check if particular already exists (idempotent).
     */
    private function exists(string $grade, string $strand, string $code, string $desc): bool
    {
        return AccountsParticular::where('gradeLevel', $grade)
            ->where('strand', $strand)
            ->where('account_code', $code)
            ->where('description', $desc)
            ->where('schoolYear', self::SCHOOL_YEAR)
            ->exists();
    }
}
