<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GuidanceExternalReferral extends Model
{
    use HasPublicId;

    protected $fillable = [
        'public_id',
        'case_id',
        'agency_name',
        'agency_type',
        'contact_person',
        'contact_number',
        'reason_for_referral',
        'services_requested',
        'referred_at',
        'school_head_cosigned',
        'follow_up_date',
        'outcome',
        'status',
        'referred_by',
    ];

    protected $casts = [
        'referred_at'          => 'date',
        'follow_up_date'       => 'date',
        'school_head_cosigned' => 'boolean',
    ];

    public function caseRecord(): BelongsTo
    {
        return $this->belongsTo(GuidanceCaseRecord::class, 'case_id');
    }

    public function referredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referred_by');
    }
}
