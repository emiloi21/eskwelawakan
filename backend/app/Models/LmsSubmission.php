<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LmsSubmission extends Model
{
    use HasPublicId;

    protected $table = 'lms_submissions';

    protected $fillable = [
        'assignment_id', 'student_reg_id', 'status',
        'student_note', 'submitted_at', 'score',
        'feedback', 'graded_at', 'graded_by',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'graded_at'    => 'datetime',
        'score'        => 'decimal:2',
    ];

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(LmsAssignment::class, 'assignment_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_reg_id', 'reg_id');
    }

    public function gradedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'graded_by');
    }

    public function files(): HasMany
    {
        return $this->hasMany(LmsSubmissionFile::class, 'submission_id');
    }
}
