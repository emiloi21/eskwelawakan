<?php

namespace Database\Seeders;

use App\Models\AccountsAssessment;
use App\Models\AccountsCategory;
use App\Models\AccountsCatParticular;
use App\Models\AccountsParticular;
use App\Models\AssessmentPayable;
use App\Models\ChartOfAccount;
use App\Models\ClassModel;
use App\Models\FacultyStaff;
use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
/**
 * TestDataSeeder
 *
 * Seeds comprehensive test data covering all major modules:
 *
 *  Teachers (portal)
 *  ─────────────────
 *  - 3 FacultyStaff records + Teacher portal accounts
 *    user: teacher_santos / teacher_reyes / teacher_gonzales  pw: Teacher123!
 *
 *  Students (14 across 7 grade levels, 2 per level)
 *  ─────────────────────────────────────────────────
 *  Grade: Preparatory | Grade 7 | Grade 8 | Grade 9 | Grade 10 | Grade 11 STEM | Grade 12 ABM
 *  Sibling families for parent portal testing:
 *    - Reyes family: Miguel (Gr 7) + Patricia (Gr 9)
 *    - Cruz  family: Juan Antonio (Gr 11 STEM) + Diana (Gr 12 ABM)
 *  Student portal: stud_<name>  pw: Student123!
 *
 *  Parents / Guardians (12 accounts, 2 with multiple children)
 *  ────────────────────────────────────────────────────────────
 *  parent_reyes  → Miguel + Patricia  (sibling test)
 *  parent_cruz   → Juan Antonio + Diana (sibling test)
 *  Others: 1 child each
 *  pw: varies (see CREDENTIALS section at top of run())
 *
 *  Assessments (all grade levels via legacy particulars)
 *  ─────────────────────────────────────────────────────
 *  Creates AccountsAssessment + AccountsCategory + AccountsCatParticular
 *  + AssessmentPayable for every grade/strand that has accounts_particulars.
 *  Also assigns StudentAssessment rows to each student (mirrors enrollment flow).
 *
 *  Prerequisites (auto-called if missing):
 *    SystemChartOfAccountsSeeder → ChartOfAccountsSeeder
 *    → ClassesFromLegacySeeder
 *    → ParticularsFromLegacySeeder
 *
 *  Idempotent: all inserts are guarded by exists() checks.
 */
class TestDataSeeder extends Seeder
{
    private const SY       = '2025-2026';
    private const SEM      = '1st Semester';
    private const APP_DATE = '2025-06-15';
    private const APP_TIME = '08:00 AM';

    // ── Entry point ───────────────────────────────────────────────────────────

