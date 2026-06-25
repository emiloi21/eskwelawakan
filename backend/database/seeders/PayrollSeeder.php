<?php

namespace Database\Seeders;

use App\Models\HrmsPersonnel;
use App\Models\HrmsPosition;
use App\Models\PayrollCoaMap;
use App\Models\PayrollPositionRate;
use App\Models\PayrollSalarySetting;
use App\Models\PayrollTemplate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PayrollSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        // ─────────────────────────────────────────────────────────────────────
        // SSS Contribution Table 2025 (Republic Act 11199 / SSS Circular 2023-009)
        // ─────────────────────────────────────────────────────────────────────
        DB::table('payroll_sss_brackets')->truncate();
        $sss = [
            [1000,    3249.99,  3000,   135,   270,   10, 0,   0],
            [3250,    3749.99,  3500,   157.5, 315,   10, 0,   0],
            [3750,    4249.99,  4000,   180,   360,   10, 0,   0],
            [4250,    4749.99,  4500,   202.5, 405,   10, 0,   0],
            [4750,    5249.99,  5000,   225,   450,   10, 0,   0],
            [5250,    5749.99,  5500,   247.5, 495,   10, 0,   0],
            [5750,    6249.99,  6000,   270,   540,   10, 0,   0],
            [6250,    6749.99,  6500,   292.5, 585,   10, 0,   0],
            [6750,    7249.99,  7000,   315,   630,   10, 0,   0],
            [7250,    7749.99,  7500,   337.5, 675,   10, 0,   0],
            [7750,    8249.99,  8000,   360,   720,   10, 0,   0],
            [8250,    8749.99,  8500,   382.5, 765,   10, 0,   0],
            [8750,    9249.99,  9000,   405,   810,   10, 0,   0],
            [9250,    9749.99,  9500,   427.5, 855,   10, 0,   0],
            [9750,    10249.99, 10000,  450,   900,   10, 0,   0],
            [10250,   10749.99, 10500,  472.5, 945,   10, 0,   0],
            [10750,   11249.99, 11000,  495,   990,   10, 0,   0],
            [11250,   11749.99, 11500,  517.5, 1035,  10, 0,   0],
            [11750,   12249.99, 12000,  540,   1080,  10, 0,   0],
            [12250,   12749.99, 12500,  562.5, 1125,  10, 0,   0],
            [12750,   13249.99, 13000,  585,   1170,  10, 0,   0],
            [13250,   13749.99, 13500,  607.5, 1215,  10, 0,   0],
            [13750,   14249.99, 14000,  630,   1260,  10, 0,   0],
            [14250,   14749.99, 14500,  652.5, 1305,  10, 0,   0],
            [14750,   15249.99, 15000,  675,   1350,  10, 0,   0],
            [15250,   15749.99, 15500,  697.5, 1395,  10, 0,   0],
            [15750,   16249.99, 16000,  720,   1440,  10, 0,   0],
            [16250,   16749.99, 16500,  742.5, 1485,  10, 0,   0],
            [16750,   17249.99, 17000,  765,   1530,  10, 0,   0],
            [17250,   17749.99, 17500,  787.5, 1575,  10, 0,   0],
            [17750,   18249.99, 18000,  810,   1620,  10, 0,   0],
            [18250,   18749.99, 18500,  832.5, 1665,  10, 0,   0],
            [18750,   19249.99, 19000,  855,   1710,  10, 0,   0],
            [19250,   19749.99, 19500,  877.5, 1755,  10, 0,   0],
            [19750,   20249.99, 20000,  900,   1800,  10, 0,   0],
            [20250,   20749.99, 20500,  922.5, 1845,  10, 0,   0],
            [20750,   21249.99, 21000,  945,   1890,  10, 0,   0],
            [21250,   21749.99, 21500,  967.5, 1935,  10, 0,   0],
            [21750,   22249.99, 22000,  990,   1980,  10, 0,   0],
            [22250,   22749.99, 22500,  1012.5,2025,  10, 0,   0],
            [22750,   23249.99, 23000,  1035,  2070,  10, 0,   0],
            [23250,   23749.99, 23500,  1057.5,2115,  10, 0,   0],
            [23750,   24249.99, 24000,  1080,  2160,  10, 0,   0],
            [24250,   24749.99, 24500,  1102.5,2205,  10, 0,   0],
            [24750,   25249.99, 25000,  1125,  2250,  10, 0,   0],
            // Cap at 25,000 MSC (max contribution)
            [25250,   null,     25000,  1125,  2250,  10, 0,   0],
        ];

        foreach ($sss as [$from, $to, $msc, $ee, $er, $ec, $wispEE, $wispER]) {
            DB::table('payroll_sss_brackets')->insert([
                'salary_from'          => $from,
                'salary_to'            => $to,
                'msc'                  => $msc,
                'employee_contribution'=> $ee,
                'employer_contribution'=> $er,
                'ec_contribution'      => $ec,
                'wisp_employee'        => $wispEE,
                'wisp_employer'        => $wispER,
                'effective_year'       => 2025,
            ]);
        }

        // ─────────────────────────────────────────────────────────────────────
        // PhilHealth 2025 (5% premium; min ₱500, max ₱5,000)
        // ─────────────────────────────────────────────────────────────────────
        DB::table('payroll_philhealth_config')->truncate();
        DB::table('payroll_philhealth_config')->insert([
            'rate_percent'         => 5.00,
            'min_monthly_premium'  => 500.00,
            'max_monthly_premium'  => 5000.00,
            'effective_year'       => 2025,
        ]);

        // ─────────────────────────────────────────────────────────────────────
        // Pag-IBIG 2025
        // ─────────────────────────────────────────────────────────────────────
        DB::table('payroll_pagibig_config')->truncate();
        DB::table('payroll_pagibig_config')->insert([
            'low_salary_threshold'     => 1500.00,
            'low_employee_rate'        => 0.0100,
            'high_employee_rate'       => 0.0200,
            'employer_rate'            => 0.0200,
            'max_employee_contribution'=> 100.00,
            'max_employer_contribution'=> 100.00,
            'effective_year'           => 2025,
        ]);

        // ─────────────────────────────────────────────────────────────────────
        // BIR Withholding Tax Brackets 2025 (TRAIN Law, monthly table)
        // ─────────────────────────────────────────────────────────────────────
        DB::table('payroll_tax_brackets')->truncate();
        $taxBrackets = [
            [0,         20833,     0,      0],
            [20833,     33332,     0,      20],
            [33333,     66666,     2500,   25],
            [66667,     166666,    10833,  30],
            [166667,    666666,    40833,  32],
            [666667,    null,      200833, 35],
        ];
        foreach ($taxBrackets as [$from, $to, $base, $rate]) {
            DB::table('payroll_tax_brackets')->insert([
                'income_from'    => $from,
                'income_to'      => $to,
                'base_tax'       => $base,
                'rate_percent'   => $rate,
                'effective_year' => 2025,
            ]);
        }

        // ─────────────────────────────────────────────────────────────────────
        // Payroll templates
        // ─────────────────────────────────────────────────────────────────────
        PayrollTemplate::truncate();
        $templates = [
            [
                'name'                    => 'Regular Semi-Monthly Payroll',
                'type'                    => 'regular',
                'description'             => 'Standard bi-monthly payroll (1st–15th and 16th–end of month)',
                'include_basic'           => true,
                'include_transportation'  => true,
                'include_rice'            => true,
                'include_clothing'        => false,
                'include_communication'   => false,
                'include_medical'         => false,
                'include_other_allowance' => true,
                'deduct_sss'              => true,
                'deduct_philhealth'       => true,
                'deduct_pagibig'          => true,
                'deduct_tax'              => true,
                'deduct_loans'            => true,
                'auto_compute_thirteenth' => false,
                'allow_individual_override' => true,
                'is_active'               => true,
            ],
            [
                'name'                    => 'Regular Monthly Payroll',
                'type'                    => 'regular',
                'description'             => 'Full monthly payroll for monthly-frequency employees',
                'include_basic'           => true,
                'include_transportation'  => true,
                'include_rice'            => true,
                'include_clothing'        => false,
                'include_communication'   => false,
                'include_medical'         => false,
                'include_other_allowance' => true,
                'deduct_sss'              => true,
                'deduct_philhealth'       => true,
                'deduct_pagibig'          => true,
                'deduct_tax'              => true,
                'deduct_loans'            => true,
                'auto_compute_thirteenth' => false,
                'allow_individual_override' => true,
                'is_active'               => true,
            ],
            [
                'name'                    => '13th Month Pay',
                'type'                    => '13th_month',
                'description'             => 'Auto-computed 13th month based on months worked × basic monthly ÷ 12. Tax-exempt up to ₱90,000.',
                'include_basic'           => false,
                'include_transportation'  => false,
                'include_rice'            => false,
                'include_clothing'        => false,
                'include_communication'   => false,
                'include_medical'         => false,
                'include_other_allowance' => false,
                'custom_earning_label'    => '13th Month Pay',
                'custom_earning_taxable'  => false,
                'deduct_sss'              => false,
                'deduct_philhealth'       => false,
                'deduct_pagibig'          => false,
                'deduct_tax'              => false,
                'deduct_loans'            => false,
                'auto_compute_thirteenth' => true,
                'allow_individual_override' => true,
                'is_active'               => true,
            ],
            [
                'name'                    => 'Mid-Year Bonus',
                'type'                    => 'mid_year_bonus',
                'description'             => 'Discretionary mid-year bonus. Enter amounts per employee.',
                'include_basic'           => false,
                'include_transportation'  => false,
                'include_rice'            => false,
                'include_clothing'        => false,
                'include_communication'   => false,
                'include_medical'         => false,
                'include_other_allowance' => false,
                'custom_earning_label'    => 'Mid-Year Bonus',
                'custom_earning_taxable'  => true,
                'deduct_sss'              => false,
                'deduct_philhealth'       => false,
                'deduct_pagibig'          => false,
                'deduct_tax'              => true,
                'deduct_loans'            => false,
                'auto_compute_thirteenth' => false,
                'allow_individual_override' => true,
                'is_active'               => true,
            ],
            [
                'name'                    => 'Year-End Bonus',
                'type'                    => 'year_end_bonus',
                'description'             => 'Performance / year-end cash bonus.',
                'include_basic'           => false,
                'include_transportation'  => false,
                'include_rice'            => false,
                'include_clothing'        => false,
                'include_communication'   => false,
                'include_medical'         => false,
                'include_other_allowance' => false,
                'custom_earning_label'    => 'Year-End Bonus',
                'custom_earning_taxable'  => true,
                'deduct_sss'              => false,
                'deduct_philhealth'       => false,
                'deduct_pagibig'          => false,
                'deduct_tax'              => true,
                'deduct_loans'            => false,
                'auto_compute_thirteenth' => false,
                'allow_individual_override' => true,
                'is_active'               => true,
            ],
        ];

        foreach ($templates as $t) {
            PayrollTemplate::create($t);
        }

        // ─────────────────────────────────────────────────────────────────────
        // Position default rates
        // ─────────────────────────────────────────────────────────────────────
        PayrollPositionRate::truncate();
        $positionRates = [
            'Subject Teacher'        => ['basic' => 24000, 'trans' => 2000, 'rice' => 2000],
            'Grade School Teacher'   => ['basic' => 22000, 'trans' => 2000, 'rice' => 2000],
            'Administrative Assistant' => ['basic' => 18000, 'trans' => 1500, 'rice' => 2000],
            'Accounting Clerk'       => ['basic' => 18000, 'trans' => 1500, 'rice' => 2000],
            'IT Support Staff'       => ['basic' => 20000, 'trans' => 1500, 'rice' => 2000],
            'Librarian'              => ['basic' => 17000, 'trans' => 1500, 'rice' => 2000],
            'Security Guard'         => ['basic' => 16000, 'trans' => 1000, 'rice' => 2000],
        ];

        foreach ($positionRates as $posName => $rates) {
            $positions = \App\Models\HrmsPosition::where('name', $posName)->get();
            foreach ($positions as $pos) {
                PayrollPositionRate::create([
                    'position_id'            => $pos->id,
                    'basic_monthly_pay'      => $rates['basic'],
                    'transportation_allowance' => $rates['trans'],
                    'rice_allowance'         => $rates['rice'],
                ]);
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Per-employee salary settings (override for 2 test employees)
        // ─────────────────────────────────────────────────────────────────────
        PayrollSalarySetting::truncate();
        $emp1 = HrmsPersonnel::where('employee_id', 'EMP-2025-001')->first();
        $emp2 = HrmsPersonnel::where('employee_id', 'EMP-2025-002')->first();

        if ($emp1) {
            PayrollSalarySetting::create([
                'personnel_id'            => $emp1->id,
                'pay_frequency'           => 'semi-monthly',
                'basic_monthly_pay'       => 28000,
                'transportation_allowance'=> 2500,
                'rice_allowance'          => 2000,
                'clothing_allowance'      => 500,
                'communication_allowance' => 0,
                'medical_allowance'       => 0,
                'other_allowance'         => 0,
                'sss_loan_monthly'        => 0,
                'pagibig_loan_monthly'    => 0,
                'salary_advance_monthly'  => 0,
                'effective_date'          => '2025-06-01',
                'notes'                   => 'Senior teacher rate',
            ]);
        }

        if ($emp2) {
            PayrollSalarySetting::create([
                'personnel_id'            => $emp2->id,
                'pay_frequency'           => 'semi-monthly',
                'basic_monthly_pay'       => 26000,
                'transportation_allowance'=> 2000,
                'rice_allowance'          => 2000,
                'clothing_allowance'      => 0,
                'communication_allowance' => 0,
                'medical_allowance'       => 0,
                'other_allowance'         => 500,
                'other_allowance_label'   => 'Hazard Pay',
                'sss_loan_monthly'        => 500,
                'pagibig_loan_monthly'    => 0,
                'salary_advance_monthly'  => 0,
                'effective_date'          => '2025-06-01',
            ]);
        }

        // ─────────────────────────────────────────────────────────────────────
        // COA map stubs (will be linked to actual COA by HR/Accounting)
        // ─────────────────────────────────────────────────────────────────────
        PayrollCoaMap::truncate();
        $coaKeys = [
            'salaries_expense'            => 'Salaries & Wages Expense',
            'employer_sss_expense'        => 'Employer SSS Contribution Expense',
            'employer_philhealth_expense'  => 'Employer PhilHealth Contribution Expense',
            'employer_pagibig_expense'    => 'Employer Pag-IBIG Contribution Expense',
            'salaries_payable'            => 'Salaries Payable',
            'sss_payable'                 => 'SSS Contributions Payable',
            'philhealth_payable'          => 'PhilHealth Contributions Payable',
            'pagibig_payable'             => 'Pag-IBIG Contributions Payable',
            'tax_payable'                 => 'Withholding Tax Payable',
        ];
        foreach ($coaKeys as $key => $label) {
            PayrollCoaMap::create(['account_key' => $key, 'label' => $label, 'coa_id' => null]);
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }
}
