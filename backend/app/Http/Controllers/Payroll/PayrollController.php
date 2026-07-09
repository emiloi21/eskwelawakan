<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Models\HrmsPersonnel;
use App\Models\PayrollCoaMap;
use App\Models\PayrollItem;
use App\Models\PayrollPeriod;
use App\Models\PayrollPositionRate;
use App\Models\PayrollSalarySetting;
use App\Models\PayrollTemplate;
use App\Services\Payroll\PayrollComputeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class PayrollController extends Controller
{
    public function __construct(private PayrollComputeService $svc) {}

    // ──────────────────────────────────────────────────────────────────────────
    // Templates
    // ──────────────────────────────────────────────────────────────────────────

    public function templates(): JsonResponse
    {
        $templates = PayrollTemplate::orderBy('type')->orderBy('name')->get();
        return response()->json(['data' => $templates]);
    }

    public function storeTemplate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                    => 'required|string|max:100',
            'type'                    => 'required|in:regular,13th_month,mid_year_bonus,year_end_bonus,custom',
            'description'             => 'nullable|string',
            'include_basic'           => 'boolean',
            'include_transportation'  => 'boolean',
            'include_rice'            => 'boolean',
            'include_clothing'        => 'boolean',
            'include_communication'   => 'boolean',
            'include_medical'         => 'boolean',
            'include_other_allowance' => 'boolean',
            'custom_earning_label'    => 'nullable|string|max:100',
            'custom_earning_taxable'  => 'boolean',
            'deduct_sss'              => 'boolean',
            'deduct_philhealth'       => 'boolean',
            'deduct_pagibig'          => 'boolean',
            'deduct_tax'              => 'boolean',
            'deduct_loans'            => 'boolean',
            'auto_compute_thirteenth' => 'boolean',
            'allow_individual_override' => 'boolean',
            'is_active'               => 'boolean',
        ]);

        $tmpl = PayrollTemplate::create($data);
        return response()->json(['data' => $tmpl], 201);
    }

    public function updateTemplate(Request $request, string $publicId): JsonResponse
    {
        $tmpl = PayrollTemplate::where('public_id', $publicId)->firstOrFail();
        $data = $request->validate([
            'name'                    => 'sometimes|required|string|max:100',
            'type'                    => 'sometimes|required|in:regular,13th_month,mid_year_bonus,year_end_bonus,custom',
            'description'             => 'nullable|string',
            'include_basic'           => 'boolean',
            'include_transportation'  => 'boolean',
            'include_rice'            => 'boolean',
            'include_clothing'        => 'boolean',
            'include_communication'   => 'boolean',
            'include_medical'         => 'boolean',
            'include_other_allowance' => 'boolean',
            'custom_earning_label'    => 'nullable|string|max:100',
            'custom_earning_taxable'  => 'boolean',
            'deduct_sss'              => 'boolean',
            'deduct_philhealth'       => 'boolean',
            'deduct_pagibig'          => 'boolean',
            'deduct_tax'              => 'boolean',
            'deduct_loans'            => 'boolean',
            'auto_compute_thirteenth' => 'boolean',
            'allow_individual_override' => 'boolean',
            'is_active'               => 'boolean',
        ]);
        $tmpl->update($data);
        return response()->json(['data' => $tmpl]);
    }

    public function destroyTemplate(string $publicId): JsonResponse
    {
        $tmpl = PayrollTemplate::where('public_id', $publicId)->firstOrFail();
        if ($tmpl->periods()->exists()) {
            return response()->json(['message' => 'Template has payroll periods. Cannot delete.'], 422);
        }
        $tmpl->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Salary Settings
    // ──────────────────────────────────────────────────────────────────────────

    public function salarySetting(string $personnelPublicId): JsonResponse
    {
        $person  = HrmsPersonnel::where('public_id', $personnelPublicId)->firstOrFail();
        $setting = PayrollSalarySetting::where('personnel_id', $person->id)->first();
        $salary  = $this->svc->getPersonnelSalary($person);
        return response()->json(['data' => $setting, 'effective' => $salary]);
    }

    public function saveSalarySetting(Request $request, string $personnelPublicId): JsonResponse
    {
        $person = HrmsPersonnel::where('public_id', $personnelPublicId)->firstOrFail();
        $data   = $request->validate([
            'pay_frequency'           => 'required|in:monthly,semi-monthly',
            'basic_monthly_pay'       => 'required|numeric|min:0',
            'transportation_allowance'=> 'nullable|numeric|min:0',
            'rice_allowance'          => 'nullable|numeric|min:0',
            'clothing_allowance'      => 'nullable|numeric|min:0',
            'communication_allowance' => 'nullable|numeric|min:0',
            'medical_allowance'       => 'nullable|numeric|min:0',
            'other_allowance_label'   => 'nullable|string|max:80',
            'other_allowance'         => 'nullable|numeric|min:0',
            'sss_loan_monthly'        => 'nullable|numeric|min:0',
            'pagibig_loan_monthly'    => 'nullable|numeric|min:0',
            'salary_advance_monthly'  => 'nullable|numeric|min:0',
            'effective_date'          => 'nullable|date',
            'notes'                   => 'nullable|string',
        ]);

        $setting = PayrollSalarySetting::updateOrCreate(
            ['personnel_id' => $person->id],
            $data
        );

        return response()->json(['data' => $setting]);
    }

    public function positionRates(): JsonResponse
    {
        $rates = PayrollPositionRate::with('position.department')->get();
        return response()->json(['data' => $rates]);
    }

    public function savePositionRate(Request $request, int $positionId): JsonResponse
    {
        $data = $request->validate([
            'basic_monthly_pay'       => 'required|numeric|min:0',
            'transportation_allowance'=> 'nullable|numeric|min:0',
            'rice_allowance'          => 'nullable|numeric|min:0',
            'clothing_allowance'      => 'nullable|numeric|min:0',
            'communication_allowance' => 'nullable|numeric|min:0',
            'medical_allowance'       => 'nullable|numeric|min:0',
        ]);

        $rate = PayrollPositionRate::updateOrCreate(
            ['position_id' => $positionId],
            $data
        );

        return response()->json(['data' => $rate->load('position.department')]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Payroll Periods
    // ──────────────────────────────────────────────────────────────────────────

    public function periods(Request $request): JsonResponse
    {
        $query = PayrollPeriod::with(['template', 'creator'])
            ->withCount('items')
            ->when($request->school_year, fn($q, $sy) => $q->where('school_year', $sy))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->template_id, fn($q, $tid) => $q->where('template_id', $tid))
            ->orderByDesc('period_start');

        $perPage = min((int)($request->per_page ?? 15), 100);
        $data    = $query->paginate($perPage);

        return response()->json([
            'data' => $data->items(),
            'meta' => ['total' => $data->total(), 'last_page' => $data->lastPage(), 'current_page' => $data->currentPage()],
        ]);
    }

    public function storePeriod(Request $request): JsonResponse
    {
        $data = $request->validate([
            'template_id'  => 'required|exists:payroll_templates,id',
            'school_year'  => 'required|string|max:20',
            'period_label' => 'required|string|max:100',
            'period_start' => 'required|date',
            'period_end'   => 'required|date|after_or_equal:period_start',
            'payout_date'  => 'nullable|date',
            'notes'        => 'nullable|string',
        ]);

        $period = PayrollPeriod::create(array_merge($data, [
            'status'     => 'draft',
            'created_by' => Auth::id(),
        ]));

        // Auto-generate payroll items immediately
        $this->svc->generateItems($period);

        $period->load(['template', 'creator']);
        return response()->json(['data' => $period], 201);
    }

    public function showPeriod(string $publicId): JsonResponse
    {
        $period = PayrollPeriod::with(['template', 'creator', 'approver'])
            ->withCount('items')
            ->where('public_id', $publicId)
            ->firstOrFail();

        return response()->json(['data' => $period]);
    }

    public function updatePeriod(Request $request, string $publicId): JsonResponse
    {
        $period = PayrollPeriod::where('public_id', $publicId)->firstOrFail();

        if (!in_array($period->status, ['draft'])) {
            return response()->json(['message' => 'Only draft periods can be edited.'], 422);
        }

        $data = $request->validate([
            'period_label' => 'sometimes|required|string|max:100',
            'payout_date'  => 'nullable|date',
            'notes'        => 'nullable|string',
        ]);

        $period->update($data);
        return response()->json(['data' => $period]);
    }

    public function destroyPeriod(string $publicId): JsonResponse
    {
        $period = PayrollPeriod::where('public_id', $publicId)->firstOrFail();

        if (!in_array($period->status, ['draft'])) {
            return response()->json(['message' => 'Only draft periods can be deleted.'], 422);
        }

        $period->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    /** Re-generate all non-manually-edited items. */
    public function regenerateItems(string $publicId): JsonResponse
    {
        $period = PayrollPeriod::where('public_id', $publicId)->firstOrFail();

        if (!in_array($period->status, ['draft'])) {
            return response()->json(['message' => 'Only draft periods can be regenerated.'], 422);
        }

        $this->svc->generateItems($period);
        $period->refresh()->load('template');

        return response()->json(['data' => $period]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Payroll Items
    // ──────────────────────────────────────────────────────────────────────────

    public function periodItems(string $publicId): JsonResponse
    {
        $period = PayrollPeriod::where('public_id', $publicId)->firstOrFail();

        $items = PayrollItem::with(['personnel.department', 'personnel.position'])
            ->where('payroll_period_id', $period->id)
            ->get()
            ->sortBy('personnel.lname')
            ->values();

        return response()->json(['data' => $items]);
    }

    public function updateItem(Request $request, string $periodPublicId, string $itemPublicId): JsonResponse
    {
        $period = PayrollPeriod::where('public_id', $periodPublicId)->firstOrFail();
        $item   = PayrollItem::where('public_id', $itemPublicId)
            ->where('payroll_period_id', $period->id)
            ->firstOrFail();

        if (!in_array($period->status, ['draft', 'for_approval', 'approved', 'posted'])) {
            return response()->json(['message' => 'Period is locked for adjustments.'], 422);
        }

        if (!$period->template->allow_individual_override) {
            return response()->json(['message' => 'This template does not allow individual overrides.'], 422);
        }

        $data = $request->validate([
            'basic_pay'                 => 'sometimes|numeric|min:0',
            'transportation_allowance'  => 'sometimes|numeric|min:0',
            'rice_allowance'            => 'sometimes|numeric|min:0',
            'clothing_allowance'        => 'sometimes|numeric|min:0',
            'communication_allowance'   => 'sometimes|numeric|min:0',
            'medical_allowance'         => 'sometimes|numeric|min:0',
            'other_allowance'           => 'sometimes|numeric|min:0',
            'other_allowance_label'     => 'nullable|string|max:80',
            'custom_earning'            => 'sometimes|numeric|min:0',
            'custom_earning_label'      => 'nullable|string|max:100',
            'overtime_hours'            => 'sometimes|numeric|min:0',
            'overtime_pay'              => 'sometimes|numeric|min:0',
            'sss_loan'                  => 'sometimes|numeric|min:0',
            'pagibig_loan'              => 'sometimes|numeric|min:0',
            'salary_advance'            => 'sometimes|numeric|min:0',
            'other_deductions'          => 'sometimes|numeric|min:0',
            'other_deductions_label'    => 'nullable|string|max:80',
            'days_worked'               => 'nullable|numeric|min:0',
            'absent_deduction'          => 'sometimes|numeric|min:0',
            'is_included'               => 'sometimes|boolean',
            'remarks'                   => 'nullable|string',
        ]);

        $item->update(array_merge($data, ['is_manually_edited' => true]));
        $item->refresh();

        // Re-derive gov deductions & net pay from updated figures
        $recalc = $this->svc->recalcGrossAndDeductions($item, $period->template, (int) $period->period_start->format('Y'));
        $item->update($recalc);

        $this->svc->recalcPeriodTotals($period);
        $item->refresh()->load(['personnel.department', 'personnel.position']);

        return response()->json(['data' => $item]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Workflow transitions
    // ──────────────────────────────────────────────────────────────────────────

    public function submitForApproval(string $publicId): JsonResponse
    {
        $period = PayrollPeriod::where('public_id', $publicId)->firstOrFail();

        if ($period->status !== 'draft') {
            return response()->json(['message' => 'Period must be in draft to submit.'], 422);
        }

        $period->update(['status' => 'for_approval', 'submitted_at' => now()]);
        return response()->json(['data' => $period]);
    }

    public function approve(Request $request, string $publicId): JsonResponse
    {
        $period = PayrollPeriod::where('public_id', $publicId)->firstOrFail();

        if ($period->status !== 'for_approval') {
            return response()->json(['message' => 'Period must be submitted for approval first.'], 422);
        }

        $data = $request->validate(['approval_notes' => 'nullable|string']);

        $period->update([
            'status'         => 'approved',
            'approved_by'    => Auth::id(),
            'approved_at'    => now(),
            'approval_notes' => $data['approval_notes'] ?? null,
        ]);

        return response()->json(['data' => $period]);
    }

    public function post(string $publicId): JsonResponse
    {
        $period = PayrollPeriod::where('public_id', $publicId)->firstOrFail();

        if ($period->status !== 'approved') {
            return response()->json(['message' => 'Period must be approved before posting.'], 422);
        }

        $entry = $this->svc->postToGl($period);
        $period->refresh()->load(['template', 'creator', 'approver', 'journalEntry']);

        return response()->json(['data' => $period, 'journal_entry_id' => $entry->je_id]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Payslip
    // ──────────────────────────────────────────────────────────────────────────

    public function payslip(string $periodPublicId, string $personnelPublicId)
    {
        $period = PayrollPeriod::with('template')->where('public_id', $periodPublicId)->firstOrFail();
        $person = HrmsPersonnel::with(['department', 'position'])->where('public_id', $personnelPublicId)->firstOrFail();

        $item = PayrollItem::where('payroll_period_id', $period->id)
            ->where('personnel_id', $person->id)
            ->firstOrFail();

        $schoolPref = DB::table('school_preferences')->first();

        $pdf = Pdf::loadView('payroll.payslip', compact('period', 'person', 'item', 'schoolPref'))
            ->setPaper('a5', 'portrait');

        $filename = "payslip-{$person->employee_id}-{$period->period_start->format('Y-m')}.pdf";

        return $pdf->download($filename);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // COA Mapping
    // ──────────────────────────────────────────────────────────────────────────

    public function coaMap(): JsonResponse
    {
        $map = PayrollCoaMap::with('account')->get()->keyBy('account_key');
        return response()->json(['data' => $map]);
    }

    public function saveCoaMap(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mappings'            => 'required|array',
            'mappings.*.account_key' => 'required|string',
            'mappings.*.label'       => 'required|string',
            'mappings.*.coa_id'      => 'nullable|exists:chart_of_accounts,coa_id',
        ]);

        foreach ($data['mappings'] as $mapping) {
            PayrollCoaMap::updateOrCreate(
                ['account_key' => $mapping['account_key']],
                ['label' => $mapping['label'], 'coa_id' => $mapping['coa_id'] ?? null]
            );
        }

        $map = PayrollCoaMap::with('account')->get()->keyBy('account_key');
        return response()->json(['data' => $map]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Preview salary computation for a single employee (before creating period)
    // ──────────────────────────────────────────────────────────────────────────

    public function previewSalary(Request $request, string $personnelPublicId): JsonResponse
    {
        $person = HrmsPersonnel::with(['department', 'position'])->where('public_id', $personnelPublicId)->firstOrFail();
        $salary = $this->svc->getPersonnelSalary($person);
        $year   = (int) now()->format('Y');

        [$sssEE, $sssER] = $this->svc->computeSss($salary['basic_monthly_pay'], $year);
        [$phEE,  $phER]  = $this->svc->computePhilhealth($salary['basic_monthly_pay'], $year);
        [$piEE,  $piER]  = $this->svc->computePagibig($salary['basic_monthly_pay'], $year);
        $taxable        = $this->svc->computeTaxableIncome($salary['basic_monthly_pay'], $sssEE, $phEE, $piEE, $year);
        $tax            = $this->svc->computeWithholdingTax($taxable, $year);

        return response()->json([
            'data' => [
                'personnel'       => $person,
                'salary_settings' => $salary,
                'gov_deductions'  => [
                    'sss_employee'      => $sssEE,
                    'sss_employer'      => $sssER,
                    'philhealth_employee' => $phEE,
                    'philhealth_employer' => $phER,
                    'pagibig_employee'  => $piEE,
                    'pagibig_employer'  => $piER,
                    'withholding_tax'   => $tax,
                    'taxable_income'    => $taxable,
                ],
            ],
        ]);
    }
}