    public function run(): void
    {
        /*
         * ╔══════════════════════════════════════════════════════╗
         * ║  TEST ACCOUNT CREDENTIALS                           ║
         * ╠══════════════════════════════════════════════════════╣
         * ║  TEACHERS                                           ║
         * ║  teacher_santos    / Teacher123!                    ║
         * ║  teacher_reyes     / Teacher123!                    ║
         * ║  teacher_gonzales  / Teacher123!                    ║
         * ╠══════════════════════════════════════════════════════╣
         * ║  STUDENTS (password: Student123!)                   ║
         * ║  stud_aguilar_luis     (Preparatory)                ║
         * ║  stud_bautista_sofia   (Preparatory)                ║
         * ║  stud_reyes_miguel     (Grade 7)                    ║
         * ║  stud_torres_andrea    (Grade 7)                    ║
         * ║  stud_villanueva_jose  (Grade 8)                    ║
         * ║  stud_mendoza_clara    (Grade 8)                    ║
         * ║  stud_reyes_patricia   (Grade 9)                    ║
         * ║  stud_espinosa_mark    (Grade 9)                    ║
         * ║  stud_navarro_isabella (Grade 10)                   ║
         * ║  stud_garcia_luis      (Grade 10)                   ║
         * ║  stud_cruz_juan        (Grade 11 STEM)              ║
         * ║  stud_flores_cristina  (Grade 11 STEM)              ║
         * ║  stud_cruz_diana       (Grade 12 ABM)               ║
         * ║  stud_delacruz_carlo   (Grade 12 ABM)               ║
         * ╠══════════════════════════════════════════════════════╣
         * ║  PARENTS / GUARDIANS                                ║
         * ║  parent_aguilar    / Parent123!  (1 child)          ║
         * ║  parent_bautista   / Parent123!  (1 child)          ║
         * ║  parent_reyes      / Parent123!  (2 children) ★     ║
         * ║  parent_torres     / Parent123!  (1 child)          ║
         * ║  parent_villanueva / Parent123!  (1 child)          ║
         * ║  parent_mendoza    / Parent123!  (1 child)          ║
         * ║  parent_espinosa   / Parent123!  (1 child)          ║
         * ║  parent_navarro    / Parent123!  (1 child)          ║
         * ║  parent_garcia     / Parent123!  (1 child)          ║
         * ║  parent_cruz       / Parent123!  (2 children) ★     ║
         * ║  parent_flores     / Parent123!  (1 child)          ║
         * ║  parent_delacruz   / Parent123!  (1 child)          ║
         * ║  ★ = sibling test account                           ║
         * ╚══════════════════════════════════════════════════════╝
         */

        $this->command->newLine();
        $this->command->info('═══ TestDataSeeder ═══════════════════════════════════');

        $this->ensureDependencies();

        $this->command->newLine();
        $this->command->info('── Teachers ──────────────────────────────────────────');
        $this->seedTeachers();

        $this->command->newLine();
        $this->command->info('── Assessments ───────────────────────────────────────');
        $this->seedAssessments();

        $this->command->newLine();
        $this->command->info('── Students & Portal Accounts ────────────────────────');
        $createdStudents = $this->seedStudents();
        $this->seedStudentPortalAccounts($createdStudents);
        $this->seedParentPortalAccounts($createdStudents);

        $this->command->newLine();
        $this->command->info('── HRMS ──────────────────────────────────────────────');
        $this->call(HrmsSeeder::class);

        $this->command->newLine();
        $this->command->info('── Payroll ───────────────────────────────────────────');
        $this->call(PayrollSeeder::class);

        $this->command->newLine();
        $this->command->info('═══ TestDataSeeder: complete ══════════════════════════');
        $this->command->newLine();
    }

    // ── 1. Ensure prerequisite seeders have been run ──────────────────────────

    private function ensureDependencies(): void
    {
        $this->command->info('── Prerequisites ─────────────────────────────────────');

        if (!ChartOfAccount::exists()) {
            $this->command->info('  Running SystemChartOfAccountsSeeder…');
            $this->call(SystemChartOfAccountsSeeder::class);
            $this->command->info('  Running ChartOfAccountsSeeder…');
            $this->call(ChartOfAccountsSeeder::class);
        } else {
            $this->command->line('  ✓ Chart of Accounts already seeded');
        }

        if (ClassModel::where('schoolYear', self::SY)->count() < 5) {
            $this->command->info('  Running ClassesFromLegacySeeder…');
            $this->call(ClassesFromLegacySeeder::class);
        } else {
            $this->command->line('  ✓ Classes already seeded');
        }

        if (AccountsParticular::where('schoolYear', self::SY)->count() < 10) {
            $this->command->info('  Running ParticularsFromLegacySeeder…');
            $this->call(ParticularsFromLegacySeeder::class);
        } else {
            $this->command->line('  ✓ Particulars already seeded');
        }
    }

    // ── 2. Teachers ───────────────────────────────────────────────────────────

