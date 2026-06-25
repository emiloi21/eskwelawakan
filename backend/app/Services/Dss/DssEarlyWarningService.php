<?php

namespace App\Services\Dss;

use App\Models\EarlyWarning;
use App\Models\GuidanceCaseRecord;
use App\Models\GuidanceReferral;
use Illuminate\Support\Facades\DB;

class DssEarlyWarningService
{
    public function __construct(
        private readonly DssAcademicHealthService $academicService,
        private readonly DssEnrollmentService     $enrollmentService,
        private readonly DssResourceService       $resourceService,
    ) {}

    /**
     * Evaluate all warning conditions against current data.
     * Creates EarlyWarning records only for conditions not already flagged & unacknowledged.
     *
     * @return array{created: int, skipped: int}
     */
    public function evaluate(int $schoolYearId): array
    {
        $created = 0;
        $skipped = 0;

        $created += $this->checkHighRetentionRate($schoolYearId, $skipped);
        $created += $this->checkEnrollmentDrop($schoolYearId, $skipped);
        $created += $this->checkAtRiskStudentSurge($schoolYearId, $skipped);
        $created += $this->checkOverloadedFaculty($schoolYearId, $skipped);
        $created += $this->checkSectionCapacity($schoolYearId, $skipped);
        $created += $this->checkMaterialsShortage($skipped);
        $created += $this->checkSubjectFailureSpike($schoolYearId, $skipped);
        $created += $this->checkReferralBacklog($schoolYearId, $skipped);
        $created += $this->checkGuidanceCaseOverload($schoolYearId, $skipped);
        $created += $this->checkCounselorCaseload($schoolYearId, $skipped);

        return ['created' => $created, 'skipped' => $skipped];
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function createWarning(
        string  $warningType,
        string  $severity,
        string  $message,
        ?string $entityType = null,
        ?int    $entityId   = null,
    ): bool {
        // Skip if already exists and is unacknowledged
        $exists = EarlyWarning::where('warning_type', $warningType)
            ->where('is_acknowledged', false)
            ->when($entityType, fn ($q) => $q->where('related_entity_type', $entityType))
            ->when($entityId,   fn ($q) => $q->where('related_entity_id',   $entityId))
            ->exists();

        if ($exists) {
            return false;
        }

        EarlyWarning::create([
            'warning_type'        => $warningType,
            'severity'            => $severity,
            'message'             => $message,
            'related_entity_type' => $entityType,
            'related_entity_id'   => $entityId,
        ]);

        return true;
    }

    private function checkHighRetentionRate(int $schoolYearId, int &$skipped): int
    {
        $rates   = $this->academicService->promotionRetentionRates($schoolYearId);
        $created = 0;

        foreach ($rates as $row) {
            if ($row['retention_pct'] > 20) {
                $msg = "Retention rate for {$row['grade_level']} is {$row['retention_pct']}%, exceeding the 20% critical threshold.";
                $ok  = $this->createWarning('high_retention_rate', 'critical', $msg, 'grade_level', null);
                $ok ? $created++ : $skipped++;
            }
        }

        return $created;
    }

    private function checkEnrollmentDrop(int $schoolYearId, int &$skipped): int
    {
        $sy = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');
        if (!$sy) {
            return 0;
        }

        // Find previous school year
        $prevSy = DB::table('school_years')
            ->where('school_year', '<', $sy)
            ->orderBy('school_year', 'desc')
            ->value('school_year');

        if (!$prevSy) {
            return 0;
        }

        $currentByGl  = DB::table('students')
            ->where('schoolYear', $sy)
            ->whereIn('status', ['Enrolled', 'Active'])
            ->groupBy('gradeLevel')
            ->pluck(DB::raw('COUNT(*)'), 'gradeLevel');

        $previousByGl = DB::table('students')
            ->where('schoolYear', $prevSy)
            ->whereIn('status', ['Enrolled', 'Active'])
            ->groupBy('gradeLevel')
            ->pluck(DB::raw('COUNT(*)'), 'gradeLevel');

        $created = 0;
        foreach ($currentByGl as $gl => $curr) {
            $prev = $previousByGl[$gl] ?? 0;
            if ($prev <= 0) {
                continue;
            }
            $drop = (($prev - $curr) / $prev) * 100;
            if ($drop > 15) {
                $msg = sprintf(
                    'Enrollment in %s dropped by %.1f%% compared to the previous school year.',
                    $gl,
                    $drop,
                );
                $ok = $this->createWarning('enrollment_drop', 'critical', $msg, 'grade_level', null);
                $ok ? $created++ : $skipped++;
            }
        }

        return $created;
    }

    private function checkAtRiskStudentSurge(int $schoolYearId, int &$skipped): int
    {
        $sy = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');
        if (!$sy) {
            return 0;
        }

        $prevSyId = DB::table('school_years')
            ->where('school_year', '<', $sy)
            ->orderBy('school_year', 'desc')
            ->value('id');

        $currCount = $this->academicService->flagAtRiskStudents($schoolYearId)->count();
        $prevCount = $prevSyId
            ? $this->academicService->flagAtRiskStudents((int) $prevSyId)->count()
            : 0;

        if ($prevCount <= 0 || $currCount <= 0) {
            return 0;
        }

        $increase = (($currCount - $prevCount) / $prevCount) * 100;
        if ($increase > 10) {
            $msg = sprintf(
                'At-risk student count increased by %.1f%% compared to the previous school year.',
                $increase,
            );
            $ok = $this->createWarning('at_risk_student_surge', 'warning', $msg, 'institution', null);
            return $ok ? 1 : 0;
        }

        return 0;
    }

    private function checkOverloadedFaculty(int $schoolYearId, int &$skipped): int
    {
        $loads   = $this->resourceService->facultyLoadAnalysis($schoolYearId);
        $created = 0;

        foreach ($loads as $row) {
            if ($row['load_status'] === 'overloaded') {
                $msg = sprintf(
                    '%s is carrying %d units, exceeding the maximum load of 24 units.',
                    $row['faculty_name'],
                    $row['total_units'],
                );
                $ok = $this->createWarning('overloaded_faculty', 'warning', $msg, 'faculty', null);
                $ok ? $created++ : $skipped++;
            }
        }

        return $created;
    }

    private function checkSectionCapacity(int $schoolYearId, int &$skipped): int
    {
        $fillRates = $this->enrollmentService->sectionFillRates($schoolYearId);
        $created   = 0;

        foreach ($fillRates as $row) {
            if ($row['status'] === 'overcapacity') {
                $msg = sprintf(
                    'Section %s has %d students enrolled, exceeding its room capacity of %d.',
                    $row['section_name'],
                    $row['enrolled_count'],
                    $row['capacity'],
                );
                $ok = $this->createWarning('section_overcapacity', 'warning', $msg, 'section', null);
                $ok ? $created++ : $skipped++;
            }

            if ($row['status'] === 'underutilized') {
                $msg = sprintf(
                    'Section %s has a fill rate of %.1f%%, which is below the 50%% minimum threshold.',
                    $row['section_name'],
                    $row['fill_rate_pct'],
                );
                $ok = $this->createWarning('underutilized_section', 'info', $msg, 'section', null);
                $ok ? $created++ : $skipped++;
            }
        }

        return $created;
    }

    private function checkMaterialsShortage(int &$skipped): int
    {
        $items   = DB::table('consumable_items')->where('quantity_on_hand', '<=', DB::raw('reorder_point'))->get();
        $created = 0;

        foreach ($items as $item) {
            $msg = sprintf(
                'Consumable item "%s" is below minimum stock: %d available vs %d needed.',
                $item->name,
                $item->quantity_on_hand,
                $item->reorder_point,
            );
            $ok = $this->createWarning('materials_shortage', 'warning', $msg, 'consumable', (int) $item->id);
            $ok ? $created++ : $skipped++;
        }

        return $created;
    }

    private function checkSubjectFailureSpike(int $schoolYearId, int &$skipped): int
    {
        $subjects = $this->academicService->subjectPerformance($schoolYearId);
        $created  = 0;

        foreach ($subjects as $row) {
            if ($row['status'] === 'fail') {
                $msg = sprintf(
                    'Subject "%s" in %s has an average grade of %.2f, which is below passing for the current school year.',
                    $row['subject'],
                    $row['grade_level'],
                    $row['avg_grade'],
                );
                $ok = $this->createWarning('subject_failure_spike', 'warning', $msg, 'subject', null);
                $ok ? $created++ : $skipped++;
            }
        }

        return $created;
    }

    /**
     * Students with 3+ pending referrals and no case opened.
     * Referrals table has no school_year_id — we check all pending referrals globally.
     */
    private function checkReferralBacklog(int $schoolYearId, int &$skipped): int
    {
        $rows = GuidanceReferral::selectRaw('reg_id, COUNT(*) as cnt')
            ->where('status', 'pending')
            ->groupBy('reg_id')
            ->having('cnt', '>=', 3)
            ->get();

        $created = 0;

        foreach ($rows as $row) {
            // Only warn if no open/ongoing case exists for this student
            $hasCase = GuidanceCaseRecord::where('reg_id', $row->reg_id)
                ->whereIn('status', ['open', 'ongoing'])
                ->exists();

            if ($hasCase) {
                continue;
            }

            $msg = sprintf(
                'Student (reg_id: %s) has %d pending referrals with no guidance case opened. Immediate case intake is recommended.',
                $row->reg_id,
                $row->cnt,
            );
            $ok = $this->createWarning('referral_backlog', 'warning', $msg, 'student', null);
            $ok ? $created++ : $skipped++;
        }

        return $created;
    }

    /**
     * Students with 2+ simultaneously open/ongoing guidance cases.
     */
    private function checkGuidanceCaseOverload(int $schoolYearId, int &$skipped): int
    {
        $rows = GuidanceCaseRecord::selectRaw('reg_id, COUNT(*) as cnt')
            ->where('school_year_id', $schoolYearId)
            ->whereIn('status', ['open', 'ongoing'])
            ->groupBy('reg_id')
            ->having('cnt', '>=', 2)
            ->get();

        $created = 0;

        foreach ($rows as $row) {
            $msg = sprintf(
                'Student (reg_id: %s) has %d simultaneously active guidance cases in the current school year. Case consolidation is recommended.',
                $row->reg_id,
                $row->cnt,
            );
            $ok = $this->createWarning('guidance_case_overload', 'warning', $msg, 'student', null);
            $ok ? $created++ : $skipped++;
        }

        return $created;
    }

    /**
     * Warn when any counselor has more than 50 active cases.
     */
    private function checkCounselorCaseload(int $schoolYearId, int &$skipped): int
    {
        $rows = GuidanceCaseRecord::selectRaw('assigned_counselor_id, COUNT(*) as cnt')
            ->where('school_year_id', $schoolYearId)
            ->whereIn('status', ['open', 'ongoing'])
            ->whereNotNull('assigned_counselor_id')
            ->groupBy('assigned_counselor_id')
            ->having('cnt', '>', 50)
            ->with('assignedCounselor:id,name')
            ->get();

        $created = 0;

        foreach ($rows as $row) {
            $counselorName = $row->assignedCounselor?->name ?? "Counselor #{$row->assigned_counselor_id}";
            $msg = sprintf(
                '%s currently has %d active guidance cases, exceeding the recommended maximum of 50.',
                $counselorName,
                $row->cnt,
            );
            $ok = $this->createWarning('counselor_overload', 'warning', $msg, 'user', (int) $row->assigned_counselor_id);
            $ok ? $created++ : $skipped++;
        }

        return $created;
    }
}
