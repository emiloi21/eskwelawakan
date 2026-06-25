<?php

namespace App\Services\Dss;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DssAcademicHealthService
{
    /**
     * Promotion, retention, and dropout counts / rates per grade level.
     */
    public function promotionRetentionRates(int $schoolYearId): array
    {
        $sy = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');

        if (!$sy) {
            return [];
        }

        $gradeLevels = DB::table('students')
            ->where('schoolYear', $sy)
            ->whereIn('status', ['Enrolled', 'Active'])
            ->distinct()
            ->pluck('gradeLevel')
            ->toArray();

        $results = [];
        foreach ($gradeLevels as $gl) {
            $total = DB::table('students')
                ->where('schoolYear', $sy)
                ->where('gradeLevel', $gl)
                ->count();

            if ($total === 0) {
                continue;
            }

            // A student is "retained" if they are still in the same grade level
            // that they were in the previous school year (prev_sy_reg_id points to prev enrollment).
            $retained = DB::table('students as curr')
                ->join('students as prev', 'curr.prev_sy_reg_id', '=', 'prev.reg_id')
                ->where('curr.schoolYear', $sy)
                ->where('curr.gradeLevel', $gl)
                ->where('prev.gradeLevel', $gl)   // same grade level → retained
                ->where('curr.prev_sy_reg_id', '>', 0)
                ->count();

            // Dropped / left: no matching student in current SY with prev_sy reference
            $dropped = DB::table('students as prev')
                ->leftJoin('students as curr', function ($join) use ($sy) {
                    $join->on('curr.prev_sy_reg_id', '=', 'prev.reg_id')
                         ->where('curr.schoolYear', $sy);
                })
                ->whereNull('curr.reg_id')
                ->where('prev.gradeLevel', $gl)
                ->where('prev.schoolYear', '!=', $sy)
                ->count();

            $promoted    = $total - $retained;
            $retentionPct = round(($retained / $total) * 100, 1);
            $promotionPct = round(($promoted / $total) * 100, 1);

            $results[] = [
                'grade_level'    => $gl,
                'total'          => $total,
                'promoted'       => $promoted,
                'retained'       => $retained,
                'promotion_pct'  => $promotionPct,
                'retention_pct'  => $retentionPct,
            ];
        }

        return $results;
    }

    /**
     * Grade distribution: count of students per grade bracket for a school year.
     * Brackets: 90-100, 85-89, 80-84, 75-79, <75
     */
    public function gradeDistribution(int $schoolYearId, ?string $gradeLevel = null): array
    {
        $sy = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');

        if (!$sy) {
            return [];
        }

        $query = DB::table('grades as g')
            ->join('students as s', 's.reg_id', '=', 'g.reg_id')
            ->where('g.school_year', $sy)
            ->whereNotNull('g.final_grade');

        if ($gradeLevel) {
            $query->where('s.gradeLevel', $gradeLevel);
        }

        $rows = $query->select([
            's.gradeLevel',
            DB::raw('AVG(g.final_grade) as avg_grade'),
        ])
        ->groupBy('s.reg_id', 's.gradeLevel')
        ->get();

        $brackets = [
            '90-100' => 0,
            '85-89'  => 0,
            '80-84'  => 0,
            '75-79'  => 0,
            '<75'    => 0,
        ];

        foreach ($rows as $row) {
            $avg = (float) $row->avg_grade;
            if ($avg >= 90) {
                $brackets['90-100']++;
            } elseif ($avg >= 85) {
                $brackets['85-89']++;
            } elseif ($avg >= 80) {
                $brackets['80-84']++;
            } elseif ($avg >= 75) {
                $brackets['75-79']++;
            } else {
                $brackets['<75']++;
            }
        }

        return array_map(fn ($bracket, $count) => [
            'bracket' => $bracket,
            'count'   => $count,
        ], array_keys($brackets), array_values($brackets));
    }

