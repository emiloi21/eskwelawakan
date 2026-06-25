<?php

namespace App\Http\Controllers\Admin\Guidance;

use App\Http\Controllers\Controller;
use App\Models\GuidanceCaseRecord;
use App\Models\GuidanceAnecdotalRecord;
use App\Models\GuidanceGroupSession;
use App\Models\GuidanceReferral;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class GuidanceReportsController extends Controller
{
    public function casesSummary(Request $request): Response
    {
        $syId  = $request->query('school_year_id');
        $cases = GuidanceCaseRecord::with(['student', 'assignedCounselor'])
            ->when($syId, fn($q) => $q->where('school_year_id', $syId))
            ->orderBy('case_number')
            ->get();

        $pdf = Pdf::loadView('guidance.reports.cases-summary', [
            'cases'      => $cases,
            'generated'  => now()->format('F d, Y h:i A'),
        ])->setPaper('a4', 'landscape');

        return $pdf->download('guidance-cases-summary.pdf');
    }

    public function referralLog(Request $request): Response
    {
        $syId = $request->query('school_year_id');
        $referrals = GuidanceReferral::with(['student'])
            ->when($syId, fn($q) => $q->whereHas('caseRecord', fn($c) => $c->where('school_year_id', $syId)))
            ->orderByDesc('referred_at')
            ->get();

        $pdf = Pdf::loadView('guidance.reports.referral-log', [
            'referrals'  => $referrals,
            'generated'  => now()->format('F d, Y h:i A'),
        ])->setPaper('a4', 'landscape');

        return $pdf->download('guidance-referral-log.pdf');
    }

    public function anecdotalLog(Request $request): Response
    {
        $records = GuidanceAnecdotalRecord::with(['student', 'filedBy'])
            ->orderByDesc('observation_date')
            ->paginate(100);

        $pdf = Pdf::loadView('guidance.reports.anecdotal-log', [
            'records'    => $records->items(),
            'generated'  => now()->format('F d, Y h:i A'),
        ])->setPaper('a4', 'portrait');

        return $pdf->download('guidance-anecdotal-log.pdf');
    }

    public function groupSessionsLog(Request $request): Response
    {
        $syId = $request->query('school_year_id');
        $sessions = GuidanceGroupSession::with('facilitator')
            ->when($syId, fn($q) => $q->where('school_year_id', $syId))
            ->orderByDesc('session_date')
            ->get();

        $pdf = Pdf::loadView('guidance.reports.group-sessions', [
            'sessions'  => $sessions,
            'generated' => now()->format('F d, Y h:i A'),
        ])->setPaper('a4', 'landscape');

        return $pdf->download('guidance-group-sessions.pdf');
    }
}
