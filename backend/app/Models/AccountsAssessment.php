<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Traits\HasPublicId;

/**
 * AccountsAssessment
 * 
 * Represents a fee assessment template that groups multiple Categories.
 * When assigned to students, categories are flattened into particulars.
 * 
 * Relationships:
 * - Assessment hasMany Categories (via AssessmentPayable)
 * - Category hasMany Particulars (via AccountsCatParticular)
 * - Assessment hasMany StudentAssessments (flattened particulars per student)
 */
class AccountsAssessment extends Model
{
    use HasPublicId;

    protected $primaryKey = 'assessment_id';

    protected $fillable = [
        'dept', 'gradeLevel', 'strand', 'major',
        'schoolYear', 'semester', 'coverage', 'description',
        'totalAmount', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Override totalAmount to compute from loaded payables when available,
     * so the JSON response is never stale even before recalculateTotal() runs.
     */
    public function getTotalAmountAttribute(): float
    {
        if ($this->relationLoaded('payables')) {
            return (float) $this->payables->sum(fn($p) => $p->category?->totalAmount ?? 0);
        }
        return (float) ($this->attributes['totalAmount'] ?? 0);
    }

    /**
     * Categories linked to this assessment (many-to-many)
     * Assessment hasMany Categories
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(
            AccountsCategory::class,
            'assessment_payables',
            'assessment_id',
            'category_id'
        )
        ->withPivot(['total_amt_payable', 'display_order', 'schoolYear'])
        ->orderByPivot('display_order');
    }

    /**
     * Assessment payables (join table entries)
     */
    public function payables(): HasMany
    {
        return $this->hasMany(AssessmentPayable::class, 'assessment_id', 'assessment_id');
    }

    /**
     * Student assessments (assignments to students)
     * Contains flattened particulars from all categories
     */
    public function studentAssessments(): HasMany
    {
        return $this->hasMany(StudentAssessment::class, 'assessment_id', 'assessment_id');
    }

    /**
     * Get all particulars from all categories, flattened and deduplicated
     * 
     * Business Rules:
     * 1. Collect all particulars from all categories
     * 2. Deduplicate by particular_id
     * 3. Keep higher amount if duplicates
     * 4. Prefer Active status over Inactive
     * 5. Sort by category order, then particular id
     * 
     * @return array Deduplicated list of particulars
     */
    public function getFlattenedParticulars(): array
    {
        $particulars = [];
        
        foreach ($this->categories as $category) {
            foreach ($category->catParticulars as $catParticular) {
                $particularId = $catParticular->particular_id;
                
                $item = [
                    'particular_id' => $particularId,
                    'particular_public_id' => $catParticular->particular?->public_id,
                    'description' => $catParticular->description,
                    'amount' => $catParticular->amount,
                    'account_code' => $catParticular->account_code,
                    'account_group' => $catParticular->account_group,
                    'paymentTerm' => $catParticular->paymentTerm,
                    'status' => $catParticular->status,
                    'category_id' => $category->category_id,
                    'category_public_id' => $category->public_id,
                    'category_name' => $category->description,
                    'category_order' => $category->pivot?->display_order ?? 0,
                ];
                
                // Deduplication logic
                if (!isset($particulars[$particularId])) {
                    $particulars[$particularId] = $item;
                } else {
                    // Keep higher amount
                    if ($item['amount'] > $particulars[$particularId]['amount']) {
                        $particulars[$particularId] = $item;
                    }
                    // Prefer active status
                    elseif ($item['status'] === 'Active' && $particulars[$particularId]['status'] !== 'Active') {
                        $particulars[$particularId] = $item;
                    }
                }
            }
        }
        
        // Sort by category order, then particular id
        usort($particulars, function ($a, $b) {
            if ($a['category_order'] !== $b['category_order']) {
                return $a['category_order'] <=> $b['category_order'];
            }
            return $a['particular_id'] <=> $b['particular_id'];
        });
        
        return array_values($particulars);
    }

    /**
     * Recalculate total from categories
     */
    public function recalculateTotal(): void
    {
        $total = $this->categories()->sum('totalAmount');
        $this->update(['totalAmount' => $total]);
        
        // Update payables cache
        foreach ($this->payables as $payable) {
            $categoryTotal = $payable->category?->totalAmount ?? 0;
            $payable->update(['total_amt_payable' => $categoryTotal]);
        }
    }

    /**
     * Check if assessment can be assigned to students
     * 
     * Validation Rules:
     * 1. Must have at least one category
     * 2. At least one category must have active particulars
     */
    public function canBeAssigned(): bool
    {
        if ($this->categories()->count() === 0) {
            return false;
        }
        
        foreach ($this->categories as $category) {
            if ($category->catParticulars()->where('status', 'Active')->count() > 0) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get validation errors preventing assignment
     */
    public function getAssignmentErrors(): array
    {
        $errors = [];
        
        if ($this->categories()->count() === 0) {
            $errors[] = 'Assessment has no categories';
        }
        
        $emptyCategories = [];
        foreach ($this->categories as $category) {
            if ($category->catParticulars()->where('status', 'Active')->count() === 0) {
                $emptyCategories[] = $category->description;
            }
        }
        
        if (!empty($emptyCategories)) {
            $errors[] = 'Categories have no active particulars: ' . implode(', ', $emptyCategories);
        }
        
        return $errors;
    }
}
