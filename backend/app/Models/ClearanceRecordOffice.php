<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClearanceRecordOffice extends Model
{
    public $timestamps = false;

    protected $table = 'clearance_record_offices';

    protected $fillable = [
        'record_id', 'office_id', 'office_name',
        'status', 'cleared_by_id', 'cleared_at', 'remarks',
    ];

    protected $casts = ['cleared_at' => 'datetime'];

    public function record(): BelongsTo
    {
        return $this->belongsTo(ClearanceRecord::class, 'record_id');
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(ClearanceTemplateOffice::class, 'office_id');
    }

    public function clearedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cleared_by_id');
    }
}
