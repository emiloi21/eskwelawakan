<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HealthIncident extends Model
{
    use HasPublicId;

    protected $table = 'health_incidents';

    protected $fillable = [
        'student_id', 'incident_type', 'incident_datetime', 'location',
        'description', 'first_aid_given', 'referred_to_hospital',
        'hospital_name', 'witnesses', 'reported_by', 'status', 'notes',
    ];

    protected $casts = [
        'incident_datetime'    => 'datetime',
        'referred_to_hospital' => 'boolean',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id', 'reg_id');
    }

    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }
}
