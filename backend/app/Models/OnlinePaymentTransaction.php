<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OnlinePaymentTransaction extends Model
{
    protected $fillable = [
        'reg_id',
        'paymongo_session_id',
        'payment_intent_id',
        'amount',
        'school_year',
        'semester',
        'status',
        'receipt_num',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount'   => 'decimal:2',
            'metadata' => 'array',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }
}
