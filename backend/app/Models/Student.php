<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasPublicId;

class Student extends Model
{
    use HasPublicId;

    protected $primaryKey = 'reg_id';

    protected $fillable = [
        'lrn', 'esc_id', 'student_id',
        'lname', 'fname', 'mname', 'suffix',
        'bdMM', 'bdDD', 'bdYYYY', 'sex', 'age',
        'address_street', 'address_brgy', 'address_city_mun', 'address_province',
        'guardian_lname', 'guardian_fname', 'guardian_contact', 'guardian_relation',
        'g_address_street', 'g_address_brgy', 'g_address_city_mun', 'g_address_province',
        'last_school', 'last_school_sy', 'last_school_type', 'gen_average',
        'class_id', 'dept', 'gradeLevel', 'strand', 'major', 'section',
        'classification', 'schoolYear', 'sem',
        'appDate', 'appTime', 'assessment_id',
        'status', 'remarks', 'stat_date', 'prev_sy_reg_id', 'img',
    ];

    public function classInfo(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'class_id', 'class_id');
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(StudentAssessment::class, 'reg_id', 'reg_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(StudentPayment::class, 'reg_id', 'reg_id');
    }

    public function paymentData(): HasMany
    {
        return $this->hasMany(StudentPaymentData::class, 'reg_id', 'reg_id');
    }

    public function otherFees(): HasMany
    {
        return $this->hasMany(StudentOtherFee::class, 'reg_id', 'reg_id');
    }

    public function requirements(): HasMany
    {
        return $this->hasMany(StudentRequirement::class, 'student_id', 'student_id');
    }

    public function discounts(): HasMany
    {
        return $this->hasMany(AssessmentDiscount::class, 'reg_id', 'reg_id');
    }

    public function bookAssigned(): HasMany
    {
        return $this->hasMany(BookAssigned::class, 'reg_id', 'reg_id');
    }

    public function getFullNameAttribute(): string
    {
        $name = trim("{$this->lname}, {$this->fname} {$this->mname}");
        return $this->suffix && $this->suffix !== '-' ? "{$name} {$this->suffix}" : $name;
    }
}
