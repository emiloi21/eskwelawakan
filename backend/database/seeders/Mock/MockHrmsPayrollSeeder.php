<?php

namespace Database\Seeders\Mock;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * MockHrmsPayrollSeeder
 *
 * Extends the existing HrmsSeeder data with:
 *  1. Additional leave applications for all seeded personnel
 *  2. Attendance kiosk logs for past ~ 90 business days
 *  3. Payroll salary settings per personnel
 *  4. One regular semi-monthly payroll template (if absent)
 *  5. Two complete payroll periods (June 1-15, June 16-30 2025)
 *     with payroll_items computed per employee
 *  6. One payroll period in "for_approval" status (July 1-15)
 *
 * Idempotent: guards all creates with count() > N checks.
 *
 * PHilHealth: 5% / 2 each side, cap 5000/yr (250 each side per cut-off)
 * PAG-IBIG: 2% employee (max 100), 2% employer (max 100)
 * SSS 2025: simplified flat rate for seeder purposes (based on MSC range)
 */
class MockHrmsPayrollSeeder extends Seeder
{
    // ── Position salary map (basic monthly pay in PHP) ───────────────────────
    private const POSITION_SALARIES = [
        'Principal'               => 65000.00,
        'Assistant Principal'     => 55000.00,
        'Head Teacher'            => 45000.00,
        'Teacher I'               => 28000.00,
        'Teacher II'              => 32000.00,
        'Teacher III'             => 36000.00,
        'School Nurse'            => 30000.00,
        'Administrative Assistant'=> 22000.00,
        'Cashier'                 => 24000.00,
        'Registrar'               => 30000.00,
        'Accountant'              => 35000.00,
        'HR Officer'              => 30000.00,
        'IT Specialist'           => 32000.00,
        'Librarian'               => 25000.00,
        'Security Guard'          => 18000.00,
        'Utility Personnel'       => 16000.00,
    ];

    // ── Allowances per employment type ───────────────────────────────────────
    private const REGULAR_ALLOWANCES = [
        'transportation_allowance' => 2000.00,
        'rice_allowance'           => 1500.00,
        'clothing_allowance'       => 500.00,
        'communication_allowance'  => 400.00,
        'medical_allowance'        => 300.00,
    ];

    private const CONTRACTUAL_ALLOWANCES = [
        'transportation_allowance' => 1000.00,
        'rice_allowance'           => 1000.00,
        'clothing_allowance'       => 0.00,
        'communication_allowance'  => 0.00,
        'medical_allowance'        => 0.00,
    ];

    // ── Leave type definitions ───────────────────────────────────────────────
    private const LEAVE_TYPES = [
        ['name' => 'Vacation Leave',        'days_per_year' => 15, 'is_paid' => true],
        ['name' => 'Sick Leave',            'days_per_year' => 15, 'is_paid' => true],
        ['name' => 'Emergency Leave',       'days_per_year' => 5,  'is_paid' => true],
        ['name' => 'Maternity Leave',       'days_per_year' => 105,'is_paid' => true],
        ['name' => 'Paternity Leave',       'days_per_year' => 7,  'is_paid' => true],
        ['name' => 'Unpaid Leave',          'days_per_year' => 0,  'is_paid' => false],
    ];

    // ── Additional leave application templates ───────────────────────────────
    private const LEAVE_SCENARIOS = [
        // [type_name, start_offset_from_SY, total_days, status, reason]
        ['Vacation Leave',  20, 3.0, 'Approved', 'Family vacation during break.'],
        ['Sick Leave',      35, 2.0, 'Approved', 'Flu with medical certificate attached.'],
        ['Emergency Leave',  8, 1.0, 'Approved', 'Family emergency – hospitalization of parent.'],
        ['Sick Leave',      50, 1.0, 'Rejected', 'No medical certificate submitted.'],
        ['Vacation Leave',  60, 5.0, 'Pending',  'Approved trip abroad.'],
        ['Emergency Leave', 15, 2.0, 'Approved', 'Attendance for parent\'s funeral.'],
        ['Unpaid Leave',    70, 5.0, 'Pending',  'Personal reasons.'],
    ];

    // ── Entry point ──────────────────────────────────────────────────────────