    private function seedTeachers(): void
    {
        $definitions = [
            [
                'fullname'       => 'Santos, Maria Lourdes',
                'classification' => 'Teaching',
                'username'       => 'teacher_santos',
                'fname'          => 'Maria Lourdes',
                'lname'          => 'Santos',
                'email'          => 'ma.santos@svhs.edu.ph',
            ],
            [
                'fullname'       => 'Reyes, Carlos Manuel',
                'classification' => 'Teaching',
                'username'       => 'teacher_reyes',
                'fname'          => 'Carlos Manuel',
                'lname'          => 'Reyes',
                'email'          => 'c.reyes@svhs.edu.ph',
            ],
            [
                'fullname'       => 'Gonzales, Ana Ma.',
                'classification' => 'Teaching',
                'username'       => 'teacher_gonzales',
                'fname'          => 'Ana Ma.',
                'lname'          => 'Gonzales',
                'email'          => 'a.gonzales@svhs.edu.ph',
            ],
        ];

        foreach ($definitions as $def) {
            $fs = FacultyStaff::firstOrCreate(
                ['fullname' => $def['fullname']],
                ['classification' => $def['classification'], 'description' => '']
            );

            if (User::where('username', $def['username'])->exists()) {
                $this->command->line("  ⊘ Teacher portal exists: {$def['username']}");
                continue;
            }

            User::create([
                'access'       => 'Teacher',
                'username'     => $def['username'],
                'password'     => Hash::make('Teacher123!'),
                'fname'        => $def['fname'],
                'lname'        => $def['lname'],
                'email'        => $def['email'],
                'personnel_id' => $fs->personnel_id,
                'status'       => 'Active',
            ]);

            $this->command->info("  + teacher portal: {$def['username']} → {$def['fullname']}");
        }
    }

    // ── 3. Assessments (all grade levels) ─────────────────────────────────────

    private function seedAssessments(): void
    {
        // All grade/strand combinations that have particulars in the DB
        $defs = [
            // Grade School
            ['Prekinder',   'N/A',   'Grade School',       'Grade School Prekinder Assessment'],
            ['Preparatory', 'N/A',   'Grade School',       'Grade School Preparatory Assessment'],
            // Junior High School
            ['Grade 7',     'N/A',   'Junior High School', 'JHS Grade 7 Assessment'],
            ['Grade 8',     'N/A',   'Junior High School', 'JHS Grade 8 Assessment'],
            ['Grade 9',     'N/A',   'Junior High School', 'JHS Grade 9 Assessment'],
            ['Grade 10',    'N/A',   'Junior High School', 'JHS Grade 10 Assessment'],
            // Senior High School — one per grade × strand
            ['Grade 11',    'ABM',   'Senior High School', 'SHS Grade 11 ABM Assessment'],
            ['Grade 11',    'HE',    'Senior High School', 'SHS Grade 11 HE Assessment'],
            ['Grade 11',    'HUMSS', 'Senior High School', 'SHS Grade 11 HUMSS Assessment'],
            ['Grade 11',    'ICT',   'Senior High School', 'SHS Grade 11 ICT Assessment'],
            ['Grade 11',    'STEM',  'Senior High School', 'SHS Grade 11 STEM Assessment'],
            ['Grade 12',    'ABM',   'Senior High School', 'SHS Grade 12 ABM Assessment'],
            ['Grade 12',    'HE',    'Senior High School', 'SHS Grade 12 HE Assessment'],
            ['Grade 12',    'HUMSS', 'Senior High School', 'SHS Grade 12 HUMSS Assessment'],
            ['Grade 12',    'ICT',   'Senior High School', 'SHS Grade 12 ICT Assessment'],
            ['Grade 12',    'STEM',  'Senior High School', 'SHS Grade 12 STEM Assessment'],
        ];

        foreach ($defs as [$grade, $strand, $dept, $desc]) {
            $this->buildAssessment($grade, $strand, $dept, $desc);
        }
    }

