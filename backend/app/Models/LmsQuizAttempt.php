<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LmsQuizAttempt extends Model
{
    use HasPublicId;

    protected $table = 'lms_quiz_attempts';

    protected $fillable = [
        'assignment_id', 'student_reg_id', 'attempt_number',
        'score', 'max_score', 'started_at', 'submitted_at',
    ];

    protected $casts = [
        'started_at'   => 'datetime',
        'submitted_at' => 'datetime',
        'score'        => 'decimal:2',
        'max_score'    => 'decimal:2',
    ];

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(LmsAssignment::class, 'assignment_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_reg_id', 'reg_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(LmsQuizAnswer::class, 'attempt_id');
    }
}
