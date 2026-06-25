<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LmsAssignment extends Model
{
    use HasPublicId;

    protected $table = 'lms_assignments';

    protected $fillable = [
        'class_id', 'created_by', 'type', 'title',
        'instructions', 'points', 'due_date', 'topic', 'allow_late', 'flashcard_deck_id',
    ];

    protected $casts = [
        'due_date'          => 'datetime',
        'allow_late'        => 'boolean',
        'points'            => 'decimal:2',
        'flashcard_deck_id' => 'integer',
    ];

    public function class(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'class_id', 'class_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(LmsSubmission::class, 'assignment_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(LmsQuizQuestion::class, 'assignment_id')->orderBy('order');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(LmsQuizAttempt::class, 'assignment_id');
    }

    public function deck(): BelongsTo
    {
        return $this->belongsTo(FlashcardDeck::class, 'flashcard_deck_id');
    }

    public function isOverdue(): bool
    {
        return $this->due_date && now()->isAfter($this->due_date);
    }
}