    /**
     * Build one assessment from the accounts_particulars already seeded by
     * ParticularsFromLegacySeeder.  Groups particulars by account_group so each
     * group becomes one AccountsCategory, mirroring how the UI sets them up.
     */
    private function buildAssessment(
        string $gradeLevel, string $strand, string $dept, string $description
    ): void {
        // Already exists? — skip entirely
        if (AccountsAssessment::where('gradeLevel', $gradeLevel)
            ->where('strand', $strand)
            ->where('schoolYear', self::SY)
            ->exists()) {
            $this->command->line("  ⊘ Assessment exists: {$gradeLevel} {$strand}");
            return;
        }

        // Pull relevant particulars from the legacy seeder
        $particulars = AccountsParticular::where('gradeLevel', $gradeLevel)
            ->where('strand', $strand)
            ->where('schoolYear', self::SY)
            ->where('status', 'Active')
            ->get();

        if ($particulars->isEmpty()) {
            $this->command->warn("  ⊘ No particulars found for {$gradeLevel} {$strand} — skipping.");
            return;
        }

        DB::transaction(function () use (
            $gradeLevel, $strand, $dept, $description, $particulars
        ) {
            // Create the assessment header
            $assessment = AccountsAssessment::create([
                'dept'        => $dept,
                'gradeLevel'  => $gradeLevel,
                'strand'      => $strand,
                'major'       => 'N/A',
                'schoolYear'  => self::SY,
                'coverage'    => 'Full Year',
                'description' => $description,
            ]);

            $assessmentTotal = 0;

            // Group particulars by account_group → one category per group
            foreach ($particulars->groupBy('account_group') as $groupName => $groupParticulars) {
                $groupTotal = $groupParticulars->sum(fn($p) => (float) $p->amount);

                $category = AccountsCategory::create([
                    'gradeLevel'  => $gradeLevel,
                    'strand'      => $strand,
                    'major'       => 'N/A',
                    'schoolYear'  => self::SY,
                    'semester'    => self::SEM,
                    'description' => $groupName,
                    'totalAmount' => $groupTotal,
                ]);

                // Link each particular to the category
                // Tuition Fee and Standard Fees are paid monthly; others are full/upon enrollment
                $ptermId = in_array($groupName, ['Tuition Fee', 'Standard Fees']) ? 2 : 1;
                foreach ($groupParticulars as $particular) {
                    AccountsCatParticular::create([
                        'category_id'   => $category->category_id,
                        'particular_id' => $particular->particular_id,
                        'account_group' => $particular->account_group,
                        'account_code'  => $particular->account_code,
                        'description'   => $particular->description,
                        'amount'        => $particular->amount,
                        'status'        => 'Active',
                        'paymentTerm'   => $ptermId,
                        'schoolYear'    => self::SY,
                        'semester'      => self::SEM,
                    ]);
                }

                // Link category to assessment via AssessmentPayable
                AssessmentPayable::create([
                    'assessment_id'     => $assessment->assessment_id,
                    'category_id'       => $category->category_id,
                    'total_amt_payable' => $groupTotal,
                    'schoolYear'        => self::SY,
                ]);

                $assessmentTotal += $groupTotal;
            }

            $this->command->info(sprintf(
                '  + Assessment: %-20s %-8s  ₱%s',
                $gradeLevel, $strand, number_format($assessmentTotal, 2)
            ));
        });
    }

    // ── 4. Students ───────────────────────────────────────────────────────────

