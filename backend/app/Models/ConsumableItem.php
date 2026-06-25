<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConsumableItem extends Model
{
    use HasPublicId;

    protected $table = 'consumable_items';

    protected $fillable = [
        'name', 'category_id', 'unit', 'quantity_on_hand',
        'reorder_point', 'location', 'description',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(ConsumableCategory::class, 'category_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(ConsumableTransaction::class, 'item_id');
    }

    public function isLowStock(): bool
    {
        return $this->quantity_on_hand <= $this->reorder_point;
    }
}