    /**
     * Subject-level average performance per grade level.
     */
    public function subjectPerformance(int $schoolYearId): array
    {
        $sy = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');

        if (!$sy) {
            return [];
        }

        return DB::table('grades as g')
            ->join('students as s', 's.reg_id', '=', 'g.reg_id')
            ->where('g.school_year', $sy)
            ->whereNotNull('g.final_grade')
            ->groupBy('s.gradeLevel', 'g.subject')
            ->select([
                's.gradeLevel',
                'g.subject',
                DB::raw('AVG(g.final_grade) as avg_grade'),
                DB::raw('COUNT(*) as student_count'),
                DB::raw('SUM(CASE WHEN g.final_grade < 75 THEN 1 ELSE 0 END) as failed_count'),
            ])
            ->orderBy('s.gradeLevel')
            ->orderBy('g.subject')
            ->get()
            ->map(fn ($r) => [
                'grade_level'   => $r->gradeLevel,
                'subject'       => $r->subject,
                'avg_grade'     => round((float) $r->avg_grade, 2),
                'student_count' => (int) $r->student_count,
                'failed_count'  => (int) $r->failed_count,
                'status'        => ((float) $r->avg_grade >= 75) ? 'pass' : 'fail',
            ])
            ->toArray();
    }

    /**
     * Flag at-risk students based on:
     * - Final grade below 75 in 2+ subjects
     * - Retained in same grade level (prev_sy_reg_id points to same grade)
     *
     * This method is reusable — called from Academic Health AND DssEarlyWarningService.
     */
    public function flagAtRiskStudents(int $schoolYearId): Collection
    {
        $sy = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');

        if (!$sy) {
            return collect();
        }

        // Students with 2+ failing subjects
        $failingStudents = DB::table('grades as g')
            ->join('students as s', 's.reg_id', '=', 'g.reg_id')
            ->where('g.school_year', $sy)
            ->where('g.final_grade', '<', 75)
            ->groupBy('g.reg_id', 's.reg_id', 's.lname', 's.fname', 's.mname', 's.gradeLevel', 's.section', 's.class_id')
            ->having(DB::raw('COUNT(*)'), '>=', 2)
            ->select([
                's.reg_id',
                's.lname',
                's.fname',
                's.mname',
                's.gradeLevel',
                's.section',
                DB::raw('COUNT(*) as failing_subject_count'),
                DB::raw('"failing_subjects" as flag_type'),
            ])
            ->get();

        // Retained students (same grade level as previous year)
        $retainedStudents = DB::table('students as curr')
            ->join('students as prev', 'curr.prev_sy_reg_id', '=', 'prev.reg_id')
            ->where('curr.schoolYear', $sy)
            ->where('curr.prev_sy_reg_id', '>', 0)
            ->whereColumn('curr.gradeLevel', 'prev.gradeLevel')
            ->select([
                'curr.reg_id',
                'curr.lname',
                'curr.fname',
                'curr.mname',
                'curr.gradeLevel',
                'curr.section',
                DB::raw('0 as failing_subject_count'),
                DB::raw('"retained" as flag_type'),
            ])
            ->get();

        // Merge and group by student
        $all = $failingStudents->concat($retainedStudents)
            ->groupBy('reg_id')
            ->map(function ($rows) use ($schoolYearId) {
                $first       = $rows->first();
                $flagReasons = $rows->pluck('flag_type')->unique()->values()->toArray();

                $intervention = DB::table('student_interventions')
                    ->where('student_id', $first->reg_id)
                    ->where('school_year_id', $schoolYearId)
                    ->orderBy('created_at', 'desc')
                    ->first();

                return [
                    'reg_id'               => $first->reg_id,
                    'student_name'         => trim("{$first->lname}, {$first->fname} {$first->mname}"),
                    'grade_level'          => $first->gradeLevel,
                    'section'              => $first->section,
                    'flag_reasons'         => $flagReasons,
                    'intervention_status'  => $intervention?->intervention_status ?? 'flagged',
                    'notes'                => $intervention?->notes,
                    'public_id'            => $intervention?->public_id,
                ];
            })
            ->values();

        return $all;
    }
}
