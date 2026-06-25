<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssessmentPayable extends Model
{
    use HasPublicId;

    protected $primaryKey = 'assess_payable_id';

    protected $fillable = [
        'assessment_id', 'category_id', 'total_amt_payable', 'schoolYear',
    ];

    protected function casts(): array
    {
        return [
            'total_amt_payable' => 'decimal:2',
        ];
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(AccountsAssessment::class, 'assessment_id', 'assessment_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(AccountsCategory::class, 'category_id', 'category_id');
    }
}
