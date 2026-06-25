<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConsumableTransaction extends Model
{
    use HasPublicId;

    protected $table = 'consumable_transactions';

    protected $fillable = [
        'item_id', 'type', 'quantity', 'reference_no', 'remarks', 'performed_by', 'transacted_at',
    ];

    protected $casts = [
        'transacted_at' => 'datetime',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(ConsumableItem::class, 'item_id');
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
