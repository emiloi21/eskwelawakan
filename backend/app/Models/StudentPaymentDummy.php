<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\AccountsParticular;
use App\Models\AccountsCategory;

class StudentPaymentDummy extends Model
{
    protected $table = 'student_payment_dummy';
    protected $primaryKey = 'payment_id';

    protected $fillable = [
        'reg_id', 'lname', 'fname', 'receipt_num',
        'schoolYear', 'semester', 'payment_type', 'method_id',
        'assessment_id', 'category_id', 'particular_id',
        'amt_payable', 'amt_paid', 'personnel_user_id',
    ];

    protected function casts(): array
    {
        return [
            'amt_payable' => 'decimal:2',
            'amt_paid' => 'decimal:2',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }

    public function particular(): BelongsTo
    {
        return $this->belongsTo(AccountsParticular::class, 'particular_id', 'particular_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(AccountsCategory::class, 'category_id', 'category_id');
    }
}
