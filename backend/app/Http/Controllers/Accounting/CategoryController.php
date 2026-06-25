<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AccountsCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AccountsCategory::withCount('catParticulars')
            ->with('coa:coa_id,account_code,account_name');

        if ($grade = $request->query('gradeLevel')) {
            $query->where('gradeLevel', $grade);
        }
        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }
        if ($strand = $request->query('strand')) {
            $query->where('strand', $strand);
        }

        $categories = $query->orderBy('gradeLevel')
            ->orderBy('description')
            ->paginate($request->query('per_page', 50));

        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'gradeLevels'  => ['nullable', 'array', 'min:1'],
            'gradeLevels.*' => ['string', 'max:20'],
            'gradeLevel'   => ['nullable', 'string', 'max:20'],
            'strand'       => ['nullable', 'string', 'max:55'],
            'major'        => ['nullable', 'string', 'max:55'],
            'schoolYear'   => ['required', 'string', 'max:9'],
            'semester'     => ['nullable', 'string', 'max:55'],
            'description'  => ['required', 'string', 'max:255'],
            'totalAmount'  => ['nullable', 'numeric', 'min:0'],
        ]);

        $validated['strand'] = $validated['strand'] ?? 'N/A';
        $validated['major'] = $validated['major'] ?? 'N/A';
        $validated['semester'] = $validated['semester'] ?? 'N/A';
        $validated['totalAmount'] = $validated['totalAmount'] ?? 0;

        $gradeLevels = $validated['gradeLevels'] ?? (($validated['gradeLevel'] ?? null) ? [$validated['gradeLevel']] : []);
        unset($validated['gradeLevels']);

        if (empty($gradeLevels)) {
            return response()->json(['message' => 'At least one grade level is required.'], 422);
        }

        $created = [];
        foreach ($gradeLevels as $grade) {
            $data = array_merge($validated, ['gradeLevel' => $grade]);
            $created[] = AccountsCategory::create($data);
        }

        if (count($created) === 1) {
            return response()->json(['data' => $created[0]], 201);
        }

        return response()->json([
            'data' => $created,
            'message' => count($created) . ' categories created.',
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $category = AccountsCategory::with('catParticulars.particular')
            ->withCount('catParticulars')
            ->where('public_id', $id)->firstOrFail();

        return response()->json(['data' => $category]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $category = AccountsCategory::findByPublicIdOrFail($id);

        $validated = $request->validate([
            'gradeLevel'   => ['sometimes', 'string', 'max:20'],
            'strand'       => ['nullable', 'string', 'max:55'],
            'major'        => ['nullable', 'string', 'max:55'],
            'schoolYear'   => ['sometimes', 'string', 'max:9'],
            'semester'     => ['nullable', 'string', 'max:55'],
            'description'  => ['sometimes', 'string', 'max:255'],
            'coa_id'       => ['nullable', 'integer', 'exists:chart_of_accounts,coa_id'],
        ]);

        $category->update($validated);

        return response()->json(['data' => $category->fresh()]);
    }

    public function destroy(string $id): JsonResponse
    {
        $category = AccountsCategory::findByPublicIdOrFail($id);

        $hasPaidStudents = \App\Models\StudentAssessment::where('category_id', $category->category_id)
            ->where('total_amt_paid', '>', 0)
            ->exists();

        if ($hasPaidStudents) {
            return response()->json([
                'message' => 'Cannot delete category with existing student payments.',
            ], 422);
        }

        $category->catParticulars()->delete();
        $category->delete();

        return response()->json(['message' => 'Category deleted.']);
    }

    /**
     * Get all particulars linked to this category.
     */
    public function particulars(string $id): JsonResponse
    {
        $category = AccountsCategory::findByPublicIdOrFail($id);

        $items = $category->catParticulars()
            ->with('particular')
            ->orderBy('description')
            ->get();

        return response()->json(['data' => $items]);
    }
}
