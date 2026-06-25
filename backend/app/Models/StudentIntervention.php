<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasPublicId;

class StudentIntervention extends Model
{
    use HasPublicId;

    protected $fillable = [
        'public_id',
        'student_id',
        'school_year_id',
        'flagged_reason',
        'intervention_status',
        'notes',
        'flagged_by',
        'flagged_at',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'flagged_at'  => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id', 'reg_id');
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class, 'school_year_id');
    }

    public function flaggedByUser(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'flagged_by');
    }
}
