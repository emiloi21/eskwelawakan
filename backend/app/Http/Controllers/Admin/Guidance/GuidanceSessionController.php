<?php

namespace App\Http\Controllers\Admin\Guidance;

use App\Http\Controllers\Controller;
use App\Models\GuidanceCaseRecord;
use App\Models\GuidanceCaseNote;
use App\Models\GuidanceSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GuidanceSessionController extends Controller
{
    public function index(string $casePublicId): JsonResponse
    {
        $case = GuidanceCaseRecord::findByPublicIdOrFail($casePublicId);
        $sessions = GuidanceSession::with(['caseNote', 'counselor'])
            ->where('case_id', $case->id)
            ->orderBy('session_number')
            ->get();

        return response()->json($sessions);
    }

    public function store(Request $request, string $casePublicId): JsonResponse
    {
        $case = GuidanceCaseRecord::findByPublicIdOrFail($casePublicId);
        $validated = $request->validate([
            'session_date'              => 'required|date',
            'session_time'              => 'nullable|string',
            'duration_minutes'          => 'nullable|integer|min:1|max:480',
            'session_type'              => 'nullable|string|in:individual,group,family,phone',
            'approach_used'             => 'nullable|string|max:100',
            'presenting_issues'         => 'nullable|string|max:3000',
            'interventions_done'        => 'nullable|string|max:3000',
            'response_to_intervention'  => 'nullable|string|max:3000',
            'risk_level'                => 'nullable|string|in:none,low,moderate,high',
            'next_steps'                => 'nullable|string|max:2000',
            'follow_up_date'            => 'nullable|date',
            // SOAP note fields (stored together with session)
            'soap_subjective' => 'nullable|string|max:3000',
            'soap_objective'  => 'nullable|string|max:3000',
            'soap_assessment' => 'nullable|string|max:3000',
            'soap_plan'       => 'nullable|string|max:3000',
        ]);

        $lastNumber = GuidanceSession::where('case_id', $case->id)->max('session_number') ?? 0;

        $session = GuidanceSession::create([
            'case_id'                  => $case->id,
            'session_number'           => $lastNumber + 1,
            'session_date'             => $validated['session_date'],
            'session_time'             => $validated['session_time'] ?? null,
            'duration_minutes'         => $validated['duration_minutes'] ?? null,
            'session_type'             => $validated['session_type'] ?? 'individual',
            'approach_used'            => $validated['approach_used'] ?? null,
            'presenting_issues'        => $validated['presenting_issues'] ?? null,
            'interventions_done'       => $validated['interventions_done'] ?? null,
            'response_to_intervention' => $validated['response_to_intervention'] ?? null,
            'risk_level'               => $validated['risk_level'] ?? 'none',
            'next_steps'               => $validated['next_steps'] ?? null,
            'follow_up_date'           => $validated['follow_up_date'] ?? null,
            'counselor_id'             => Auth::id(),
        ]);

        // Auto-create SOAP note if any SOAP fields provided
        if (!empty($validated['soap_subjective']) || !empty($validated['soap_objective'])) {
            GuidanceCaseNote::create([
                'session_id' => $session->id,
                'case_id'    => $case->id,
                'note_date'  => $validated['session_date'],
                'subjective' => $validated['soap_subjective'] ?? '',
                'objective'  => $validated['soap_objective'] ?? '',
                'assessment' => $validated['soap_assessment'] ?? '',
                'plan'       => $validated['soap_plan'] ?? '',
                'written_by' => Auth::id(),
            ]);
        }

        // Update case status to ongoing if it was just 'open'
        if ($case->status === 'open') {
            $case->update(['status' => 'ongoing']);
        }

        return response()->json($session->load(['caseNote', 'counselor']), 201);
    }

    public function update(Request $request, string $casePublicId, string $sessionPublicId): JsonResponse
    {
        $case = GuidanceCaseRecord::findByPublicIdOrFail($casePublicId);
        $session = GuidanceSession::where('case_id', $case->id)
            ->where('public_id', $sessionPublicId)
            ->firstOrFail();

        $validated = $request->validate([
            'session_date'              => 'nullable|date',
            'approach_used'             => 'nullable|string|max:100',
            'presenting_issues'         => 'nullable|string|max:3000',
            'interventions_done'        => 'nullable|string|max:3000',
            'response_to_intervention'  => 'nullable|string|max:3000',
            'risk_level'                => 'nullable|string|in:none,low,moderate,high',
            'next_steps'                => 'nullable|string|max:2000',
            'follow_up_date'            => 'nullable|date',
        ]);

        $session->update($validated);

        return response()->json($session->fresh(['caseNote', 'counselor']));
    }
}
