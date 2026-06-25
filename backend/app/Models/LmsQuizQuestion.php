<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LmsQuizQuestion extends Model
{
    protected $table = 'lms_quiz_questions';

    protected $fillable = ['assignment_id', 'type', 'question', 'points', 'order'];

    protected $casts = [
        'points' => 'integer',
        'order'  => 'integer',
    ];

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(LmsAssignment::class, 'assignment_id');
    }

    public function choices(): HasMany
    {
        return $this->hasMany(LmsQuizChoice::class, 'question_id')->orderBy('order');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(LmsQuizAnswer::class, 'question_id');
    }
}
