<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiscountCodeRedemption extends Model
{
    protected $fillable = [
        'discount_code_id',
        'reg_id',
        'school_year',
    ];

    public function discountCode(): BelongsTo
    {
        return $this->belongsTo(DiscountCode::class, 'discount_code_id', 'discount_code_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }
}
