<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Grade extends Model
{
    protected $primaryKey = 'grade_id';

    protected $fillable = [
        'reg_id', 'class_id', 'subject', 'school_year', 'semester',
        'q1', 'q2', 'q3', 'q4', 'final_grade', 'remarks',
    ];

    protected function casts(): array
    {
        return [
            'q1' => 'decimal:2',
            'q2' => 'decimal:2',
            'q3' => 'decimal:2',
            'q4' => 'decimal:2',
            'final_grade' => 'decimal:2',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }

    public function classInfo(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'class_id', 'class_id');
    }
}
