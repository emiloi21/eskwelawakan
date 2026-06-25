<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AccountsCategory;
use App\Models\AccountsCatParticular;
use App\Models\AccountsDiscount;
use App\Models\AssessmentDiscount;
use App\Models\DiscountCode;
use App\Models\DiscountCodeRedemption;
use App\Models\Student;
use App\Models\StudentAssessment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class DiscountCodeController extends Controller
{
    // ── Admin: CRUD ────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $codes = DiscountCode::with(['accountDiscount:acct_discount_id,description,type,amount,percentage', 'category:category_id,description'])
            ->when($request->query('active'), fn($q) => $q->where('is_active', true))
            ->when($request->query('search'), fn($q, $s) => $q->where('code', 'like', "%{$s}%")
                ->orWhere('description', 'like', "%{$s}%"))
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($codes);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code'                       => ['required', 'string', 'max:50', 'unique:discount_codes,code'],
            'description'                => ['required', 'string', 'max:255'],
            'acct_discount_id'           => ['required', 'string', 'exists:accounts_discount,public_id'],
            'deduct_category_id'         => ['required', 'string', 'exists:accounts_categories,public_id'],
            'max_uses'                   => ['nullable', 'integer', 'min:1'],
            'valid_from'                 => ['nullable', 'date'],
            'valid_until'                => ['nullable', 'date', 'after_or_equal:valid_from'],
            'dept_restriction'           => ['nullable', 'string', 'max:55'],
            'grade_level_restriction'    => ['nullable', 'string', 'max:55'],
            'classification_restriction' => ['nullable', 'string', 'max:55'],
            'is_active'                  => ['boolean'],
        ]);

        $discount  = AccountsDiscount::findByPublicIdOrFail($validated['acct_discount_id']);
        $category  = AccountsCategory::where('public_id', $validated['deduct_category_id'])->firstOrFail();

        $code = DiscountCode::create(array_merge($validated, [
            'acct_discount_id'   => $discount->acct_discount_id,
            'deduct_category_id' => $category->category_id,
            'code'               => strtoupper(trim($validated['code'])),
        ]));

        return response()->json(['data' => $code->load(['accountDiscount', 'category'])], 201);
    }

    public function show(string $id): JsonResponse
    {
        $code = DiscountCode::findByPublicIdOrFail($id)->load(['accountDiscount', 'category']);
        return response()->json(['data' => $code, 'uses_count' => $code->uses_count]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $code = DiscountCode::findByPublicIdOrFail($id);

        $validated = $request->validate([
            'code'                       => ['sometimes', 'string', 'max:50', 'unique:discount_codes,code,' . $code->discount_code_id . ',discount_code_id'],
            'description'                => ['sometimes', 'string', 'max:255'],
            'acct_discount_id'           => ['sometimes', 'string', 'exists:accounts_discount,public_id'],
            'deduct_category_id'         => ['sometimes', 'string', 'exists:accounts_categories,public_id'],
            'max_uses'                   => ['nullable', 'integer', 'min:1'],
            'valid_from'                 => ['nullable', 'date'],
            'valid_until'                => ['nullable', 'date'],
            'dept_restriction'           => ['nullable', 'string', 'max:55'],
            'grade_level_restriction'    => ['nullable', 'string', 'max:55'],
            'classification_restriction' => ['nullable', 'string', 'max:55'],
            'is_active'                  => ['boolean'],
        ]);

        if (isset($validated['acct_discount_id'])) {
            $discount = AccountsDiscount::findByPublicIdOrFail($validated['acct_discount_id']);
            $validated['acct_discount_id'] = $discount->acct_discount_id;
        }
        if (isset($validated['deduct_category_id'])) {
            $cat = AccountsCategory::where('public_id', $validated['deduct_category_id'])->firstOrFail();
            $validated['deduct_category_id'] = $cat->category_id;
        }
        if (isset($validated['code'])) {
            $validated['code'] = strtoupper(trim($validated['code']));
        }

        $code->update($validated);

        return response()->json(['data' => $code->fresh()->load(['accountDiscount', 'category'])]);
    }

    public function destroy(string $id): JsonResponse
    {
        DiscountCode::findByPublicIdOrFail($id)->delete();
        return response()->json(['message' => 'Discount code deleted.']);
    }

    /**
     * List redemptions for a given code (admin use).
     */
    public function redemptions(string $id): JsonResponse
    {
        $code = DiscountCode::findByPublicIdOrFail($id);

        $redemptions = DiscountCodeRedemption::with('student:reg_id,lname,fname,mname,student_id,gradeLevel')
            ->where('discount_code_id', $code->discount_code_id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $redemptions]);
    }

    // ── Portal: Redeem ─────────────────────────────────────────────────────────

    // ── Portal: Redeem (Student) ───────────────────────────────────────────────

    /**
     * Preview a code for the authenticated student (no side effects).
     */
    public function preview(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:50']]);
        $student = Student::findOrFail($request->user()->reg_id
            ?? abort(403, 'Your account is not linked to a student record.'));

        return $this->previewFor($request->input('code'), $student);
    }

    /**
     * Preview a code for a parent's linked child (no side effects).
     */
    public function previewForChild(Request $request, string $publicId): JsonResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:50']]);
        $user    = $request->user();
        $student = Student::where('public_id', $publicId)->firstOrFail();
        if (! $user->children()->where('students.reg_id', $student->reg_id)->exists() && ! $user->isAdmin()) {
            abort(403, 'Not authorized for this student.');
        }
        return $this->previewFor($request->input('code'), $student);
    }

    /**
     * Apply a discount code for the authenticated student.
     */
    public function redeem(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:50']]);
        $regId = $request->user()->reg_id;
        if (! $regId) {
            abort(403, 'Your account is not linked to a student record.');
        }
        $student = Student::findOrFail($regId);
        return $this->applyCode($request->input('code'), $student);
    }

    /**
     * Apply a discount code on behalf of a parent's linked child.
     */
    public function redeemForChild(Request $request, string $publicId): JsonResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:50']]);
        $user    = $request->user();
        $student = Student::where('public_id', $publicId)->firstOrFail();
        if (! $user->children()->where('students.reg_id', $student->reg_id)->exists() && ! $user->isAdmin()) {
            abort(403, 'Not authorized for this student.');
        }
        return $this->applyCode($request->input('code'), $student);
    }

    // ── Shared Logic ───────────────────────────────────────────────────────────

    private function previewFor(string $codeStr, Student $student): JsonResponse
    {
        $codeStr = strtoupper(trim($codeStr));
        $code    = DiscountCode::where('code', $codeStr)->first();

        if (! $code) {
            return response()->json(['valid' => false, 'message' => 'Invalid discount code.'], 422);
        }

        $error = $code->eligibilityError($student);
        if ($error) {
            return response()->json(['valid' => false, 'message' => $error], 422);
        }

        $discount       = $code->accountDiscount;
        $catParticulars = AccountsCatParticular::where('category_id', $code->deduct_category_id)->get();
        $totalDiscount  = $this->estimateDiscount($discount, $catParticulars, $student->reg_id);

        return response()->json([
            'valid'          => true,
            'code'           => $code->code,
            'description'    => $code->description,
            'discount_type'  => $discount->type,
            'category'       => $code->category?->description,
            'total_discount' => $totalDiscount,
        ]);
    }

    private function applyCode(string $codeStr, Student $student): JsonResponse
    {
        $codeStr = strtoupper(trim($codeStr));

        return DB::transaction(function () use ($codeStr, $student) {
            // Lock the row to prevent race conditions on max_uses
            $code = DiscountCode::where('code', $codeStr)->lockForUpdate()->first();

            if (! $code) {
                return response()->json(['message' => 'Invalid discount code.'], 422);
            }

            $error = $code->eligibilityError($student);
            if ($error) {
                return response()->json(['message' => $error], 422);
            }

            $discount       = $code->accountDiscount;
            $catParticulars = AccountsCatParticular::where('category_id', $code->deduct_category_id)->get();

            if ($catParticulars->isEmpty()) {
                return response()->json(['message' => 'This discount code has a configuration error. Please contact the office.'], 422);
            }

            $totalApplied = 0;

            foreach ($catParticulars as $cp) {
                $discountAmount = $discount->type === 'Percentage'
                    ? (float) $cp->amount * ((float) $discount->percentage / 100)
                    : (float) $discount->amount;

                AssessmentDiscount::updateOrCreate(
                    [
                        'acct_discount_id'     => $code->acct_discount_id,
                        'reg_id'               => $student->reg_id,
                        'deduct_category_id'   => $code->deduct_category_id,
                        'deduct_particular_id' => $cp->particular_id,
                    ],
                    [
                        'account_code' => $discount->account_code,
                        'description'  => $code->description,
                        'amount'       => $discountAmount,
                        'percentage'   => $discount->percentage ?? 0,
                        'schoolYear'   => $student->schoolYear,
                        'type'         => $discount->type,
                        'status'       => 'Active',
                    ]
                );

                // Mirror bulkAssign: only update balance for 'Discount' type
                if ($discount->type === 'Discount') {
                    $sa = StudentAssessment::where('reg_id', $student->reg_id)
                        ->where('category_id', $code->deduct_category_id)
                        ->where('particular_id', $cp->particular_id)
                        ->first();

                    if ($sa) {
                        $newDiscount = (float) $sa->total_amt_discount + $discountAmount;
                        $newBal = (float) $sa->total_amt_payable - ($newDiscount + (float) $sa->total_amt_paid);
                        $sa->update([
                            'total_amt_discount' => $newDiscount,
                            'total_amt_bal'      => $newBal,
                        ]);
                        $totalApplied += $discountAmount;
                    }
                }
            }

            DiscountCodeRedemption::create([
                'discount_code_id' => $code->discount_code_id,
                'reg_id'           => $student->reg_id,
                'school_year'      => $student->schoolYear,
            ]);

            $code->increment('uses_count');

            return response()->json([
                'message'       => 'Discount code applied successfully!',
                'code'          => $code->code,
                'description'   => $code->description,
                'total_applied' => $totalApplied,
            ]);
        });
    }

    private function estimateDiscount(AccountsDiscount $discount, $catParticulars, int $regId): float
    {
        $total = 0;
        foreach ($catParticulars as $cp) {
            $amt = $discount->type === 'Percentage'
                ? (float) $cp->amount * ((float) $discount->percentage / 100)
                : (float) $discount->amount;

            if (StudentAssessment::where('reg_id', $regId)->where('particular_id', $cp->particular_id)->exists()) {
                $total += $amt;
            }
        }
        return round($total, 2);
    }
}
