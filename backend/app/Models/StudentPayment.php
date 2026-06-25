<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentPayment extends Model
{
    protected $primaryKey = 'payment_id';

    protected $fillable = [
        'reg_id', 'lname', 'fname', 'receipt_num',
        'schoolYear', 'semester', 'payment_type', 'method_id',
        'category_id', 'particular_id',
        'amt_payable', 'amt_paid',
        'trans_date', 'trans_time',
        'status', 'void_remarks', 'personnel_user_id',
    ];

    protected function casts(): array
    {
        return [
            'amt_payable' => 'decimal:2',
            'amt_paid' => 'decimal:2',
            'trans_time' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }

    public function paymentData(): BelongsTo
    {
        return $this->belongsTo(StudentPaymentData::class, 'receipt_num', 'receipt_num');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(AccountsCategory::class, 'category_id', 'category_id');
    }
}
