<?php

namespace App\Services\Dss;

use Illuminate\Support\Facades\DB;

class DssEnrollmentService
{
    /**
     * Total enrollment per school year for the last 5 SYs (for trend chart).
     */
    public function enrollmentTrendByYear(): array
    {
        $rows = DB::table('school_years as sy')
            ->leftJoin('students as s', function ($join) {
                $join->on('s.schoolYear', '=', 'sy.school_year')
                     ->whereIn('s.status', ['Enrolled', 'Active']);
            })
            ->orderBy('sy.school_year', 'desc')
            ->limit(5)
            ->groupBy('sy.id', 'sy.school_year')
            ->select([
                'sy.school_year',
                DB::raw('COUNT(s.reg_id) as total_enrolled'),
            ])
            ->get()
            ->reverse()
            ->values();

        return $rows->map(fn ($r) => [
            'school_year'    => $r->school_year,
            'total_enrolled' => (int) $r->total_enrolled,
        ])->toArray();
    }

    /**
     * Enrollment per grade level for a given school_year_id.
     */
    public function enrollmentByGradeLevel(int $schoolYearId): array
    {
        $sy = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');

        if (!$sy) {
            return [];
        }

        return DB::table('students')
            ->where('schoolYear', $sy)
            ->whereIn('status', ['Enrolled', 'Active'])
            ->groupBy('gradeLevel', 'dept')
            ->select([
                'gradeLevel',
                'dept',
                DB::raw('COUNT(*) as enrolled_count'),
            ])
            ->orderBy('dept')
            ->orderBy('gradeLevel')
            ->get()
            ->map(fn ($r) => [
                'grade_level'    => $r->gradeLevel,
                'dept'           => $r->dept,
                'enrolled_count' => (int) $r->enrolled_count,
            ])
            ->toArray();
    }

    /**
     * Section fill rates for a given school_year_id.
     * Uses classes table as the canonical list of sections.
     * Capacity is derived from the assigned facility; falls back to a default of 40.
     *
     * N+1 fix: enrolled counts and facility capacities are each fetched in
     * a single batch query and matched in PHP, not per-class.
     */
    public function sectionFillRates(int $schoolYearId): array
    {
        $sy = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');

        if (!$sy) {
            return [];
        }

        $classes = DB::table('classes')
            ->where('schoolYear', $sy)
            ->select('class_id', 'gradeLevel', 'section', 'dept', 'semester')
            ->get();

        if ($classes->isEmpty()) {
            return [];
        }

        $classIds = $classes->pluck('class_id')->all();

        // Batch 1: one query for all enrolled counts, grouped by class_id
        $enrolledMap = DB::table('students')
            ->whereIn('class_id', $classIds)
            ->where('schoolYear', $sy)
            ->whereIn('status', ['Enrolled', 'Active'])
            ->groupBy('class_id')
            ->select('class_id', DB::raw('COUNT(*) as cnt'))
            ->pluck('cnt', 'class_id');

        // Batch 2: one query for all facility capacities; match to section name in PHP
        $facilityRows = DB::table('facility_bookings as fb')
            ->join('facilities as f', 'fb.facility_id', '=', 'f.id')
            ->select('fb.title', DB::raw('MAX(f.capacity) as capacity'))
            ->groupBy('fb.title')
            ->pluck('capacity', 'title');

        $sectionNames = $classes->pluck('section')->unique()->all();
        $capacityMap  = [];
        foreach ($sectionNames as $section) {
            foreach ($facilityRows as $title => $cap) {
                if (str_contains((string) $title, (string) $section)) {
                    $capacityMap[$section] = (int) $cap;
                    break;
                }
            }
        }

        $results = [];
        foreach ($classes as $class) {
            $enrolled = (int) ($enrolledMap[$class->class_id] ?? 0);
            $capacity = max((int) ($capacityMap[$class->section] ?? 40), 1);
            $fillRate = round(($enrolled / $capacity) * 100, 1);
            $status   = match (true) {
                $fillRate > 100  => 'overcapacity',
                $fillRate >= 70  => 'full',
                $fillRate >= 50  => 'available',
                default          => 'underutilized',
            };

            $results[] = [
                'section_name'   => $class->section,
                'grade_level'    => $class->gradeLevel,
                'dept'           => $class->dept,
                'semester'       => $class->semester,
                'enrolled_count' => $enrolled,
                'capacity'       => $capacity,
                'fill_rate_pct'  => $fillRate,
                'status'         => $status,
            ];
        }

        return $results;
    }

    /**
     * Simple linear projection for next school year enrollment per grade level.
     * Based on last 5 years of data.
     *
     * N+1 fix: a single GROUP BY query replaces the previous per-grade-level loop.
     */
    public function enrollmentProjection(): array
    {
        $syYears = DB::table('school_years')
            ->orderBy('school_year', 'desc')
            ->limit(5)
            ->pluck('school_year')
            ->reverse()
            ->values()
            ->toArray();

        if (count($syYears) < 2) {
            return [];
        }

        // Single query: all grade-level × school-year counts in one pass
        $rows = DB::table('students')
            ->whereIn('schoolYear', $syYears)
            ->whereIn('status', ['Enrolled', 'Active'])
            ->groupBy('gradeLevel', 'schoolYear')
            ->select('gradeLevel', 'schoolYear', DB::raw('COUNT(*) as cnt'))
            ->get();

        // Organise into [gradeLevel => [schoolYear => count]]
        $byGrade = [];
        foreach ($rows as $row) {
            $byGrade[$row->gradeLevel][$row->schoolYear] = (int) $row->cnt;
        }

        $projections = [];
        foreach ($byGrade as $gl => $yearData) {
            ksort($yearData);
            $values = array_values($yearData);
            $n      = count($values);
            if ($n < 2) {
                continue;
            }

            // Simple linear trend: average of year-over-year differences
            $diffs = [];
            for ($i = 1; $i < $n; $i++) {
                $diffs[] = $values[$i] - $values[$i - 1];
            }
            $slope  = array_sum($diffs) / count($diffs);
            $years  = array_keys($yearData);
            $lastSy = end($years);
            [$startY, $endY] = explode('-', $lastSy);
            $nextSy = ($startY + 1) . '-' . ($endY + 1);

            $projections[] = [
                'grade_level'       => $gl,
                'last_enrolled'     => (int) end($values),
                'projected_next_sy' => (int) max(0, round(end($values) + $slope)),
                'next_school_year'  => $nextSy,
            ];
        }

        return $projections;
    }
}
