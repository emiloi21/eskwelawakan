<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollPeriod extends Model
{
    use HasPublicId;

    protected $table = 'payroll_periods';

    protected $fillable = [
        'public_id', 'template_id', 'school_year', 'period_label',
        'period_start', 'period_end', 'payout_date', 'status',
        'total_basic_pay', 'total_allowances', 'total_gross_pay',
        'total_sss_employee', 'total_philhealth_employee', 'total_pagibig_employee',
        'total_withholding_tax', 'total_other_deductions', 'total_net_pay',
        'total_employer_sss', 'total_employer_philhealth', 'total_employer_pagibig',
        'created_by', 'submitted_at', 'approved_by', 'approved_at',
        'posted_by', 'posted_at', 'je_id', 'approval_notes', 'notes',
    ];

    protected $casts = [
        'period_start'  => 'date:Y-m-d',
        'period_end'    => 'date:Y-m-d',
        'payout_date'   => 'date:Y-m-d',
        'submitted_at'  => 'datetime',
        'approved_at'   => 'datetime',
        'posted_at'     => 'datetime',
        'total_basic_pay'              => 'decimal:2',
        'total_allowances'             => 'decimal:2',
        'total_gross_pay'              => 'decimal:2',
        'total_sss_employee'           => 'decimal:2',
        'total_philhealth_employee'    => 'decimal:2',
        'total_pagibig_employee'       => 'decimal:2',
        'total_withholding_tax'        => 'decimal:2',
        'total_other_deductions'       => 'decimal:2',
        'total_net_pay'                => 'decimal:2',
        'total_employer_sss'           => 'decimal:2',
        'total_employer_philhealth'    => 'decimal:2',
        'total_employer_pagibig'       => 'decimal:2',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(PayrollTemplate::class, 'template_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PayrollItem::class, 'payroll_period_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function poster(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'je_id', 'je_id');
    }
}
