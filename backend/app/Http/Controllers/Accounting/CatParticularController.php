<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AccountsCatParticular;
use App\Models\AccountsCategory;
use App\Models\AccountsParticular;
use App\Models\StudentAssessment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CatParticularController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AccountsCatParticular::with(['category', 'particular']);

        if ($catId = $request->query('category_id')) {
            $query->where('category_id', $catId);
        }
        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }

        $items = $query->orderBy('category_id')
            ->orderBy('description')
            ->paginate($request->query('per_page', 100));

        return response()->json($items);
    }

    /**
     * Link a particular to a category and cascade to student assessments.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id'   => ['required', 'string', 'exists:accounts_categories,public_id'],
            'particular_id' => ['required', 'string', 'exists:accounts_particulars,public_id'],
            'paymentTerm'   => ['nullable', 'string', 'max:55'],
        ]);

        $particular = AccountsParticular::where('public_id', $validated['particular_id'])->firstOrFail();
        $category = AccountsCategory::where('public_id', $validated['category_id'])->firstOrFail();

        return DB::transaction(function () use ($validated, $particular, $category) {
            $catParticular = AccountsCatParticular::updateOrCreate(
                [
                    'category_id'   => $category->category_id,
                    'particular_id' => $particular->particular_id,
                ],
                [
                    'account_group' => $particular->account_group,
                    'account_code'  => $particular->account_code,
                    'description'   => $particular->description,
                    'amount'        => $particular->amount,
                    'status'        => $particular->status,
                    'paymentTerm'   => $validated['paymentTerm'] ?? '13',
                    'schoolYear'    => $category->schoolYear,
                    'semester'      => $particular->semester ?? '-',
                ]
            );

            $this->recalculateCategoryTotal($category->category_id);
            $this->cascadeToStudentAssessments($category->category_id, $particular);

            return response()->json(['data' => $catParticular->load(['category', 'particular'])], 201);
        });
    }

    /**
     * Bulk-link multiple particulars to a category.
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id'      => ['required', 'string', 'exists:accounts_categories,public_id'],
            'particular_ids'   => ['required', 'array', 'min:1'],
            'particular_ids.*' => ['string', 'exists:accounts_particulars,public_id'],
            'paymentTerm'      => ['nullable', 'string', 'max:55'],
        ]);

        $category = AccountsCategory::where('public_id', $validated['category_id'])->firstOrFail();
        $particulars = AccountsParticular::whereIn('public_id', $validated['particular_ids'])->get();

        return DB::transaction(function () use ($validated, $particulars, $category) {
            $created = [];
            foreach ($particulars as $particular) {
                $created[] = AccountsCatParticular::updateOrCreate(
                    [
                        'category_id'   => $category->category_id,
                        'particular_id' => $particular->particular_id,
                    ],
                    [
                        'account_group' => $particular->account_group,
                        'account_code'  => $particular->account_code,
                        'description'   => $particular->description,
                        'amount'        => $particular->amount,
                        'status'        => $particular->status,
                        'paymentTerm'   => $validated['paymentTerm'] ?? '13',
                        'schoolYear'    => $category->schoolYear,
                        'semester'      => $particular->semester ?? '-',
                    ]
                );
                $this->cascadeToStudentAssessments($category->category_id, $particular);
            }

            $this->recalculateCategoryTotal($category->category_id);

            return response()->json([
                'data' => $created,
                'message' => count($created) . ' particulars linked.',
            ], 201);
        });
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $catParticular = AccountsCatParticular::findByPublicIdOrFail($id);

        $validated = $request->validate([
            'amount'      => ['sometimes', 'numeric', 'min:0'],
            'paymentTerm' => ['nullable', 'string', 'max:55'],
            'status'      => ['nullable', 'string', 'max:10'],
        ]);

        return DB::transaction(function () use ($catParticular, $validated) {
            $catParticular->update($validated);

            $this->recalculateCategoryTotal($catParticular->category_id);

            if (isset($validated['amount'])) {
                $particular = AccountsParticular::find($catParticular->particular_id);
                if ($particular) {
                    $this->cascadeToStudentAssessments($catParticular->category_id, $particular, $validated['amount']);
                }
            }

            return response()->json(['data' => $catParticular->fresh(['category', 'particular'])]);
        });
    }

    public function destroy(string $id): JsonResponse
    {
        $catParticular = AccountsCatParticular::findByPublicIdOrFail($id);
        $categoryId = $catParticular->category_id;

        $hasPaid = StudentAssessment::where('category_id', $categoryId)
            ->where('particular_id', $catParticular->particular_id)
            ->where('total_amt_paid', '>', 0)
            ->exists();

        if ($hasPaid) {
            return response()->json([
                'message' => 'Cannot remove: students have payments on this particular.',
            ], 422);
        }

        return DB::transaction(function () use ($catParticular, $categoryId) {
            StudentAssessment::where('category_id', $categoryId)
                ->where('particular_id', $catParticular->particular_id)
                ->where('total_amt_paid', '<=', 0)
                ->delete();

            $catParticular->delete();
            $this->recalculateCategoryTotal($categoryId);

            return response()->json(['message' => 'Category-particular link removed.']);
        });
    }

    private function recalculateCategoryTotal(int $categoryId): void
    {
        $category = AccountsCategory::find($categoryId);
        $category?->recalculateTotal();
    }

    private function cascadeToStudentAssessments(int $categoryId, AccountsParticular $particular, ?float $overrideAmount = null): void
    {
        $amount = $overrideAmount ?? $particular->amount;

        $students = StudentAssessment::where('category_id', $categoryId)
            ->select('reg_id', 'assessment_id')
            ->distinct()
            ->get();

        foreach ($students as $row) {
            $existing = StudentAssessment::where('reg_id', $row->reg_id)
                ->where('category_id', $categoryId)
                ->where('particular_id', $particular->particular_id)
                ->first();

            if ($existing) {
                $existing->update([
                    'total_amt_payable' => $amount,
                    'total_amt_bal'     => $amount - ($existing->total_amt_discount + $existing->total_amt_paid),
                ]);
            } else {
                StudentAssessment::create([
                    'reg_id'            => $row->reg_id,
                    'assessment_id'     => $row->assessment_id,
                    'category_id'       => $categoryId,
                    'particular_id'     => $particular->particular_id,
                    'par_stat'          => 'Active',
                    'total_amt_payable' => $amount,
                    'total_amt_bal'     => $amount,
                    'schoolYear'        => AccountsCategory::where('category_id', $categoryId)->value('schoolYear'),
                ]);
            }
        }
    }
}
