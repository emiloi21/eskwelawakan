<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EntranceExamSlot extends Model
{
    use HasPublicId;

    protected $table = 'entrance_exam_slots';

    protected $fillable = [
        'public_id',
        'school_year',
        'dept',
        'grade_level',
        'exam_date',
        'exam_time',
        'location',
        'capacity',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'exam_date'  => 'date',
        'is_active'  => 'boolean',
        'capacity'   => 'integer',
    ];

    public function bookings(): HasMany
    {
        return $this->hasMany(EntranceExamBooking::class, 'slot_id');
    }

    public function getBookedCountAttribute(): int
    {
        return $this->bookings()->count();
    }

    public function getSpotsLeftAttribute(): int
    {
        return max(0, $this->capacity - $this->booked_count);
    }
}