    /**
     * Returns an array keyed by index (0–13) with the Student model instances
     * so portal-account seeders can reference reg_id by index.
     *
     * Sibling pairs:
     *   [2] REYES, Miguel   (Grade 7)      ┐ parent_reyes
     *   [6] REYES, Patricia (Grade 9)      ┘
     *
     *   [10] CRUZ, Juan Antonio (Grade 11 STEM) ┐ parent_cruz
     *   [12] CRUZ, Diana        (Grade 12 ABM)  ┘
     */
    private function seedStudents(): array
    {
        /*
         * Columns: lrn, student_id, lname, fname, mname, sex, birth_year,
         *          gradeLevel, strand, dept, section,
         *          guardian_fname, guardian_lname, guardian_contact, guardian_relation
         */
        $definitions = [
            // ── Preparatory ────────────────────────────────
            ['202501000001', 'GS-2025-0001',  'AGUILAR',    'Luis',           'Marcos',   'Male',   '2020',
             'Preparatory', 'N/A',   'Grade School',       'A',
             'Marcos', 'Aguilar',    '09171000001', 'Father'],

            ['202501000002', 'GS-2025-0002',  'BAUTISTA',   'Sofia',          'Marie',    'Female', '2020',
             'Preparatory', 'N/A',   'Grade School',       'A',
             'Elena',  'Bautista',   '09171000002', 'Mother'],

            // ── Grade 7 ─────────────────────────────────── Reyes sibling #1
            ['202501000003', 'JHS-2025-0001', 'REYES',      'Miguel',         'Antonio',  'Male',   '2013',
             'Grade 7',  'N/A', 'Junior High School', 'St. Augustine',
             'Manuel', 'Reyes',      '09171000003', 'Father'],

            ['202501000004', 'JHS-2025-0002', 'TORRES',     'Andrea',         'Lim',      'Female', '2013',
             'Grade 7',  'N/A', 'Junior High School', 'St. Augustine',
             'Nelly',  'Torres',     '09171000004', 'Mother'],

            // ── Grade 8 ──────────────────────────────────────────────────────
            ['202501000005', 'JHS-2025-0003', 'VILLANUEVA', 'Jose',           'Antonio',  'Male',   '2012',
             'Grade 8',  'N/A', 'Junior High School', 'St. Joseph the Worker',
             'Fernando', 'Villanueva', '09171000005', 'Father'],

            ['202501000006', 'JHS-2025-0004', 'MENDOZA',    'Clara',          'Rosa',     'Female', '2012',
             'Grade 8',  'N/A', 'Junior High School', 'St. Joseph the Worker',
             'Rosa',   'Mendoza',    '09171000006', 'Mother'],

            // ── Grade 9 ─────────────────────────────────── Reyes sibling #2
            ['202501000007', 'JHS-2025-0005', 'REYES',      'Patricia',       'Antonio',  'Female', '2011',
             'Grade 9',  'N/A', 'Junior High School', 'St. Blaise',
             'Manuel', 'Reyes',      '09171000003', 'Father'],

            ['202501000008', 'JHS-2025-0006', 'ESPINOSA',   'Mark',           'Jose',     'Male',   '2011',
             'Grade 9',  'N/A', 'Junior High School', 'St. Blaise',
             'Pedro',  'Espinosa',   '09171000008', 'Father'],

            // ── Grade 10 ─────────────────────────────────────────────────────
            ['202501000009', 'JHS-2025-0007', 'NAVARRO',    'Isabella',       'Garcia',   'Female', '2010',
             'Grade 10', 'N/A', 'Junior High School', 'St. Lorenzo Ruiz',
             'Carmen', 'Navarro',    '09171000009', 'Mother'],

            ['202501000010', 'JHS-2025-0008', 'GARCIA',     'Luis',           'Ramon',    'Male',   '2010',
             'Grade 10', 'N/A', 'Junior High School', 'St. Lorenzo Ruiz',
             'Roberto', 'Garcia',   '09171000010', 'Father'],

            // ── Grade 11 STEM ────────────────────────────── Cruz sibling #1
            ['202501000011', 'SHS-2025-0002', 'CRUZ',       'Juan Antonio',   'Miguel',   'Male',   '2009',
             'Grade 11', 'STEM', 'Senior High School', 'ST. MARK',
             'Jose',   'Cruz',       '09171000011', 'Father'],

            ['202501000012', 'SHS-2025-0003', 'FLORES',     'Maria Cristina', 'Liza',     'Female', '2009',
             'Grade 11', 'STEM', 'Senior High School', 'ST. MARK',
             'Ricardo', 'Flores',   '09171000012', 'Father'],

            // ── Grade 12 ABM ─────────────────────────────── Cruz sibling #2
            ['202501000013', 'SHS-2025-0004', 'CRUZ',       'Diana',          'Miguel',   'Female', '2008',
             'Grade 12', 'ABM',  'Senior High School', 'ST. ANNE MOTHER OF MARY',
             'Jose',   'Cruz',       '09171000011', 'Father'],

            ['202501000014', 'SHS-2025-0005', 'DELA CRUZ',  'Carlo',          'Santos',   'Male',   '2008',
             'Grade 12', 'ABM',  'Senior High School', 'ST. ANNE MOTHER OF MARY',
             'Pedro',  'Dela Cruz',  '09171000014', 'Father'],
        ];

        $created = [];

        foreach ($definitions as $idx => $row) {
            [
                $lrn, $studentId, $lname, $fname, $mname, $sex, $birthYear,
                $gradeLevel, $strand, $dept, $section,
                $guardianFname, $guardianLname, $guardianContact, $guardianRelation,
            ] = $row;

            // Idempotent: return existing record
            if ($existing = Student::where('lrn', $lrn)->first()) {
                $this->command->line("  ⊘ Student exists: {$lname}, {$fname}");
                $created[$idx] = $existing;
                continue;
            }

            $class = ClassModel::where('gradeLevel', $gradeLevel)
                ->where('strand', $strand)
                ->where('section', $section)
                ->where('schoolYear', self::SY)
                ->first();

            $assessment = AccountsAssessment::where('gradeLevel', $gradeLevel)
                ->where('strand', $strand)
                ->where('schoolYear', self::SY)
                ->first();

            $age = (2025 - (int) $birthYear);

            $student = Student::create([
                'lrn'               => $lrn,
                'student_id'        => $studentId,
                'lname'             => $lname,
                'fname'             => $fname,
                'mname'             => $mname,
                'suffix'            => '',
                'bdMM'              => '06',
                'bdDD'              => '15',
                'bdYYYY'            => $birthYear,
                'sex'               => $sex,
                'age'               => $age,
                'address_street'    => '123 Test Street',
                'address_brgy'      => 'Brgy. San Vicente',
                'address_city_mun'  => 'Victoria',
                'address_province'  => 'Laguna',
                'guardian_lname'    => $guardianLname,
                'guardian_fname'    => $guardianFname,
                'guardian_contact'  => $guardianContact,
                'guardian_relation' => $guardianRelation,
                'last_school'       => 'SVHS Test School',
                'last_school_sy'    => '2024-2025',
                'last_school_type'  => 'Private',
                'class_id'          => $class?->class_id ?? 0,
                'dept'              => $dept,
                'gradeLevel'        => $gradeLevel,
                'strand'            => $strand,
                'section'           => $section,
                'classification'    => 'New',
                'schoolYear'        => self::SY,
                'sem'               => self::SEM,
                'appDate'           => self::APP_DATE,
                'appTime'           => self::APP_TIME,
                'assessment_id'     => $assessment?->assessment_id ?? 0,
                'status'            => 'Enrolled',
            ]);

            // Assign assessment → creates StudentAssessment line items
            if ($assessment) {
                $this->assignAssessment($student, $assessment->assessment_id);
            }

            $this->command->info(sprintf(
                '  + Student %-15s %-20s %s %s',
                $studentId, $lname . ', ' . $fname, $gradeLevel, $strand !== 'N/A' ? "({$strand})" : ''
            ));

            $created[$idx] = $student;
        }

        return $created;
    }

