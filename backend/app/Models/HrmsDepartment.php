<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HrmsDepartment extends Model
{
    use HasPublicId;

    protected $table = 'hrms_departments';

    protected $fillable = ['public_id', 'name', 'description'];

    public function positions(): HasMany
    {
        return $this->hasMany(HrmsPosition::class, 'department_id');
    }

    public function personnel(): HasMany
    {
        return $this->hasMany(HrmsPersonnel::class, 'department_id');
    }
}
