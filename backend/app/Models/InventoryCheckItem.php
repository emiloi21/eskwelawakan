<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryCheckItem extends Model
{
    public $timestamps = false;

    protected $table = 'inventory_check_items';

    protected $fillable = [
        'check_id', 'item_id', 'item_name', 'property_no',
        'expected_quantity', 'counted_quantity', 'condition_found', 'remarks',
    ];

    public function propertyItem(): BelongsTo
    {
        return $this->belongsTo(PropertyItem::class, 'item_id');
    }
}
