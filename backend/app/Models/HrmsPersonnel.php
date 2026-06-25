<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HrmsPersonnel extends Model
{
    use HasPublicId;

    protected $table = 'hrms_personnel';

    protected $fillable = [
        'public_id', 'employee_id', 'pin_code', 'user_id',
        'fname', 'mname', 'lname',
        'department_id', 'position_id',
        'employment_type', 'date_hired', 'date_separated',
        'status', 'gender', 'birthdate',
        'contact', 'email', 'address',
        'emergency_contact_name', 'emergency_contact_number',
        'photo',
    ];

    protected $casts = [
        'date_hired'     => 'date:Y-m-d',
        'date_separated' => 'date:Y-m-d',
        'birthdate'      => 'date:Y-m-d',
        'department_id'  => 'integer',
        'position_id'    => 'integer',
        'user_id'        => 'integer',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(HrmsDepartment::class, 'department_id');
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(HrmsPosition::class, 'position_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function leaveApplications(): HasMany
    {
        return $this->hasMany(LeaveApplication::class, 'personnel_id');
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->lname}, {$this->fname}" . ($this->mname ? " {$this->mname[0]}." : ''));
    }
}
