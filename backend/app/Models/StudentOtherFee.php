<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasPublicId;

class StudentOtherFee extends Model
{
    use HasPublicId;

    protected $table = 'student_other_fees';
    protected $primaryKey = 'particular_id';

    protected $fillable = [
        'reg_id', 'category_id', 'account_code', 'description',
        'amount', 'status', 'paymentTerm', 'schoolYear',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }
}
