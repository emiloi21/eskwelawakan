<?php

namespace App\Http\Controllers\Admin\Guidance;

use App\Http\Controllers\Controller;
use App\Models\GuidanceCaseRecord;
use App\Services\Guidance\GuidanceCaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GuidanceCaseController extends Controller
{
    public function __construct(private GuidanceCaseService $caseService) {}

    public function index(Request $request): JsonResponse
    {
        $cases = GuidanceCaseRecord::with(['student', 'assignedCounselor'])
            ->when($request->school_year_id, fn($q) => $q->where('school_year_id', $request->school_year_id))
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->case_type, fn($q) => $q->where('case_type', $request->case_type))
            ->when($request->urgency, fn($q) => $q->where('urgency', $request->urgency))
            ->when($request->search, fn($q) => $q->where(function ($q2) use ($request) {
                $q2->where('case_number', 'like', "%{$request->search}%")
                   ->orWhereHas('student', fn($s) => $s->where('last_name', 'like', "%{$request->search}%")
                       ->orWhere('first_name', 'like', "%{$request->search}%"));
            }))
            ->orderByDesc('opened_at')
            ->paginate(25);

        $cases->getCollection()->transform(fn($c) => $this->formatCase($c));

        return response()->json($cases);
    }

    public function show(string $publicId): JsonResponse
    {
        $case = GuidanceCaseRecord::with([
            'student',
            'schoolYear',
            'assignedCounselor',
            'referrals.student',
            'sessions.caseNote',
            'psychTests',
            'externalReferrals',
        ])->findByPublicIdOrFail($publicId);

        return response()->json($this->formatCase($case, true));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reg_id'           => 'required|string|exists:students,reg_id',
            'school_year_id'   => 'required|integer|exists:school_years,id',
            'case_type'        => 'required|string|in:academic,behavioral,personal_social,career,family,crisis,child_protection',
            'presenting_concern' => 'required|string|max:2000',
            'urgency'          => 'nullable|string|in:routine,urgent,crisis',
            'notes'            => 'nullable|string|max:2000',
            'referral_id'      => 'nullable|string',
        ]);

        $case = $this->caseService->openCase($validated, Auth::id());

        return response()->json($this->formatCase($case->load(['student', 'assignedCounselor'])), 201);
    }

    public function update(Request $request, string $publicId): JsonResponse
    {
        $case = GuidanceCaseRecord::findByPublicIdOrFail($publicId);
        $validated = $request->validate([
            'case_type'        => 'nullable|string|in:academic,behavioral,personal_social,career,family,crisis,child_protection',
            'presenting_concern' => 'nullable|string|max:2000',
            'urgency'          => 'nullable|string|in:routine,urgent,crisis',
            'status'           => 'nullable|string|in:open,ongoing,resolved,referred_external,referred_cpc,closed_transferred,closed_withdrawn',
            'notes'            => 'nullable|string|max:2000',
            'parent_notified'  => 'nullable|boolean',
        ]);

        if (isset($validated['parent_notified']) && $validated['parent_notified'] && !$case->parent_notified) {
            $validated['parent_notified_at'] = now();
        }

        $case->update($validated);

        return response()->json($this->formatCase($case->fresh(['student', 'assignedCounselor'])));
    }

    public function close(Request $request, string $publicId): JsonResponse
    {
        $case = GuidanceCaseRecord::findByPublicIdOrFail($publicId);
        $validated = $request->validate([
            'disposition' => 'required|string|in:resolved,referred_external,referred_cpc,closed_transferred,closed_withdrawn',
            'notes'       => 'nullable|string|max:2000',
        ]);

        $case = $this->caseService->closeCase($case, $validated['disposition'], $validated['notes'] ?? null);

        return response()->json($this->formatCase($case->fresh(['student', 'assignedCounselor'])));
    }

    private function formatCase(GuidanceCaseRecord $c, bool $full = false): array
    {
        $base = [
            'public_id'          => $c->public_id,
            'case_number'        => $c->case_number,
            'case_type'          => $c->case_type,
            'presenting_concern' => $c->presenting_concern,
            'urgency'            => $c->urgency,
            'status'             => $c->status,
            'parent_notified'    => $c->parent_notified,
            'parent_notified_at' => $c->parent_notified_at,
            'opened_at'          => $c->opened_at,
            'closed_at'          => $c->closed_at,
            'notes'              => $c->notes,
            'student'            => $c->student ? [
                'reg_id'     => $c->student->reg_id,
                'last_name'  => $c->student->last_name,
                'first_name' => $c->student->first_name,
                'grade_level' => $c->student->grade_level ?? null,
                'section'     => $c->student->section ?? null,
            ] : null,
            'assigned_counselor' => $c->assignedCounselor ? [
                'id'   => $c->assignedCounselor->id,
                'name' => $c->assignedCounselor->name,
            ] : null,
        ];

        if ($full) {
            $base['school_year'] = $c->schoolYear ? [
                'id'          => $c->schoolYear->id,
                'school_year' => $c->schoolYear->school_year ?? null,
            ] : null;
            $base['referrals']          = $c->referrals ?? [];
            $base['sessions']           = $c->sessions ?? [];
            $base['psych_tests']        = $c->psychTests ?? [];
            $base['external_referrals'] = $c->externalReferrals ?? [];
        }

        return $base;
    }
}
