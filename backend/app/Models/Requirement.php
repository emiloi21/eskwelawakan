<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasPublicId;

class Requirement extends Model
{
    use HasPublicId;

    protected $primaryKey = 'require_id';

    protected $fillable = [
        'dept', 'gradeLevel', 'classification',
        'requirement_name', 'description', 'schoolYear', 'type', 'purpose',
    ];

    public function studentRequirements()
    {
        return $this->hasMany(StudentRequirement::class, 'require_id', 'require_id');
    }
}
