<?php

namespace Database\Seeders\Mock;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * MockAttendanceGradesSeeder
 *
 * For all enrolled (SY 2025-2026) students:
 *  - Attendance: every school day from June 9 to current date
 *    ~92% Present, ~3% Late, ~3% Absent, ~2% Excused
 *  - Grades: Q1 and Q2 for each subject per grade level
 *
 * Subjects match DepEd basic education curriculum:
 *   GS  : Filipino, English, Mathematics, Science, Araling Panlipunan,
 *          MAPEH, EPP/TLE, MTB-MLE, EsP
 *   JHS : Filipino, English, Mathematics, Science, Araling Panlipunan,
 *          MAPEH, TLE/EPP, EsP
 *   SHS : Core + Strand-specific applied/specialized subjects
 */
class MockAttendanceGradesSeeder extends Seeder
{
    private const SY = '2025-2026';
    private const CHUNK = 200;

    // ── Subjects by grade level ──────────────────────────────────────────────
    private const SUBJECTS = [
        'Nursery'     => ['Oral Language', 'Phonological Awareness', 'Mathematics', 'Social Development'],
        'Preparatory' => ['Oral Language', 'Phonological Awareness', 'Book and Print Knowledge', 'Alphabet Knowledge', 'Mathematics', 'Social Development'],
        // ── Grade School ──────────────────────────────────────────────────────
        'Kinder'  => ['Mother Tongue', 'English', 'Mathematics', 'MAPEH', 'EsP'],
        'Grade 1' => ['Mother Tongue', 'Filipino', 'English', 'Mathematics', 'Araling Panlipunan', 'MAPEH', 'EsP'],
        'Grade 2' => ['Mother Tongue', 'Filipino', 'English', 'Mathematics', 'Araling Panlipunan', 'MAPEH', 'EsP'],
        'Grade 3' => ['Mother Tongue', 'Filipino', 'English', 'Mathematics', 'Araling Panlipunan', 'MAPEH', 'EsP'],
        'Grade 4' => ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'MAPEH', 'TLE/EPP', 'EsP'],
        'Grade 5' => ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'MAPEH', 'TLE/EPP', 'EsP'],
        'Grade 6' => ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'MAPEH', 'TLE/EPP', 'EsP'],
        // ── Junior High School ────────────────────────────────────────────────
        'Grade 7'     => ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'MAPEH', 'TLE', 'EsP'],
        'Grade 8'     => ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'MAPEH', 'TLE', 'EsP'],
        'Grade 9'     => ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'MAPEH', 'TLE', 'EsP'],
        'Grade 10'    => ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'MAPEH', 'TLE', 'EsP'],
        'Grade 11'    => [
            'Oral Communication', 'Komunikasyon at Pananaliksik', '21st Century Literature',
            'Contemporary Philippine Arts', 'Media and Information Literacy', 'General Mathematics',
            'Earth and Life Science', 'Understanding Culture Society and Politics', 'Personal Development',
            'PE and Health',
        ],
        'Grade 12'    => [
            'Pagbasa at Pagsusuri', 'Komunikasyon at Pananaliksik', 'Practical Research 2',
            'English for Academic and Professional Purposes', 'Physical Education and Health',
            'Entrepreneurship', 'Research/Capstone Project', 'Work Immersion',
        ],
    ];

    // SHS strand-specific subjects
    private const SHS_STRAND_SUBJECTS = [
        'STEM'  => ['Pre-Calculus', 'Basic Calculus', 'General Biology 1', 'General Biology 2', 'General Chemistry 1', 'General Physics 1'],
        'ABM'   => ['Business Mathematics', 'Business Finance', 'Organization and Management', 'Fundamentals of Accountancy'],
        'HUMSS' => ['Creative Writing', 'Philippine Politics and Governance', 'Disciplines and Ideas in Social Sciences', 'Community Engagement'],
        'HE'    => ['Home Economics', 'Food and Beverage Services', 'Cookery', 'Bread and Pastry Production'],
        'ICT'   => ['Computer Hardware Servicing', 'Programming', 'Web Design', 'Animation'],
    ];

    // ── School calendar: school days Jun 9 – Dec 12 of SY start year ────────
    private function getSchoolDays(): array
    {
        $syStart = 2025;
        $days = [];
        $date = \Carbon\Carbon::create($syStart, 6, 9);
        $end  = \Carbon\Carbon::create($syStart, 12, 12);

        // DepEd holidays/breaks to skip (approximate PH national holidays)
        $holidays = [
            "{$syStart}-06-12", // Independence Day
            "{$syStart}-08-21", // Ninoy Aquino Day
            "{$syStart}-08-25", // National Heroes Day (last Mon of Aug)
            "{$syStart}-09-10", "{$syStart}-09-11", "{$syStart}-09-12", // Sembreak approximation
            "{$syStart}-10-31", // Undas
            "{$syStart}-11-01", "{$syStart}-11-02",
            "{$syStart}-11-30", // Bonifacio Day
            "{$syStart}-12-08", // Feast of Immaculate Conception
        ];

        while ($date->lte($end)) {
            if (!$date->isWeekend() && !in_array($date->toDateString(), $holidays)) {
                $days[] = $date->toDateString();
            }
            $date->addDay();
        }

        return $days;
    }

    // ── Entry point ──────────────────────────────────────────────────────────

    public function run(): void
    {
        $schoolDays = $this->getSchoolDays();
        $this->command->line("  School days in date range: " . count($schoolDays));

        // Get all active students with their class_id and grade level
        $students = DB::table('students')
            ->where('schoolYear', self::SY)
            ->where('status', 'Enrolled')
            ->select(['reg_id', 'class_id', 'gradeLevel', 'strand'])
            ->get();

        $this->command->line("  Students to process: " . $students->count());

        // ── Attendance ────────────────────────────────────────────────────────
        $this->command->info("  Seeding attendance…");
        $this->seedAttendance($students, $schoolDays);

        // ── Grades ────────────────────────────────────────────────────────────
        $this->command->info("  Seeding grades…");
        $this->seedGrades($students);
    }

    // ── Attendance seeding ───────────────────────────────────────────────────

    private function seedAttendance($students, array $schoolDays): void
    {
        // Only seed up to today (don't create future attendance)
        $today = now()->toDateString();
        $eligibleDays = array_filter($schoolDays, fn($d) => $d <= $today);

        $batch = [];
        $inserted = 0;

        // Check what's already seeded
        $existingCount = DB::table('attendance')->where('date', '>=', '2025-06-09')->count();
        if ($existingCount > 5000) {
            $this->command->line("  ⊘ Attendance already seeded ({$existingCount} rows), skipping.");
            return;
        }

        foreach ($students as $student) {
            if ($student->class_id == 0) continue;

            foreach ($eligibleDays as $date) {
                $rand = mt_rand(1, 100);
                $status = match (true) {
                    $rand <= 92 => 'Present',
                    $rand <= 95 => 'Late',
                    $rand <= 97 => 'Absent',
                    $rand <= 99 => 'Excused',
                    default     => 'Half Day',
                };

                $batch[] = [
                    'reg_id'   => $student->reg_id,
                    'class_id' => $student->class_id,
                    'date'     => $date,
                    'status'   => $status,
                    'remarks'  => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if (count($batch) >= self::CHUNK) {
                    // Use INSERT IGNORE to skip duplicates from unique constraint
                    DB::table('attendance')->insertOrIgnore($batch);
                    $inserted += count($batch);
                    $batch = [];
                }
            }
        }

        if (!empty($batch)) {
            DB::table('attendance')->insertOrIgnore($batch);
            $inserted += count($batch);
        }

        $this->command->line("  ✓ Attendance rows inserted: {$inserted}");
    }

    // ── Grades seeding ───────────────────────────────────────────────────────

    private function seedGrades($students): void
    {
        $existingCount = DB::table('grades')->where('school_year', self::SY)->count();
        if ($existingCount > 5000) {
            $this->command->line("  ⊘ Grades already seeded ({$existingCount} rows), skipping.");
            return;
        }

        $batch = [];
        $inserted = 0;

        foreach ($students as $student) {
            if ($student->class_id == 0) continue;

            $subjects = $this->getSubjects($student->gradeLevel, $student->strand ?? 'N/A');

            foreach ($subjects as $subject) {
                // Weighted random grade: most students 80-92, some higher/lower
                $q1 = $this->randGrade();
                $q2 = $this->randGrade();
                // Q3/Q4 null for now (2nd semester not ended)
                $final = round(($q1 + $q2) / 2, 2);

                $batch[] = [
                    'reg_id'      => $student->reg_id,
                    'class_id'    => $student->class_id,
                    'subject'     => $subject,
                    'school_year' => self::SY,
                    'semester'    => '1st Semester',
                    'q1'          => $q1,
                    'q2'          => $q2,
                    'q3'          => null,
                    'q4'          => null,
                    'final_grade' => $final,
                    'remarks'     => $final >= 75 ? 'Passed' : 'Failed',
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ];

                if (count($batch) >= self::CHUNK) {
                    DB::table('grades')->insertOrIgnore($batch);
                    $inserted += count($batch);
                    $batch = [];
                }
            }
        }

        if (!empty($batch)) {
            DB::table('grades')->insertOrIgnore($batch);
            $inserted += count($batch);
        }

        $this->command->line("  ✓ Grade rows inserted: {$inserted}");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function getSubjects(string $gradeLevel, string $strand): array
    {
        $base = self::SUBJECTS[$gradeLevel] ?? self::SUBJECTS['Grade 7'];

        if (in_array($gradeLevel, ['Grade 11', 'Grade 12']) && isset(self::SHS_STRAND_SUBJECTS[$strand])) {
            $base = array_merge($base, self::SHS_STRAND_SUBJECTS[$strand]);
        }

        return $base;
    }

    private function randGrade(): float
    {
        // Bell-curve-like distribution: most 82-92
        $rand = mt_rand(1, 100);
        return match (true) {
            $rand <= 3  => mt_rand(70, 74) + (mt_rand(0, 9) / 10),   // 3% failing
            $rand <= 10 => mt_rand(75, 79) + (mt_rand(0, 9) / 10),   // 7% low pass
            $rand <= 45 => mt_rand(80, 84) + (mt_rand(0, 9) / 10),   // 35% average
            $rand <= 80 => mt_rand(85, 89) + (mt_rand(0, 9) / 10),   // 35% above average
            $rand <= 93 => mt_rand(90, 94) + (mt_rand(0, 9) / 10),   // 13% honor
            default     => mt_rand(95, 98) + (mt_rand(0, 9) / 10),   // 7% high honor
        };
    }
}
