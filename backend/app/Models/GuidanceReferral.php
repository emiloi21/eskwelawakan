<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GuidanceReferral extends Model
{
    use HasPublicId;

    protected $fillable = [
        'public_id',
        'reg_id',
        'case_id',
        'referral_type',
        'referrer_name',
        'referrer_role',
        'referrer_user_id',
        'concern_description',
        'urgency',
        'referred_at',
        'acknowledged_at',
        'acknowledged_by',
        'action_taken',
        'status',
    ];

    protected $casts = [
        'referred_at'     => 'date',
        'acknowledged_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }

    public function caseRecord(): BelongsTo
    {
        return $this->belongsTo(GuidanceCaseRecord::class, 'case_id');
    }

    public function referrerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referrer_user_id');
    }

    public function acknowledgedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }
}
