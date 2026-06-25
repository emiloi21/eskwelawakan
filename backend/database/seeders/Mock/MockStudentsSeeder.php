<?php

namespace Database\Seeders\Mock;

use App\Models\ClassModel;
use App\Models\Student;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * MockStudentsSeeder
 *
 * Seeds ~5,000 students distributed across all grade levels and sections,
 * with portal accounts for every student and parents (with realistic sibling
 * families — some parents have 3-4 active children).
 *
 * Distribution (matches SVHS class roster):
 *   Nursery:      1 section  ×  25  =   25
 *   Preparatory:  2 sections ×  30  =   60
 *   Grade 7:      4 sections ×  50  =  200
 *   Grade 8:      3 sections ×  50  =  150
 *   Grade 9:      2 sections ×  50  =  100
 *   Grade 10:     3 sections ×  50  =  150
 *   Grade 11:     5 strands  ×  50  =  250
 *   Grade 12:     5 strands  ×  50  =  250
 *   ─────────────────────────────────────
 *   Subtotal before family distribution:  1,185
 *
 * To reach ~5,000 we create 4 school-year cohorts:
 *   SY 2025-2026 (active)  ~1,200
 *   SY 2024-2025 (alumni)  ~1,100
 *   SY 2023-2024 (alumni)  ~1,000
 *   SY 2022-2023 (alumni)    ~900
 *   SY 2021-2022 (alumni)    ~800
 *   ─────────────────────────────────────
 *   Total: ~5,000
 *
 * Family groupings per SY:
 *   ~15%  of families have 2 siblings    → 2 active children per parent
 *   ~8%   of families have 3 siblings    → 3 active children per parent
 *   ~3%   of families have 4 siblings    → 4 active children per parent
 *
 * Chunked inserts for memory efficiency.
 */
class MockStudentsSeeder extends Seeder
{
    private const SCHOOL_YEARS = [
        ['sy' => '2025-2026', 'count' => 1200, 'status' => 'Enrolled'],
        ['sy' => '2024-2025', 'count' => 1100, 'status' => 'Enrolled'],
        ['sy' => '2023-2024', 'count' => 1000, 'status' => 'Enrolled'],
        ['sy' => '2022-2023', 'count' =>  900, 'status' => 'Enrolled'],
        ['sy' => '2021-2022', 'count' =>  800, 'status' => 'Enrolled'],
    ];

    private const CHUNK_SIZE = 50;

    // ── Grade-level distribution per school year slot ───────────────────────
    private const DISTRIBUTION = [
        // [gradeLevel, strand, dept, section, capacity]
        ['Nursery',     'N/A',   'Grade School',       'Nursery',                    25],
        ['Preparatory', 'N/A',   'Grade School',       'A',                          30],
        ['Preparatory', 'N/A',   'Grade School',       'PreKinder',                  25],
        ['Grade 7',     'N/A',   'Junior High School', 'St. Augustine',              50],
        ['Grade 7',     'N/A',   'Junior High School', 'St. Dominic',                50],
        ['Grade 7',     'N/A',   'Junior High School', 'St. Ignatius of Loyola',     50],
        ['Grade 7',     'N/A',   'Junior High School', 'St. Therese of Lisieux',     50],
        ['Grade 8',     'N/A',   'Junior High School', 'St. Joseph the Worker',      50],
        ['Grade 8',     'N/A',   'Junior High School', 'St. Jude Thaddeus',          50],
        ['Grade 8',     'N/A',   'Junior High School', 'St. Patricius',              50],
        ['Grade 9',     'N/A',   'Junior High School', 'St. Blaise',                 50],
        ['Grade 9',     'N/A',   'Junior High School', 'St. Thomas Aquinas',         50],
        ['Grade 10',    'N/A',   'Junior High School', 'St. Lorenzo Ruiz',           50],
        ['Grade 10',    'N/A',   'Junior High School', 'St. Sebastian',              50],
        ['Grade 10',    'N/A',   'Junior High School', 'St. Vincent Ferrer',         50],
        ['Grade 11',    'ABM',   'Senior High School', 'ST. ROSE OF LIMA',           50],
        ['Grade 11',    'HE',    'Senior High School', 'ST. EZEKIEL MORENO',         50],
        ['Grade 11',    'HUMSS', 'Senior High School', 'ST. JOHN PAUL',              50],
        ['Grade 11',    'ICT',   'Senior High School', 'ST. PEDRO CALUNGSOD',        50],
        ['Grade 11',    'STEM',  'Senior High School', 'ST. MARK',                   50],
        ['Grade 12',    'ABM',   'Senior High School', 'ST. ANNE MOTHER OF MARY',    50],
        ['Grade 12',    'HE',    'Senior High School', 'ST. FRANCIS OF ASSISI',      50],
        ['Grade 12',    'HUMSS', 'Senior High School', 'ST. ANTHONY DE PADUA',       50],
        ['Grade 12',    'ICT',   'Senior High School', 'St. Michael the Archangel',  50],
        ['Grade 12',    'STEM',  'Senior High School', 'St. Albert the Great',       50],
    ];

