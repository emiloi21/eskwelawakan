<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitorLog extends Model
{
    use HasPublicId;

    protected $table = 'visitor_logs';

    protected $fillable = [
        'visitor_name', 'company_org', 'purpose', 'host_name',
        'id_type', 'id_number', 'badge_no',
        'check_in_at', 'check_out_at', 'photo',
        'status', 'processed_by', 'notes',
    ];

    protected $casts = [
        'check_in_at'  => 'datetime',
        'check_out_at' => 'datetime',
    ];

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
