<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClearanceTemplateOffice extends Model
{
    public $timestamps = false;

    protected $table = 'clearance_template_offices';

    protected $fillable = ['template_id', 'office_name', 'responsible_role', 'description', 'sort_order'];

    public function template(): BelongsTo
    {
        return $this->belongsTo(ClearanceTemplate::class, 'template_id');
    }

    public function recordOffices(): HasMany
    {
        return $this->hasMany(ClearanceRecordOffice::class, 'office_id');
    }
}