    // ── Grade-level → typical birth year offset from SY start ───────────────
    private const BIRTH_YEAR_OFFSET = [
        'Nursery'     =>  3,
        'Preparatory' =>  4,
        'Grade 7'     => 12,
        'Grade 8'     => 13,
        'Grade 9'     => 14,
        'Grade 10'    => 15,
        'Grade 11'    => 16,
        'Grade 12'    => 17,
    ];

    private int $lrnCounter = 0;
    private int $studentCounter = 0;
    private array $rng;

    // ── Entry point ──────────────────────────────────────────────────────────

    public function run(): void
    {
        // Seed the random state for reproducibility
        mt_srand(42);

        // Get max LRN / student_id already in DB so we don't collide
        $maxLrn = (int) DB::table('students')->max(DB::raw('CAST(lrn AS UNSIGNED)'));
        $this->lrnCounter = max($maxLrn, 202500000000);

        $maxStudId = DB::table('students')
            ->whereRaw("student_id REGEXP '^[A-Z]+-[0-9]+-[0-9]+$'")
            ->count();
        $this->studentCounter = max($maxStudId, 1000);

        $totalCreated = 0;
        $totalSkipped = 0;

        foreach (self::SCHOOL_YEARS as $syDef) {
            $sy     = $syDef['sy'];
            $target = $syDef['count'];
            $status = $syDef['status'];
            $syStart = (int) substr($sy, 0, 4);

            $this->command->info("  SY {$sy} — target {$target} students");

            // Skip if already seeded for this SY
            $existingCount = DB::table('students')->where('schoolYear', $sy)->count();
            if ($existingCount >= (int) ($target * 0.8)) {
                $this->command->line("    ⊘ SY {$sy} already seeded ({$existingCount} students), skipping.");
                $totalCreated += $existingCount;
                continue;
            }

            // Build ordered slot list to fill
            $slots = $this->buildSlots($target);
            $families = $this->buildFamilyGroups($slots);

            $studentsCreated = 0;
            $usersCreated    = 0;

            $batch = [];

            foreach ($families as $family) {
                $parentSuffix    = $this->randLastName();
                $guardianFname   = $this->randGuardianFirstName();
                $guardianContact = '09' . mt_rand(171, 999) . str_pad((string) mt_rand(0, 9999999), 7, '0', STR_PAD_LEFT);
                $guardianRelation = MockNames::$relations[mt_rand(0, count(MockNames::$relations) - 1)];
                $parentUsername  = 'parent_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $parentSuffix)) . '_' . mt_rand(1000, 9999);

                // Each family member is one slot from the distribution
                foreach ($family as $slot) {
                    [$gradeLevel, $strand, $dept, $section] = $slot;

                    $this->lrnCounter++;
                    $this->studentCounter++;
                    $lrn = (string) $this->lrnCounter;

                    // Skip if LRN already exists
                    if (DB::table('students')->where('lrn', $lrn)->exists()) {
                        $totalSkipped++;
                        continue;
                    }

                    $sex    = (mt_rand(0, 1) === 0) ? 'Male' : 'Female';
                    $fname  = ($sex === 'Male')
                        ? MockNames::$maleFirstNames[mt_rand(0, count(MockNames::$maleFirstNames) - 1)]
                        : MockNames::$femaleFirstNames[mt_rand(0, count(MockNames::$femaleFirstNames) - 1)];
                    $mname  = MockNames::$middleNames[mt_rand(0, count(MockNames::$middleNames) - 1)];

                    $offset    = self::BIRTH_YEAR_OFFSET[$gradeLevel] ?? 13;
                    $birthYear = $syStart - $offset;

                    // Class
                    $classId = ClassModel::where('gradeLevel', $gradeLevel)
                        ->where('strand', $strand)
                        ->where('section', $section)
                        ->where('schoolYear', $sy)
                        ->value('class_id') ?? 0;

                    $prefix = match ($dept) {
                        'Grade School'       => 'GS',
                        'Junior High School' => 'JHS',
                        'Senior High School' => 'SHS',
                        default              => 'ST',
                    };

                    $studentId = "{$prefix}-{$syStart}-" . str_pad((string) $this->studentCounter, 4, '0', STR_PAD_LEFT);

                    $appDate = $syStart . '-06-' . str_pad((string) mt_rand(1, 30), 2, '0', STR_PAD_LEFT);

                    $batch[] = [
                        'lrn'               => $lrn,
                        'esc_id'            => '0',
                        'student_id'        => $studentId,
                        'lname'             => strtoupper($parentSuffix),
                        'fname'             => $fname,
                        'mname'             => $mname,
                        'suffix'            => '',
                        'bdMM'              => str_pad((string) mt_rand(1, 12), 2, '0', STR_PAD_LEFT),
                        'bdDD'              => str_pad((string) mt_rand(1, 28), 2, '0', STR_PAD_LEFT),
                        'bdYYYY'            => (string) $birthYear,
                        'sex'               => $sex,
                        'age'               => $syStart - $birthYear,
                        'address_street'    => mt_rand(1, 999) . ' ' . MockNames::$streets[mt_rand(0, count(MockNames::$streets) - 1)],
                        'address_brgy'      => MockNames::$barangays[mt_rand(0, count(MockNames::$barangays) - 1)],
                        'address_city_mun'  => MockNames::$cities[mt_rand(0, count(MockNames::$cities) - 1)],
                        'address_province'  => MockNames::$provinces[mt_rand(0, count(MockNames::$provinces) - 1)],
                        'guardian_lname'    => $parentSuffix,
                        'guardian_fname'    => $guardianFname,
                        'guardian_contact'  => $guardianContact,
                        'guardian_relation' => $guardianRelation,
                        'g_address_street'  => null,
                        'g_address_brgy'    => null,
                        'g_address_city_mun' => null,
                        'g_address_province' => null,
                        'last_school'       => MockNames::$prevSchools[mt_rand(0, count(MockNames::$prevSchools) - 1)],
                        'last_school_sy'    => ($syStart - 1) . '-' . $syStart,
                        'last_school_type'  => (mt_rand(0, 1) === 0) ? 'Private' : 'Public',
                        'gen_average'       => mt_rand(80, 98),
                        'class_id'          => $classId,
                        'dept'              => $dept,
                        'gradeLevel'        => $gradeLevel,
                        'strand'            => $strand,
                        'major'             => 'N/A',
                        'section'           => $section,
                        'classification'    => (mt_rand(0, 2) === 0) ? 'Old' : 'New',
                        'schoolYear'        => $sy,
                        'sem'               => '1st Semester',
                        'appDate'           => $appDate,
                        'appTime'           => '08:00 AM',
                        'assessment_id'     => 0,
                        'status'            => $status,
                        'remarks'           => null,
                        'stat_date'         => $appDate,
                        'prev_sy_reg_id'    => 0,
                        'public_id'         => Str::random(20),
                        'created_at'        => now(),
                        'updated_at'        => now(),
                    ];

                    $studentsCreated++;

                    // Flush chunk
                    if (count($batch) >= self::CHUNK_SIZE) {
                        DB::table('students')->insert($batch);
                        $batch = [];
                    }
                }
            }

            // Insert remaining
            if (!empty($batch)) {
                DB::table('students')->insert($batch);
                $batch = [];
            }

            $this->command->line("    ✓ Inserted {$studentsCreated} students for SY {$sy}");
            $totalCreated += $studentsCreated;
        }

        $this->command->line("  Total students created: {$totalCreated} (skipped duplicates: {$totalSkipped})");

        // Now create student + parent portal accounts for active SY only
        $this->command->info("  Creating portal accounts (SY 2025-2026)…");
        $this->seedPortalAccounts('2025-2026');
        $this->command->line("  ✓ Portal accounts created.");
    }