    public function run(): void
    {
        $adminUserId = DB::table('users')->where('access', 'Administrator')->value('id') ?? 1;
        $personnel   = DB::table('hrms_personnel')->where('status', 'Active')->get();

        if ($personnel->isEmpty()) {
            $this->command->warn("  ⚠ No active personnel found. Run HrmsSeeder first.");
            return;
        }

        $this->command->info("  Seeding leave types and applications…");
        $leaveTypes = $this->seedLeaveTypesIfNeeded();
        $this->seedLeaveApplications($personnel, $leaveTypes, $adminUserId);

        $this->command->info("  Seeding personnel attendance kiosk logs…");
        $this->seedAttendanceLogs($personnel);

        $this->command->info("  Seeding payroll salary settings…");
        $this->seedSalarySetting($personnel);

        $this->command->info("  Seeding payroll template…");
        $templateId = $this->seedPayrollTemplate();

        $this->command->info("  Seeding payroll periods and items…");
        $this->seedPayrollPeriods($personnel, $templateId, $adminUserId);
    }

    // ── Leave types ──────────────────────────────────────────────────────────

    private function seedLeaveTypesIfNeeded(): \Illuminate\Support\Collection
    {
        foreach (self::LEAVE_TYPES as $def) {
            $exists = DB::table('leave_types')->where('name', $def['name'])->exists();
            if (!$exists) {
                DB::table('leave_types')->insert([
                    'public_id'    => Str::random(20),
                    'name'         => $def['name'],
                    'days_per_year'=> $def['days_per_year'],
                    'is_paid'      => $def['is_paid'],
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ]);
            }
        }

        return DB::table('leave_types')->get()->keyBy('name');
    }

    // ── Leave applications ───────────────────────────────────────────────────

    private function seedLeaveApplications(
        \Illuminate\Support\Collection $personnel,
        \Illuminate\Support\Collection $leaveTypes,
        int $adminUserId
    ): void {
        if (DB::table('leave_applications')->count() >= $personnel->count()) {
            $this->command->line("  ⊘ Leave applications already seeded, skipping.");
            return;
        }

        $syStart = Carbon::create(2025, 6, 9);
        $inserted = 0;

        foreach ($personnel as $person) {
            // Each person gets 2-3 random leave scenarios
            $scenarios = array_slice(self::LEAVE_SCENARIOS, 0, mt_rand(2, 3));

            foreach ($scenarios as [$typeName, $startOffset, $days, $status, $reason]) {
                $type = $leaveTypes->get($typeName);
                if (!$type) {
                    continue;
                }

                $startDate = $syStart->copy()->addDays($startOffset + mt_rand(0, 5));
                $endDate   = $startDate->copy()->addDays((int) $days - 1);

                // Avoid duplicate (personnel_id + leave_type_id + start_date)
                $exists = DB::table('leave_applications')
                    ->where('personnel_id', $person->id)
                    ->where('leave_type_id', $type->id)
                    ->where('start_date', $startDate->toDateString())
                    ->exists();
                if ($exists) {
                    continue;
                }

                DB::table('leave_applications')->insert([
                    'public_id'       => Str::random(20),
                    'personnel_id'    => $person->id,
                    'leave_type_id'   => $type->id,
                    'start_date'      => $startDate->toDateString(),
                    'end_date'        => $endDate->toDateString(),
                    'total_days'      => $days,
                    'reason'          => $reason,
                    'status'          => $status,
                    'approved_by'     => in_array($status, ['Approved', 'Rejected']) ? $adminUserId : null,
                    'approver_remarks'=> $status === 'Rejected' ? 'Insufficient documentation provided.' : null,
                    'created_at'      => $startDate->copy()->subDays(7)->toDateTimeString(),
                    'updated_at'      => now(),
                ]);
                $inserted++;
            }
        }

        $this->command->line("  ✓ Leave applications inserted: {$inserted}");
    }

    // ── Attendance kiosk logs ─────────────────────────────────────────────────

