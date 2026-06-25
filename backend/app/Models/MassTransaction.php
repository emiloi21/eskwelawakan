<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MassTransaction extends Model
{
    protected $primaryKey = 'mt_id';

    protected $fillable = [
        'massTransCode', 'discount_id', 'payment_term',
        'payment_amt', 'personnel_user_id',
    ];

    protected function casts(): array
    {
        return [
            'payment_amt' => 'decimal:2',
        ];
    }
}
