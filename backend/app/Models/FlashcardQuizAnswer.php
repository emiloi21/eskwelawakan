<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FlashcardQuizAnswer extends Model
{
    protected $fillable = [
        'session_id', 'card_id', 'question_type', 'question_data',
        'correct_answer', 'student_answer', 'is_correct',
    ];

    protected $casts = [
        'question_data' => 'array',
        'is_correct'    => 'boolean',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(FlashcardQuizSession::class, 'session_id');
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo(FlashcardCard::class, 'card_id');
    }
}