    private function seedAttendanceLogs(\Illuminate\Support\Collection $personnel): void
    {
        if (DB::table('attendance_logs')->where('entity_type', 'personnel')->count() > 50) {
            $this->command->line("  ⊘ Personnel attendance logs already seeded, skipping.");
            return;
        }

        $batch   = [];
        $syStart = Carbon::create(2025, 6, 9);
        $today   = Carbon::now()->startOfDay();
        $days    = 0;
        $cursor  = $syStart->copy();

        while ($cursor->lessThan($today) && $days < 90) {
            if ($cursor->isWeekend()) {
                $cursor->addDay();
                continue;
            }

            foreach ($personnel as $person) {
                // 95% attendance rate
                if (mt_rand(1, 100) <= 5) {
                    $cursor->addDay();
                    continue;
                }

                $inHour  = mt_rand(0, 100) < 85 ? 7 : 8;   // 85% arrive 7am, 15% arrive 8am
                $inMin   = mt_rand(0, 59);

                // Morning in
                $batch[] = [
                    'public_id'   => Str::random(20),
                    'entity_type' => 'personnel',
                    'entity_id'   => $person->employee_id,
                    'log_time'    => $cursor->copy()->setTime($inHour, $inMin)->toDateTimeString(),
                    'direction'   => 'in',
                    'method'      => 'kiosk',
                    'notes'       => null,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ];

                // Afternoon out
                $outHour = mt_rand(0, 100) < 90 ? 17 : 16;
                $outMin  = mt_rand(0, 59);

                $batch[] = [
                    'public_id'   => Str::random(20),
                    'entity_type' => 'personnel',
                    'entity_id'   => $person->employee_id,
                    'log_time'    => $cursor->copy()->setTime($outHour, $outMin)->toDateTimeString(),
                    'direction'   => 'out',
                    'method'      => 'kiosk',
                    'notes'       => null,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ];

                if (count($batch) >= 200) {
                    DB::table('attendance_logs')->insertOrIgnore($batch);
                    $batch = [];
                }
            }

            $cursor->addDay();
            $days++;
        }

        if (!empty($batch)) {
            DB::table('attendance_logs')->insertOrIgnore($batch);
        }

        $this->command->line("  ✓ Personnel attendance logs inserted for {$days} working days.");
    }

    // ── Payroll salary settings ───────────────────────────────────────────────

    private function seedSalarySetting(\Illuminate\Support\Collection $personnel): void
    {
        if (DB::table('payroll_salary_settings')->count() >= $personnel->count()) {
            $this->command->line("  ⊘ Payroll salary settings already seeded, skipping.");
            return;
        }

        $inserted = 0;
        foreach ($personnel as $person) {
            $exists = DB::table('payroll_salary_settings')
                ->where('personnel_id', $person->id)
                ->exists();
            if ($exists) {
                continue;
            }

            // Look up position name to get base salary
            $posName = DB::table('hrms_positions')->where('id', $person->position_id)->value('name') ?? '';
            $basicPay = 0.0;
            foreach (self::POSITION_SALARIES as $key => $val) {
                if (stripos($posName, $key) !== false) {
                    $basicPay = $val;
                    break;
                }
            }
            if ($basicPay == 0.0) {
                $basicPay = 26000.00; // default fallback
            }

            $allowances = $person->employment_type === 'Regular'
                ? self::REGULAR_ALLOWANCES
                : self::CONTRACTUAL_ALLOWANCES;

            DB::table('payroll_salary_settings')->insert([
                'public_id'                => Str::random(20),
                'personnel_id'             => $person->id,
                'pay_frequency'            => 'semi-monthly',
                'basic_monthly_pay'        => $basicPay,
                'transportation_allowance' => $allowances['transportation_allowance'],
                'rice_allowance'           => $allowances['rice_allowance'],
                'clothing_allowance'       => $allowances['clothing_allowance'],
                'communication_allowance'  => $allowances['communication_allowance'],
                'medical_allowance'        => $allowances['medical_allowance'],
                'other_allowance_label'    => null,
                'other_allowance'          => 0.00,
                'sss_loan_monthly'         => 0.00,
                'pagibig_loan_monthly'     => 0.00,
                'salary_advance_monthly'   => 0.00,
                'effective_date'           => '2025-06-01',
                'notes'                    => null,
                'created_at'               => now(),
                'updated_at'               => now(),
            ]);
            $inserted++;
        }

        $this->command->line("  ✓ Payroll salary settings inserted: {$inserted}");
    }

    // ── Payroll template ─────────────────────────────────────────────────────

