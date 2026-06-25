<?php

namespace App\Services\Payroll;

use App\Models\HrmsPersonnel;
use App\Models\HrmsPosition;
use App\Models\PayrollCoaMap;
use App\Models\PayrollItem;
use App\Models\PayrollPagibigConfig;
use App\Models\PayrollPeriod;
use App\Models\PayrollPhilhealthConfig;
use App\Models\PayrollPositionRate;
use App\Models\PayrollSalarySetting;
use App\Models\PayrollSssBracket;
use App\Models\PayrollTaxBracket;
use App\Models\PayrollTemplate;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;

class PayrollComputeService
{
    // ──────────────────────────────────────────────────────────────────────────
    // Public entry points
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Generate (or re-generate) payroll items for a draft period.
     * Existing non-manually-edited items are replaced.
     */
    public function generateItems(PayrollPeriod $period): void
    {
        $template  = $period->template;
        $personnel = $this->getEligiblePersonnel();
        $year      = (int) date('Y', strtotime($period->period_start));

        foreach ($personnel as $person) {
            $existing = PayrollItem::where('payroll_period_id', $period->id)
                ->where('personnel_id', $person->id)
                ->first();

            if ($existing && $existing->is_manually_edited) {
                continue; // preserve manual overrides
            }

            $itemData = $this->computeItem($person, $period, $template, $year);

            if ($existing) {
                $existing->update($itemData);
            } else {
                PayrollItem::create(array_merge(['payroll_period_id' => $period->id, 'personnel_id' => $person->id], $itemData));
            }
        }

        $this->recalcPeriodTotals($period);
    }

    /**
     * Recompute a single item (called after manual override save).
     */
    public function recalcItem(PayrollItem $item): void
    {
        $period   = $item->period;
        $template = $period->template;
        $year     = (int) date('Y', strtotime($period->period_start));

        $grossAndDeductions = $this->recalcGrossAndDeductions($item, $template, $year);
        $item->update($grossAndDeductions);
        $this->recalcPeriodTotals($period);
    }

