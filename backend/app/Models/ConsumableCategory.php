<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConsumableCategory extends Model
{
    use HasPublicId;

    protected $table = 'consumable_categories';

    protected $fillable = [
        'name', 'default_unit', 'description',
        'gl_asset_account_id', 'gl_expense_account_id',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(ConsumableItem::class, 'category_id');
    }

    public function glAssetAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'gl_asset_account_id', 'coa_id');
    }

    public function glExpenseAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'gl_expense_account_id', 'coa_id');
    }
}
