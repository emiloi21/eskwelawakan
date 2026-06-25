<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryCheck extends Model
{
    use HasPublicId;

    protected $table = 'inventory_checks';

    protected $fillable = [
        'title', 'school_year', 'location', 'assigned_to_id', 'status',
        'due_date', 'submitted_at', 'assignee_remarks',
        'reviewed_by_id', 'reviewed_at', 'custodian_remarks',
    ];

    protected $casts = [
        'due_date' => 'date',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_id');
    }

    public function checkItems(): HasMany
    {
        return $this->hasMany(InventoryCheckItem::class, 'check_id');
    }
}
