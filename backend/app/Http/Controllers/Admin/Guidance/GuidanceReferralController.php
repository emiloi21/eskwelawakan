<?php

namespace App\Http\Controllers\Admin\Guidance;

use App\Http\Controllers\Controller;
use App\Models\GuidanceReferral;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GuidanceReferralController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $referrals = GuidanceReferral::with(['student'])
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->urgency, fn($q) => $q->where('urgency', $request->urgency))
            ->when($request->referral_type, fn($q) => $q->where('referral_type', $request->referral_type))
            ->when($request->search, fn($q) => $q->whereHas('student', fn($s) =>
                $s->where('last_name', 'like', "%{$request->search}%")
                  ->orWhere('first_name', 'like', "%{$request->search}%")
            ))
            ->orderByDesc('referred_at')
            ->paginate(25);

        return response()->json($referrals);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reg_id'              => 'required|string|exists:students,reg_id',
            'referral_type'       => 'required|string|in:self,teacher,parent,admin,nurse',
            'referrer_name'       => 'required|string|max:120',
            'referrer_role'       => 'nullable|string|max:80',
            'referrer_user_id'    => 'nullable|integer|exists:users,id',
            'concern_description' => 'required|string|max:3000',
            'urgency'             => 'nullable|string|in:routine,urgent,crisis',
            'referred_at'         => 'nullable|date',
        ]);

        $validated['referred_at'] = $validated['referred_at'] ?? today()->toDateString();

        $referral = GuidanceReferral::create($validated);

        return response()->json($referral->load('student'), 201);
    }

    public function acknowledge(Request $request, string $publicId): JsonResponse
    {
        $referral = GuidanceReferral::findByPublicIdOrFail($publicId);
        $validated = $request->validate([
            'action_taken' => 'nullable|string|max:2000',
        ]);

        $referral->update([
            'status'          => 'acknowledged',
            'acknowledged_at' => now(),
            'acknowledged_by' => Auth::id(),
            'action_taken'    => $validated['action_taken'] ?? null,
        ]);

        return response()->json($referral->fresh('student'));
    }

    public function decline(string $publicId): JsonResponse
    {
        $referral = GuidanceReferral::findByPublicIdOrFail($publicId);
        $referral->update([
            'status'          => 'declined',
            'acknowledged_at' => now(),
            'acknowledged_by' => Auth::id(),
        ]);

        return response()->json($referral->fresh());
    }
}
