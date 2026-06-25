<?php

namespace App\Services\Guidance;

use App\Models\GuidanceCaseRecord;
use App\Models\GuidanceReferral;
use Illuminate\Support\Facades\DB;

class GuidanceCaseService
{
    /**
     * Auto-generate the next case number, e.g. GC-2026-0001.
     */
    public function nextCaseNumber(): string
    {
        $year  = now()->year;
        $count = GuidanceCaseRecord::whereYear('opened_at', $year)->count() + 1;
        return sprintf('GC-%d-%04d', $year, $count);
    }

    /**
     * Open a new case record.
     */
    public function openCase(array $data, int $counselorId): GuidanceCaseRecord
    {
        return DB::transaction(function () use ($data, $counselorId) {
            $case = GuidanceCaseRecord::create([
                'reg_id'               => $data['reg_id'],
                'school_year_id'       => $data['school_year_id'],
                'case_number'          => $this->nextCaseNumber(),
                'case_type'            => $data['case_type'],
                'presenting_concern'   => $data['presenting_concern'],
                'urgency'              => $data['urgency'] ?? 'routine',
                'status'               => 'open',
                'assigned_counselor_id' => $counselorId,
                'notes'                => $data['notes'] ?? null,
                'opened_at'            => now(),
            ]);

            // If opened from a referral, link and update its status
            if (!empty($data['referral_id'])) {
                $referral = GuidanceReferral::findByPublicIdOrFail($data['referral_id']);
                $referral->update([
                    'case_id' => $case->id,
                    'status'  => 'converted_to_case',
                ]);
            }

            return $case;
        });
    }

    /**
     * Close / dispose a case.
     */
    public function closeCase(GuidanceCaseRecord $case, string $disposition, ?string $notes): GuidanceCaseRecord
    {
        $case->update([
            'status'    => $disposition,
            'closed_at' => now(),
            'notes'     => $notes ?? $case->notes,
        ]);
        return $case;
    }

    /**
     * Summary statistics for the dashboard.
     */
    public function dashboardStats(?int $schoolYearId = null): array
    {
        $query = GuidanceCaseRecord::query();
        if ($schoolYearId) {
            $query->where('school_year_id', $schoolYearId);
        }

        $total    = (clone $query)->count();
        $open     = (clone $query)->whereIn('status', ['open', 'ongoing'])->count();
        $resolved = (clone $query)->where('status', 'resolved')->count();
        $crisis   = (clone $query)->where('urgency', 'crisis')->whereIn('status', ['open', 'ongoing'])->count();

        $byType = (clone $query)
            ->select('case_type', DB::raw('count(*) as total'))
            ->groupBy('case_type')
            ->pluck('total', 'case_type');

        $byStatus = (clone $query)
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $pending = GuidanceReferral::where('status', 'pending')->count();

        return [
            'total_cases'       => $total,
            'open_cases'        => $open,
            'resolved_cases'    => $resolved,
            'crisis_active'     => $crisis,
            'pending_referrals' => $pending,
            'by_type'           => $byType,
            'by_status'         => $byStatus,
        ];
    }
}