    // ── Build ordered slots filling up to $target students ──────────────────

    private function buildSlots(int $target): array
    {
        $slots = [];
        $remaining = $target;

        // Cycle through distribution until we fill the target
        while ($remaining > 0) {
            foreach (self::DISTRIBUTION as $row) {
                [$gradeLevel, $strand, $dept, $section, $capacity] = $row;
                $fill = min($capacity, $remaining);
                for ($i = 0; $i < $fill; $i++) {
                    $slots[] = [$gradeLevel, $strand, $dept, $section];
                }
                $remaining -= $fill;
                if ($remaining <= 0) break;
            }
        }

        return $slots;
    }

    // ── Group slots into family units ────────────────────────────────────────
    // Result: array of arrays, each inner array = siblings (1-4 slots)

    private function buildFamilyGroups(array $slots): array
    {
        shuffle($slots);
        $families = [];
        $i = 0;
        $total = count($slots);

        while ($i < $total) {
            $rand = mt_rand(1, 100);
            if ($rand <= 3 && ($i + 3) < $total) {
                // 4-sibling family (3% chance)
                $families[] = [$slots[$i], $slots[$i + 1], $slots[$i + 2], $slots[$i + 3]];
                $i += 4;
            } elseif ($rand <= 11 && ($i + 2) < $total) {
                // 3-sibling family (8% chance)
                $families[] = [$slots[$i], $slots[$i + 1], $slots[$i + 2]];
                $i += 3;
            } elseif ($rand <= 26 && ($i + 1) < $total) {
                // 2-sibling family (15% chance)
                $families[] = [$slots[$i], $slots[$i + 1]];
                $i += 2;
            } else {
                // Single student (74% chance)
                $families[] = [$slots[$i]];
                $i++;
            }
        }

        return $families;
    }

