<?php

namespace Database\Seeders;

use App\Models\AttendanceLog;
use App\Models\HrmsDepartment;
use App\Models\HrmsPersonnel;
use App\Models\HrmsPosition;
use App\Models\LeaveApplication;
use App\Models\LeaveType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * HrmsSeeder
 *
 * Seeds comprehensive HRMS test data:
 *  - 6 departments
 *  - 8 positions
 *  - 10 personnel (EMP-2025-001 to EMP-2025-010) with PINs 1001–1010
 *    - First 3 linked to teacher portal accounts (teacher_santos/reyes/gonzales)
 *    - HR system user linked to EMP-2025-006 (Dela Cruz)
 *  - 6 leave types
 *  - 7 leave applications (3 approved, 3 pending, 1 rejected)
 *  - Attendance logs for today + past 7 business days
 *
 * Idempotent: guards all creates with exists() checks.
 */
class HrmsSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('── HRMS Departments ───────────────────────────────────');
        $depts = $this->seedDepartments();

        $this->command->info('── HRMS Positions ────────────────────────────────────');
        $positions = $this->seedPositions($depts);

        $this->command->info('── HRMS Personnel ────────────────────────────────────');
        $personnel = $this->seedPersonnel($depts, $positions);

        $this->command->info('── Leave Types ───────────────────────────────────────');
        $leaveTypes = $this->seedLeaveTypes();

        $this->command->info('── Leave Applications ────────────────────────────────');
        $this->seedLeaveApplications($personnel, $leaveTypes);

        $this->command->info('── Attendance Logs ───────────────────────────────────');
        $this->seedAttendanceLogs($personnel);

        $this->command->line('  ✓ HrmsSeeder complete — 10 personnel, 6 departments, 6 leave types');
    }

    // ── Departments ───────────────────────────────────────────────────────────

    private function seedDepartments(): array
    {
        $definitions = [
            ['name' => 'Administration',               'description' => 'Administrative and support staff'],
            ['name' => 'Academic - Grade School',      'description' => 'Grade School teaching staff'],
            ['name' => 'Academic - Junior High School','description' => 'Junior High School teaching staff'],
            ['name' => 'Academic - Senior High School','description' => 'Senior High School teaching staff'],
            ['name' => 'Finance',                      'description' => 'Finance, accounting, and cashiering staff'],
            ['name' => 'Maintenance',                  'description' => 'Maintenance, security, and utility staff'],
        ];

        $map = [];
        foreach ($definitions as $def) {
            $dept = HrmsDepartment::firstOrCreate(
                ['name' => $def['name']],
                ['public_id' => $this->genId(), 'description' => $def['description']]
            );
            $map[$def['name']] = $dept;
            $this->command->line("  ✓ Dept: {$dept->name}");
        }
        return $map;
    }

    // ── Positions ─────────────────────────────────────────────────────────────

    private function seedPositions(array $depts): array
    {
        $definitions = [
            ['name' => 'Subject Teacher',      'dept' => 'Academic - Junior High School'],
            ['name' => 'Subject Teacher',      'dept' => 'Academic - Senior High School'],
            ['name' => 'Grade School Teacher', 'dept' => 'Academic - Grade School'],
            ['name' => 'Administrative Assistant', 'dept' => 'Administration'],
            ['name' => 'Librarian',            'dept' => 'Academic - Grade School'],
            ['name' => 'Accounting Clerk',     'dept' => 'Finance'],
            ['name' => 'IT Support Staff',     'dept' => 'Administration'],
            ['name' => 'Security Guard',       'dept' => 'Maintenance'],
        ];

        $map = [];
        foreach ($definitions as $def) {
            $pos = HrmsPosition::firstOrCreate(
                ['name' => $def['name'], 'department_id' => $depts[$def['dept']]->id],
                ['public_id' => $this->genId()]
            );
            // key: "name::dept"
            $map["{$def['name']}::{$def['dept']}"] = $pos;
            $this->command->line("  ✓ Position: {$pos->name} ({$def['dept']})");
        }
        return $map;
    }

    // ── Personnel ─────────────────────────────────────────────────────────────

    private function seedPersonnel(array $depts, array $positions): array
    {
        $definitions = [
            [
                'employee_id' => 'EMP-2025-001',
                'pin_code'    => 1001,
                'fname'       => 'Maria Lourdes',
                'mname'       => 'B.',
                'lname'       => 'Santos',
                'dept'        => 'Academic - Junior High School',
                'pos_key'     => 'Subject Teacher::Academic - Junior High School',
                'gender'      => 'Female',
                'birthdate'   => '1988-03-15',
                'contact'     => '09171000001',
                'email'       => 'emp-2025-001@svhs.edu.ph',
                'date_hired'  => '2022-06-01',
                'link_teacher' => 'teacher_santos',
            ],
            [
                'employee_id' => 'EMP-2025-002',
                'pin_code'    => 1002,
                'fname'       => 'Carlos Manuel',
                'mname'       => 'A.',
                'lname'       => 'Reyes',
                'dept'        => 'Academic - Senior High School',
                'pos_key'     => 'Subject Teacher::Academic - Senior High School',
                'gender'      => 'Male',
                'birthdate'   => '1990-07-22',
                'contact'     => '09171000002',
                'email'       => 'emp-2025-002@svhs.edu.ph',
                'date_hired'  => '2022-06-01',
                'link_teacher' => 'teacher_reyes',
            ],
            [
                'employee_id' => 'EMP-2025-003',
                'pin_code'    => 1003,
                'fname'       => 'Ana Ma.',
                'mname'       => 'R.',
                'lname'       => 'Gonzales',
                'dept'        => 'Academic - Grade School',
                'pos_key'     => 'Grade School Teacher::Academic - Grade School',
                'gender'      => 'Female',
                'birthdate'   => '1985-11-08',
                'contact'     => '09171000003',
                'email'       => 'emp-2025-003@svhs.edu.ph',
                'date_hired'  => '2022-06-01',
                'link_teacher' => 'teacher_gonzales',
            ],
            [
                'employee_id' => 'EMP-2025-004',
                'pin_code'    => 1004,
                'fname'       => 'Benjamin',
                'mname'       => 'F.',
                'lname'       => 'Ramos',
                'dept'        => 'Academic - Junior High School',
                'pos_key'     => 'Subject Teacher::Academic - Junior High School',
                'gender'      => 'Male',
                'birthdate'   => '1987-05-30',
                'contact'     => '09171000004',
                'email'       => 'emp-2025-004@svhs.edu.ph',
                'date_hired'  => '2022-06-01',
            ],
            [
                'employee_id' => 'EMP-2025-005',
                'pin_code'    => 1005,
                'fname'       => 'Cynthia',
                'mname'       => 'D.',
                'lname'       => 'Villanueva',
                'dept'        => 'Academic - Senior High School',
                'pos_key'     => 'Subject Teacher::Academic - Senior High School',
                'gender'      => 'Female',
                'birthdate'   => '1992-01-14',
                'contact'     => '09171000005',
                'email'       => 'emp-2025-005@svhs.edu.ph',
                'date_hired'  => '2022-06-01',
            ],
            [
                'employee_id' => 'EMP-2025-006',
                'pin_code'    => 1006,
                'fname'       => 'Juan',
                'mname'       => 'M.',
                'lname'       => 'Dela Cruz',
                'dept'        => 'Administration',
                'pos_key'     => 'Administrative Assistant::Administration',
                'gender'      => 'Male',
                'birthdate'   => '1983-09-21',
                'contact'     => '09171000006',
                'email'       => 'emp-2025-006@svhs.edu.ph',
                'date_hired'  => '2022-06-01',
                'link_user'   => 'hr',
            ],
            [
                'employee_id' => 'EMP-2025-007',
                'pin_code'    => 1007,
                'fname'       => 'Rosa',
                'mname'       => 'A.',
                'lname'       => 'Mercado',
                'dept'        => 'Academic - Grade School',
                'pos_key'     => 'Librarian::Academic - Grade School',
                'gender'      => 'Female',
                'birthdate'   => '1986-06-05',
                'contact'     => '09171000007',
                'email'       => 'emp-2025-007@svhs.edu.ph',
                'date_hired'  => '2022-06-01',
            ],
            [
                'employee_id' => 'EMP-2025-008',
                'pin_code'    => 1008,
                'fname'       => 'Patricia',
                'mname'       => 'L.',
                'lname'       => 'Tan',
                'dept'        => 'Finance',
                'pos_key'     => 'Accounting Clerk::Finance',
                'gender'      => 'Female',
                'birthdate'   => '1991-08-19',
                'contact'     => '09171000008',
                'email'       => 'emp-2025-008@svhs.edu.ph',
                'date_hired'  => '2022-06-01',
            ],
            [
                'employee_id' => 'EMP-2025-009',
                'pin_code'    => 1009,
                'fname'       => 'Roberto',
                'mname'       => 'C.',
                'lname'       => 'Lim',
                'dept'        => 'Administration',
                'pos_key'     => 'IT Support Staff::Administration',
                'gender'      => 'Male',
                'birthdate'   => '1994-04-27',
                'contact'     => '09171000009',
                'email'       => 'emp-2025-009@svhs.edu.ph',
                'date_hired'  => '2022-06-01',
            ],
            [
                'employee_id' => 'EMP-2025-010',
                'pin_code'    => 1010,
                'fname'       => 'Edgar',
                'mname'       => 'S.',
                'lname'       => 'Aquino',
                'dept'        => 'Maintenance',
                'pos_key'     => 'Security Guard::Maintenance',
                'gender'      => 'Male',
                'birthdate'   => '1980-12-03',
                'contact'     => '09171000010',
                'email'       => 'emp-2025-010@svhs.edu.ph',
                'date_hired'  => '2022-06-01',
            ],
        ];

        $map = [];
        foreach ($definitions as $def) {
            $existing = HrmsPersonnel::where('employee_id', $def['employee_id'])->first();

            if (! $existing) {
                $existing = HrmsPersonnel::create([
                    'public_id'       => $this->genId(),
                    'employee_id'     => $def['employee_id'],
                    'pin_code'        => $def['pin_code'],
                    'fname'           => $def['fname'],
                    'mname'           => $def['mname'] ?? null,
                    'lname'           => $def['lname'],
                    'department_id'   => $depts[$def['dept']]->id,
                    'position_id'     => $positions[$def['pos_key']]->id,
                    'employment_type' => 'Regular',
                    'date_hired'      => $def['date_hired'],
                    'status'          => 'Active',
                    'gender'          => $def['gender'],
                    'birthdate'       => $def['birthdate'],
                    'contact'         => $def['contact'],
                    'email'           => $def['email'],
                    'address'         => 'Laguna, Philippines',
                    'emergency_contact_name'   => 'Emergency Contact',
                    'emergency_contact_number' => '09170000000',
                ]);
                $this->command->line("  ✓ Created: {$def['lname']}, {$def['fname']} ({$def['employee_id']}) PIN:{$def['pin_code']}");
            } else {
                // Update pin_code if missing
                if (! $existing->pin_code) {
                    $existing->update(['pin_code' => $def['pin_code']]);
                }
                $this->command->line("  - Exists: {$def['employee_id']} — skipping");
            }

            // Link teacher portal user to personnel
            if (isset($def['link_teacher'])) {
                $teacherUser = User::where('username', $def['link_teacher'])->first();
                if ($teacherUser && ! $existing->user_id) {
                    $existing->update(['user_id' => $teacherUser->id]);
                    $this->command->line("    → Linked to portal user: {$def['link_teacher']}");
                }
            }

            // Link system user (e.g. hr) to personnel
            if (isset($def['link_user'])) {
                $sysUser = User::where('username', $def['link_user'])->first();
                if ($sysUser && ! $existing->user_id) {
                    $existing->update(['user_id' => $sysUser->id]);
                    $this->command->line("    → Linked to system user: {$def['link_user']}");
                }
            }

            $map[$def['employee_id']] = $existing->fresh();
        }

        return $map;
    }

    // ── Leave Types ───────────────────────────────────────────────────────────

    private function seedLeaveTypes(): array
    {
        $definitions = [
            ['name' => 'Vacation Leave',         'days_per_year' => 15, 'is_paid' => true],
            ['name' => 'Sick Leave',              'days_per_year' => 15, 'is_paid' => true],
            ['name' => 'Emergency Leave',         'days_per_year' => 3,  'is_paid' => true],
            ['name' => 'Maternity / Paternity Leave', 'days_per_year' => 105, 'is_paid' => true],
            ['name' => 'Bereavement Leave',       'days_per_year' => 5,  'is_paid' => true],
            ['name' => 'Service Incentive Leave', 'days_per_year' => 5,  'is_paid' => true],
        ];

        $map = [];
        foreach ($definitions as $def) {
            $lt = LeaveType::firstOrCreate(
                ['name' => $def['name']],
                [
                    'public_id'    => $this->genId(),
                    'days_per_year' => $def['days_per_year'],
                    'is_paid'      => $def['is_paid'],
                ]
            );
            $map[$def['name']] = $lt;
            $this->command->line("  ✓ Leave type: {$lt->name} ({$lt->days_per_year} days)");
        }
        return $map;
    }

    // ── Leave Applications ────────────────────────────────────────────────────

    private function seedLeaveApplications(array $personnel, array $leaveTypes): void
    {
        // Only seed if none exist
        if (LeaveApplication::count() > 0) {
            $this->command->line('  - Leave applications already exist — skipping');
            return;
        }

        $approverUser = User::where('username', 'hr')->first()
            ?? User::where('access', 'Administrator')->first();

        $applications = [
            // ── Approved (historical) ──────────────────────────────────────────
            [
                'employee_id'  => 'EMP-2025-001',
                'leave_type'   => 'Vacation Leave',
                'start_date'   => '2026-01-13',
                'end_date'     => '2026-01-17',
                'total_days'   => 5,
                'reason'       => 'Family vacation during semester break.',
                'status'       => 'Approved',
                'approver_remarks' => 'Approved. Enjoy your vacation.',
            ],
            [
                'employee_id'  => 'EMP-2025-002',
                'leave_type'   => 'Sick Leave',
                'start_date'   => '2026-02-03',
                'end_date'     => '2026-02-05',
                'total_days'   => 3,
                'reason'       => 'Fever and flu. Medical certificate attached.',
                'status'       => 'Approved',
                'approver_remarks' => 'Approved. Please send medical certificate.',
            ],
            [
                'employee_id'  => 'EMP-2025-004',
                'leave_type'   => 'Emergency Leave',
                'start_date'   => '2026-03-10',
                'end_date'     => '2026-03-12',
                'total_days'   => 3,
                'reason'       => 'Family emergency — hospitalization of parent.',
                'status'       => 'Approved',
                'approver_remarks' => 'Approved. Get well soon.',
            ],
            // ── Pending (current) ─────────────────────────────────────────────
            [
                'employee_id'  => 'EMP-2025-006',
                'leave_type'   => 'Vacation Leave',
                'start_date'   => '2026-04-14',
                'end_date'     => '2026-04-18',
                'total_days'   => 5,
                'reason'       => 'Summer family vacation.',
                'status'       => 'Pending',
            ],
            [
                'employee_id'  => 'EMP-2025-008',
                'leave_type'   => 'Sick Leave',
                'start_date'   => '2026-04-07',
                'end_date'     => '2026-04-09',
                'total_days'   => 3,
                'reason'       => 'Migraine and eye strain. Requesting medical leave.',
                'status'       => 'Pending',
            ],
            [
                'employee_id'  => 'EMP-2025-005',
                'leave_type'   => 'Bereavement Leave',
                'start_date'   => '2026-04-08',
                'end_date'     => '2026-04-10',
                'total_days'   => 3,
                'reason'       => 'Death of a relative. Attending the wake and burial.',
                'status'       => 'Pending',
            ],
            // ── Rejected ──────────────────────────────────────────────────────
            [
                'employee_id'  => 'EMP-2025-009',
                'leave_type'   => 'Emergency Leave',
                'start_date'   => '2026-04-02',
                'end_date'     => '2026-04-03',
                'total_days'   => 2,
                'reason'       => 'Personal reasons.',
                'status'       => 'Rejected',
                'approver_remarks' => 'Insufficient documentation. Please provide supporting details.',
            ],
        ];

        foreach ($applications as $app) {
            if (! isset($personnel[$app['employee_id']])) {
                continue;
            }

            $person    = $personnel[$app['employee_id']];
            $leaveType = $leaveTypes[$app['leave_type']];

            LeaveApplication::create([
                'public_id'        => $this->genId(),
                'personnel_id'     => $person->id,
                'leave_type_id'    => $leaveType->id,
                'start_date'       => $app['start_date'],
                'end_date'         => $app['end_date'],
                'total_days'       => $app['total_days'],
                'reason'           => $app['reason'],
                'status'           => $app['status'],
                'approved_by'      => in_array($app['status'], ['Approved', 'Rejected']) ? ($approverUser?->id ?? null) : null,
                'approver_remarks' => $app['approver_remarks'] ?? null,
            ]);

            $this->command->line("  ✓ Leave ({$app['status']}): {$person->lname} — {$app['leave_type']} {$app['start_date']}");
        }
    }

    // ── Attendance Logs ───────────────────────────────────────────────────────

    private function seedAttendanceLogs(array $personnel): void
    {
        // Only seed if no logs exist at all
        if (AttendanceLog::where('entity_type', 'personnel')->count() > 0) {
            $this->command->line('  - Personnel attendance logs already exist — skipping');
            return;
        }

        $today      = Carbon::today();
        $employeeIds = array_keys($personnel);

        // Past 7 calendar days (skip weekends)
        $businessDays = [];
        $cursor = $today->copy()->subDays(1);
        while (count($businessDays) < 7) {
            if ($cursor->isWeekday()) {
                $businessDays[] = $cursor->copy();
            }
            $cursor->subDay();
        }

        foreach ($businessDays as $day) {
            foreach ($employeeIds as $empId) {
                // EMP-2025-010 (security) had a day off (leave day) on the oldest day
                if ($day->isSameDay($businessDays[6]) && $empId === 'EMP-2025-010') {
                    continue;
                }

                $timeIn  = $day->copy()->setTime(7, rand(30, 55), 0);
                $timeOut = $day->copy()->setTime(16, rand(30, 59), 0);

                AttendanceLog::create([
                    'public_id'   => $this->genId(),
                    'entity_type' => 'personnel',
                    'entity_id'   => $empId,
                    'log_time'    => $timeIn,
                    'direction'   => 'in',
                    'method'      => 'kiosk',
                ]);

                // Most staff have a time-out; EMP-2025-007 forgot to time out yesterday
                if (! ($day->isSameDay($businessDays[0]) && $empId === 'EMP-2025-007')) {
                    AttendanceLog::create([
                        'public_id'   => $this->genId(),
                        'entity_type' => 'personnel',
                        'entity_id'   => $empId,
                        'log_time'    => $timeOut,
                        'direction'   => 'out',
                        'method'      => 'kiosk',
                    ]);
                }
            }
        }

        // Today: first 6 staff have timed in already (no time-out yet)
        foreach (array_slice($employeeIds, 0, 6) as $empId) {
            AttendanceLog::create([
                'public_id'   => $this->genId(),
                'entity_type' => 'personnel',
                'entity_id'   => $empId,
                'log_time'    => $today->copy()->setTime(7, rand(30, 55), 0),
                'direction'   => 'in',
                'method'      => 'kiosk',
            ]);
        }

        $total = AttendanceLog::where('entity_type', 'personnel')->count();
        $this->command->line("  ✓ Created {$total} personnel attendance log entries");
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private function genId(): string
    {
        return Str::lower(Str::random(20));
    }
}
