<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AccountsDiscount;
use App\Models\AccountsCategory;
use App\Models\AccountsCatParticular;
use App\Models\AssessmentDiscount;
use App\Models\Student;
use App\Models\StudentAssessment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DiscountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AccountsDiscount::query();

        if ($dept = $request->query('dept')) {
            $query->where('dept', $dept);
        }
        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        $discounts = $query->orderBy('dept')
            ->orderBy('description')
            ->paginate($request->query('per_page', 50));

        return response()->json($discounts);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'dept'           => ['required', 'string', 'max:55'],
            'schoolYear'     => ['required', 'string', 'max:9'],
            'account_code'   => ['nullable', 'string', 'max:55'],
            'description'    => ['required', 'string', 'max:255'],
            'amount'         => ['required', 'numeric', 'min:0'],
            'percentage'     => ['nullable', 'numeric', 'min:0', 'max:100'],
            'classification' => ['nullable', 'string', 'max:255'],
            'type'           => ['required', 'string', 'max:55'],
        ]);

        $discount = AccountsDiscount::create($validated);

        return response()->json(['data' => $discount], 201);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(['data' => AccountsDiscount::findByPublicIdOrFail($id)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $discount = AccountsDiscount::findByPublicIdOrFail($id);

        $validated = $request->validate([
            'dept'           => ['sometimes', 'string', 'max:55'],
            'schoolYear'     => ['sometimes', 'string', 'max:9'],
            'account_code'   => ['nullable', 'string', 'max:55'],
            'description'    => ['sometimes', 'string', 'max:255'],
            'amount'         => ['sometimes', 'numeric', 'min:0'],
            'percentage'     => ['nullable', 'numeric', 'min:0', 'max:100'],
            'classification' => ['nullable', 'string', 'max:255'],
            'type'           => ['sometimes', 'string', 'max:55'],
        ]);

        $discount->update($validated);

        return response()->json(['data' => $discount->fresh()]);
    }

    public function destroy(string $id): JsonResponse
    {
        AccountsDiscount::findByPublicIdOrFail($id)->delete();
        return response()->json(['message' => 'Discount deleted.']);
    }

    /**
     * Bulk assign discount to students — applies per-particular discount
     * and updates student assessment balances.
     */
    public function bulkAssign(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'acct_discount_id'   => ['required', 'string', 'exists:accounts_discount,public_id'],
            'reg_ids'            => ['required', 'array', 'min:1'],
            'reg_ids.*'          => ['string', 'exists:students,public_id'],
            'deduct_category_id' => ['required', 'string', 'exists:accounts_categories,public_id'],
            'schoolYear'         => ['required', 'string', 'max:9'],
        ]);

        $discount = AccountsDiscount::findByPublicIdOrFail($validated['acct_discount_id']);
        $category = AccountsCategory::where('public_id', $validated['deduct_category_id'])->firstOrFail();
        $students = Student::whereIn('public_id', $validated['reg_ids'])->get();
        $catParticulars = AccountsCatParticular::where('category_id', $category->category_id)->get();

        if ($catParticulars->isEmpty()) {
            return response()->json(['message' => 'Category has no linked particulars.'], 422);
        }

        $assigned = 0;

        return DB::transaction(function () use ($students, $discount, $category, $catParticulars, $validated, &$assigned) {
            foreach ($students as $student) {
                foreach ($catParticulars as $cp) {
                    $discountAmount = $discount->type === 'Percentage'
                        ? (float) $cp->amount * ((float) $discount->percentage / 100)
                        : (float) $discount->amount;

                    AssessmentDiscount::updateOrCreate(
                        [
                            'acct_discount_id'    => $discount->acct_discount_id,
                            'reg_id'              => $student->reg_id,
                            'deduct_category_id'  => $category->category_id,
                            'deduct_particular_id' => $cp->particular_id,
                        ],
                        [
                            'account_code' => $discount->account_code,
                            'description'  => $discount->description,
                            'amount'       => $discountAmount,
                            'percentage'   => $discount->percentage ?? 0,
                            'schoolYear'   => $validated['schoolYear'],
                            'type'         => $discount->type,
                            'status'       => 'Active',
                        ]
                    );

                    // If type is "Discount", update student assessment balance immediately
                    if ($discount->type === 'Discount') {
                        $sa = StudentAssessment::where('reg_id', $student->reg_id)
                            ->where('category_id', $category->category_id)
                            ->where('particular_id', $cp->particular_id)
                            ->first();

                        if ($sa) {
                            $newDiscount = (float) $sa->total_amt_discount + $discountAmount;
                            $newBal = (float) $sa->total_amt_payable - ($newDiscount + (float) $sa->total_amt_paid);
                            $sa->update([
                                'total_amt_discount' => $newDiscount,
                                'total_amt_bal'      => $newBal,
                            ]);
                        }
                    }

                    $assigned++;
                }
            }

            return response()->json([
                'message'  => "{$assigned} discount assignments processed.",
                'assigned' => $assigned,
            ]);
        });
    }
}
