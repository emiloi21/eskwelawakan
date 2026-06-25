<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasPublicId;

class AccountsAssessmentGroup extends Model
{
    use HasPublicId;

    protected $table = 'accounts_assessment_groups';
    protected $primaryKey = 'assessment_group_id';

    protected $fillable = [
        'gradeLevel', 'strand', 'major', 'schoolYear', 'semester',
        'description', 'totalAmount',
    ];

    protected function casts(): array
    {
        return [
            'totalAmount' => 'decimal:2',
        ];
    }

    public function assessmentParticulars(): HasMany
    {
        return $this->hasMany(AccountsAssessmentParticular::class, 'assessment_group_id', 'assessment_group_id');
    }
}
