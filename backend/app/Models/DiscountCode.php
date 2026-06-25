<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiscountCode extends Model
{
    use HasPublicId;

    protected $table = 'discount_codes';
    protected $primaryKey = 'discount_code_id';

    protected $fillable = [
        'code',
        'description',
        'acct_discount_id',
        'deduct_category_id',
        'max_uses',
        'uses_count',
        'valid_from',
        'valid_until',
        'dept_restriction',
        'grade_level_restriction',
        'classification_restriction',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active'   => 'boolean',
            'valid_from'  => 'date',
            'valid_until' => 'date',
        ];
    }

    public function accountDiscount(): BelongsTo
    {
        return $this->belongsTo(AccountsDiscount::class, 'acct_discount_id', 'acct_discount_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(AccountsCategory::class, 'deduct_category_id', 'category_id');
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(DiscountCodeRedemption::class, 'discount_code_id', 'discount_code_id');
    }

    /**
     * Check whether a student is eligible to redeem this code.
     * Returns a string error message or null if eligible.
     */
    public function eligibilityError(Student $student): ?string
    {
        if (! $this->is_active) {
            return 'This discount code is no longer active.';
        }

        if ($this->valid_from && now()->startOfDay()->lt($this->valid_from)) {
            return 'This discount code is not valid yet.';
        }

        if ($this->valid_until && now()->startOfDay()->gt($this->valid_until)) {
            return 'This discount code has expired.';
        }

        if ($this->max_uses !== null && $this->uses_count >= $this->max_uses) {
            return 'This discount code has reached its maximum usage limit.';
        }

        if ($this->dept_restriction && $student->dept !== $this->dept_restriction) {
            return 'This discount code is not applicable to your department.';
        }

        if ($this->grade_level_restriction && $student->gradeLevel !== $this->grade_level_restriction) {
            return 'This discount code is not applicable to your grade level.';
        }

        if ($this->classification_restriction && $student->classification !== $this->classification_restriction) {
            return 'This discount code is not applicable to your student classification.';
        }

        $alreadyRedeemed = $this->redemptions()->where('reg_id', $student->reg_id)->exists();
        if ($alreadyRedeemed) {
            return 'You have already redeemed this discount code.';
        }

        return null;
    }
}
