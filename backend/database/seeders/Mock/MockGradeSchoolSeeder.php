<?php

namespace Database\Seeders\Mock;

use App\Models\ClassModel;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * MockGradeSchoolSeeder
 *
 * Seeds the missing grade levels: Kinder, Grade 1 – Grade 6.
 * ClassesFromLegacySeeder only includes Nursery and Preparatory; this seeder
 * fills out the rest of the Grade School department.
 *
 * Sections (all under Grade School dept):
 *   Kinder  : St. Vincent                     (25 students)
 *   Grade 1 : St. Michael, St. Gabriel        (30 × 2)
 *   Grade 2 : St. Raphael, St. John           (30 × 2)
 *   Grade 3 : St. Therese, St. Catherine      (30 × 2)
 *   Grade 4 : St. Francis, St. Charles        (30 × 2)
 *   Grade 5 : St. Joseph, St. Thomas More     (30 × 2)
 *   Grade 6 : St. Justin, St. Benedict        (30 × 2)
 *   ─── Total capacity per SY: 385 ──────────────────
 *
 * School years seeded (additive, will not re-seed existing data):
 *   SY 2025-2026 : 385  students (Enrolled)
 *   SY 2024-2025 : 350  students (Enrolled)
 *   SY 2023-2024 : 320  students (Enrolled)
 *   SY 2022-2023 : 290  students (Enrolled)
 *   SY 2021-2022 : 260  students (Enrolled)
 *
 * Portal accounts (student + parent) are created for SY 2025-2026 only.
 */
class MockGradeSchoolSeeder extends Seeder
{
    private const SCHOOL_YEARS = [
        ['sy' => '2025-2026', 'count' => 385, 'status' => 'Enrolled'],
        ['sy' => '2024-2025', 'count' => 350, 'status' => 'Enrolled'],
        ['sy' => '2023-2024', 'count' => 320, 'status' => 'Enrolled'],
        ['sy' => '2022-2023', 'count' => 290, 'status' => 'Enrolled'],
        ['sy' => '2021-2022', 'count' => 260, 'status' => 'Enrolled'],
    ];

    // [gradeLevel, section, capacity]
    private const GS_CLASSES = [
        ['Kinder',  'St. Vincent',            25],
        ['Grade 1', 'St. Michael',            30],
        ['Grade 1', 'St. Gabriel',            30],
        ['Grade 2', 'St. Raphael',            30],
        ['Grade 2', 'St. John the Evangelist',30],
        ['Grade 3', 'St. Therese',            30],
        ['Grade 3', 'St. Catherine',          30],
        ['Grade 4', 'St. Francis of Assisi',  30],
        ['Grade 4', 'St. Charles Borromeo',   30],
        ['Grade 5', 'St. Joseph',             30],
        ['Grade 5', 'St. Thomas More',        30],
        ['Grade 6', 'St. Justin',             30],
        ['Grade 6', 'St. Benedict',           30],
    ];

    private const BIRTH_YEAR_OFFSET = [
        'Kinder'  => 5,
        'Grade 1' => 6,
        'Grade 2' => 7,
        'Grade 3' => 8,
        'Grade 4' => 9,
        'Grade 5' => 10,
        'Grade 6' => 11,
    ];

