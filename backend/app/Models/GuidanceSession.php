<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class GuidanceSession extends Model
{
    use HasPublicId;

    protected $fillable = [
        'public_id',
        'case_id',
        'session_number',
        'session_date',
        'session_time',
        'duration_minutes',
        'session_type',
        'approach_used',
        'presenting_issues',
        'interventions_done',
        'response_to_intervention',
        'risk_level',
        'next_steps',
        'follow_up_date',
        'counselor_id',
    ];

    protected $casts = [
        'session_date'  => 'date',
        'follow_up_date' => 'date',
    ];

    public function caseRecord(): BelongsTo
    {
        return $this->belongsTo(GuidanceCaseRecord::class, 'case_id');
    }

    public function counselor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'counselor_id');
    }

    public function caseNote(): HasOne
    {
        return $this->hasOne(GuidanceCaseNote::class, 'session_id');
    }
}
