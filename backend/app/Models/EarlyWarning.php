<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasPublicId;

class EarlyWarning extends Model
{
    use HasPublicId;

    protected $fillable = [
        'public_id',
        'warning_type',
        'severity',
        'message',
        'related_entity_type',
        'related_entity_id',
        'is_acknowledged',
        'acknowledged_by',
        'acknowledged_at',
        'triggered_at',
    ];

    protected function casts(): array
    {
        return [
            'is_acknowledged' => 'boolean',
            'acknowledged_at' => 'datetime',
            'triggered_at'    => 'datetime',
        ];
    }

    public function acknowledgedByUser(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'acknowledged_by');
    }

    public function recommendations(): HasMany
    {
        return $this->hasMany(DssRecommendation::class, 'related_warning_id');
    }
}
