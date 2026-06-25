<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GuidancePsychTest extends Model
{
    use HasPublicId;

    protected $fillable = [
        'public_id',
        'case_id',
        'reg_id',
        'test_name',
        'test_date',
        'administered_by',
        'raw_score',
        'scaled_score',
        'score_interpretation',
        'full_interpretation',
        'recommendations',
        'feedback_given',
        'feedback_date',
    ];

    protected $casts = [
        'test_date'      => 'date',
        'feedback_given' => 'boolean',
        'feedback_date'  => 'date',
        'raw_score'      => 'float',
        'scaled_score'   => 'float',
    ];

    public function caseRecord(): BelongsTo
    {
        return $this->belongsTo(GuidanceCaseRecord::class, 'case_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }

    public function administeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'administered_by');
    }
}
