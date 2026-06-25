<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasPublicId;

class AccountsCatParticular extends Model
{
    use HasPublicId;

    protected $primaryKey = 'cat_particular_id';

    protected $fillable = [
        'category_id', 'particular_id', 'account_group', 'account_code',
        'description', 'amount', 'status', 'paymentTerm',
        'schoolYear', 'semester',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
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
