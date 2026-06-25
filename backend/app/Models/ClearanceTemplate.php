<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClearanceTemplate extends Model
{
    use HasPublicId;

    protected $table = 'clearance_templates';

    protected $fillable = ['name', 'school_year', 'for_type', 'is_active', 'created_by_id'];

    protected $casts = ['is_active' => 'boolean'];

    public function offices(): HasMany
    {
        return $this->hasMany(ClearanceTemplateOffice::class, 'template_id')->orderBy('sort_order');
    }

    public function records(): HasMany
    {
        return $this->hasMany(ClearanceRecord::class, 'template_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}
