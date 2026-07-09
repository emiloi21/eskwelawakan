<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasPublicId;

class StudentRequirement extends Model
{
    use HasPublicId;

    protected $primaryKey = 'stud_reqs_id';

    protected $fillable = [
        'require_id', 'student_id', 'reg_id', 'schoolYear',
        'status', 'file_path', 'remarks',
    ];

    protected $appends = [
        'file_url',
    ];

    public function requirement(): BelongsTo
    {
        return $this->belongsTo(Requirement::class, 'require_id', 'require_id');
    }

    public function getFileUrlAttribute()
    {
        if (!$this->file_path) return null;
        
        return \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'files.requirement.download',
            now()->addHours(1),
            ['publicId' => $this->public_id]
        );
    }
}
