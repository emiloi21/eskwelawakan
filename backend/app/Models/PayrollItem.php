<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollItem extends Model
{
    use HasPublicId;

    protected $table = 'payroll_items';

    protected $fillable = [
        'public_id', 'payroll_period_id', 'personnel_id',
        'basic_pay', 'transportation_allowance', 'rice_allowance',
        'clothing_allowance', 'communication_allowance', 'medical_allowance',
        'other_allowance', 'other_allowance_label',
        'custom_earning', 'custom_earning_label',
        'overtime_hours', 'overtime_pay', 'gross_pay',
        'sss_employee', 'philhealth_employee', 'pagibig_employee', 'withholding_tax',
        'sss_employer', 'philhealth_employer', 'pagibig_employer',
        'sss_loan', 'pagibig_loan', 'salary_advance',
        'other_deductions', 'other_deductions_label',
        'days_worked', 'late_hours', 'absent_deduction',
        'total_employee_deductions', 'net_pay',
        'is_included', 'is_manually_edited', 'remarks',
    ];

    protected $casts = [
        'basic_pay'                  => 'decimal:2',
        'transportation_allowance'   => 'decimal:2',
        'rice_allowance'             => 'decimal:2',
        'clothing_allowance'         => 'decimal:2',
        'communication_allowance'    => 'decimal:2',
        'medical_allowance'          => 'decimal:2',
        'other_allowance'            => 'decimal:2',
        'custom_earning'             => 'decimal:2',
        'overtime_hours'             => 'decimal:2',
        'overtime_pay'               => 'decimal:2',
        'gross_pay'                  => 'decimal:2',
        'sss_employee'               => 'decimal:2',
        'philhealth_employee'        => 'decimal:2',
        'pagibig_employee'           => 'decimal:2',
        'withholding_tax'            => 'decimal:2',
        'sss_employer'               => 'decimal:2',
        'philhealth_employer'        => 'decimal:2',
        'pagibig_employer'           => 'decimal:2',
        'sss_loan'                   => 'decimal:2',
        'pagibig_loan'               => 'decimal:2',
        'salary_advance'             => 'decimal:2',
        'other_deductions'           => 'decimal:2',
        'absent_deduction'           => 'decimal:2',
        'late_hours'                 => 'decimal:2',
        'days_worked'                => 'decimal:2',
        'total_employee_deductions'  => 'decimal:2',
        'net_pay'                    => 'decimal:2',
        'is_included'                => 'boolean',
        'is_manually_edited'         => 'boolean',
    ];

    public function period(): BelongsTo
    {
        return $this->belongsTo(PayrollPeriod::class, 'payroll_period_id');
    }

    public function personnel(): BelongsTo
    {
        return $this->belongsTo(HrmsPersonnel::class, 'personnel_id');
    }
}
