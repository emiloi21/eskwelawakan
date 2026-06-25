<?php

namespace App\Services;

use App\Models\AccountsAssessment;
use App\Models\StudentAssessment;
use App\Models\Student;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * AssessmentService
 * 
 * Handles business logic for assessment creation, assignment, and management.
 * Implements deduplication rules and cascade updates.
 */
class AssessmentService
{
    /**
     * Assign an assessment to a student with flattened particulars
     * 
     * @param int $assessmentId Assessment to assign
     * @param int $studentId Student to assign to
     * @param array $options Assignment options (discounts, pro_rate_date, etc.)
     * @return array Assignment result with particulars
     * @throws \Exception If validation fails
     */
    public function assignToStudent(int $assessmentId, int $studentId, array $options = []): array
    {
        return DB::transaction(function () use ($assessmentId, $studentId, $options) {
            // 1. Load assessment with categories and particulars
            $assessment = AccountsAssessment::with([
                'categories.catParticulars.particular'
            ])->findOrFail($assessmentId);
            
            // 2. Validate assessment can be assigned
            $errors = $assessment->getAssignmentErrors();
            if (!empty($errors)) {
                throw new \InvalidArgumentException(
                    'Cannot assign assessment: ' . implode('; ', $errors)
                );
            }
            
            // 3. Check for duplicate assignment
            $existingAssignment = StudentAssessment::where('reg_id', $studentId)
                ->where('assessment_id', $assessmentId)
                ->where('schoolYear', $assessment->schoolYear)
                ->first();
                
            if ($existingAssignment) {
                throw new \InvalidArgumentException(
                    "Student already has assessment '{$assessment->description}' for {$assessment->schoolYear}"
                );
            }
            
            // 4. Get flattened, deduplicated particulars
            $particulars = $assessment->getFlattenedParticulars();
            
            if (empty($particulars)) {
                throw new \InvalidArgumentException('Assessment has no assignable particulars');
            }
            
            // 5. Apply discounts if provided
            $discounts = $options['discounts'] ?? [];
            $particulars = $this->applyDiscounts($particulars, $discounts);
            
            // 6. Apply pro-rating if mid-year enrollment
            if (isset($options['pro_rate_date'])) {
                $particulars = $this->applyProRating($particulars, $options['pro_rate_date']);
            }
            
            // 7. Create student assessment records
            $studentParticulars = [];
            $totalPayable = 0;
            $totalDiscount = 0;
            
            foreach ($particulars as $particular) {
                $discountAmount = $particular['discount_applied'] ?? 0;
                $payableAmount = $particular['amount'] - $discountAmount;
                
                $studentAssessment = StudentAssessment::create([
                    'reg_id' => $studentId,
                    'assessment_id' => $assessmentId,
                    'category_id' => $particular['category_id'],
                    'particular_id' => $particular['particular_id'],
                    'total_amt_payable' => $payableAmount,
                    'total_amt_paid' => 0,
                    'total_amt_bal' => $payableAmount,
                    'total_amt_discount' => $discountAmount,
                    'par_stat' => 'Active',
                    'schoolYear' => $assessment->schoolYear,
                    'paymentTerm' => $particular['paymentTerm'],
                    'assigned_at' => now(),
                ]);
                
                $studentParticulars[] = [
                    'student_particular_id' => $studentAssessment->public_id,
                    'particular_id' => $particular['particular_public_id'],
                    'particular_name' => $particular['description'],
                    'category_id' => $particular['category_public_id'],
                    'category_name' => $particular['category_name'],
                    'original_amount' => $particular['amount'],
                    'payable_amount' => $payableAmount,
                    'discount' => $discountAmount,
                    'balance' => $payableAmount,
                    'payment_term' => $particular['paymentTerm'],
                    'status' => 'Active',
                    'due_date' => $this->calculateDueDate($particular['paymentTerm']),
                ];
                
                $totalPayable += $payableAmount;
                $totalDiscount += $discountAmount;
            }
            
            // 8. Log assignment
            Log::info('Assessment assigned to student', [
                'assessment_id' => $assessmentId,
                'student_id' => $studentId,
                'particular_count' => count($particulars),
                'total_amount' => $totalPayable,
            ]);
            
            return [
                'student_id' => $studentId,
                'assessment_id' => $assessment->public_id,
                'assessment_name' => $assessment->description,
                'school_year' => $assessment->schoolYear,
                'semester' => $assessment->semester,
                'particulars' => $studentParticulars,
                'summary' => [
                    'total_particulars' => count($particulars),
                    'total_original_amount' => $assessment->totalAmount,
                    'total_payable' => $totalPayable,
                    'total_discount' => $totalDiscount,
                    'total_balance' => $totalPayable,
                ],
                'assigned_at' => now()->toIso8601String(),
            ];
        });
    }

