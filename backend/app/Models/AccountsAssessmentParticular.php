<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasPublicId;

class AccountsAssessmentParticular extends Model
{
    use HasPublicId;

    protected $table = 'accounts_assessment_particulars';
    protected $primaryKey = 'assessment_particular_id';

    protected $fillable = [
        'assessment_group_id', 'particular_id', 'account_group',
        'description', 'amount', 'status', 'paymentTerm',
        'schoolYear', 'semester',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function assessmentGroup(): BelongsTo
    {
        return $this->belongsTo(AccountsAssessmentGroup::class, 'assessment_group_id', 'assessment_group_id');
    }

    public function particular(): BelongsTo
    {
        return $this->belongsTo(AccountsParticular::class, 'particular_id', 'particular_id');
    }
}
