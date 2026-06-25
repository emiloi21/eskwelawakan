<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasPublicId;

class FlashcardDeck extends Model
{
    use HasPublicId;

    protected $fillable = [
        'owner_user_id', 'title', 'description', 'tags', 'is_graded', 'is_pinned',
    ];

    protected $casts = [
        'tags'      => 'array',
        'is_graded' => 'boolean',
        'is_pinned' => 'boolean',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function cards(): HasMany
    {
        return $this->hasMany(FlashcardCard::class, 'deck_id')->orderBy('sort_order');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(FlashcardDeckShare::class, 'deck_id');
    }

    public function quizSessions(): HasMany
    {
        return $this->hasMany(FlashcardQuizSession::class, 'deck_id');
    }
}
