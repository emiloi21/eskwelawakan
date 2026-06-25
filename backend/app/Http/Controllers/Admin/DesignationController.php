<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserDesignation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DesignationController extends Controller
{
    private const VALID_ROLES = [
        'Administrator', 'Registrar', 'Encoder', 'Accounting Staff', 'Cashier',
        'Teacher', 'Student', 'Parent', 'Applicant', 'HR', 'Custodian',
    ];

    /**
     * List all designations for a user.
     */
    public function index(int $userId): JsonResponse
    {
        $user = User::findOrFail($userId);
        return response()->json(['data' => $user->designations()->orderByDesc('is_primary')->get()]);
    }

    /**
     * Add a designation to a user.
     */
    public function store(Request $request, int $userId): JsonResponse
    {
        $user = User::findOrFail($userId);

        $data = $request->validate([
            'designation'    => ['required', 'string', \Illuminate\Validation\Rule::in(self::VALID_ROLES)],
            'position_title' => ['nullable', 'string', 'max:100'],
            'department'     => ['nullable', 'string', 'max:100'],
            'is_primary'     => ['boolean'],
        ]);

        // Prevent duplicate (unique constraint already covers it, but give a clean message)
        if ($user->designations()->where('designation', $data['designation'])->exists()) {
            return response()->json(['message' => 'This designation is already assigned.'], 422);
        }

        // If is_primary is being set, clear existing primary flag
        if (! empty($data['is_primary'])) {
            $user->designations()->where('is_primary', true)->update(['is_primary' => false]);
        }

        $designation = $user->designations()->create($data);

        return response()->json(['data' => $designation], 201);
    }

    /**
     * Update a designation (e.g. change position title or set primary).
     */
    public function update(Request $request, int $userId, int $id): JsonResponse
    {
        $designation = UserDesignation::where('user_id', $userId)->findOrFail($id);

        $data = $request->validate([
            'position_title' => ['nullable', 'string', 'max:100'],
            'department'     => ['nullable', 'string', 'max:100'],
            'is_primary'     => ['boolean'],
        ]);

        // If setting this as primary, clear the old one
        if (! empty($data['is_primary'])) {
            UserDesignation::where('user_id', $userId)
                ->where('id', '!=', $id)
                ->where('is_primary', true)
                ->update(['is_primary' => false]);
        }

        $designation->update($data);

        return response()->json(['data' => $designation]);
    }

    /**
     * Remove a designation from a user.
     */
    public function destroy(int $userId, int $id): JsonResponse
    {
        $designation = UserDesignation::where('user_id', $userId)->findOrFail($id);
        $designation->delete();
        return response()->json(null, 204);
    }
}