    private const GS_GRADE_LEVELS = ['Kinder', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

    private int $lrnCounter    = 0;
    private int $studentCounter = 0;

    // ── Entry point ──────────────────────────────────────────────────────────

    public function run(): void
    {
        $this->seedClasses('2025-2026');
        mt_srand(142857); // separate RNG seed from MockStudentsSeeder

        // Start counters above what MockStudentsSeeder used
        $maxLrn = (int) DB::table('students')->max(DB::raw('CAST(lrn AS UNSIGNED)'));
        $this->lrnCounter = max($maxLrn, 202500000000);

        $maxStudId = DB::table('students')
            ->whereRaw("student_id REGEXP '^[A-Z]+-[0-9]+-[0-9]+$'")
            ->count();
        $this->studentCounter = max($maxStudId, 7000); // well above GS existing IDs

        $totalCreated = 0;

        foreach (self::SCHOOL_YEARS as $syDef) {
            $sy      = $syDef['sy'];
            $target  = $syDef['count'];
            $status  = $syDef['status'];
            $syStart = (int) substr($sy, 0, 4);

            $existing = DB::table('students')
                ->where('schoolYear', $sy)
                ->whereIn('gradeLevel', self::GS_GRADE_LEVELS)
                ->count();

            if ($existing >= (int) ($target * 0.8)) {
                $this->command->line("  ⊘ GS {$sy} already seeded ({$existing} students), skipping.");
                $totalCreated += $existing;
                continue;
            }

            $this->command->info("  GS SY {$sy} — target {$target} students");
            $n = $this->seedStudentsForSy($sy, $syStart, $target, $status);
            $this->command->line("    ✓ Inserted {$n} GS students for SY {$sy}");
            $totalCreated += $n;
        }

        $this->command->line("  Total GS students created: {$totalCreated}");
        $this->command->info("  Creating GS portal accounts (SY 2025-2026)…");
        $this->seedPortalAccounts('2025-2026');
        $this->command->line("  ✓ GS portal accounts created.");
    }

    // ── Seed classes for a given SY ──────────────────────────────────────────

    private function seedClasses(string $sy): void
    {
        $created = 0;
        foreach (self::GS_CLASSES as [$grade, $section]) {
            if (ClassModel::where('gradeLevel', $grade)
                ->where('section', $section)
                ->where('schoolYear', $sy)
                ->exists()) {
                continue;
            }
            ClassModel::create([
                'gradeLevel' => $grade,
                'strand'     => 'N/A',
                'major'      => 'N/A',
                'section'    => $section,
                'dept'       => 'Grade School',
                'adviser_id' => 0,
                'adviser'    => '-',
                'schoolYear' => $sy,
                'semester'   => '1st Semester',
            ]);
            $created++;
        }
        $this->command->line("  ✓ GS classes verified for {$sy} ({$created} new).");
    }

    // ── Seed students for one SY ─────────────────────────────────────────────

    private function seedStudentsForSy(string $sy, int $syStart, int $target, string $status): int
    {
        // Build slot list proportional to section capacities
        $classDefs = self::GS_CLASSES;
        $totalCap  = array_sum(array_column($classDefs, 2));
        $slots     = [];
        $remaining = $target;

        foreach ($classDefs as $idx => [$grade, $section, $cap]) {
            $fill = ($idx < count($classDefs) - 1)
                ? (int) round(($cap / $totalCap) * $target)
                : $remaining;
            $fill = min($fill, $remaining);
            for ($i = 0; $i < $fill; $i++) {
                $slots[] = [$grade, $section];
            }
            $remaining -= $fill;
        }

        $batch = [];
        $count = 0;

        foreach ($slots as [$grade, $section]) {
            $this->lrnCounter++;
            $this->studentCounter++;

            if (DB::table('students')->where('lrn', (string) $this->lrnCounter)->exists()) {
                continue;
            }

            // For SY 2025-2026, get real class_id; older SYs don't have classes seeded
            $classId = ClassModel::where('gradeLevel', $grade)
                ->where('section', $section)
                ->where('schoolYear', $sy)
                ->value('class_id') ?? 0;

            $sex     = mt_rand(0, 1) === 0 ? 'Male' : 'Female';
            $fname   = $sex === 'Male'
                ? MockNames::$maleFirstNames[mt_rand(0, count(MockNames::$maleFirstNames) - 1)]
                : MockNames::$femaleFirstNames[mt_rand(0, count(MockNames::$femaleFirstNames) - 1)];
            $lname   = MockNames::$lastNames[mt_rand(0, count(MockNames::$lastNames) - 1)];
            $mname   = MockNames::$middleNames[mt_rand(0, count(MockNames::$middleNames) - 1)];
            $gFname  = MockNames::$maleFirstNames[mt_rand(0, count(MockNames::$maleFirstNames) - 1)];
            $birthYr = $syStart - self::BIRTH_YEAR_OFFSET[$grade];
            $appDate = $syStart . '-06-' . str_pad((string) mt_rand(1, 28), 2, '0', STR_PAD_LEFT);
            $contact = '09' . mt_rand(171, 999) . str_pad((string) mt_rand(0, 9999999), 7, '0', STR_PAD_LEFT);

            $batch[] = [
                'lrn'                => (string) $this->lrnCounter,
                'esc_id'             => '0',
                'student_id'         => 'GS-' . $syStart . '-' . str_pad((string) $this->studentCounter, 4, '0', STR_PAD_LEFT),
                'lname'              => strtoupper($lname),
                'fname'              => $fname,
                'mname'              => $mname,
                'suffix'             => '',
                'bdMM'               => str_pad((string) mt_rand(1, 12), 2, '0', STR_PAD_LEFT),
                'bdDD'               => str_pad((string) mt_rand(1, 28), 2, '0', STR_PAD_LEFT),
                'bdYYYY'             => (string) $birthYr,
                'sex'                => $sex,
                'age'                => $syStart - $birthYr,
                'address_street'     => mt_rand(1, 999) . ' ' . MockNames::$streets[mt_rand(0, count(MockNames::$streets) - 1)],
                'address_brgy'       => MockNames::$barangays[mt_rand(0, count(MockNames::$barangays) - 1)],
                'address_city_mun'   => MockNames::$cities[mt_rand(0, count(MockNames::$cities) - 1)],
                'address_province'   => MockNames::$provinces[mt_rand(0, count(MockNames::$provinces) - 1)],
                'guardian_lname'     => $lname,
                'guardian_fname'     => $gFname,
                'guardian_contact'   => $contact,
                'guardian_relation'  => MockNames::$relations[mt_rand(0, count(MockNames::$relations) - 1)],
                'g_address_street'   => null,
                'g_address_brgy'     => null,
                'g_address_city_mun' => null,
                'g_address_province' => null,
                'last_school'        => MockNames::$prevSchools[mt_rand(0, count(MockNames::$prevSchools) - 1)],
                'last_school_sy'     => ($syStart - 1) . '-' . $syStart,
                'last_school_type'   => mt_rand(0, 1) === 0 ? 'Private' : 'Public',
                'gen_average'        => mt_rand(80, 98),
                'class_id'           => $classId,
                'dept'               => 'Grade School',
                'gradeLevel'         => $grade,
                'strand'             => 'N/A',
                'major'              => 'N/A',
                'section'            => $section,
                'classification'     => mt_rand(0, 2) === 0 ? 'Old' : 'New',
                'schoolYear'         => $sy,
                'sem'                => '1st Semester',
                'appDate'            => $appDate,
                'appTime'            => '08:00 AM',
                'assessment_id'      => 0,
                'status'             => $status,
                'remarks'            => null,
                'stat_date'          => $appDate,
                'prev_sy_reg_id'     => 0,
                'public_id'          => Str::random(20),
                'created_at'         => now(),
                'updated_at'         => now(),
            ];

            $count++;

            if (count($batch) >= 50) {
                DB::table('students')->insert($batch);
                $batch = [];
            }
        }

        if (!empty($batch)) {
            DB::table('students')->insert($batch);
        }

        return $count;
    }

    // ── Portal accounts for GS students ─────────────────────────────────────

    private function seedPortalAccounts(string $sy): void
    {
        $studentPw = Hash::make('Student123!');
        $parentPw  = Hash::make('Parent123!');
        $parents   = [];

        $cursor = DB::table('students')
            ->where('schoolYear', $sy)
            ->whereIn('gradeLevel', self::GS_GRADE_LEVELS)
            ->select(['reg_id', 'lname', 'fname', 'student_id',
                      'guardian_lname', 'guardian_fname', 'guardian_contact'])
            ->cursor();

        foreach ($cursor as $s) {
            // Student account
            $uname = 's_gs_'
                . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $s->lname))
                . '_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $s->fname))
                . '_' . substr($s->student_id, -4);

            if (!DB::table('users')->where('username', $uname)->exists()) {
                DB::table('users')->insert([
                    'username'   => $uname,
                    'password'   => $studentPw,
                    'fname'      => $s->fname,
                    'lname'      => $s->lname,
                    'email'      => strtolower($uname) . '@student.svhs.edu.ph',
                    'access'     => 'Student',
                    'department' => 'Student',
                    'status'     => 'Active',
                    'reg_id'     => $s->reg_id,
                    'public_id'  => Str::random(20),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Parent account
            $pKey = $s->guardian_lname . '|' . $s->guardian_fname . '|' . $s->guardian_contact;

            if (!isset($parents[$pKey])) {
                $pName = 'p_gs_'
                    . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $s->guardian_lname))
                    . '_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $s->guardian_fname))
                    . '_' . substr(md5($s->guardian_contact ?? ''), 0, 6);

                if (!DB::table('users')->where('username', $pName)->exists()) {
                    $pId = DB::table('users')->insertGetId([
                        'username'   => $pName,
                        'password'   => $parentPw,
                        'fname'      => $s->guardian_fname,
                        'lname'      => $s->guardian_lname,
                        'email'      => strtolower($pName) . '@parent.svhs.edu.ph',
                        'access'     => 'Parent',
                        'department' => 'Parent',
                        'status'     => 'Active',
                        'public_id'  => Str::random(20),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    $pId = DB::table('users')->where('username', $pName)->value('id');
                }

                $parents[$pKey] = $pId;
            }

            if (!empty($parents[$pKey])) {
                DB::table('parent_students')->insertOrIgnore([
                    'user_id' => $parents[$pKey],
                    'reg_id'  => $s->reg_id,
                ]);
            }
        }
    }
}
