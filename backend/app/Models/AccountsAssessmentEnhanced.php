<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Traits\HasPublicId;

/**
 * AccountsAssessment
 * 
 * Represents a fee assessment template that groups multiple categories.
 * When assigned to students, categories are flattened into particulars.
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
        'totalAmount' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Categories linked to this assessment (many-to-many)
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(
            AccountsCategory::class,
            'assessment_payables',
            'assessment_id',
            'category_id'
        )
        ->withPivot(['total_amt_payable', 'display_order'])
        ->orderByPivot('display_order');
    }

    /**
     * Assessment payables (join table entries)
     */
    public function payables(): HasMany
    {
        return $this->hasMany(AssessmentPayable::class, 'assessment_id', 'assessment_id')
            ->orderBy('display_order');
    }

    /**
     * Student assessments (assignments to students)
     */
    public function studentAssessments(): HasMany
    {
        return $this->hasMany(StudentAssessment::class, 'assessment_id', 'assessment_id');
    }

    /**
     * Get all particulars from all categories, flattened and deduplicated
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
     */
    public function canBeAssigned(): bool
    {
        // Must have at least one category
        if ($this->categories()->count() === 0) {
            return false;
        }
        
        // At least one category must have particulars
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

    /**
     * Scope: Active assessments
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: For school year
     */
    public function scopeForSchoolYear($query, string $schoolYear)
    {
        return $query->where('schoolYear', $schoolYear);
    }

    /**
     * Scope: For grade level
     */
    public function scopeForGradeLevel($query, string $gradeLevel)
    {
        return $query->where('gradeLevel', $gradeLevel);
    }
}
