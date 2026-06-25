<?php

namespace App\Http\Controllers\Registrar;

use App\Http\Controllers\Controller;
use App\Mail\EnrollmentStatusUpdatedMail;
use App\Notifications\EnrollmentStatusChanged;
use App\Models\AccountsAssessment;
use App\Models\AccountsCatParticular;
use App\Models\AssessmentPayable;
use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\IdcodeGen;
use App\Models\User;
use App\Services\CacheService;
use App\Services\GlJournalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EnrollmentController extends Controller
{
    /**
     * Enrollment pipeline overview grouped by status.
     */
    public function pipeline(Request $request): JsonResponse
    {
        $sy = $request->query('schoolYear');
        $dept = $request->query('dept');

        $query = Student::query();
        if ($sy) $query->where('schoolYear', $sy);
        if ($dept) $query->where('dept', $dept);

        $pipeline = $query->selectRaw('status, dept, count(*) as count')
            ->groupBy('status', 'dept')
            ->get()
            ->groupBy('status')
            ->map(fn ($group) => [
                'total' => $group->sum('count'),
                'by_dept' => $group->pluck('count', 'dept'),
            ]);

        return response()->json(['data' => $pipeline]);
    }

    /**
     * Transition a student's enrollment status.
     * Valid transitions:
     *   For Accounts Assessment → For Payment
     *   For Payment → Enrolled
     *   Any → Withdrawn, Transferred Out, Dropped
     */
    public function transition(Request $request, string $regId): JsonResponse
    {
        $validated = $request->validate([
            'status'        => ['required', 'string', 'in:Pending,For Application Assessment,For Accounts Assessment,For Payment,Enrolled,Withdrawn,Transferred Out,Dropped'],
            'remarks'       => ['nullable', 'string', 'max:190'],
            'assessment_id' => ['nullable', 'integer', 'exists:accounts_assessments,assessment_id'],
        ]);

        $student = Student::findByPublicIdOrFail($regId);
        /** @var Student $student */
        $currentStatus = $student->status;
        $newStatus = $validated['status'];

        // Validate transition rules
        $allowed = $this->getAllowedTransitions($currentStatus);
        if (!in_array($newStatus, $allowed)) {
            return response()->json([
                'message' => "Cannot transition from \"{$currentStatus}\" to \"{$newStatus}\".",
                'allowed' => $allowed,
            ], 422);
        }

        // When moving to "For Payment", an assessment must be assigned
        if ($newStatus === 'For Payment' && $currentStatus === 'For Accounts Assessment') {
            if (empty($validated['assessment_id'])) {
                return response()->json([
                    'message' => 'An assessment must be selected when moving to "For Payment".',
                ], 422);
            }

            return DB::transaction(function () use ($student, $validated, $newStatus, $request) {
                $this->assignAssessment($student, $validated['assessment_id'], $request->user()->id);

                $student->update([
                    'status'    => $newStatus,
                    'remarks'   => $validated['remarks'] ?? $student->remarks,
                    'stat_date' => now()->format('m/d/Y'),
                ]);

                if ($newStatus === 'Enrolled') {
                    $this->onStudentEnrolled($student->fresh());
                }

                $this->notifyStatusChange($student->fresh(), $newStatus, $validated['remarks'] ?? null);

                CacheService::bustStudentStats();

                return response()->json(['data' => $student->fresh()->load('classInfo')]);
            });
        }

        $student->update([
            'status'   => $newStatus,
            'remarks'  => $validated['remarks'] ?? $student->remarks,
            'stat_date' => now()->format('m/d/Y'),
        ]);

        if ($newStatus === 'Enrolled') {
            $this->onStudentEnrolled($student->fresh());
        }

        $this->notifyStatusChange($student->fresh(), $newStatus, $validated['remarks'] ?? null);

        CacheService::bustStudentStats();

        return response()->json(['data' => $student->fresh()->load('classInfo')]);
    }

    /**
     * Bulk transition students.
     */
    public function bulkTransition(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reg_ids'       => ['required', 'array', 'min:1'],
            'reg_ids.*'     => ['string', 'exists:students,public_id'],
            'status'        => ['required', 'string', 'in:Pending,For Application Assessment,For Accounts Assessment,For Payment,Enrolled,Withdrawn,Transferred Out,Dropped'],
            'remarks'       => ['nullable', 'string', 'max:190'],
            'assessment_id' => ['nullable', 'integer', 'exists:accounts_assessments,assessment_id'],
        ]);

        $targetStatus = $validated['status'];

        // If bulk-moving to "For Payment" from assessment stage, require assessment_id
        if ($targetStatus === 'For Payment' && empty($validated['assessment_id'])) {
            return response()->json([
                'message' => 'An assessment must be selected when moving to "For Payment".',
            ], 422);
        }

        $updated = 0;
        $skipped = 0;

        DB::transaction(function () use ($validated, $targetStatus, &$updated, &$skipped, $request) {
            $students = Student::whereIn('public_id', $validated['reg_ids'])->get();

            foreach ($students as $student) {
                /** @var \App\Models\Student $student */
                $allowed = $this->getAllowedTransitions($student->status);
                if (!in_array($targetStatus, $allowed)) {
                    $skipped++;
                    continue;
                }

                // Assign assessment when transitioning to "For Payment"
                if ($targetStatus === 'For Payment'
                    && $student->status === 'For Accounts Assessment'
                    && !empty($validated['assessment_id'])) {
                    $this->assignAssessment($student, $validated['assessment_id'], $request->user()->id);
                }

                $student->update([
                    'status'    => $targetStatus,
                    'remarks'   => $validated['remarks'] ?? $student->remarks,
                    'stat_date' => now()->format('m/d/Y'),
                ]);
                if ($targetStatus === 'Enrolled') {
                    $this->onStudentEnrolled($student->fresh());
                }
                $this->notifyStatusChange($student->fresh(), $targetStatus, $validated['remarks'] ?? null);
                $updated++;
            }
        });

        CacheService::bustStudentStats();

        return response()->json([
            'message' => "{$updated} student(s) updated, {$skipped} skipped due to invalid transition.",
            'updated' => $updated,
            'skipped' => $skipped,
        ]);
    }

    // ── Grade Progression ─────────────────────────────────────────────────────

    private const GRADE_PROGRESSION = [
        'Nursery'       => 'Preparatory',
        'Preparatory'   => 'Kinder',
        'Kinder'        => 'Grade 1',
        'Grade 1'       => 'Grade 2',
        'Grade 2'       => 'Grade 3',
        'Grade 3'       => 'Grade 4',
        'Grade 4'       => 'Grade 5',
        'Grade 5'       => 'Grade 6',
        'Grade 6'       => 'Grade 7',
        'Grade 7'       => 'Grade 8',
        'Grade 8'       => 'Grade 9',
        'Grade 9'       => 'Grade 10',
        'Grade 10'      => 'Grade 11',
        'Grade 11'      => 'Grade 12',
        'Grade 12'      => null, // graduated
    ];

    private const DEPT_AT_GRADE = [
        'Grade 7'  => 'Junior High School',
        'Grade 11' => 'Senior High School',
    ];

    private function nextGradeLevel(string $gradeLevel): ?string
    {
        return self::GRADE_PROGRESSION[$gradeLevel] ?? null;
    }

    private function deptForGrade(string $nextGrade, string $currentDept): string
    {
        return self::DEPT_AT_GRADE[$nextGrade] ?? $currentDept;
    }

    // ── Bulk Promotion ────────────────────────────────────────────────────────

    /**
     * Preview which students would be promoted (dry-run, no DB writes).
     *
     * Query params:
     *   source_school_year  (required)
     *   next_school_year    (required)
     *   dept                (optional filter)
     *   grade_level         (optional filter)
     */
    public function previewBulkPromote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source_school_year' => ['required', 'string', 'max:10'],
            'next_school_year'   => ['required', 'string', 'max:10'],
            'dept'               => ['nullable', 'string', 'max:55'],
            'grade_level'        => ['nullable', 'string', 'max:55'],
        ]);

        $query = Student::where('schoolYear', $validated['source_school_year'])
            ->where('status', 'Enrolled');

        if (!empty($validated['dept'])) {
            $query->where('dept', $validated['dept']);
        }
        if (!empty($validated['grade_level'])) {
            $query->where('gradeLevel', $validated['grade_level']);
        }

        $students = $query->get();

        $toPromote   = [];
        $graduated   = [];
        $alreadyDone = [];

        foreach ($students as $student) {
            $nextGrade = $this->nextGradeLevel($student->gradeLevel);

            if ($nextGrade === null) {
                $graduated[] = [
                    'reg_id'      => $student->public_id,
                    'student_id'  => $student->student_id,
                    'name'        => "{$student->lname}, {$student->fname}",
                    'gradeLevel'  => $student->gradeLevel,
                    'dept'        => $student->dept,
                ];
                continue;
            }

            $alreadyPromoted = Student::where('prev_sy_reg_id', $student->reg_id)->exists();
            if ($alreadyPromoted) {
                $alreadyDone[] = [
                    'reg_id'     => $student->public_id,
                    'student_id' => $student->student_id,
                    'name'       => "{$student->lname}, {$student->fname}",
                    'gradeLevel' => $student->gradeLevel,
                ];
                continue;
            }

            $nextDept = $this->deptForGrade($nextGrade, $student->dept);
            $toPromote[] = [
                'reg_id'          => $student->public_id,
                'student_id'      => $student->student_id,
                'name'            => "{$student->lname}, {$student->fname}",
                'current_grade'   => $student->gradeLevel,
                'next_grade'      => $nextGrade,
                'current_dept'    => $student->dept,
                'next_dept'       => $nextDept,
                'strand'          => $student->strand,
            ];
        }

        return response()->json([
            'to_promote'    => $toPromote,
            'graduated'     => $graduated,
            'already_done'  => $alreadyDone,
            'summary' => [
                'will_promote'   => count($toPromote),
                'graduated'      => count($graduated),
                'already_done'   => count($alreadyDone),
                'total_enrolled' => $students->count(),
            ],
        ]);
    }

    /**
     * Execute bulk promotion — creates a new Student record for every eligible
     * Enrolled student in the source school year.
     *
     * Body params:
     *   source_school_year  (required)
     *   next_school_year    (required)
     *   dept                (optional filter)
     *   grade_level         (optional filter)
     *   next_sem            (optional, default "1st Semester")
     *   classification      (optional, default "Old")
     */
    public function bulkPromote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source_school_year' => ['required', 'string', 'max:10'],
            'next_school_year'   => ['required', 'string', 'max:10'],
            'dept'               => ['nullable', 'string', 'max:55'],
            'grade_level'        => ['nullable', 'string', 'max:55'],
            'next_sem'           => ['nullable', 'string', 'max:25'],
            'classification'     => ['nullable', 'string', 'max:55'],
        ]);

        $query = Student::where('schoolYear', $validated['source_school_year'])
            ->where('status', 'Enrolled');

        if (!empty($validated['dept'])) {
            $query->where('dept', $validated['dept']);
        }
        if (!empty($validated['grade_level'])) {
            $query->where('gradeLevel', $validated['grade_level']);
        }

        $students = $query->get();

        $promoted  = 0;
        $graduated = 0;
        $skipped   = 0;

        DB::transaction(function () use ($students, $validated, &$promoted, &$graduated, &$skipped) {
            foreach ($students as $student) {
                $nextGrade = $this->nextGradeLevel($student->gradeLevel);

                if ($nextGrade === null) {
                    $graduated++;
                    continue;
                }

                $alreadyPromoted = Student::where('prev_sy_reg_id', $student->reg_id)->exists();
                if ($alreadyPromoted) {
                    $skipped++;
                    continue;
                }

                $nextDept   = $this->deptForGrade($nextGrade, $student->dept);
                $newStudentId = $this->generateStudentId($nextDept);

                // Carry over SHS strand/major; reset for cross-department promotions
                $nextStrand = $student->strand ?? 'N/A';
                $nextMajor  = $student->major  ?? 'N/A';
                if (in_array($nextGrade, ['Grade 7', 'Grade 11'], true)) {
                    // Entering new department — strand/major to be set by registrar
                    $nextStrand = 'N/A';
                    $nextMajor  = 'N/A';
                }

                Student::create([
                    ...$student->only([
                        'lrn', 'esc_id', 'lname', 'fname', 'mname', 'suffix',
                        'bdMM', 'bdDD', 'bdYYYY', 'sex', 'age',
                        'address_street', 'address_brgy', 'address_city_mun', 'address_province',
                        'guardian_lname', 'guardian_fname', 'guardian_contact', 'guardian_relation',
                        'g_address_street', 'g_address_brgy', 'g_address_city_mun', 'g_address_province',
                        'last_school', 'last_school_sy', 'last_school_type', 'gen_average',
                    ]),
                    'student_id'     => $newStudentId,
                    'dept'           => $nextDept,
                    'gradeLevel'     => $nextGrade,
                    'strand'         => $nextStrand,
                    'major'          => $nextMajor,
                    'classification' => $validated['classification'] ?? 'Old',
                    'schoolYear'     => $validated['next_school_year'],
                    'sem'            => $validated['next_sem'] ?? '1st Semester',
                    'section'        => '-',
                    'status'         => 'For Accounts Assessment',
                    'appDate'        => now()->format('m/d/Y'),
                    'appTime'        => now()->format('h:i A'),
                    'prev_sy_reg_id' => $student->reg_id,
                ]);

                $promoted++;
            }
        });

        CacheService::bustStudentStats();

        return response()->json([
            'message'   => "{$promoted} student(s) promoted, {$graduated} graduated (skipped), {$skipped} already promoted.",
            'promoted'  => $promoted,
            'graduated' => $graduated,
            'skipped'   => $skipped,
        ], 201);
    }

    /**
     * Promote a student to the next grade level.
     */
    public function promote(Request $request, string $regId): JsonResponse
    {
        $validated = $request->validate([
            'gradeLevel'     => ['required', 'string', 'max:55'],
            'dept'           => ['required', 'string', 'max:55'],
            'strand'         => ['nullable', 'string', 'max:55'],
            'major'          => ['nullable', 'string', 'max:55'],
            'classification' => ['required', 'string', 'max:55'],
            'schoolYear'     => ['required', 'string', 'max:10'],
            'sem'            => ['nullable', 'string', 'max:25'],
        ]);

        $student = Student::findByPublicIdOrFail($regId);

        return DB::transaction(function () use ($student, $validated) {
            // Generate a new student_id for the new SY (locked to prevent duplicates)
            $newStudentId = $this->generateStudentId($validated['dept']);

            // Store reference to previous record
            $prevRegId = $student->reg_id;

            // Create the promoted record as a new student entry
            $promoted = Student::create([
                ...$student->only([
                    'lrn', 'esc_id', 'lname', 'fname', 'mname', 'suffix',
                    'bdMM', 'bdDD', 'bdYYYY', 'sex', 'age',
                    'address_street', 'address_brgy', 'address_city_mun', 'address_province',
                    'guardian_lname', 'guardian_fname', 'guardian_contact', 'guardian_relation',
                    'g_address_street', 'g_address_brgy', 'g_address_city_mun', 'g_address_province',
                    'last_school', 'last_school_sy', 'last_school_type', 'gen_average',
                ]),
                'student_id'     => $newStudentId,
                'dept'           => $validated['dept'],
                'gradeLevel'     => $validated['gradeLevel'],
                'strand'         => $validated['strand'] ?? 'N/A',
                'major'          => $validated['major'] ?? 'N/A',
                'classification' => $validated['classification'],
                'schoolYear'     => $validated['schoolYear'],
                'sem'            => $validated['sem'] ?? '1st Semester',
                'section'        => '-',
                'status'         => 'For Accounts Assessment',
                'appDate'        => now()->format('m/d/Y'),
                'appTime'        => now()->format('h:i A'),
                'prev_sy_reg_id' => $prevRegId,
            ]);

            CacheService::bustStudentStats();

            return response()->json([
                'data'    => $promoted->load('classInfo'),
                'message' => 'Student promoted successfully.',
            ], 201);
        });
    }

    /**
     * POST /registrar/enrollment/auto-assign-assessments
     *
     * Bulk auto-assign matching assessment templates to every student currently at
     * "For Accounts Assessment" for the given school year.
     *
     * For each student:
     *  - If exactly 1 template matches → assign it and advance to "For Payment".
     *  - If 0 or >1 matches → skip and include in the "needs_manual" list.
     */
    public function autoAssignAssessments(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'schoolYear'  => ['required', 'string', 'max:10'],
            'dept'        => ['nullable', 'string', 'max:55'],
            'grade_level' => ['nullable', 'string', 'max:55'],
        ]);

        $query = Student::where('status', 'For Accounts Assessment')
            ->where('schoolYear', $validated['schoolYear'])
            ->whereNull('assessment_id');

        if (!empty($validated['dept']))        $query->where('dept', $validated['dept']);
        if (!empty($validated['grade_level'])) $query->where('gradeLevel', $validated['grade_level']);

        $students = $query->get();

        $autoAssigned = 0;
        $needsManual  = 0;
        $details      = [];
        $noValue      = ['', '-', 'N/A'];
        $userId       = $request->user()?->id ?? 0;

        DB::transaction(function () use ($students, $userId, $noValue, &$autoAssigned, &$needsManual, &$details) {
            foreach ($students as $student) {
                $strand = (empty($student->strand) || in_array($student->strand, $noValue)) ? null : $student->strand;
                $major  = (empty($student->major)  || in_array($student->major,  $noValue)) ? null : $student->major;

                $q = AccountsAssessment::where('gradeLevel', $student->gradeLevel)
                    ->where('schoolYear', $student->schoolYear);

                if ($strand) {
                    $q->where('strand', $strand);
                } else {
                    $q->whereIn('strand', ['', 'N/A']);
                }

                if ($major) {
                    $q->where('major', $major);
                } else {
                    $q->whereIn('major', ['', 'N/A']);
                }

                $matches = $q->get();
                $name    = "{$student->lname}, {$student->fname}";

                if ($matches->count() === 1) {
                    $template = $matches->first();
                    $this->assignAssessment($student, $template->assessment_id, $userId);
                    $student->update(['status' => 'For Payment', 'stat_date' => now()->format('m/d/Y')]);
                    $this->notifyStatusChange($student->fresh(), 'For Payment');
                    $autoAssigned++;
                    $details[] = [
                        'name'     => $name,
                        'status'   => 'assigned',
                        'template' => $template->description,
                    ];
                } else {
                    $needsManual++;
                    $reason    = $matches->count() === 0
                        ? 'No matching template found'
                        : "Multiple templates found ({$matches->count()})";
                    $details[] = ['name' => $name, 'status' => 'skipped', 'reason' => $reason];
                }
            }
        });

        return response()->json([
            'message'       => "{$autoAssigned} student(s) auto-assigned to For Payment, {$needsManual} need manual selection.",
            'auto_assigned' => $autoAssigned,
            'needs_manual'  => $needsManual,
            'details'       => $details,
        ]);
    }

    /**
     * Return assessments matching a student's gradeLevel / strand / major / schoolYear,
     * with their payable categories so the registrar can pick one during enrollment.
     */
    public function assessmentsForStudent(string $regId): JsonResponse
    {
        $student = Student::findByPublicIdOrFail($regId);

        // Normalise: the student form stores '' or '-' for non-SHS fields, but assessments
        // always store 'N/A'. Treat all three as "no strand/major" so matching works.
        $noValue = ['', '-', 'N/A'];
        $strand = (empty($student->strand) || in_array($student->strand, $noValue)) ? null : $student->strand;
        $major  = (empty($student->major)  || in_array($student->major,  $noValue)) ? null : $student->major;

        $query = AccountsAssessment::with('payables.category')
            ->where('gradeLevel', $student->gradeLevel)
            ->where('schoolYear', $student->schoolYear);

        // Strand: if the student has a real strand, match exactly; otherwise accept
        // both '' and 'N/A' so JHS / Grade-School assessments are found.
        if ($strand) {
            $query->where('strand', $strand);
        } else {
            $query->whereIn('strand', ['', 'N/A']);
        }

        // Same logic for major
        if ($major) {
            $query->where('major', $major);
        } else {
            $query->whereIn('major', ['', 'N/A']);
        }

        $assessments = $query->orderBy('description')->get();

        return response()->json(['data' => $assessments]);
    }

    private function getAllowedTransitions(string $currentStatus): array
    {
        return match ($currentStatus) {
            'Pending'                 => ['For Application Assessment', 'Withdrawn', 'Dropped'],
            'For Application Assessment' => ['For Accounts Assessment', 'Withdrawn', 'Dropped'],
            'For Accounts Assessment' => ['For Payment', 'Withdrawn', 'Transferred Out', 'Dropped'],
            'For Payment'             => ['Enrolled', 'For Accounts Assessment', 'Withdrawn', 'Transferred Out', 'Dropped'],
            'Enrolled'                => ['Withdrawn', 'Transferred Out', 'Dropped'],
            'Withdrawn', 'Transferred Out', 'Dropped' => ['For Accounts Assessment'],
            default => ['For Application Assessment'],
        };
    }

    private function generateStudentId(string $dept): string
    {
        $deptCodeMap = [
            'Preschool'          => '1',
            'Grade School'       => '1',
            'Elementary'         => '1',
            'Junior High School' => '2',
            'Senior High School' => '3',
        ];

        $deptCode = $deptCodeMap[$dept] ?? '1';
        $yearPrefix = date('y'); // last 2 digits of current year

        // Use dept code as the prefix key for the idcode_gen table
        $idCode = IdcodeGen::where('prefix', $deptCode)->lockForUpdate()->first();

        if (!$idCode) {
            $idCode = IdcodeGen::create(['dept' => $dept, 'prefix' => $deptCode, 'last_idNum' => 0]);
        }

        $newNum = $idCode->last_idNum + 1;

        // Format: YY + dept_code + zero-padded counter (3 digits)
        $studentId = $yearPrefix . $deptCode . str_pad($newNum, 3, '0', STR_PAD_LEFT);
        while (Student::where('student_id', $studentId)->exists()) {
            $newNum++;
            $studentId = $yearPrefix . $deptCode . str_pad($newNum, 3, '0', STR_PAD_LEFT);
        }

        $idCode->update(['last_idNum' => $newNum]);

        return $studentId;
    }

    /**
     * Create student_assessment rows from an assessment template.
     * Mirrors the logic in StudentAssessmentController::assign().
     */
    private function assignAssessment(Student $student, int $assessmentId, int $createdBy = 0): void
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

                if (!$exists) {
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

        $student->update(['assessment_id' => $assessmentId]);

        // GL: record assessment A/R + revenue entry (non-blocking)
        if ($createdBy > 0) {
            try {
                app(GlJournalService::class)->recordAssessment($student, $assessmentId, $student->schoolYear ?? '', $createdBy);
            } catch (\Throwable $glEx) {
                Log::warning('GL assessment entry failed for student reg_id=' . $student->reg_id . ': ' . $glEx->getMessage());
            }
        }
    }

    /**
     * When a student is transitioned to Enrolled:
     * 1. If their linked portal account has access=Applicant, promote it to Student.
     * 2. If this is a re-enrollment (prev_sy_reg_id set), update the old account's reg_id.
     */
    private function onStudentEnrolled(Student $student): void
    {
        $user = User::where('reg_id', $student->reg_id)->first();

        if ($user) {
            if ($user->access === 'Applicant') {
                $user->update(['access' => 'Student']);
            }
            return;
        }

        // Re-enrollment path: the portal account still points to the previous SY record
        if ($student->prev_sy_reg_id) {
            $prevUser = User::where('reg_id', $student->prev_sy_reg_id)->first();
            if ($prevUser && $prevUser->access === 'Student') {
                $prevUser->update(['reg_id' => $student->reg_id]);
            }
        }
    }

    private function notifyStatusChange(Student $student, string $newStatus, ?string $remarks = null): void
    {
        $studentName = "{$student->fname} {$student->lname}";

        // ── Notify the student's own portal account ───────────────────────────
        $user = User::where('reg_id', $student->reg_id)->first();
        if ($user) {
            try {
                $user->notify(new EnrollmentStatusChanged($newStatus, $student->schoolYear, $remarks));
            } catch (\Throwable) {}

            if ($user->email) {
                try {
                    Mail::to($user->email)->send(new EnrollmentStatusUpdatedMail(
                        studentName: $studentName,
                        newStatus: $newStatus,
                        schoolYear: $student->schoolYear,
                        remarks: $remarks,
                    ));
                } catch (\Throwable) {}
            }
        }

        // ── Notify any linked parent accounts ────────────────────────────────
        $parentUsers = User::where('access', 'Parent')
            ->whereHas('children', fn ($q) => $q->where('students.reg_id', $student->reg_id))
            ->get();

        foreach ($parentUsers as $parentUser) {
            try {
                $parentUser->notify(new EnrollmentStatusChanged(
                    newStatus:   $newStatus,
                    schoolYear:  $student->schoolYear,
                    remarks:     $remarks,
                    studentName: $studentName,
                ));
            } catch (\Throwable) {}
        }
    }
}