    // ── 5. Student portal accounts ────────────────────────────────────────────

    /** @param array<int, Student|null> $students */
    private function seedStudentPortalAccounts(array $students): void
    {
        $usernames = [
            0  => 'stud_aguilar_luis',
            1  => 'stud_bautista_sofia',
            2  => 'stud_reyes_miguel',
            3  => 'stud_torres_andrea',
            4  => 'stud_villanueva_jose',
            5  => 'stud_mendoza_clara',
            6  => 'stud_reyes_patricia',
            7  => 'stud_espinosa_mark',
            8  => 'stud_navarro_isabella',
            9  => 'stud_garcia_luis',
            10 => 'stud_cruz_juan',
            11 => 'stud_flores_cristina',
            12 => 'stud_cruz_diana',
            13 => 'stud_delacruz_carlo',
        ];

        foreach ($students as $idx => $student) {
            if (!$student) {
                continue;
            }

            $username = $usernames[$idx] ?? ('stud_' . strtolower(str_replace(' ', '_', $student->lname)));

            // Guard: one portal per student record
            if (User::where('username', $username)->exists()
                || User::where('reg_id', $student->reg_id)->exists()) {
                $this->command->line("  ⊘ Student portal exists: {$username}");
                continue;
            }

            $email = strtolower(
                str_replace(' ', '', $student->fname) . '.' .
                str_replace(' ', '', $student->lname)
            ) . '@test.svhs.edu.ph';

            User::create([
                'access'   => 'Student',
                'username' => $username,
                'password' => Hash::make('Student123!'),
                'fname'    => $student->fname,
                'mname'    => $student->mname,
                'lname'    => $student->lname,
                'email'    => $email,
                'reg_id'   => $student->reg_id,
                'status'   => 'Active',
            ]);

            $this->command->info("  + Student portal: {$username}");
        }
    }