    /**
     * Recalculate gross, deductions and net for a payroll item array (given raw earnings/deductions).
     * Used when an item's earnings/deductions are changed manually but auto-calc of gov deductions is still desired.
     */
    public function recalcGrossAndDeductions(PayrollItem $item, PayrollTemplate $template, int $year): array
    {
        // Gross
        $gross = $this->computeGross($item->toArray(), $template);

        // Gov deductions - employee side
        [$sssEE, $sssER] = $this->computeSss($item->basic_pay, $year);
        [$phEE, $phER]   = $this->computePhilhealth($item->basic_pay, $year);
        [$piEE, $piER]   = $this->computePagibig($item->basic_pay, $year);

        $taxableIncome = $template->deduct_tax
            ? $this->computeTaxableIncome($item->basic_pay, $sssEE, $phEE, $piEE, $year)
            : 0;
        $tax = $template->deduct_tax ? $this->computeWithholdingTax($taxableIncome, $year) : 0;

        $sssEE  = $template->deduct_sss        ? $sssEE : 0;
        $phEE   = $template->deduct_philhealth  ? $phEE  : 0;
        $piEE   = $template->deduct_pagibig     ? $piEE  : 0;
        $sssER  = $template->deduct_sss        ? $sssER : 0;
        $phER   = $template->deduct_philhealth  ? $phER  : 0;
        $piER   = $template->deduct_pagibig     ? $piER  : 0;

        $totalDed = $sssEE + $phEE + $piEE + $tax
            + $item->sss_loan + $item->pagibig_loan + $item->salary_advance
            + $item->other_deductions + $item->absent_deduction;

        return [
            'gross_pay'                 => round($gross, 2),
            'sss_employee'              => round($sssEE, 2),
            'philhealth_employee'       => round($phEE, 2),
            'pagibig_employee'          => round($piEE, 2),
            'withholding_tax'           => round($tax, 2),
            'sss_employer'              => round($sssER, 2),
            'philhealth_employer'       => round($phER, 2),
            'pagibig_employer'          => round($piER, 2),
            'total_employee_deductions' => round($totalDed, 2),
            'net_pay'                   => round($gross - $totalDed, 2),
        ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Item computation
    // ──────────────────────────────────────────────────────────────────────────

    private function computeItem(HrmsPersonnel $person, PayrollPeriod $period, PayrollTemplate $template, int $year): array
    {
        $salary = $this->getPersonnelSalary($person);
        $freq   = $salary['pay_frequency'] ?? 'semi-monthly';
        $div    = $freq === 'monthly' ? 1 : 2;

        // Earnings for this period
        $basicPay         = $template->include_basic            ? round($salary['basic_monthly_pay'] / $div, 2) : 0;
        $transAllowance   = $template->include_transportation   ? round($salary['transportation_allowance'] / $div, 2) : 0;
        $riceAllowance    = $template->include_rice             ? round($salary['rice_allowance'] / $div, 2) : 0;
        $clothingAll      = $template->include_clothing         ? round($salary['clothing_allowance'] / $div, 2) : 0;
        $commAll          = $template->include_communication    ? round($salary['communication_allowance'] / $div, 2) : 0;
        $medAll           = $template->include_medical          ? round($salary['medical_allowance'] / $div, 2) : 0;
        $otherAll         = $template->include_other_allowance  ? round($salary['other_allowance'] / $div, 2) : 0;

        // 13th month auto-computation
        $customEarning = 0;
        if ($template->auto_compute_thirteenth) {
            $monthsWorked = $this->monthsWorkedThisYear($person, $period->period_end);
            $customEarning = round($salary['basic_monthly_pay'] * $monthsWorked / 12, 2);
        }

        $earnings = [
            'basic_pay'                 => $basicPay,
            'transportation_allowance'  => $transAllowance,
            'rice_allowance'            => $riceAllowance,
            'clothing_allowance'        => $clothingAll,
            'communication_allowance'   => $commAll,
            'medical_allowance'         => $medAll,
            'other_allowance'           => $otherAll,
            'other_allowance_label'     => $salary['other_allowance_label'] ?? null,
            'custom_earning'            => $customEarning,
            'custom_earning_label'      => $template->custom_earning_label,
            'overtime_hours'            => 0,
            'overtime_pay'              => 0,
        ];

        $gross = $this->computeGross($earnings, $template);

        // For monthly gov deductions, use monthly basic regardless of pay_frequency
        $monthlyBasic = (float) $salary['basic_monthly_pay'];

        [$sssEE, $sssER] = $template->deduct_sss        ? $this->computeSss($monthlyBasic, $year)        : [0, 0];
        [$phEE,  $phER]  = $template->deduct_philhealth  ? $this->computePhilhealth($monthlyBasic, $year) : [0, 0];
        [$piEE,  $piER]  = $template->deduct_pagibig     ? $this->computePagibig($monthlyBasic, $year)    : [0, 0];

        // For semi-monthly, split gov deductions in half
        if ($freq === 'semi-monthly') {
            $sssEE /= 2; $sssER /= 2;
            $phEE  /= 2; $phER  /= 2;
            $piEE  /= 2; $piER  /= 2;
        }

        $taxableMonthly = $template->deduct_tax
            ? $this->computeTaxableIncome($monthlyBasic, $sssEE * $div, $phEE * $div, $piEE * $div, $year)
            : 0;
        $monthlyTax = $template->deduct_tax ? $this->computeWithholdingTax($taxableMonthly, $year) : 0;
        $periodTax  = $freq === 'semi-monthly' ? $monthlyTax / 2 : $monthlyTax;

        $sssLoan     = $template->deduct_loans ? round($salary['sss_loan_monthly']      / $div, 2) : 0;
        $piLoan      = $template->deduct_loans ? round($salary['pagibig_loan_monthly']   / $div, 2) : 0;
        $salAdvance  = $template->deduct_loans ? round($salary['salary_advance_monthly'] / $div, 2) : 0;

        $totalDed = round($sssEE + $phEE + $piEE + $periodTax + $sssLoan + $piLoan + $salAdvance, 2);

        return array_merge($earnings, [
            'gross_pay'                 => round($gross, 2),
            'sss_employee'              => round($sssEE, 2),
            'philhealth_employee'       => round($phEE, 2),
            'pagibig_employee'          => round($piEE, 2),
            'withholding_tax'           => round($periodTax, 2),
            'sss_employer'              => round($sssER, 2),
            'philhealth_employer'       => round($phER, 2),
            'pagibig_employer'          => round($piER, 2),
            'sss_loan'                  => $sssLoan,
            'pagibig_loan'              => $piLoan,
            'salary_advance'            => $salAdvance,
            'other_deductions'          => 0,
            'days_worked'               => null,
            'late_hours'                => 0,
            'absent_deduction'          => 0,
            'total_employee_deductions' => $totalDed,
            'net_pay'                   => round($gross - $totalDed, 2),
            'is_included'               => true,
            'is_manually_edited'        => false,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Gross computation
    // ──────────────────────────────────────────────────────────────────────────

    private function computeGross(array $earnings, PayrollTemplate $template): float
    {
        return array_sum([
            $earnings['basic_pay'],
            $earnings['transportation_allowance'],
            $earnings['rice_allowance'],
            $earnings['clothing_allowance'],
            $earnings['communication_allowance'],
            $earnings['medical_allowance'],
            $earnings['other_allowance'],
            $earnings['custom_earning'],
            $earnings['overtime_pay'],
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Government statutory computations (Philippines 2025 tables)
    // ──────────────────────────────────────────────────────────────────────────

    /** Returns [employee_contribution, employer_contribution] */
    public function computeSss(float $monthlyBasic, int $year): array
    {
        $bracket = DB::table('payroll_sss_brackets')
            ->where('effective_year', '<=', $year)
            ->where(function ($q) use ($monthlyBasic) {
                $q->where('salary_from', '<=', $monthlyBasic)
                  ->where(function ($q2) use ($monthlyBasic) {
                      $q2->whereNull('salary_to')
                         ->orWhere('salary_to', '>=', $monthlyBasic);
                  });
            })
            ->orderByDesc('effective_year')
            ->orderByDesc('salary_from')
            ->first();

        if (!$bracket) {
            return [0, 0];
        }

        return [
            (float) ($bracket->employee_contribution + $bracket->wisp_employee),
            (float) ($bracket->employer_contribution  + $bracket->ec_contribution + $bracket->wisp_employer),
        ];
    }

    /** Returns [employee_share, employer_share] */
    public function computePhilhealth(float $monthlyBasic, int $year): array
    {
        $config = DB::table('payroll_philhealth_config')
            ->where('effective_year', '<=', $year)
            ->orderByDesc('effective_year')
            ->first();

        if (!$config) {
            return [0, 0];
        }

        $total = ($monthlyBasic * $config->rate_percent) / 100;
        $total = max((float) $config->min_monthly_premium, min($total, (float) $config->max_monthly_premium));
        $share = $total / 2;

        return [round($share, 2), round($share, 2)];
    }

    /** Returns [employee_contribution, employer_contribution] */
    public function computePagibig(float $monthlyBasic, int $year): array
    {
        $config = DB::table('payroll_pagibig_config')
            ->where('effective_year', '<=', $year)
            ->orderByDesc('effective_year')
            ->first();

        if (!$config) {
            return [0, 0];
        }

        $eeRate = $monthlyBasic <= (float) $config->low_salary_threshold
            ? (float) $config->low_employee_rate
            : (float) $config->high_employee_rate;

        $ee = min($monthlyBasic * $eeRate,      (float) $config->max_employee_contribution);
        $er = min($monthlyBasic * (float) $config->employer_rate, (float) $config->max_employer_contribution);

        return [round($ee, 2), round($er, 2)];
    }

    /**
     * BIR 2023+ non-mandatory deductions (only mandatory gov - SSS/PH/HDMF - are pre-tax).
     */
    public function computeTaxableIncome(float $monthlyBasic, float $sssEE, float $phEE, float $piEE, int $year): float
    {
        return max(0, $monthlyBasic - $sssEE - $phEE - $piEE);
    }

    /** Monthly withholding tax from BIR bracket table. */
    public function computeWithholdingTax(float $taxableMonthly, int $year): float
    {
        $bracket = DB::table('payroll_tax_brackets')
            ->where('effective_year', '<=', $year)
            ->where('income_from', '<=', $taxableMonthly)
            ->where(function ($q) use ($taxableMonthly) {
                $q->whereNull('income_to')
                  ->orWhere('income_to', '>=', $taxableMonthly);
            })
            ->orderByDesc('effective_year')
            ->orderByDesc('income_from')
            ->first();

        if (!$bracket) {
            return 0;
        }

        $excess = $taxableMonthly - (float) $bracket->income_from;
        $tax    = (float) $bracket->base_tax + ($excess * (float) $bracket->rate_percent / 100);

        return round(max(0, $tax), 2);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Period totals
    // ──────────────────────────────────────────────────────────────────────────

    public function recalcPeriodTotals(PayrollPeriod $period): void
    {
        $items = PayrollItem::where('payroll_period_id', $period->id)
            ->where('is_included', true)
            ->get();

        $period->update([
            'total_basic_pay'           => $items->sum('basic_pay'),
            'total_allowances'          => $items->sum(fn($i) =>
                $i->transportation_allowance + $i->rice_allowance +
                $i->clothing_allowance + $i->communication_allowance +
                $i->medical_allowance + $i->other_allowance
            ),
            'total_gross_pay'           => $items->sum('gross_pay'),
            'total_sss_employee'        => $items->sum('sss_employee'),
            'total_philhealth_employee' => $items->sum('philhealth_employee'),
            'total_pagibig_employee'    => $items->sum('pagibig_employee'),
            'total_withholding_tax'     => $items->sum('withholding_tax'),
            'total_other_deductions'    => $items->sum(fn($i) =>
                $i->sss_loan + $i->pagibig_loan + $i->salary_advance + $i->other_deductions + $i->absent_deduction
            ),
            'total_net_pay'             => $items->sum('net_pay'),
            'total_employer_sss'        => $items->sum('sss_employer'),
            'total_employer_philhealth' => $items->sum('philhealth_employer'),
            'total_employer_pagibig'    => $items->sum('pagibig_employer'),
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GL Journal posting
    // ──────────────────────────────────────────────────────────────────────────

    public function postToGl(PayrollPeriod $period): JournalEntry
    {
        $coaMap = PayrollCoaMap::whereNotNull('coa_id')->get()->keyBy('account_key');

        $map = fn(string $key) => $coaMap->get($key)?->coa_id;

        return DB::transaction(function () use ($period, $map) {
            $today   = now()->format('Ymd');
            $seq     = JournalEntry::whereDate('created_at', today())->count() + 1;
            $entryNo = 'PR-' . $today . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);

            $entry = JournalEntry::create([
                'entry_no'        => $entryNo,
                'entry_date'      => $period->payout_date ?? $period->period_end,
                'description'     => "Payroll: {$period->period_label}",
                'reference_type'  => 'payroll',
                'reference_id'    => $period->id,
                'status'          => 'Posted',
                'schoolYear'      => $period->school_year,
                'created_by'      => Auth::id(),
                'posted_by'       => Auth::id(),
                'posted_at'       => now(),
            ]);

            $lines = [];

            // DR Salaries & Wages Expense (gross pay)
            if ($coaId = $map('salaries_expense')) {
                $lines[] = ['je_id' => $entry->je_id, 'coa_id' => $coaId,
                    'debit' => $period->total_gross_pay, 'credit' => 0,
                    'memo'  => 'Gross salaries & wages'];
            }

            // DR Employer SSS Contribution
            if ($coaId = $map('employer_sss_expense')) {
                $lines[] = ['je_id' => $entry->je_id, 'coa_id' => $coaId,
                    'debit' => $period->total_employer_sss, 'credit' => 0,
                    'memo'  => 'Employer SSS share'];
            }

            // DR Employer PhilHealth Contribution
            if ($coaId = $map('employer_philhealth_expense')) {
                $lines[] = ['je_id' => $entry->je_id, 'coa_id' => $coaId,
                    'debit' => $period->total_employer_philhealth, 'credit' => 0,
                    'memo'  => 'Employer PhilHealth share'];
            }

            // DR Employer Pag-IBIG Contribution
            if ($coaId = $map('employer_pagibig_expense')) {
                $lines[] = ['je_id' => $entry->je_id, 'coa_id' => $coaId,
                    'debit' => $period->total_employer_pagibig, 'credit' => 0,
                    'memo'  => 'Employer Pag-IBIG share'];
            }

            // CR Net payable to employees
            if ($coaId = $map('salaries_payable')) {
                $lines[] = ['je_id' => $entry->je_id, 'coa_id' => $coaId,
                    'debit' => 0, 'credit' => $period->total_net_pay,
                    'memo'  => 'Net salaries payable'];
            }

            // CR SSS payable (employee + employer)
            $totalSss = $period->total_sss_employee + $period->total_employer_sss;
            if ($totalSss > 0 && $coaId = $map('sss_payable')) {
                $lines[] = ['je_id' => $entry->je_id, 'coa_id' => $coaId,
                    'debit' => 0, 'credit' => $totalSss,
                    'memo'  => 'SSS payable (EE+ER)'];
            }

            // CR PhilHealth payable
            $totalPh = $period->total_philhealth_employee + $period->total_employer_philhealth;
            if ($totalPh > 0 && $coaId = $map('philhealth_payable')) {
                $lines[] = ['je_id' => $entry->je_id, 'coa_id' => $coaId,
                    'debit' => 0, 'credit' => $totalPh,
                    'memo'  => 'PhilHealth payable (EE+ER)'];
            }

            // CR Pag-IBIG payable
            $totalPi = $period->total_pagibig_employee + $period->total_employer_pagibig;
            if ($totalPi > 0 && $coaId = $map('pagibig_payable')) {
                $lines[] = ['je_id' => $entry->je_id, 'coa_id' => $coaId,
                    'debit' => 0, 'credit' => $totalPi,
                    'memo'  => 'Pag-IBIG payable (EE+ER)'];
            }

            // CR Withholding tax payable
            if ($period->total_withholding_tax > 0 && $coaId = $map('tax_payable')) {
                $lines[] = ['je_id' => $entry->je_id, 'coa_id' => $coaId,
                    'debit' => 0, 'credit' => $period->total_withholding_tax,
                    'memo'  => 'Withholding tax payable'];
            }

            JournalEntryLine::insert($lines);

            $period->update(['je_id' => $entry->je_id, 'status' => 'posted', 'posted_by' => Auth::id(), 'posted_at' => now()]);

            return $entry;
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private function getEligiblePersonnel(): Collection
    {
        return HrmsPersonnel::where('status', 'Active')->get();
    }

    /** Returns salary array, falling back to position rate if no personal setting exists. */
    public function getPersonnelSalary(HrmsPersonnel $person): array
    {
        $setting = PayrollSalarySetting::where('personnel_id', $person->id)->first();

        if ($setting) {
            return $setting->toArray();
        }

        // Fall back to position default rate
        if ($person->position_id) {
            $rate = PayrollPositionRate::where('position_id', $person->position_id)->first();
            if ($rate) {
                return array_merge($rate->toArray(), [
                    'pay_frequency'          => 'semi-monthly',
                    'other_allowance'        => 0,
                    'other_allowance_label'  => null,
                    'sss_loan_monthly'       => 0,
                    'pagibig_loan_monthly'   => 0,
                    'salary_advance_monthly' => 0,
                ]);
            }
        }

        return [
            'pay_frequency'           => 'semi-monthly',
            'basic_monthly_pay'       => 0,
            'transportation_allowance'=> 0,
            'rice_allowance'          => 0,
            'clothing_allowance'      => 0,
            'communication_allowance' => 0,
            'medical_allowance'       => 0,
            'other_allowance'         => 0,
            'other_allowance_label'   => null,
            'sss_loan_monthly'        => 0,
            'pagibig_loan_monthly'    => 0,
            'salary_advance_monthly'  => 0,
        ];
    }

    /** Count full months worked in the current calendar year up to $asOf date. */
    private function monthsWorkedThisYear(HrmsPersonnel $person, $asOf): float
    {
        $startOfYear = date('Y-01-01');
        $from = max($person->date_hired?->format('Y-m-d') ?? $startOfYear, $startOfYear);
        $to   = $asOf instanceof \DateTime ? $asOf->format('Y-m-d') : (string) $asOf;

        $fromDt = new \DateTime($from);
        $toDt   = new \DateTime($to);
        if ($toDt < $fromDt) {
            return 0;
        }

        $diff    = $fromDt->diff($toDt);
        $months  = $diff->y * 12 + $diff->m;
        // include partial month if at least 15 days remaining
        if ($diff->d >= 15) {
            $months += 1;
        }

        return min($months, 12);
    }
}
