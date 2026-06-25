<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentHealthRecord extends Model
{
    use HasPublicId;

    protected $table = 'student_health_records';

    protected $fillable = [
        'student_id', 'blood_type', 'height_cm', 'weight_kg',
        'vision_left', 'vision_right', 'hearing_left', 'hearing_right',
        'medical_conditions', 'allergies', 'current_medications',
        'vaccination_records', 'last_physical_exam', 'philhealth_no', 'notes',
    ];

    protected $casts = [
        'vaccination_records' => 'array',
        'last_physical_exam'  => 'date',
        'height_cm'           => 'decimal:1',
        'weight_kg'           => 'decimal:1',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id', 'reg_id');
    }
}
