<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasPublicId;

class AdvancePayment extends Model
{
    use HasPublicId;

    protected $primaryKey = 'adv_pay_id';

    protected $fillable = [
        'reg_id', 'description', 'adv_pay_amt',
    ];

    protected function casts(): array
    {
        return [
            'adv_pay_amt' => 'decimal:2',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }
}