    // ── Create portal accounts for SY 2025-2026 students ────────────────────

    private function seedPortalAccounts(string $sy): void
    {
        $defaultPassword = Hash::make('Student123!');
        $parentPassword  = Hash::make('Parent123!');

        // Track parent username -> user_id to avoid duplicate parent accounts per family
        $parentAccounts = []; // key: "guardian_lname|guardian_fname|guardian_contact", value: user->id

        $students = DB::table('students')
            ->where('schoolYear', $sy)
            ->orderBy('reg_id')
            ->select(['reg_id', 'student_id', 'lname', 'fname', 'mname',
                       'guardian_lname', 'guardian_fname', 'guardian_contact', 'guardian_relation'])
            ->cursor();

        $studentBatch = [];
        $parentStudentBatch = [];

        foreach ($students as $s) {
            $username = 's_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $s->lname))
                      . '_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $s->fname))
                      . '_' . substr($s->student_id, -4);

            // Avoid duplicates
            if (!DB::table('users')->where('username', $username)->exists()) {
                $userId = DB::table('users')->insertGetId([
                    'username'   => $username,
                    'password'   => $defaultPassword,
                    'fname'      => $s->fname,
                    'lname'      => $s->lname,
                    'email'      => strtolower($username) . '@student.svhs.edu.ph',
                    'access'     => 'Student',
                    'department' => 'Student',
                    'status'     => 'Active',
                    'reg_id'     => $s->reg_id,
                    'public_id'  => Str::random(20),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                $userId = DB::table('users')->where('username', $username)->value('id');
            }

            // Parent account
            $parentKey = $s->guardian_lname . '|' . $s->guardian_fname . '|' . $s->guardian_contact;

            if (!isset($parentAccounts[$parentKey])) {
                $parentUsername = 'p_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $s->guardian_lname))
                                . '_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $s->guardian_fname))
                                . '_' . substr(md5($s->guardian_contact), 0, 6);

                if (!DB::table('users')->where('username', $parentUsername)->exists()) {
                    $parentId = DB::table('users')->insertGetId([
                        'username'   => $parentUsername,
                        'password'   => $parentPassword,
                        'fname'      => $s->guardian_fname,
                        'lname'      => $s->guardian_lname,
                        'email'      => strtolower($parentUsername) . '@parent.svhs.edu.ph',
                        'access'     => 'Parent',
                        'department' => 'Parent',
                        'status'     => 'Active',
                        'public_id'  => Str::random(20),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    $parentId = DB::table('users')->where('username', $parentUsername)->value('id');
                }

                $parentAccounts[$parentKey] = $parentId;
            }

            $parentId = $parentAccounts[$parentKey];

            // parent_students link
            if (!DB::table('parent_students')->where('user_id', $parentId)->where('reg_id', $s->reg_id)->exists()) {
                $parentStudentBatch[] = ['user_id' => $parentId, 'reg_id' => $s->reg_id];
            }

            if (count($parentStudentBatch) >= self::CHUNK_SIZE) {
                DB::table('parent_students')->insert($parentStudentBatch);
                $parentStudentBatch = [];
            }
        }

        if (!empty($parentStudentBatch)) {
            DB::table('parent_students')->insert($parentStudentBatch);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function randLastName(): string
    {
        return MockNames::$lastNames[mt_rand(0, count(MockNames::$lastNames) - 1)];
    }

    private function randGuardianFirstName(): string
    {
        // Guardians are adults — pick from both lists
        $all = array_merge(MockNames::$maleFirstNames, MockNames::$femaleFirstNames);
        return $all[mt_rand(0, count($all) - 1)];
    }
}
