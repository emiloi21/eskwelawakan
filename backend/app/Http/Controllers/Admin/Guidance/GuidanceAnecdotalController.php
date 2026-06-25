<?php

namespace App\Http\Controllers\Admin\Guidance;

use App\Http\Controllers\Controller;
use App\Models\GuidanceAnecdotalRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GuidanceAnecdotalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $records = GuidanceAnecdotalRecord::with(['student', 'filedBy'])
            ->when($request->reg_id, fn($q) => $q->where('reg_id', $request->reg_id))
            ->when($request->search, fn($q) => $q->whereHas('student', fn($s) =>
                $s->where('last_name', 'like', "%{$request->search}%")
                  ->orWhere('first_name', 'like', "%{$request->search}%")
            ))
            ->orderByDesc('observation_date')
            ->paginate(25);

        return response()->json($records);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reg_id'               => 'required|string|exists:students,reg_id',
            'observed_by_name'     => 'required|string|max:120',
            'observed_by_role'     => 'nullable|string|max:80',
            'observed_by_user_id'  => 'nullable|integer|exists:users,id',
            'observation_date'     => 'required|date',
            'location'             => 'nullable|string|max:120',
            'behavior_description' => 'required|string|max:5000',
            'interpretation'       => 'nullable|string|max:2000',
        ]);

        $validated['filed_by']        = Auth::id();
        $validated['observed_by_role'] = $validated['observed_by_role'] ?? 'Teacher';

        $record = GuidanceAnecdotalRecord::create($validated);

        return response()->json($record->load(['student', 'filedBy']), 201);
    }
}
