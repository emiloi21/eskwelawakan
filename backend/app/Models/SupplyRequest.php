<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplyRequest extends Model
{
    use HasPublicId;

    protected $table = 'supply_requests';

    protected $fillable = [
        'requester_id', 'status', 'purpose', 'notes',
        'reviewed_by_id', 'reviewer_remarks', 'reviewed_at', 'fulfilled_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
        'fulfilled_at' => 'datetime',
    ];

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SupplyRequestItem::class, 'request_id');
    }
}
