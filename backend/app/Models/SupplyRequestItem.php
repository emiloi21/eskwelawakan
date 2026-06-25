<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplyRequestItem extends Model
{
    public $timestamps = false;

    protected $table = 'supply_request_items';

    protected $fillable = [
        'request_id', 'item_id', 'item_name', 'unit',
        'quantity_requested', 'quantity_fulfilled', 'remarks',
    ];

    public function request(): BelongsTo
    {
        return $this->belongsTo(SupplyRequest::class, 'request_id');
    }

    public function consumable(): BelongsTo
    {
        return $this->belongsTo(ConsumableItem::class, 'item_id');
    }
}
