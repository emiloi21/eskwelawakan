<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;

class AttendanceLog extends Model
{
    use HasPublicId;

    protected $table = 'attendance_logs';

    protected $fillable = [
        'public_id', 'entity_type', 'entity_id',
        'log_time', 'direction', 'method', 'notes', 'kiosk_code',
    ];

    protected $casts = [
        'log_time' => 'datetime',
    ];
}