    private function seedPayrollTemplate(): int
    {
        $existing = DB::table('payroll_templates')
            ->where('name', 'Regular Semi-Monthly Payroll')
            ->value('id');
        if ($existing) {
            $this->command->line("  ⊘ Payroll template already exists, using existing.");
            return $existing;
        }

        $id = DB::table('payroll_templates')->insertGetId([
            'public_id'                  => Str::random(20),
            'name'                       => 'Regular Semi-Monthly Payroll',
            'type'                       => 'regular',
            'description'                => 'Standard semi-monthly payroll for all regular and contractual personnel.',
            'include_basic'              => true,
            'include_transportation'     => true,
            'include_rice'               => true,
            'include_clothing'           => true,
            'include_communication'      => true,
            'include_medical'            => true,
            'include_other_allowance'    => false,
            'custom_earning_label'       => null,
            'custom_earning_taxable'     => true,
            'deduct_sss'                 => true,
            'deduct_philhealth'          => true,
            'deduct_pagibig'             => true,
            'deduct_tax'                 => true,
            'deduct_loans'               => true,
            'auto_compute_thirteenth'    => false,
            'allow_individual_override'  => true,
            'is_active'                  => true,
            'created_at'                 => now(),
            'updated_at'                 => now(),
        ]);

        $this->command->line("  ✓ Payroll template created.");
        return $id;
    }

    // ── Payroll periods and items ─────────────────────────────────────────────

