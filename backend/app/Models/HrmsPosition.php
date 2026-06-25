<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HrmsPosition extends Model
{
    use HasPublicId;

    protected $table = 'hrms_positions';

    protected $fillable = ['public_id', 'name', 'department_id', 'description'];

    protected $casts = ['department_id' => 'integer'];

    public function department(): BelongsTo
    {
        return $this->belongsTo(HrmsDepartment::class, 'department_id');
    }

    public function personnel(): HasMany
    {
        return $this->hasMany(HrmsPersonnel::class, 'position_id');
    }
}
