<?php

namespace Database\Seeders\Mock;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * MockAcademicHistorySeeder
 *
 * Fills in complete academic records so the system looks like an institution
 * with years of history:
 *
 *  ┌────────────────────────────────────────────────────────────────────────┐
 *  │ For SY 2025-2026 students:                                             │
 *  │   • Adds 2nd Semester grades (Q3 + Q4, semester = '2nd Semester')      │
 *  │     MockAttendanceGradesSeeder already seeded 1st Semester (Q1+Q2).    │
 *  │                                                                        │
 *  │ For SY 2024-2025 → 2021-2022 students:                                 │
 *  │   • Adds FULL year grades using semester = 'Annual'                    │
 *  │     (all 4 quarters in one row; class_id = 0 since past classes        │
 *  │     were not seeded for those years)                                   │
 *  └────────────────────────────────────────────────────────────────────────┘
 *
 * Idempotent: uses insertOrIgnore (grades table has unique constraint on
 *   reg_id + class_id + subject + school_year + semester).
 */
class MockAcademicHistorySeeder extends Seeder
{
    private const CHUNK     = 200;
    private const CURRENT_SY = '2025-2026';

    // ── Subjects by grade level (mirrors MockAttendanceGradesSeeder) ─────────
    private const SUBJECTS = [
        // Pre-school
        'Nursery'     => ['Oral Language', 'Phonological Awareness', 'Mathematics', 'Social Development'],
        'Preparatory' => ['Oral Language', 'Phonological Awareness', 'Book and Print Knowledge',
                          'Alphabet Knowledge', 'Mathematics', 'Social Development'],
        // Grade School
        'Kinder'  => ['Mother Tongue', 'English', 'Mathematics', 'MAPEH', 'EsP'],
        'Grade 1' => ['Mother Tongue', 'Filipino', 'English', 'Mathematics', 'Araling Panlipunan', 'MAPEH', 'EsP'],
        'Grade 2' => ['Mother Tongue', 'Filipino', 'English', 'Mathematics', 'Araling Panlipunan', 'MAPEH', 'EsP'],
        'Grade 3' => ['Mother Tongue', 'Filipino', 'English', 'Mathematics', 'Araling Panlipunan', 'MAPEH', 'EsP'],
        'Grade 4' => ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'MAPEH', 'TLE/EPP', 'EsP'],
        'Grade 5' => ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'MAPEH', 'TLE/EPP', 'EsP'],
        'Grade 6' => ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'MAPEH', 'TLE/EPP', 'EsP'],
        // Junior High School
        'Grade 7'  => ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'MAPEH', 'TLE', 'EsP'],
        'Grade 8'  => ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'MAPEH', 'TLE', 'EsP'],
        'Grade 9'  => ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'MAPEH', 'TLE', 'EsP'],
        'Grade 10' => ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'MAPEH', 'TLE', 'EsP'],
        // Senior High School core (strand subjects added separately)
        'Grade 11' => [
            'Oral Communication', 'Komunikasyon at Pananaliksik', '21st Century Literature',
            'Contemporary Philippine Arts', 'Media and Information Literacy', 'General Mathematics',
            'Earth and Life Science', 'Understanding Culture Society and Politics', 'Personal Development',
            'PE and Health',
        ],
        'Grade 12' => [
            'Pagbasa at Pagsusuri', 'Komunikasyon at Pananaliksik', 'Practical Research 2',
            'English for Academic and Professional Purposes', 'Physical Education and Health',
            'Entrepreneurship', 'Research/Capstone Project', 'Work Immersion',
        ],
    ];

    private const SHS_STRAND_SUBJECTS = [
        'STEM'            => ['Pre-Calculus', 'Basic Calculus', 'General Biology 1', 'General Physics 1'],
        'ABM'             => ['Business Mathematics', 'Business Finance', 'Organization and Management'],
        'HUMSS'           => ['Creative Writing', 'Philippine Politics and Governance', 'Community Engagement'],
        'Home Economics'  => ['Home Economics', 'Food and Beverage Services', 'Cookery'],
        'ICT'             => ['Computer Hardware Servicing', 'Programming', 'Animation'],
    ];

    // ── Entry point ──────────────────────────────────────────────────────────

    public function run(): void
    {
        mt_srand(314159);

        // ── 2nd Semester for current SY ───────────────────────────────────────
        $this->command->info("  Seeding 2nd Semester grades for SY 2025-2026…");
        $count = $this->seedSecondSemester();
        $this->command->line("  ✓ 2nd Semester rows: {$count}");

        // ── Full year grades for past SYs ─────────────────────────────────────
        $pastSYs = ['2024-2025', '2023-2024', '2022-2023', '2021-2022'];
        foreach ($pastSYs as $sy) {
            $this->command->info("  Seeding full-year grades for SY {$sy}…");
            $count = $this->seedAnnualGrades($sy);
            $this->command->line("  ✓ Annual rows for {$sy}: {$count}");
        }
    }

    // ── 2nd Semester for SY 2025-2026 ────────────────────────────────────────

    private function seedSecondSemester(): int
    {
        $existingCount = DB::table('grades')
            ->where('school_year', self::CURRENT_SY)
            ->where('semester', '2nd Semester')
            ->count();

        if ($existingCount > 5000) {
            $this->command->line("  ⊘ 2nd Semester 2025-2026 already seeded ({$existingCount} rows), skipping.");
            return $existingCount;
        }

        $students = DB::table('students')
            ->where('schoolYear', self::CURRENT_SY)
            ->where('status', 'Enrolled')
            ->select(['reg_id', 'class_id', 'gradeLevel', 'strand'])
            ->get();

        $batch    = [];
        $inserted = 0;

        foreach ($students as $s) {
            if ($s->class_id == 0) {
                continue; // No class record = skip (GS past year edge case)
            }
            $subjects = $this->getSubjects($s->gradeLevel, $s->strand ?? 'N/A');

            foreach ($subjects as $subject) {
                $q3    = $this->randGrade();
                $q4    = $this->randGrade();
                $final = round(($q3 + $q4) / 2, 2);

                $batch[] = [
                    'reg_id'      => $s->reg_id,
                    'class_id'    => $s->class_id,
                    'subject'     => $subject,
                    'school_year' => self::CURRENT_SY,
                    'semester'    => '2nd Semester',
                    'q1'          => null,
                    'q2'          => null,
                    'q3'          => $q3,
                    'q4'          => $q4,
                    'final_grade' => $final,
                    'remarks'     => $final >= 75 ? 'Passed' : 'Failed',
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ];

                if (count($batch) >= self::CHUNK) {
                    DB::table('grades')->insertOrIgnore($batch);
                    $inserted += count($batch);
                    $batch     = [];
                }
            }
        }

        if (!empty($batch)) {
            DB::table('grades')->insertOrIgnore($batch);
            $inserted += count($batch);
        }

        return $inserted;
    }

    // ── Annual grades for past SYs ────────────────────────────────────────────

    private function seedAnnualGrades(string $sy): int
    {
        $existingCount = DB::table('grades')
            ->where('school_year', $sy)
            ->count();

        if ($existingCount > 5000) {
            $this->command->line("  ⊘ Grades for {$sy} already seeded ({$existingCount} rows), skipping.");
            return $existingCount;
        }

        $students = DB::table('students')
            ->where('schoolYear', $sy)
            ->where('status', 'Enrolled')
            ->select(['reg_id', 'class_id', 'gradeLevel', 'strand'])
            ->get();

        $batch    = [];
        $inserted = 0;

        foreach ($students as $s) {
            $subjects = $this->getSubjects($s->gradeLevel, $s->strand ?? 'N/A');
            $classId  = $s->class_id ?? 0; // typically 0 for past SYs (no class seeded)

            foreach ($subjects as $subject) {
                $q1    = $this->randGrade();
                $q2    = $this->randGrade();
                $q3    = $this->randGrade();
                $q4    = $this->randGrade();
                $final = round(($q1 + $q2 + $q3 + $q4) / 4, 2);

                $batch[] = [
                    'reg_id'      => $s->reg_id,
                    'class_id'    => $classId,
                    'subject'     => $subject,
                    'school_year' => $sy,
                    'semester'    => 'Annual',
                    'q1'          => $q1,
                    'q2'          => $q2,
                    'q3'          => $q3,
                    'q4'          => $q4,
                    'final_grade' => $final,
                    'remarks'     => $final >= 75 ? 'Passed' : 'Failed',
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ];

                if (count($batch) >= self::CHUNK) {
                    DB::table('grades')->insertOrIgnore($batch);
                    $inserted += count($batch);
                    $batch     = [];
                }
            }
        }

        if (!empty($batch)) {
            DB::table('grades')->insertOrIgnore($batch);
            $inserted += count($batch);
        }

        return $inserted;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

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
        $rand = mt_rand(1, 100);
        return match (true) {
            $rand <= 3  => mt_rand(70, 74) + (mt_rand(0, 9) / 10),  // 3% failing
            $rand <= 10 => mt_rand(75, 79) + (mt_rand(0, 9) / 10),  // 7% low pass
            $rand <= 45 => mt_rand(80, 84) + (mt_rand(0, 9) / 10),  // 35% average
            $rand <= 80 => mt_rand(85, 89) + (mt_rand(0, 9) / 10),  // 35% above average
            $rand <= 93 => mt_rand(90, 94) + (mt_rand(0, 9) / 10),  // 13% honor
            default     => mt_rand(95, 98) + (mt_rand(0, 9) / 10),  // 7% high honor
        };
    }
}
