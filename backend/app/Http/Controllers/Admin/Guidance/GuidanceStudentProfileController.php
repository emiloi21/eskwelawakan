<?php

namespace App\Http\Controllers\Admin\Guidance;

use App\Http\Controllers\Controller;
use App\Models\GuidanceStudentProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GuidanceStudentProfileController extends Controller
{
    public function show(string $regId): JsonResponse
    {
        $profile = GuidanceStudentProfile::with(['student', 'schoolYear', 'completedBy'])
            ->where('reg_id', $regId)
            ->orderByDesc('school_year_id')
            ->firstOrFail();

        return response()->json($profile);
    }

    public function upsert(Request $request, string $regId): JsonResponse
    {
        $validated = $request->validate([
            'school_year_id'       => 'required|integer|exists:school_years,id',
            'father_name'          => 'nullable|string|max:150',
            'father_occupation'    => 'nullable|string|max:150',
            'father_contact'       => 'nullable|string|max:30',
            'mother_name'          => 'nullable|string|max:150',
            'mother_occupation'    => 'nullable|string|max:150',
            'mother_contact'       => 'nullable|string|max:30',
            'guardian_name'        => 'nullable|string|max:150',
            'guardian_relationship' => 'nullable|string|max:80',
            'guardian_contact'     => 'nullable|string|max:30',
            'monthly_family_income' => 'nullable|string|in:below_5k,5k_10k,10k_20k,20k_50k,above_50k',
            'siblings_count'       => 'nullable|integer|min:0|max:20',
            'birth_order'          => 'nullable|integer|min:1|max:20',
            'living_with'          => 'nullable|string|in:both_parents,mother_only,father_only,guardian,other',
            'health_conditions'    => 'nullable|string|max:2000',
            'special_needs'        => 'nullable|string|max:2000',
            'interests_hobbies'    => 'nullable|string|max:2000',
            'career_aspirations'   => 'nullable|string|max:2000',
            'is_4ps_beneficiary'   => 'nullable|boolean',
            'is_pwd'               => 'nullable|boolean',
            'is_solo_parent_child' => 'nullable|boolean',
            'notes'                => 'nullable|string|max:2000',
        ]);

        $validated['reg_id']       = $regId;
        $validated['completed_by'] = Auth::id();

        $profile = GuidanceStudentProfile::updateOrCreate(
            ['reg_id' => $regId, 'school_year_id' => $validated['school_year_id']],
            $validated
        );

        return response()->json($profile->load(['student', 'schoolYear', 'completedBy']));
    }
}
