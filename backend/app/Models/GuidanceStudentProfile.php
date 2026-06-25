<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GuidanceStudentProfile extends Model
{
    use HasPublicId;

    protected $fillable = [
        'public_id',
        'reg_id',
        'school_year_id',
        'father_name',
        'father_occupation',
        'father_contact',
        'mother_name',
        'mother_occupation',
        'mother_contact',
        'guardian_name',
        'guardian_relationship',
        'guardian_contact',
        'monthly_family_income',
        'siblings_count',
        'birth_order',
        'living_with',
        'health_conditions',
        'special_needs',
        'interests_hobbies',
        'career_aspirations',
        'is_4ps_beneficiary',
        'is_pwd',
        'is_solo_parent_child',
        'notes',
        'completed_by',
    ];

    protected $casts = [
        'is_4ps_beneficiary' => 'boolean',
        'is_pwd'             => 'boolean',
        'is_solo_parent_child' => 'boolean',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }
}
