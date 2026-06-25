<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\ChartOfAccount;
use App\Traits\HasPublicId;

class AccountsCategory extends Model
{
    use HasPublicId;

    protected $table = 'accounts_categories';
    protected $primaryKey = 'category_id';

    protected $fillable = [
        'gradeLevel', 'strand', 'major', 'schoolYear', 'semester',
        'description', 'totalAmount', 'coa_id',
    ];

    protected function casts(): array
    {
        return [
            'totalAmount' => 'float',
        ];
    }

    public function catParticulars(): HasMany
    {
        return $this->hasMany(AccountsCatParticular::class, 'category_id', 'category_id');
    }

    public function coa(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'coa_id', 'coa_id');
    }

    /**
     * Recalculate totalAmount from cat_particulars and cascade up to
     * assessment_payables and accounts_assessments.
     */
    public function recalculateTotal(): void
    {
        $total = $this->catParticulars()->sum('amount');
        $this->update(['totalAmount' => $total]);

        // Keep payable cache in sync
        \App\Models\AssessmentPayable::where('category_id', $this->category_id)
            ->update(['total_amt_payable' => $total]);

    }
}