    /**
     * Get student's flattened assessment particulars
     * 
     * @param int $studentId Student registration ID
     * @param int|null $assessmentId Specific assessment (null for all)
     * @param string|null $schoolYear Filter by school year
     * @return array Consolidated list of particulars
     */
    public function getStudentParticulars(
        int $studentId, 
        ?int $assessmentId = null,
        ?string $schoolYear = null
    ): array {
        $query = StudentAssessment::with(['particular', 'category', 'assessment'])
            ->where('reg_id', $studentId);
            
        if ($assessmentId) {
            $query->where('assessment_id', $assessmentId);
        }
        
        if ($schoolYear) {
            $query->where('schoolYear', $schoolYear);
        }
        
        $records = $query->orderBy('assigned_at', 'desc')->get();
        
        $particulars = [];
        foreach ($records as $record) {
            $particulars[] = [
                'student_particular_id' => $record->public_id,
                'particular_id' => $record->particular?->public_id,
                'particular_name' => $record->particular?->description ?? $record->description,
                'category_id' => $record->category?->public_id,
                'category_name' => $record->category?->description ?? 'Uncategorized',
                'assessment_id' => $record->assessment?->public_id,
                'assessment_name' => $record->assessment?->description,
                'original_amount' => $record->particular?->amount ?? 0,
                'payable_amount' => $record->total_amt_payable,
                'paid_amount' => $record->total_amt_paid,
                'balance' => $record->total_amt_bal,
                'discount' => $record->total_amt_discount,
                'payment_term' => $record->paymentTerm,
                'status' => $record->par_stat,
                'due_date' => $this->getDueDate($record),
                'assigned_at' => $record->assigned_at?->toIso8601String(),
            ];
        }
        
        return $particulars;
    }

    /**
     * Cascade update to student records when category/particular changes
     * 
     * @param int $categoryId Category that was modified
     */
    public function cascadeCategoryUpdate(int $categoryId): void
    {
        // Get all assessments using this category
        $assessments = AccountsAssessment::whereHas('categories', function ($q) use ($categoryId) {
            $q->where('accounts_categories.category_id', $categoryId);
        })->get();
        
        foreach ($assessments as $assessment) {
            // Recalculate assessment total
            $assessment->recalculateTotal();
            
            // Update unpaid student records
            StudentAssessment::where('assessment_id', $assessment->assessment_id)
                ->where('category_id', $categoryId)
                ->where('total_amt_paid', '<=', 0)
                ->chunk(100, function ($records) {
                    foreach ($records as $record) {
                        $newAmount = $record->particular?->amount ?? 0;
                        $record->update([
                            'total_amt_payable' => $newAmount,
                            'total_amt_bal' => $newAmount - $record->total_amt_discount,
                        ]);
                    }
                });
        }
    }

    /**
     * Apply discounts to particulars
     */
    private function applyDiscounts(array $particulars, array $discounts): array
    {
        foreach ($particulars as &$particular) {
            $particular['discount_applied'] = 0;
            
            foreach ($discounts as $discount) {
                // Apply discount if matches particular or category
                if ($this->discountAppliesTo($discount, $particular)) {
                    $discountAmount = $this->calculateDiscount(
                        $particular['amount'],
                        $discount
                    );
                    $particular['discount_applied'] += $discountAmount;
                }
            }
        }
        
        return $particulars;
    }

    /**
     * Apply pro-rating for mid-year enrollment
     */
    private function applyProRating(array $particulars, string $enrollmentDate): array
    {
        $enrollment = strtotime($enrollmentDate);
        $schoolYearStart = strtotime(date('Y-m-d', $enrollment) . '-06-01');
        $schoolYearEnd = strtotime('+1 year', $schoolYearStart);
        
        $totalDays = ($schoolYearEnd - $schoolYearStart) / 86400;
        $remainingDays = ($schoolYearEnd - $enrollment) / 86400;
        $ratio = $remainingDays / $totalDays;
        
        foreach ($particulars as &$particular) {
            // Only pro-rate certain types of fees
            if ($this->isProRateable($particular)) {
                $originalAmount = $particular['amount'];
                $particular['amount'] = round($originalAmount * $ratio, 2);
                $particular['is_prorated'] = true;
                $particular['prorate_ratio'] = $ratio;
            }
        }
        
        return $particulars;
    }

    /**
     * Check if discount applies to particular
     */
    private function discountAppliesTo(array $discount, array $particular): bool
    {
        if (isset($discount['particular_id'])) {
            return $discount['particular_id'] === $particular['particular_id'];
        }
        
        if (isset($discount['category_id'])) {
            return $discount['category_id'] === $particular['category_id'];
        }
        
        return true; // General discount
    }

    /**
     * Calculate discount amount
     */
    private function calculateDiscount(float $amount, array $discount): float
    {
        if ($discount['type'] === 'percentage') {
            return round($amount * ($discount['value'] / 100), 2);
        }
        
        return min($discount['value'], $amount);
    }

    /**
     * Check if fee type is pro-rateable
     */
    private function isProRateable(array $particular): bool
    {
        // Tuition fees are pro-rateable, one-time fees are not
        $proRateableTerms = ['Monthly', 'Full', 'Quarterly'];
        return in_array($particular['paymentTerm'], $proRateableTerms);
    }

    /**
     * Calculate due date based on payment term
     */
    private function calculateDueDate(string $paymentTerm): ?string
    {
        return match($paymentTerm) {
            'Upon Enrollment' => now()->toDateString(),
            'Full' => now()->addMonth()->toDateString(),
            'Monthly' => now()->addMonth()->toDateString(),
            default => now()->addMonth()->toDateString(),
        };
    }

    /**
     * Get due date from record
     */
    private function getDueDate(StudentAssessment $record): ?string
    {
        // If assigned, calculate from assigned date
        if ($record->assigned_at) {
            return match($record->paymentTerm) {
                'Upon Enrollment' => $record->assigned_at->toDateString(),
                default => $record->assigned_at->copy()->addMonth()->toDateString(),
            };
        }
        
        return null;
    }
}