    // ── 6. Parent / guardian portal accounts ─────────────────────────────────

    /** @param array<int, Student|null> $students */
    private function seedParentPortalAccounts(array $students): void
    {
        /*
         * [username, fname, lname, [child_student_indices...]]
         *
         * ★ Sibling families:
         *   parent_reyes → indices [2, 6]  = Miguel (Gr 7) + Patricia (Gr 9)
         *   parent_cruz  → indices [10, 12] = Juan (Gr 11 STEM) + Diana (Gr 12 ABM)
         */
        $definitions = [
            ['parent_aguilar',    'Marcos',    'Aguilar',    [0]],
            ['parent_bautista',   'Elena',     'Bautista',   [1]],
            ['parent_reyes',      'Manuel',    'Reyes',      [2, 6]],   // ★ siblings
            ['parent_torres',     'Nelly',     'Torres',     [3]],
            ['parent_villanueva', 'Fernando',  'Villanueva', [4]],
            ['parent_mendoza',    'Rosa',      'Mendoza',    [5]],
            ['parent_espinosa',   'Pedro',     'Espinosa',   [7]],
            ['parent_navarro',    'Carmen',    'Navarro',    [8]],
            ['parent_garcia',     'Roberto',   'Garcia',     [9]],
            ['parent_cruz',       'Jose',      'Cruz',       [10, 12]], // ★ siblings
            ['parent_flores',     'Ricardo',   'Flores',     [11]],
            ['parent_delacruz',   'Pedro',     'Dela Cruz',  [13]],
        ];

        foreach ($definitions as [$username, $fname, $lname, $childIndices]) {
            if (User::where('username', $username)->exists()) {
                $this->command->line("  ⊘ Parent portal exists: {$username}");
                continue;
            }

            $childRegIds = array_values(array_filter(
                array_map(fn($i) => $students[$i]?->reg_id ?? null, $childIndices)
            ));

            if (empty($childRegIds)) {
                $this->command->warn("  ⊘ No children found for {$username} — skipped.");
                continue;
            }

            $user = User::create([
                'access'   => 'Parent',
                'username' => $username,
                'password' => Hash::make('Parent123!'),
                'fname'    => $fname,
                'lname'    => $lname,
                'email'    => strtolower($fname . '.' . str_replace(' ', '', $lname)) . '@guardian.test',
                'status'   => 'Active',
            ]);

            DB::table('parent_students')->insert(
                array_map(fn($rid) => ['user_id' => $user->id, 'reg_id' => $rid], $childRegIds)
            );

            $n = count($childRegIds);
            $sibling = $n > 1 ? ' ★ sibling' : '';
            $this->command->info("  + Parent portal: {$username} ({$n} child" . ($n > 1 ? 'ren' : '') . "{$sibling})");
        }
    }

    // ── Assign assessment items to a student (mirrors EnrollmentController) ───

    private function assignAssessment(Student $student, int $assessmentId): void
    {
        $payables = AssessmentPayable::where('assessment_id', $assessmentId)->get();

        foreach ($payables as $payable) {
            $catParticulars = AccountsCatParticular::where('category_id', $payable->category_id)->get();

            foreach ($catParticulars as $cp) {
                $exists = StudentAssessment::where('reg_id', $student->reg_id)
                    ->where('assessment_id', $assessmentId)
                    ->where('category_id', $payable->category_id)
                    ->where('particular_id', $cp->particular_id)
                    ->exists();

                if ($exists) {
                    continue;
                }

                StudentAssessment::create([
                    'reg_id'             => $student->reg_id,
                    'assessment_id'      => $assessmentId,
                    'category_id'        => $payable->category_id,
                    'particular_id'      => $cp->particular_id,
                    'par_stat'           => 'Active',
                    'total_amt_payable'  => $cp->amount,
                    'total_amt_discount' => 0,
                    'total_amt_paid'     => 0,
                    'total_amt_debit'    => 0,
                    'total_amt_credit'   => 0,
                    'total_amt_bal'      => $cp->amount,
                    'schoolYear'         => $student->schoolYear,
                ]);
            }
        }
    }
}
