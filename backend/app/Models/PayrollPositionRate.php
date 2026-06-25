<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollPositionRate extends Model
{
    use HasPublicId;

    protected $table = 'payroll_position_rates';

    protected $fillable = [
        'public_id', 'position_id',
        'basic_monthly_pay', 'transportation_allowance', 'rice_allowance',
        'clothing_allowance', 'communication_allowance', 'medical_allowance',
    ];

    protected $casts = [
        'basic_monthly_pay'         => 'decimal:2',
        'transportation_allowance'  => 'decimal:2',
        'rice_allowance'            => 'decimal:2',
        'clothing_allowance'        => 'decimal:2',
        'communication_allowance'   => 'decimal:2',
        'medical_allowance'         => 'decimal:2',
    ];

    public function position(): BelongsTo
    {
        return $this->belongsTo(HrmsPosition::class, 'position_id');
    }
}
