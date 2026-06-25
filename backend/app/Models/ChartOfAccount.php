<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasPublicId;

class ChartOfAccount extends Model
{
    use HasPublicId;

    protected $primaryKey = 'coa_id';

    protected $fillable = [
        'account_code', 'account_name', 'account_type',
        'code_prefix', 'code_number', 'code_suffix',
        'parent_id', 'description', 'is_active', 'is_header', 'is_system',
        'normal_balance', 'schoolYear',
    ];

    protected function casts(): array
    {
        return [
            'is_active'  => 'boolean',
            'is_header'  => 'boolean',
            'is_system'  => 'boolean',
            'normal_balance' => 'decimal:2',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id', 'coa_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id', 'coa_id');
    }

    public function journalLines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class, 'coa_id', 'coa_id');
    }

    public function particulars(): HasMany
    {
        return $this->hasMany(AccountsParticular::class, 'coa_id', 'coa_id');
    }
}
