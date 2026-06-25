<?php

namespace App\Services\Dss;

use Illuminate\Support\Facades\DB;

class DssResourceService
{
    // Optimal load range in units per faculty member
    private const LOAD_MIN = 18;
    private const LOAD_MAX = 24;

    /**
     * Faculty load per hrms_personnel for a given school_year_id.
     * A "unit" here is counted as 1 unique subject assignment in a class.
     */
    public function facultyLoadAnalysis(int $schoolYearId): array
    {
        $sy = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');

        if (!$sy) {
            return [];
        }

        // classes table stores adviser_id → faculty_staff.personnel_id
        // grades / subjects taught are distinct subjects per class_id per faculty
        // We use the classes table to count distinct subjects assigned to each adviser
        $rows = DB::table('classes as c')
            ->join('faculty_staff as fs', 'fs.personnel_id', '=', 'c.adviser_id')
            ->leftJoin('hrms_personnel as hp', function ($join) {
                $join->on('hp.fname', 'like', DB::raw('CONCAT("%", fs.fullname, "%")'))
                     ->orOn('fs.fullname', 'like', DB::raw('CONCAT("%", hp.lname, "%")'));
            })
            ->leftJoin('hrms_departments as hd', 'hd.id', '=', 'hp.department_id')
            ->where('c.schoolYear', $sy)
            ->groupBy('fs.personnel_id', 'fs.fullname', 'fs.classification', 'hd.name')
            ->select([
                'fs.personnel_id',
                'fs.fullname as faculty_name',
                DB::raw('COALESCE(hd.name, fs.classification) as department'),
                DB::raw('COUNT(DISTINCT c.class_id) as subject_count'),
            ])
            ->get();

        return $rows->map(function ($r) {
            $units      = (int) $r->subject_count;
            $loadStatus = match (true) {
                $units > self::LOAD_MAX => 'overloaded',
                $units >= self::LOAD_MIN => 'optimal',
                default                  => 'underloaded',
            };

            return [
                'faculty_name'  => $r->faculty_name,
                'department'    => $r->department ?? 'Unassigned',
                'subject_count' => $units,
                'total_units'   => $units,
                'load_status'   => $loadStatus,
            ];
        })->toArray();
    }

    /**
     * Classroom utilization per facility for a given school_year_id.
     */
    public function classroomUtilization(int $schoolYearId): array
    {
        $sy = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');

        if (!$sy) {
            return [];
        }

        // Approved bookings in the current SY
        $facilities = DB::table('facilities')
            ->where('status', 'Available')
            ->get();

        $results = [];
        foreach ($facilities as $facility) {
            $bookings = DB::table('facility_bookings as fb')
                ->join('school_years as sy', function ($join) use ($sy) {
                    $join->whereRaw(
                        'fb.event_date BETWEEN COALESCE(sy.fy_start_date, CONCAT(SUBSTRING(?, 1, 4), "-06-01")) AND COALESCE(sy.fy_end_date, CONCAT(SUBSTRING(?, 6, 4), "-05-31"))',
                        [$sy, $sy]
                    );
                })
                ->where('fb.facility_id', $facility->id)
                ->where('fb.status', 'Approved')
                ->select([
                    DB::raw('COUNT(*) as booking_count'),
                    DB::raw('SUM(TIMESTAMPDIFF(HOUR, CONCAT(fb.event_date, " ", fb.start_time), CONCAT(fb.event_date, " ", fb.end_time))) as total_hours'),
                ])
                ->first();

            $sectionsAssigned = DB::table('students')
                ->where('schoolYear', $sy)
                ->whereIn('status', ['Enrolled', 'Active'])
                ->distinct('class_id')
                ->count('class_id');

            $capacity          = max((int) ($facility->capacity ?? 40), 1);
            $totalHours        = (int) ($bookings?->total_hours ?? 0);
            $standardWeeklyHrs = 40; // standard school week hours
            $utilPct           = $standardWeeklyHrs > 0
                ? round(min(($totalHours / max($standardWeeklyHrs, 1)) * 10, 100), 1)
                : 0;

            $status = match (true) {
                $utilPct > 80  => 'optimal',
                $utilPct >= 40 => 'optimal',
                $utilPct < 40  => 'underutilized',
                default        => 'underutilized',
            };

            $results[] = [
                'room_name'               => $facility->name,
                'location'                => $facility->location,
                'capacity'                => $capacity,
                'sections_assigned'       => $sectionsAssigned,
                'scheduled_hours_per_week'=> $totalHours,
                'utilization_pct'         => $utilPct,
                'status'                  => $status,
            ];
        }

        return $results;
    }

    /**
     * Instructional materials inventory status.
     * Source: consumable_items table.
     */
    public function materialsInventory(int $schoolYearId): array
    {
        $sy = DB::table('school_years')->where('id', $schoolYearId)->value('school_year');

        $enrolledCount = $sy
            ? DB::table('students')
                ->where('schoolYear', $sy)
                ->whereIn('status', ['Enrolled', 'Active'])
                ->count()
            : 0;

        return DB::table('consumable_items as ci')
            ->leftJoin('consumable_categories as cc', 'cc.id', '=', 'ci.category_id')
            ->select([
                'ci.public_id',
                'ci.name as item_name',
                DB::raw('COALESCE(cc.name, "Uncategorized") as category'),
                'ci.unit',
                'ci.quantity_on_hand',
                'ci.reorder_point',
            ])
            ->get()
            ->map(fn ($r) => [
                'public_id'       => $r->public_id,
                'item_name'       => $r->item_name,
                'category'        => $r->category,
                'unit'            => $r->unit,
                'quantity_on_hand' => (int) $r->quantity_on_hand,
                'reorder_point'   => (int) $r->reorder_point,
                'status'          => (int) $r->quantity_on_hand <= (int) $r->reorder_point
                    ? 'shortage'
                    : 'adequate',
            ])
            ->toArray();
    }
}