    private function seedPayrollPeriods(
        \Illuminate\Support\Collection $personnel,
        int $templateId,
        int $adminUserId
    ): void {
        if (DB::table('payroll_periods')->count() >= 2) {
            $this->command->line("  ⊘ Payroll periods already seeded, skipping.");
            return;
        }

        $periods = [
            [
                'label'   => 'June 1–15, 2025 (1st Cutoff)',
                'start'   => '2025-06-01',
                'end'     => '2025-06-15',
                'payout'  => '2025-06-20',
                'status'  => 'posted',
            ],
            [
                'label'   => 'June 16–30, 2025 (2nd Cutoff)',
                'start'   => '2025-06-16',
                'end'     => '2025-06-30',
                'payout'  => '2025-07-05',
                'status'  => 'posted',
            ],
            [
                'label'   => 'July 1–15, 2025 (1st Cutoff)',
                'start'   => '2025-07-01',
                'end'     => '2025-07-15',
                'payout'  => null,
                'status'  => 'for_approval',
            ],
        ];

        foreach ($periods as $periodDef) {
            $period = DB::table('payroll_periods')
                ->where('period_label', $periodDef['label'])
                ->first();
            if ($period) {
                continue;
            }

            $items = $this->buildPayrollItems($personnel, $periodDef['start']);

            $totals = $this->sumTotals($items);

            $periodId = DB::table('payroll_periods')->insertGetId([
                'public_id'                   => Str::random(20),
                'template_id'                 => $templateId,
                'school_year'                 => '2025-2026',
                'period_label'                => $periodDef['label'],
                'period_start'                => $periodDef['start'],
                'period_end'                  => $periodDef['end'],
                'payout_date'                 => $periodDef['payout'],
                'status'                      => $periodDef['status'],
                'total_basic_pay'             => $totals['basic'],
                'total_allowances'            => $totals['allowances'],
                'total_gross_pay'             => $totals['gross'],
                'total_sss_employee'          => $totals['sss_emp'],
                'total_philhealth_employee'   => $totals['ph_emp'],
                'total_pagibig_employee'      => $totals['pagibig_emp'],
                'total_withholding_tax'       => $totals['tax'],
                'total_other_deductions'      => 0.00,
                'total_net_pay'               => $totals['net'],
                'total_employer_sss'          => $totals['sss_er'],
                'total_employer_philhealth'   => $totals['ph_er'],
                'total_employer_pagibig'      => $totals['pagibig_er'],
                'created_by'                  => $adminUserId,
                'submitted_at'                => in_array($periodDef['status'], ['for_approval', 'approved', 'posted']) ? Carbon::parse($periodDef['end'])->addDay()->toDateTimeString() : null,
                'approved_by'                 => in_array($periodDef['status'], ['approved', 'posted']) ? $adminUserId : null,
                'approved_at'                 => in_array($periodDef['status'], ['approved', 'posted']) ? Carbon::parse($periodDef['end'])->addDays(3)->toDateTimeString() : null,
                'posted_by'                   => $periodDef['status'] === 'posted' ? $adminUserId : null,
                'posted_at'                   => $periodDef['status'] === 'posted' ? Carbon::parse($periodDef['payout'] ?? $periodDef['end'])->addDay()->toDateTimeString() : null,
                'je_id'                       => null,
                'notes'                       => null,
                'created_at'                  => now(),
                'updated_at'                  => now(),
            ]);

            // Insert payroll items
            $itemBatch = [];
            foreach ($items as $item) {
                $item['public_id']          = Str::random(20);
                $item['payroll_period_id']  = $periodId;
                $item['created_at']         = now();
                $item['updated_at']         = now();
                $itemBatch[]                = $item;
            }

            foreach (array_chunk($itemBatch, 50) as $chunk) {
                DB::table('payroll_items')->insertOrIgnore($chunk);
            }

            $this->command->line("  ✓ Period '{$periodDef['label']}' inserted ({$periodDef['status']}).");
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Build computed payroll item array per person without DB writes.
     */
    private function buildPayrollItems(\Illuminate\Support\Collection $personnel, string $periodStart): array
    {
        $settings = DB::table('payroll_salary_settings')
            ->whereIn('personnel_id', $personnel->pluck('id'))
            ->get()
            ->keyBy('personnel_id');

        $items = [];
        foreach ($personnel as $person) {
            $setting = $settings->get($person->id);

            $basicMonthly   = $setting ? (float) $setting->basic_monthly_pay : 26000.00;
            $basicHalfMonth = round($basicMonthly / 2, 2);

            $transAllowHalf  = $setting ? round((float) $setting->transportation_allowance / 2, 2) : 1000.00;
            $riceAllowHalf   = $setting ? round((float) $setting->rice_allowance / 2, 2) : 750.00;
            $clothingHalf    = $setting ? round((float) $setting->clothing_allowance / 2, 2) : 250.00;
            $commsHalf       = $setting ? round((float) $setting->communication_allowance / 2, 2) : 200.00;
            $medHalf         = $setting ? round((float) $setting->medical_allowance / 2, 2) : 150.00;

            $totalAllowances = $transAllowHalf + $riceAllowHalf + $clothingHalf + $commsHalf + $medHalf;
            $grossPay        = $basicHalfMonth + $totalAllowances;

            // Government deductions – approximations for seeder purposes
            // SSS: simplified flat per MSC range
            $sssEmp = $this->computeSss($basicMonthly);
            // PhilHealth: 2.5% of basic monthly, each side, capped
            $phEmp  = min(round($basicMonthly * 0.025 / 2, 2), 250.00);
            $phEr   = $phEmp;
            // PAG-IBIG: 2% of basic, max 100 per cutoff
            $pagibigEmp = min(round($basicHalfMonth * 0.02, 2), 100.00);
            $pagibigEr  = $pagibigEmp;

            // Loans from settings
            $sssLoan    = $setting ? round((float) $setting->sss_loan_monthly / 2, 2) : 0.00;
            $pagibigLoan= $setting ? round((float) $setting->pagibig_loan_monthly / 2, 2) : 0.00;
            $salAdv     = $setting ? round((float) $setting->salary_advance_monthly / 2, 2) : 0.00;

            // Withholding tax: simplified for seeder
            $monthlyTaxable = $basicMonthly - ($sssEmp * 2) - ($phEmp * 2) - ($pagibigEmp * 2);
            $wht            = round($this->computeWithholdingTax($monthlyTaxable) / 2, 2);

            $totalEmpDeductions = $sssEmp + $phEmp + $pagibigEmp + $wht + $sssLoan + $pagibigLoan + $salAdv;
            $netPay             = max(0, $grossPay - $totalEmpDeductions);

            $items[] = [
                'personnel_id'            => $person->id,
                'basic_pay'               => $basicHalfMonth,
                'transportation_allowance'=> $transAllowHalf,
                'rice_allowance'          => $riceAllowHalf,
                'clothing_allowance'      => $clothingHalf,
                'communication_allowance' => $commsHalf,
                'medical_allowance'       => $medHalf,
                'other_allowance'         => 0.00,
                'other_allowance_label'   => null,
                'custom_earning'          => 0.00,
                'custom_earning_label'    => null,
                'overtime_hours'          => 0.00,
                'overtime_pay'            => 0.00,
                'gross_pay'               => $grossPay,
                'sss_employee'            => $sssEmp,
                'philhealth_employee'     => $phEmp,
                'pagibig_employee'        => $pagibigEmp,
                'withholding_tax'         => $wht,
                'sss_employer'            => $sssEmp,      // matching employee contribution
                'philhealth_employer'     => $phEr,
                'pagibig_employer'        => $pagibigEr,
                'sss_loan'                => $sssLoan,
                'pagibig_loan'            => $pagibigLoan,
                'salary_advance'          => $salAdv,
                'other_deductions'        => 0.00,
                'other_deductions_label'  => null,
                'days_worked'             => null,
                'late_hours'              => 0.00,
                'absent_deduction'        => 0.00,
                'total_employee_deductions'=> $totalEmpDeductions,
                'net_pay'                 => $netPay,
                'is_included'             => true,
                'is_manually_edited'      => false,
                'remarks'                 => null,
            ];
        }

        return $items;
    }

    private function sumTotals(array $items): array
    {
        $t = [
            'basic' => 0.0, 'allowances' => 0.0, 'gross' => 0.0,
            'sss_emp' => 0.0, 'ph_emp' => 0.0, 'pagibig_emp' => 0.0,
            'tax' => 0.0, 'net' => 0.0,
            'sss_er' => 0.0, 'ph_er' => 0.0, 'pagibig_er' => 0.0,
        ];
        foreach ($items as $item) {
            $t['basic']       += $item['basic_pay'];
            $t['allowances']  += $item['transportation_allowance'] + $item['rice_allowance']
                                  + $item['clothing_allowance'] + $item['communication_allowance']
                                  + $item['medical_allowance'];
            $t['gross']       += $item['gross_pay'];
            $t['sss_emp']     += $item['sss_employee'];
            $t['ph_emp']      += $item['philhealth_employee'];
            $t['pagibig_emp'] += $item['pagibig_employee'];
            $t['tax']         += $item['withholding_tax'];
            $t['net']         += $item['net_pay'];
            $t['sss_er']      += $item['sss_employer'];
            $t['ph_er']       += $item['philhealth_employer'];
            $t['pagibig_er']  += $item['pagibig_employer'];
        }
        return array_map(fn($v) => round($v, 2), $t);
    }

    /** Simplified SSS computation (2025 rates, per semi-monthly) */
    private function computeSss(float $basicMonthly): float
    {
        if ($basicMonthly < 4250)       return 180.00;
        if ($basicMonthly < 6250)       return 225.00;
        if ($basicMonthly < 8250)       return 270.00;
        if ($basicMonthly < 10250)      return 315.00;
        if ($basicMonthly < 12250)      return 360.00;
        if ($basicMonthly < 14250)      return 405.00;
        if ($basicMonthly < 16250)      return 450.00;
        if ($basicMonthly < 18250)      return 495.00;
        if ($basicMonthly < 20250)      return 540.00;
        if ($basicMonthly < 25250)      return 607.50;
        if ($basicMonthly < 30250)      return 675.00;
        if ($basicMonthly < 35250)      return 742.50;
        return 900.00;
    }

    /** Simplified semi-annual BIR withholding tax (2025 TRAIN law) */
    private function computeWithholdingTax(float $monthlyTaxable): float
    {
        if ($monthlyTaxable <= 20833)   return 0.0;
        if ($monthlyTaxable <= 33333)   return round(($monthlyTaxable - 20833) * 0.20, 2);
        if ($monthlyTaxable <= 66667)   return round(2500 + ($monthlyTaxable - 33333) * 0.25, 2);
        if ($monthlyTaxable <= 166667)  return round(10833.33 + ($monthlyTaxable - 66667) * 0.30, 2);
        if ($monthlyTaxable <= 666667)  return round(40833.33 + ($monthlyTaxable - 166667) * 0.32, 2);
        return round(200833.33 + ($monthlyTaxable - 666667) * 0.35, 2);
    }
}
