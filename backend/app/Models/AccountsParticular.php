<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasPublicId;

class AccountsParticular extends Model
{
    use HasPublicId;

    protected $primaryKey = 'particular_id';

    protected $fillable = [
        'coa_id', 'gradeLevel', 'strand', 'major', 'schoolYear', 'semester',
        'account_group', 'account_code', 'description', 'amount',
        'par_acct_class', 'status',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function chartAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'coa_id', 'coa_id');
    }
}
