<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntranceExamBooking extends Model
{
    protected $table = 'entrance_exam_bookings';

    protected $fillable = [
        'slot_id',
        'reg_id',
        'booked_by',
        'result',
        'remarks',
    ];

    public function slot(): BelongsTo
    {
        return $this->belongsTo(EntranceExamSlot::class, 'slot_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }

    public function bookedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'booked_by');
    }
}
