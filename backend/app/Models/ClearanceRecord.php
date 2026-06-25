<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClearanceRecord extends Model
{
    use HasPublicId;

    protected $table = 'clearance_records';

    protected $fillable = ['template_id', 'user_id', 'status', 'notes', 'completed_at'];

    protected $casts = ['completed_at' => 'datetime'];

    public function template(): BelongsTo
    {
        return $this->belongsTo(ClearanceTemplate::class, 'template_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function officeStatuses(): HasMany
    {
        return $this->hasMany(ClearanceRecordOffice::class, 'record_id');
    }
}
