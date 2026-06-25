<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollTemplate extends Model
{
    use HasPublicId;

    protected $table = 'payroll_templates';

    protected $fillable = [
        'public_id', 'name', 'type', 'description',
        'include_basic', 'include_transportation', 'include_rice',
        'include_clothing', 'include_communication', 'include_medical',
        'include_other_allowance', 'custom_earning_label', 'custom_earning_taxable',
        'deduct_sss', 'deduct_philhealth', 'deduct_pagibig', 'deduct_tax', 'deduct_loans',
        'auto_compute_thirteenth', 'allow_individual_override', 'is_active',
    ];

    protected $casts = [
        'include_basic'             => 'boolean',
        'include_transportation'    => 'boolean',
        'include_rice'              => 'boolean',
        'include_clothing'          => 'boolean',
        'include_communication'     => 'boolean',
        'include_medical'           => 'boolean',
        'include_other_allowance'   => 'boolean',
        'custom_earning_taxable'    => 'boolean',
        'deduct_sss'                => 'boolean',
        'deduct_philhealth'         => 'boolean',
        'deduct_pagibig'            => 'boolean',
        'deduct_tax'                => 'boolean',
        'deduct_loans'              => 'boolean',
        'auto_compute_thirteenth'   => 'boolean',
        'allow_individual_override' => 'boolean',
        'is_active'                 => 'boolean',
    ];

    public function periods(): HasMany
    {
        return $this->hasMany(PayrollPeriod::class, 'template_id');
    }
}
