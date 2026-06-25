<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasPublicId;

class ClassModel extends Model
{
    use HasPublicId;

    protected $table = 'classes';
    protected $primaryKey = 'class_id';

    protected $fillable = [
        'gradeLevel', 'strand', 'major', 'section', 'dept',
        'adviser_id', 'adviser', 'schoolYear', 'semester',
    ];

    public function students(): HasMany
    {
        return $this->hasMany(Student::class, 'class_id', 'class_id');
    }
}
