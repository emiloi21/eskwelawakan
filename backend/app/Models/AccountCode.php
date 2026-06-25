<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountCode extends Model
{
    protected $primaryKey = 'ac_id';

    protected $fillable = [
        'gradeLevel', 'account_group', 'account_code',
        'description', 'amt_paid', 'payment_type', 'personnel_user_id',
    ];

    protected function casts(): array
    {
        return [
            'amt_paid' => 'decimal:2',
        ];
    }
}
