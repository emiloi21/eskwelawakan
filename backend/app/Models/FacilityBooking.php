<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FacilityBooking extends Model
{
    use HasPublicId;

    protected $table = 'facility_bookings';

    protected $fillable = [
        'facility_id', 'requested_by', 'title', 'purpose',
        'event_date', 'start_time', 'end_time', 'attendee_count',
        'status', 'approved_by', 'approver_remarks', 'notes', 'cancelled_at',
    ];

    protected $casts = [
        'event_date'   => 'date',
        'cancelled_at' => 'datetime',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class, 'facility_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
