<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasPublicId;

class AccountsDiscount extends Model
{
    use HasPublicId;

    protected $table = 'accounts_discount';
    protected $primaryKey = 'acct_discount_id';

    protected $fillable = [
        'dept', 'schoolYear', 'account_code', 'description',
        'amount', 'percentage', 'classification', 'type',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'percentage' => 'decimal:2',
        ];
    }
}
