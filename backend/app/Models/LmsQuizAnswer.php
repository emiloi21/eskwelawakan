<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LmsQuizAnswer extends Model
{
    protected $table = 'lms_quiz_answers';

    public $timestamps = false;

    protected $fillable = [
        'attempt_id', 'question_id', 'choice_id',
        'text_answer', 'is_correct', 'points_earned',
    ];

    protected $casts = [
        'is_correct'    => 'boolean',
        'points_earned' => 'decimal:2',
    ];

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(LmsQuizAttempt::class, 'attempt_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(LmsQuizQuestion::class, 'question_id');
    }

    public function choice(): BelongsTo
    {
        return $this->belongsTo(LmsQuizChoice::class, 'choice_id');
    }
}
