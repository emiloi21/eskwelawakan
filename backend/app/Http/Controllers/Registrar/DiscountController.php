<?php

namespace App\Http\Controllers\Registrar;

use App\Http\Controllers\Controller;
use App\Models\AccountsDiscount;
use App\Models\AssessmentDiscount;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        $discount = AccountsDiscount::findByPublicIdOrFail($id);
        return response()->json(['data' => $discount]);
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
        $discount = AccountsDiscount::findByPublicIdOrFail($id);
        $discount->delete();

        return response()->json(['message' => 'Discount deleted.']);
    }

    /**
     * Bulk assign a discount to multiple students.
     */
    public function bulkAssign(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'acct_discount_id' => ['required', 'string', 'exists:accounts_discount,public_id'],
            'reg_ids'          => ['required', 'array', 'min:1'],
            'reg_ids.*'        => ['string', 'exists:students,public_id'],
            'schoolYear'       => ['required', 'string', 'max:9'],
        ]);

        $discount = AccountsDiscount::findByPublicIdOrFail($validated['acct_discount_id']);
        $students = Student::whereIn('public_id', $validated['reg_ids'])->get();
        $inserted = 0;

        foreach ($students as $student) {
            AssessmentDiscount::firstOrCreate([
                'reg_id'           => $student->reg_id,
                'acct_discount_id' => $discount->acct_discount_id,
                'schoolYear'       => $validated['schoolYear'],
            ], [
                'description' => $discount->description,
                'amount'      => $discount->amount,
                'percentage'  => $discount->percentage,
                'type'        => $discount->type,
            ]);
            $inserted++;
        }

        return response()->json([
            'message' => "Discount assigned to {$inserted} student(s).",
            'count'   => $inserted,
        ]);
    }
}
