<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasPublicId;

class StudentPaymentData extends Model
{
    use HasPublicId;

    protected $table = 'student_payment_data';
    protected $primaryKey = 'pay_data_id';

    protected $fillable = [
        'reg_id', 'receipt_num', 'schoolYear', 'semester',
        'trans_payment_type', 'cv_payee', 'cv_bank_office', 'cv_number',
        'remarks', 'entry_date', 'net_amt_payable', 'amt_tend',
        'personnel_user_id', 'trans_time', 'status',
    ];

    protected function casts(): array
    {
        return [
            'net_amt_payable' => 'decimal:2',
            'amt_tend' => 'decimal:2',
            'trans_time' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(StudentPayment::class, 'receipt_num', 'receipt_num');
    }
}
