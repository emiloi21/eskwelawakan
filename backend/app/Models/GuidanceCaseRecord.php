<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GuidanceCaseRecord extends Model
{
    use HasPublicId;

    protected $fillable = [
        'public_id',
        'reg_id',
        'school_year_id',
        'case_number',
        'case_type',
        'presenting_concern',
        'urgency',
        'status',
        'assigned_counselor_id',
        'parent_notified',
        'parent_notified_at',
        'opened_at',
        'closed_at',
        'notes',
    ];

    protected $casts = [
        'parent_notified'    => 'boolean',
        'parent_notified_at' => 'datetime',
        'opened_at'          => 'datetime',
        'closed_at'          => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function assignedCounselor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_counselor_id');
    }

    public function referrals(): HasMany
    {
        return $this->hasMany(GuidanceReferral::class, 'case_id');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(GuidanceSession::class, 'case_id');
    }

    public function caseNotes(): HasMany
    {
        return $this->hasMany(GuidanceCaseNote::class, 'case_id');
    }

    public function psychTests(): HasMany
    {
        return $this->hasMany(GuidancePsychTest::class, 'case_id');
    }

    public function externalReferrals(): HasMany
    {
        return $this->hasMany(GuidanceExternalReferral::class, 'case_id');
    }
}
