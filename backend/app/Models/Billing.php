<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Billing extends Model
{
    protected $table = 'billing';
    protected $primaryKey = 'billing_id';

    protected $fillable = [
        'reg_id', 'category_id',
        'amt_payable', 'amt_paid', 'receipt_num',
        'amt_billed', 'remarks', 'schoolYear',
    ];

    protected function casts(): array
    {
        return [
            'amt_payable' => 'decimal:2',
            'amt_paid' => 'decimal:2',
            'amt_billed' => 'decimal:2',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }
}
