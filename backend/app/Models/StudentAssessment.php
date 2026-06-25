<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasPublicId;

class StudentAssessment extends Model
{
    use HasPublicId;

    protected $primaryKey = 'stud_assess_id';

    protected $fillable = [
        'reg_id', 'assessment_id', 'category_id', 'particular_id',
        'account_type', 'par_stat',
        'total_amt_payable', 'total_amt_discount', 'total_amt_paid',
        'total_amt_debit', 'total_amt_credit', 'total_amt_bal',
        'schoolYear', 'debit_id', 'credit_id',
    ];

    protected function casts(): array
    {
        return [
            'total_amt_payable' => 'decimal:2',
            'total_amt_discount' => 'decimal:2',
            'total_amt_paid' => 'decimal:2',
            'total_amt_debit' => 'decimal:2',
            'total_amt_credit' => 'decimal:2',
            'total_amt_bal' => 'decimal:2',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(AccountsAssessment::class, 'assessment_id', 'assessment_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(AccountsCategory::class, 'category_id', 'category_id');
    }

    public function particular(): BelongsTo
    {
        return $this->belongsTo(AccountsParticular::class, 'particular_id', 'particular_id');
    }
}
