<?php

namespace Database\Seeders;

use App\Models\ChartOfAccount;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds the chart_of_accounts table with distinct particulars from the
 * legacy 2025-2026 data.
 *
 * Parent accounts use PREFIX-NUMBER format (e.g. NSF-001).
 * Child accounts add a department suffix: A = Grade School, B = JHS, C = SHS.
 *
 * Idempotent: skips any account_code that already exists.
 */
class ChartOfAccountsSeeder extends Seeder
{
    /**
     * Suffix → department mapping.
     */
    private const DEPT_SUFFIXES = [
        'A' => 'Grade School',
        'B' => 'Junior High School',
        'C' => 'Senior High School',
    ];

    /**
     * Canonical particulars to import (from 2025-2026 legacy data).
     *
     * Each entry: [legacy_code, prefix, number, account_name, departments[]]
     *   departments = which department suffixes to create children for.
     */
    private const PARTICULARS = [
        // ── Tuition Fee ──
        ['TF001',  'TF',  '001', 'Tuition Fee',                ['A', 'B', 'C']],

        // ── Standard Fees ──
        ['SF001',  'SF',  '001', 'Registration Fee',           ['A', 'B', 'C']],
        ['SF002',  'SF',  '002', 'Medical/Dental Fee',         ['A', 'B', 'C']],
        ['SF003',  'SF',  '003', 'Library Fee',                ['B', 'C']],
        ['SF004',  'SF',  '004', 'Laboratory Fee',             ['B', 'C']],
        ['SF005',  'SF',  '005', 'Instructional Materials',    ['A', 'B', 'C']],
        ['SF006',  'SF',  '006', 'Developmental Fee',          ['B', 'C']],
        ['SF007',  'SF',  '007', 'Athletic/Cultural Fee',      ['B', 'C']],

        // ── Non-standard Fees ──
        ['NSF001', 'NSF', '001', 'Insurance Fee',              ['A', 'B', 'C']],
        ['NSF002', 'NSF', '002', 'Learning Modules',           ['B', 'C']],
        ['NSF003', 'NSF', '003', 'CEAP',                       ['B', 'C']],
        ['NSF004', 'NSF', '004', 'COE',                        ['B', 'C']],
        ['NSF005', 'NSF', '005', 'Students-MIS',               ['B', 'C']],
        ['NSF006', 'NSF', '006', 'Computer and Internet Fee',  ['B', 'C']],
        ['NSF007', 'NSF', '007', 'Energy Fee',                 ['B', 'C']],
        ['NSF008', 'NSF', '008', 'Miscellaneous',              ['A', 'B', 'C']],
        ['NSF009', 'NSF', '009', 'NIDACS',                     ['B', 'C']],
        ['NSF010', 'NSF', '010', 'AIM/Cathedral',              ['A', 'B', 'C']],

        // ── Other Fees ──
        ['OF001',  'OF',  '001', 'Guard Fee',                  ['B', 'C']],
        ['OF002',  'OF',  '002', 'LMS',                        ['B', 'C']],
        ['OF003',  'OF',  '003', 'RFID',                       ['B', 'C']],
    ];

    public function run(): void
    {
        $created  = 0;
        $skipped  = 0;

        DB::transaction(function () use (&$created, &$skipped) {
            foreach (self::PARTICULARS as [$legacyCode, $prefix, $number, $name, $depts]) {
                $parentCode = "{$prefix}-{$number}";

                // ── Create or find parent ──
                $parent = ChartOfAccount::where('account_code', $parentCode)->first();

                if (!$parent) {
                    $parent = ChartOfAccount::create([
                        'account_code'  => $parentCode,
                        'account_name'  => $name,
                        'account_type'  => 'Revenue',
                        'code_prefix'   => $prefix,
                        'code_number'   => $number,
                        'code_suffix'   => null,
                        'parent_id'     => null,
                        'description'   => null,
                        'is_active'     => true,
                        'is_header'     => false,
                    ]);
                    $created++;
                    $this->command->info("  + Parent: {$parentCode} — {$name}");
                } else {
                    $skipped++;
                    $this->command->warn("  ⊘ Parent exists: {$parentCode}");
                }

                // ── Create children per department ──
                foreach ($depts as $suffix) {
                    $childCode = "{$prefix}-{$number}-{$suffix}";

                    if (ChartOfAccount::where('account_code', $childCode)->exists()) {
                        $skipped++;
                        $this->command->warn("  ⊘ Child exists: {$childCode}");
                        continue;
                    }

                    ChartOfAccount::create([
                        'account_code'  => $childCode,
                        'account_name'  => $name,
                        'account_type'  => 'Revenue',
                        'code_prefix'   => $prefix,
                        'code_number'   => $number,
                        'code_suffix'   => $suffix,
                        'parent_id'     => $parent->coa_id,
                        'description'   => self::DEPT_SUFFIXES[$suffix],
                        'is_active'     => true,
                        'is_header'     => false,
                    ]);
                    $created++;
                    $this->command->info("    + Child: {$childCode} ({$suffix} = " . self::DEPT_SUFFIXES[$suffix] . ')');
                }
            }
        });

        $this->command->newLine();
        $this->command->info("Done. Created: {$created} | Skipped (existing): {$skipped}");
    }
}
