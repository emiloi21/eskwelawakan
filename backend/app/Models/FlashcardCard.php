<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasPublicId;

class FlashcardCard extends Model
{
    use HasPublicId;

    protected $fillable = [
        'deck_id', 'front', 'back', 'category_tag',
        'has_cloze', 'image_front', 'image_back', 'sort_order',
    ];

    protected $casts = [
        'has_cloze'  => 'boolean',
        'sort_order' => 'integer',
    ];

    public function deck(): BelongsTo
    {
        return $this->belongsTo(FlashcardDeck::class, 'deck_id');
    }

    public function srLogs(): HasMany
    {
        return $this->hasMany(FlashcardSrLog::class, 'card_id');
    }

    /**
     * Return the cloze answer — first {{...}} token in front text.
     */
    public function getClozeAnswerAttribute(): ?string
    {
        if (! $this->has_cloze) {
            return null;
        }
        preg_match('/\{\{(.+?)\}\}/', $this->front ?? '', $m);
        return $m[1] ?? null;
    }
}
