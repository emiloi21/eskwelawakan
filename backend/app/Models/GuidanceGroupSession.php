<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GuidanceGroupSession extends Model
{
    use HasPublicId;

    protected $fillable = [
        'public_id',
        'school_year_id',
        'session_title',
        'session_type',
        'target_group',
        'session_date',
        'start_time',
        'end_time',
        'venue',
        'facilitator_id',
        'objectives',
        'activities',
        'observations',
        'attendee_count',
    ];

    protected $casts = [
        'session_date' => 'date',
    ];

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function facilitator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'facilitator_id');
    }
}
