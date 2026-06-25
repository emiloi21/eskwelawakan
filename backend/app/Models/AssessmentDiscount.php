<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentDiscount extends Model
{
    protected $table = 'assessments_discounts';
    protected $primaryKey = 'discount_id';

    protected $fillable = [
        'reg_id', 'acct_discount_id', 'account_code', 'description',
        'amount', 'percentage', 'amt_rcv_paid',
        'deduct_category_id', 'deduct_particular_id',
        'schoolYear', 'type', 'status',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'percentage' => 'decimal:2',
            'amt_rcv_paid' => 'decimal:2',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }

    public function accountDiscount(): BelongsTo
    {
        return $this->belongsTo(AccountsDiscount::class, 'acct_discount_id', 'acct_discount_id');
    }
}
