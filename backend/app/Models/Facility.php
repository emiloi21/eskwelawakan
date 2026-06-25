<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Facility extends Model
{
    use HasPublicId;

    protected $table = 'facilities';

    protected $fillable = [
        'name', 'description', 'location', 'capacity', 'amenities', 'status', 'photo',
    ];

    public function bookings(): HasMany
    {
        return $this->hasMany(FacilityBooking::class, 'facility_id');
    }
}
