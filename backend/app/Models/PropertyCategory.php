<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PropertyCategory extends Model
{
    use HasPublicId;

    protected $table = 'property_categories';

    protected $fillable = [
        'name', 'description',
        'gl_asset_account_id', 'gl_accum_depr_account_id', 'gl_depr_expense_account_id',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(PropertyItem::class, 'category_id');
    }

    public function glAssetAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'gl_asset_account_id', 'coa_id');
    }

    public function glAccumDeprAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'gl_accum_depr_account_id', 'coa_id');
    }

    public function glDeprExpenseAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'gl_depr_expense_account_id', 'coa_id');
    }
}
