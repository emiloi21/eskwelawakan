<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasPublicId;

class FlashcardQuizSession extends Model
{
    use HasPublicId;

    protected $fillable = [
        'deck_id', 'student_user_id', 'quiz_types', 'total_questions',
        'correct_count', 'is_graded', 'status', 'started_at', 'completed_at',
    ];

    protected $casts = [
        'quiz_types'   => 'array',
        'is_graded'    => 'boolean',
        'started_at'   => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function deck(): BelongsTo
    {
        return $this->belongsTo(FlashcardDeck::class, 'deck_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_user_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(FlashcardQuizAnswer::class, 'session_id');
    }

    public function getScorePercentAttribute(): ?float
    {
        if ($this->total_questions === 0) {
            return null;
        }
        return round(($this->correct_count / $this->total_questions) * 100, 1);
    }
}
