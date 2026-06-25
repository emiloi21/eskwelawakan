<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveApplication extends Model
{
    use HasPublicId;

    protected $table = 'leave_applications';

    protected $fillable = [
        'public_id', 'personnel_id', 'leave_type_id',
        'start_date', 'end_date', 'total_days',
        'reason', 'status', 'approved_by', 'approver_remarks',
    ];

    protected $casts = [
        'start_date'  => 'date',
        'end_date'    => 'date',
        'total_days'  => 'float',
        'personnel_id' => 'integer',
        'leave_type_id' => 'integer',
        'approved_by'  => 'integer',
    ];

    public function personnel(): BelongsTo
    {
        return $this->belongsTo(HrmsPersonnel::class, 'personnel_id');
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class, 'leave_type_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
