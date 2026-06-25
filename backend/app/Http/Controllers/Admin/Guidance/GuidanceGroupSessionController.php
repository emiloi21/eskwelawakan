<?php

namespace App\Http\Controllers\Admin\Guidance;

use App\Http\Controllers\Controller;
use App\Models\GuidanceGroupSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GuidanceGroupSessionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $sessions = GuidanceGroupSession::with('facilitator')
            ->when($request->school_year_id, fn($q) => $q->where('school_year_id', $request->school_year_id))
            ->when($request->session_type, fn($q) => $q->where('session_type', $request->session_type))
            ->orderByDesc('session_date')
            ->paginate(20);

        return response()->json($sessions);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'school_year_id' => 'required|integer|exists:school_years,id',
            'session_title'  => 'required|string|max:200',
            'session_type'   => 'required|string|in:group_counseling,psychoeducational,career_guidance,information,values_formation,homeroom_guidance',
            'target_group'   => 'nullable|string|max:200',
            'session_date'   => 'required|date',
            'start_time'     => 'nullable|string',
            'end_time'       => 'nullable|string',
            'venue'          => 'nullable|string|max:150',
            'objectives'     => 'nullable|string|max:3000',
            'activities'     => 'nullable|string|max:3000',
            'observations'   => 'nullable|string|max:3000',
            'attendee_count' => 'nullable|integer|min:0',
        ]);

        $validated['facilitator_id'] = Auth::id();

        $session = GuidanceGroupSession::create($validated);

        return response()->json($session->load('facilitator'), 201);
    }

    public function update(Request $request, string $publicId): JsonResponse
    {
        $session = GuidanceGroupSession::findByPublicIdOrFail($publicId);
        $validated = $request->validate([
            'session_title'  => 'nullable|string|max:200',
            'target_group'   => 'nullable|string|max:200',
            'observations'   => 'nullable|string|max:3000',
            'attendee_count' => 'nullable|integer|min:0',
            'end_time'       => 'nullable|string',
        ]);

        $session->update($validated);

        return response()->json($session->fresh('facilitator'));
    }
}
