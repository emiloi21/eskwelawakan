<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollSalarySetting extends Model
{
    use HasPublicId;

    protected $table = 'payroll_salary_settings';

    protected $fillable = [
        'public_id', 'personnel_id', 'pay_frequency',
        'basic_monthly_pay', 'transportation_allowance', 'rice_allowance',
        'clothing_allowance', 'communication_allowance', 'medical_allowance',
        'other_allowance_label', 'other_allowance',
        'sss_loan_monthly', 'pagibig_loan_monthly', 'salary_advance_monthly',
        'effective_date', 'notes',
    ];

    protected $casts = [
        'basic_monthly_pay'         => 'decimal:2',
        'transportation_allowance'  => 'decimal:2',
        'rice_allowance'            => 'decimal:2',
        'clothing_allowance'        => 'decimal:2',
        'communication_allowance'   => 'decimal:2',
        'medical_allowance'         => 'decimal:2',
        'other_allowance'           => 'decimal:2',
        'sss_loan_monthly'          => 'decimal:2',
        'pagibig_loan_monthly'      => 'decimal:2',
        'salary_advance_monthly'    => 'decimal:2',
        'effective_date'            => 'date:Y-m-d',
    ];

    public function personnel(): BelongsTo
    {
        return $this->belongsTo(HrmsPersonnel::class, 'personnel_id');
    }
}
