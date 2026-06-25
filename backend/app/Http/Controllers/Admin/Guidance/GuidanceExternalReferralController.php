<?php

namespace App\Http\Controllers\Admin\Guidance;

use App\Http\Controllers\Controller;
use App\Models\GuidanceCaseRecord;
use App\Models\GuidanceExternalReferral;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GuidanceExternalReferralController extends Controller
{
    public function store(Request $request, string $casePublicId): JsonResponse
    {
        $case = GuidanceCaseRecord::findByPublicIdOrFail($casePublicId);
        $validated = $request->validate([
            'agency_name'         => 'required|string|max:150',
            'agency_type'         => 'required|string|in:dswd,pnp_wcpd,mental_health,hospital,ngo,barangay,lgu,other',
            'contact_person'      => 'nullable|string|max:120',
            'contact_number'      => 'nullable|string|max:30',
            'reason_for_referral' => 'required|string|max:3000',
            'services_requested'  => 'nullable|string|max:2000',
            'referred_at'         => 'nullable|date',
            'school_head_cosigned' => 'nullable|boolean',
            'follow_up_date'      => 'nullable|date',
        ]);

        $validated['referred_at']  = $validated['referred_at'] ?? today()->toDateString();
        $validated['case_id']      = $case->id;
        $validated['referred_by']  = Auth::id();

        $external = GuidanceExternalReferral::create($validated);

        // Update case status to referred_external if resolved internally
        if (in_array($case->status, ['open', 'ongoing'])) {
            $case->update(['status' => 'referred_external']);
        }

        return response()->json($external->load('referredBy'), 201);
    }

    public function update(Request $request, string $casePublicId, string $externalPublicId): JsonResponse
    {
        $case     = GuidanceCaseRecord::findByPublicIdOrFail($casePublicId);
        $external = GuidanceExternalReferral::where('case_id', $case->id)
            ->where('public_id', $externalPublicId)
            ->firstOrFail();

        $validated = $request->validate([
            'school_head_cosigned' => 'nullable|boolean',
            'follow_up_date'      => 'nullable|date',
            'outcome'             => 'nullable|string|max:2000',
            'status'              => 'nullable|string|in:sent,accepted,in_progress,completed,declined',
        ]);

        $external->update($validated);

        return response()->json($external->fresh('referredBy'));
    }
}
