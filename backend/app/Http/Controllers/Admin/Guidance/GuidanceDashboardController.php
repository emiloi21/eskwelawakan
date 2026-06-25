<?php

namespace App\Http\Controllers\Admin\Guidance;

use App\Http\Controllers\Controller;
use App\Models\GuidanceCaseRecord;
use App\Models\GuidanceReferral;
use App\Services\Guidance\GuidanceCaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuidanceDashboardController extends Controller
{
    public function __construct(private GuidanceCaseService $caseService) {}

    public function index(Request $request): JsonResponse
    {
        $syId = $request->query('school_year_id');
        $stats = $this->caseService->dashboardStats($syId ? (int) $syId : null);

        // Recent open cases (10)
        $recentCases = GuidanceCaseRecord::with(['student'])
            ->whereIn('status', ['open', 'ongoing'])
            ->when($syId, fn($q) => $q->where('school_year_id', $syId))
            ->orderByDesc('opened_at')
            ->limit(10)
            ->get()
            ->map(fn($c) => [
                'public_id'   => $c->public_id,
                'case_number' => $c->case_number,
                'case_type'   => $c->case_type,
                'urgency'     => $c->urgency,
                'status'      => $c->status,
                'opened_at'   => $c->opened_at,
                'student'     => $c->student ? [
                    'reg_id'    => $c->student->reg_id,
                    'last_name' => $c->student->last_name,
                    'first_name' => $c->student->first_name,
                ] : null,
            ]);

        // Pending referrals (10 most recent)
        $pendingReferrals = GuidanceReferral::with(['student'])
            ->where('status', 'pending')
            ->orderByDesc('referred_at')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'public_id'          => $r->public_id,
                'referral_type'      => $r->referral_type,
                'urgency'            => $r->urgency,
                'referred_at'        => $r->referred_at,
                'concern_description' => \Illuminate\Support\Str::limit($r->concern_description, 80),
                'student'            => $r->student ? [
                    'reg_id'    => $r->student->reg_id,
                    'last_name' => $r->student->last_name,
                    'first_name' => $r->student->first_name,
                ] : null,
            ]);

        return response()->json([
            'stats'            => $stats,
            'recent_cases'     => $recentCases,
            'pending_referrals' => $pendingReferrals,
        ]);
    }
}
