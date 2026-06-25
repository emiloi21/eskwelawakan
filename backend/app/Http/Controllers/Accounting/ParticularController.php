<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AccountsParticular;
use App\Models\ChartOfAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParticularController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AccountsParticular::with('chartAccount');

        if ($grade = $request->query('gradeLevel')) {
            $query->where('gradeLevel', $grade);
        }
        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }
        if ($group = $request->query('account_group')) {
            $query->where('account_group', $group);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $particulars = $query->orderBy('account_group')
            ->orderBy('account_code')
            ->paginate($request->query('per_page', 50));

        return response()->json($particulars);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'coa_id'         => ['nullable', 'string', 'exists:chart_of_accounts,public_id'],
            'gradeLevels'    => ['nullable', 'array', 'min:1'],
            'gradeLevels.*'  => ['string', 'max:55'],
            'gradeLevel'     => ['nullable', 'string', 'max:55'],
            'strand'         => ['nullable', 'string', 'max:55'],
            'major'          => ['nullable', 'string', 'max:55'],
            'schoolYear'     => ['required', 'string', 'max:9'],
            'semester'       => ['nullable', 'string', 'max:55'],
            'account_group'  => ['required', 'string', 'max:55'],
            'account_code'   => ['required', 'string', 'max:15'],
            'description'    => ['required', 'string', 'max:255'],
            'amount'         => ['required', 'numeric', 'min:0'],
            'par_acct_class' => ['nullable', 'string', 'max:55'],
            'status'         => ['nullable', 'string', 'max:10'],
        ]);

        // If coa_id provided, auto-fill code and description from COA
        if (!empty($validated['coa_id'])) {
            $coa = ChartOfAccount::where('public_id', $validated['coa_id'])->first();
            if ($coa) {
                $validated['coa_id'] = $coa->coa_id;
                $validated['account_code'] = $validated['account_code'] ?: $coa->account_code;
                $validated['description'] = $validated['description'] ?: $coa->account_name;
            }
        }

        $validated['strand'] = $validated['strand'] ?? 'N/A';
        $validated['major'] = $validated['major'] ?? 'N/A';
        $validated['semester'] = $validated['semester'] ?? '-';
        $validated['par_acct_class'] = $validated['par_acct_class'] ?? 'Assessment Account';
        $validated['status'] = $validated['status'] ?? 'Active';

        // Support bulk creation for multiple grade levels
        $gradeLevels = $validated['gradeLevels'] ?? ($validated['gradeLevel'] ? [$validated['gradeLevel']] : []);
        unset($validated['gradeLevels']);

        if (empty($gradeLevels)) {
            return response()->json(['message' => 'At least one grade level is required.'], 422);
        }

        $created = [];
        foreach ($gradeLevels as $grade) {
            $data = array_merge($validated, ['gradeLevel' => $grade]);
            $created[] = AccountsParticular::create($data);
        }

        if (count($created) === 1) {
            return response()->json(['data' => $created[0]->load('chartAccount')], 201);
        }

        return response()->json([
            'data' => $created,
            'message' => count($created) . ' particulars created.',
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $particular = AccountsParticular::with('chartAccount')->where('public_id', $id)->firstOrFail();
        return response()->json(['data' => $particular]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $particular = AccountsParticular::findByPublicIdOrFail($id);

        $validated = $request->validate([
            'coa_id'         => ['nullable', 'string', 'exists:chart_of_accounts,public_id'],
            'gradeLevel'     => ['sometimes', 'string', 'max:55'],
            'strand'         => ['nullable', 'string', 'max:55'],
            'major'          => ['nullable', 'string', 'max:55'],
            'schoolYear'     => ['sometimes', 'string', 'max:9'],
            'semester'       => ['nullable', 'string', 'max:55'],
            'account_group'  => ['sometimes', 'string', 'max:55'],
            'account_code'   => ['sometimes', 'string', 'max:15'],
            'description'    => ['sometimes', 'string', 'max:255'],
            'amount'         => ['sometimes', 'numeric', 'min:0'],
            'par_acct_class' => ['nullable', 'string', 'max:55'],
            'status'         => ['nullable', 'string', 'max:10'],
        ]);

        $particular->update($validated);

        // If amount changed, sync all cat_particulars referencing this particular
        // then cascade: category totals → assessment_payables → assessment totals
        if (isset($validated['amount'])) {
            $affectedCategoryIds = \App\Models\AccountsCatParticular
                ::where('particular_id', $particular->particular_id)
                ->pluck('category_id')
                ->unique();

            \App\Models\AccountsCatParticular::where('particular_id', $particular->particular_id)
                ->update(['amount' => $validated['amount']]);

            foreach ($affectedCategoryIds as $catId) {
                \App\Models\AccountsCategory::find($catId)?->recalculateTotal();
            }
        }

        return response()->json(['data' => $particular->fresh()->load('chartAccount')]);
    }

    public function destroy(string $id): JsonResponse
    {
        $particular = AccountsParticular::findByPublicIdOrFail($id);

        $hasPaidStudents = \App\Models\StudentAssessment::where('particular_id', $particular->particular_id)
            ->where('total_amt_paid', '>', 0)
            ->exists();

        if ($hasPaidStudents) {
            return response()->json([
                'message' => 'Cannot delete particular with existing student payments.',
            ], 422);
        }

        // Collect affected categories before deletion so we can recalculate totals
        $affectedCategoryIds = \App\Models\AccountsCatParticular
            ::where('particular_id', $particular->particular_id)
            ->pluck('category_id')
            ->unique();

        \App\Models\AccountsCatParticular::where('particular_id', $particular->particular_id)->delete();
        $particular->delete();

        foreach ($affectedCategoryIds as $catId) {
            \App\Models\AccountsCategory::find($catId)?->recalculateTotal();
        }

        return response()->json(['message' => 'Particular deleted.']);
    }
}
