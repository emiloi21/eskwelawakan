<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasPublicId;

class RefundRequest extends Model
{
    use HasPublicId;

    protected $primaryKey = 'refund_id';

    protected $fillable = [
        'reg_id', 'category_id', 'amt_excess',
        'date_time', 'personnel_user_id', 'status',
    ];

    protected function casts(): array
    {
        return [
            'amt_excess' => 'decimal:2',
            'date_time' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(AccountsCategory::class, 'category_id', 'category_id');
    }
}
