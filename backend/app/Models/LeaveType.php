<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeaveType extends Model
{
    use HasPublicId;

    protected $table = 'leave_types';

    protected $fillable = ['public_id', 'name', 'days_per_year', 'is_paid'];

    protected $casts = [
        'days_per_year' => 'integer',
        'is_paid'       => 'boolean',
    ];

    public function applications(): HasMany
    {
        return $this->hasMany(LeaveApplication::class, 'leave_type_id');
    }
}
