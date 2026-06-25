<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicVisit extends Model
{
    use HasPublicId;

    protected $table = 'clinic_visits';

    protected $fillable = [
        'student_id', 'visit_date', 'visit_time', 'complaint',
        'diagnosis', 'treatment_given', 'medicine_given',
        'vital_signs', 'referred_to', 'disposition', 'handled_by', 'notes',
    ];

    protected $casts = [
        'visit_date'  => 'date',
        'vital_signs' => 'array',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id', 'reg_id');
    }

    public function handledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
