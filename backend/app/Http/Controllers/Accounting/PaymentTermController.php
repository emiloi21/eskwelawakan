<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\PaymentTerm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentTermController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PaymentTerm::query();

        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }
        if ($dept = $request->query('dept')) {
            $query->where('dept', $dept);
        }

        $terms = $query->orderBy('payment_term')
            ->paginate($request->query('per_page', 50));

        return response()->json($terms);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payment_term'  => ['required', 'string', 'max:100'],
            'category'      => ['nullable', 'string', 'max:100'],
            'month_set_up'  => ['nullable', 'string', 'max:20'],
            'year_set_up'   => ['nullable', 'string', 'max:10'],
            'dept'          => ['required', 'string', 'max:55'],
            'schoolYear'    => ['required', 'string', 'max:9'],
        ]);

        $term = PaymentTerm::create($validated);

        return response()->json(['data' => $term], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $term = PaymentTerm::findByPublicIdOrFail($id);

        $validated = $request->validate([
            'payment_term'  => ['sometimes', 'string', 'max:100'],
            'category'      => ['nullable', 'string', 'max:100'],
            'month_set_up'  => ['nullable', 'string', 'max:20'],
            'year_set_up'   => ['nullable', 'string', 'max:10'],
            'dept'          => ['sometimes', 'string', 'max:55'],
            'schoolYear'    => ['sometimes', 'string', 'max:9'],
        ]);

        $term->update($validated);

        return response()->json(['data' => $term->fresh()]);
    }

    public function destroy(string $id): JsonResponse
    {
        $term = PaymentTerm::findByPublicIdOrFail($id);
        $term->delete();

        return response()->json(['message' => 'Payment term deleted.']);
    }
}
