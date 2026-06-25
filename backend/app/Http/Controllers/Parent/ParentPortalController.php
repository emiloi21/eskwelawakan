<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceLog;
use App\Models\Grade;
use App\Models\Kiosk;
use App\Models\LmsAssignment;
use App\Models\LmsDiscussion;
use App\Models\LmsDiscussionReply;
use App\Models\LmsQuizAttempt;
use App\Models\LmsSubmission;
use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\StudentPayment;
use App\Models\StudentPaymentData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ParentPortalController extends Controller
{
    /**
     * Resolve the authenticated parent and abort 403 if not linked.
     */
    private function getChildren(Request $request)
    {
        $user = $request->user();
        $children = $user->children()
            ->with(['classInfo'])
            ->get();

        if ($children->isEmpty()) {
            abort(403, 'No students are linked to this parent account.');
        }

        return $children;
    }

    /**
     * Dashboard — list all linked children with status + outstanding balance.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $children = $user->children()->with('classInfo')->get();

        $data = $children->map(function (Student $s) {
            $balance = StudentAssessment::where('reg_id', $s->reg_id)
                ->sum('total_amt_bal');

            return [
                'reg_id'       => $s->reg_id,
                'public_id'    => $s->public_id,
                'name'         => $s->full_name,
                'student_id'   => $s->student_id,
                'grade_level'  => $s->gradeLevel,
                'strand'       => $s->strand,
                'section'      => $s->section,
                'school_year'  => $s->schoolYear,
                'status'       => $s->status,
                'balance'      => (float) $balance,
                'class'        => $s->classInfo ? [
                    'grade_level' => $s->classInfo->gradeLevel,
                    'section'     => $s->classInfo->section,
                    'adviser'     => $s->classInfo->adviser,
                ] : null,
            ];
        });

        return response()->json(['children' => $data]);
    }

    /**
     * Child detail — basic info + outstanding balance summary.
     */
    public function childDetail(Request $request, string $publicId): JsonResponse
    {
        $user     = $request->user();
        $student  = $this->findLinkedChild($user, $publicId);

        $totalAssessed = StudentAssessment::where('reg_id', $student->reg_id)
            ->sum('total_amt_payable');
        $totalPaid = StudentAssessment::where('reg_id', $student->reg_id)
            ->sum('total_amt_paid');
        $totalBalance = StudentAssessment::where('reg_id', $student->reg_id)
            ->sum('total_amt_bal');

        return response()->json([
            'student' => [
                'reg_id'      => $student->reg_id,
                'public_id'   => $student->public_id,
                'name'        => $student->full_name,
                'student_id'  => $student->student_id,
                'grade_level' => $student->gradeLevel,
                'strand'      => $student->strand,
                'section'     => $student->section,
                'school_year' => $student->schoolYear,
                'status'      => $student->status,
            ],
            'summary' => [
                'total_assessed' => (float) $totalAssessed,
                'total_paid'     => (float) $totalPaid,
                'total_balance'  => (float) $totalBalance,
            ],
        ]);
    }

    /**
     * Child grades — all Grade records for the child.
     */
    public function childGrades(Request $request, string $publicId): JsonResponse
    {
        $user    = $request->user();
        $student = $this->findLinkedChild($user, $publicId);
        $sy      = $request->query('schoolYear');

        $query = Grade::where('reg_id', $student->reg_id);
        if ($sy) {
            $query->where('school_year', $sy);
        }

        $grades = $query->orderBy('semester')->orderBy('subject')->get();

        return response()->json(['data' => $grades]);
    }

    /**
     * Child balance — StudentAssessment rows grouped by category.
     */
    public function childBalance(Request $request, string $publicId): JsonResponse
    {
        $user    = $request->user();
        $student = $this->findLinkedChild($user, $publicId);

        $assessments = StudentAssessment::with(['category.particulars'])
            ->where('reg_id', $student->reg_id)
            ->get();

        $grouped = $assessments->groupBy('cat_id')->map(function ($rows) {
            $first    = $rows->first();
            $category = $first->category;

            return [
                'cat_id'        => $first->cat_id,
                'category_name' => $category?->name ?? 'Uncategorized',
                'total_payable' => (float) $rows->sum('total_amt_payable'),
                'total_discount'=> (float) $rows->sum('total_amt_discount'),
                'total_paid'    => (float) $rows->sum('total_amt_paid'),
                'total_balance' => (float) $rows->sum('total_amt_bal'),
                'particulars'   => $rows->map(fn($r) => [
                    'assessment_id' => $r->assessment_id,
                    'particular'    => $r->particular?->name ?? '—',
                    'payable'       => (float) $r->total_amt_payable,
                    'discount'      => (float) $r->total_amt_discount,
                    'paid'          => (float) $r->total_amt_paid,
                    'balance'       => (float) $r->total_amt_bal,
                ])->values(),
            ];
        })->values();

        return response()->json([
            'categories'     => $grouped,
            'total_assessed' => (float) $assessments->sum('total_amt_payable'),
            'total_paid'     => (float) $assessments->sum('total_amt_paid'),
            'total_balance'  => (float) $assessments->sum('total_amt_bal'),
        ]);
    }

    /**
     * Child payments — paginated StudentPayment history.
     */
    public function childPayments(Request $request, string $publicId): JsonResponse
    {
        $user    = $request->user();
        $student = $this->findLinkedChild($user, $publicId);

        $payments = StudentPayment::with('paymentData')
            ->where('reg_id', $student->reg_id)
            ->orderByDesc('payment_date')
            ->paginate(15);

        return response()->json($payments);
    }

    /**
     * Child ledger — full SOA (assessment charges + payment transactions).
     */
    public function childLedger(Request $request, string $publicId): JsonResponse
    {
        $user    = $request->user();
        $student = $this->findLinkedChild($user, $publicId);
        $sy      = $request->input('schoolYear', $student->schoolYear);

        $assessments = StudentAssessment::where('reg_id', $student->reg_id)
            ->where('par_stat', 'Active')
            ->with([
                'catParticular:cat_particular_id,description,category_id',
                'category:category_id,description',
            ])
            ->get();

        $transactions = StudentPaymentData::where('reg_id', $student->reg_id)
            ->when($sy, fn($q) => $q->where('schoolYear', $sy))
            ->where('status', '')
            ->orderBy('entry_date')
            ->get();

        $summary = [
            'total_assessed' => (float) $assessments->sum('total_amt_payable'),
            'total_discount' => (float) $assessments->sum('total_amt_discount'),
            'total_paid'     => (float) $assessments->sum('total_amt_paid'),
            'total_balance'  => (float) $assessments->sum('total_amt_bal'),
        ];

        $charges = $assessments->groupBy('category_id')->map(function ($items) {
            $cat = $items->first()->category;
            return [
                'category' => $cat?->description ?? 'Uncategorized',
                'payable'  => (float) $items->sum('total_amt_payable'),
                'discount' => (float) $items->sum('total_amt_discount'),
                'paid'     => (float) $items->sum('total_amt_paid'),
                'balance'  => (float) $items->sum('total_amt_bal'),
                'items'    => $items->map(fn($r) => [
                    'description' => $r->catParticular?->description ?? '—',
                    'payable'     => (float) $r->total_amt_payable,
                    'discount'    => (float) $r->total_amt_discount,
                    'paid'        => (float) $r->total_amt_paid,
                    'balance'     => (float) $r->total_amt_bal,
                ])->values(),
            ];
        })->values();

        return response()->json([
            'summary'      => $summary,
            'charges'      => $charges,
            'transactions' => $transactions->map(fn($t) => [
                'receipt_num' => $t->receipt_num,
                'date'        => $t->entry_date,
                'type'        => $t->trans_payment_type,
                'amount'      => (float) $t->net_amt_payable,
                'remarks'     => $t->remarks,
            ])->values(),
        ]);
    }

    /**
     * Child report card — grades formatted for report card view.
     */
    public function childReportCard(Request $request, string $publicId): JsonResponse
    {
        $user    = $request->user();
        $student = $this->findLinkedChild($user, $publicId);
        $sy      = $request->input('schoolYear', $student->schoolYear);

        $grades = Grade::where('reg_id', $student->reg_id)
            ->where('school_year', $sy)
            ->orderBy('semester')
            ->orderBy('subject')
            ->get();

        $semesters = $grades->groupBy('semester')->map(function ($semGrades) {
            $withFinal = $semGrades->filter(fn($g) => $g->final_grade !== null);
            return [
                'subjects'        => $semGrades->map(fn($g) => [
                    'grade_id'    => $g->grade_id,
                    'subject'     => $g->subject,
                    'q1'          => $g->q1,
                    'q2'          => $g->q2,
                    'q3'          => $g->q3,
                    'q4'          => $g->q4,
                    'final_grade' => $g->final_grade,
                    'remarks'     => $g->remarks,
                ])->values(),
                'general_average' => $withFinal->isNotEmpty()
                    ? round((float) $withFinal->avg('final_grade'), 2)
                    : null,
            ];
        });

        $allWithFinal = $grades->filter(fn($g) => $g->final_grade !== null);

        return response()->json([
            'student' => [
                'name'        => $student->full_name,
                'student_id'  => $student->student_id,
                'grade_level' => $student->gradeLevel,
                'strand'      => $student->strand,
                'section'     => $student->section,
                'school_year' => $sy,
            ],
            'semesters'       => $semesters,
            'overall_average' => $allWithFinal->isNotEmpty()
                ? round((float) $allWithFinal->avg('final_grade'), 2)
                : null,
        ]);
    }

    /**
     * Child academic history — enrollment record per school year.
     */
    public function childAcademicHistory(Request $request, string $publicId): JsonResponse
    {
        $user    = $request->user();
        $student = $this->findLinkedChild($user, $publicId);

        $grades = Grade::where('reg_id', $student->reg_id)
            ->with('classInfo:class_id,gradeLevel,strand,section')
            ->orderByDesc('school_year')
            ->get();

        $history = $grades->groupBy('school_year')->map(function ($yearGrades, $sy) {
            $first     = $yearGrades->first();
            $withFinal = $yearGrades->filter(fn($g) => $g->final_grade !== null);
            $avg       = $withFinal->isNotEmpty()
                ? round((float) $withFinal->avg('final_grade'), 2)
                : null;

            return [
                'school_year'     => $sy,
                'grade_level'     => $first->classInfo?->gradeLevel ?? '—',
                'strand'          => $first->classInfo?->strand ?? '',
                'section'         => $first->classInfo?->section ?? '—',
                'total_subjects'  => $yearGrades->count(),
                'general_average' => $avg,
                'status'          => $avg !== null
                    ? ($avg >= 75 ? 'Passed' : 'Failed')
                    : 'In Progress',
            ];
        })->values();

        return response()->json(['data' => $history]);
    }

    /**
     * Child attendance — records with monthly summary.
     */
    public function childAttendance(Request $request, string $publicId): JsonResponse
    {
        $user    = $request->user();
        $student = $this->findLinkedChild($user, $publicId);
        $year    = (int) $request->input('year', now()->year);
        $month   = $request->input('month');

        $query = Attendance::where('reg_id', $student->reg_id)
            ->whereYear('date', $year);

        if ($month) {
            $query->whereMonth('date', (int) $month);
        }

        $records = $query->orderBy('date')
            ->get(['attendance_id', 'date', 'status', 'remarks']);

        $summary = [
            'present'  => $records->where('status', 'Present')->count(),
            'absent'   => $records->where('status', 'Absent')->count(),
            'late'     => $records->where('status', 'Late')->count(),
            'excused'  => $records->where('status', 'Excused')->count(),
            'half_day' => $records->where('status', 'Half Day')->count(),
            'total'    => $records->count(),
        ];

        return response()->json([
            'summary' => $summary,
            'records' => $records->map(fn($r) => [
                'date'    => $r->date->toDateString(),
                'status'  => $r->status,
                'remarks' => $r->remarks,
            ])->values(),
        ]);
    }

    /**
     * Child kiosk scan logs (time-in / time-out from kiosk).
     */
    public function childKioskLogs(Request $request, string $publicId): JsonResponse
    {
        $user    = $request->user();
        $student = $this->findLinkedChild($user, $publicId);
        $year    = (int) $request->input('year', now()->year);
        $month   = $request->input('month');

        $logs = AttendanceLog::where('entity_type', 'student')
            ->where('entity_id', $student->student_id)
            ->whereYear('log_time', $year)
            ->when($month, fn($q) => $q->whereMonth('log_time', (int) $month))
            ->orderByDesc('log_time')
            ->get(['id', 'direction', 'log_time', 'method', 'kiosk_code']);

        // Build kiosk name map
        $kioskCodes = $logs->pluck('kiosk_code')->filter()->unique()->values();
        $kioskNames = [];
        if ($kioskCodes->isNotEmpty()) {
            Kiosk::whereIn('kiosk_code', $kioskCodes)
                ->get(['kiosk_code', 'name', 'gate_label'])
                ->each(fn($k) => $kioskNames[$k->kiosk_code] = "{$k->name} ({$k->gate_label})");
        }

        return response()->json([
            'summary' => [
                'total_in'  => $logs->where('direction', 'in')->count(),
                'total_out' => $logs->where('direction', 'out')->count(),
            ],
            'logs' => $logs->map(fn($l) => [
                'id'         => $l->id,
                'direction'  => $l->direction,
                'log_time'   => $l->log_time->format('Y-m-d H:i:s'),
                'method'     => $l->method,
                'kiosk_code' => $l->kiosk_code,
                'kiosk_name' => $l->kiosk_code ? ($kioskNames[$l->kiosk_code] ?? $l->kiosk_code) : null,
            ])->values(),
        ]);
    }

    /**
     * Child enrollment status — current enrollment record + any pending re-enrollment.
     */
    public function childEnrollmentStatus(Request $request, string $publicId): JsonResponse
    {
        $user    = $request->user();
        $student = $this->findLinkedChild($user, $publicId);

        $pending = Student::where('prev_sy_reg_id', $student->reg_id)->first();

        return response()->json([
            'data' => [
                'current' => [
                    'student_id'     => $student->student_id,
                    'name'           => $student->full_name,
                    'grade_level'    => $student->gradeLevel,
                    'strand'         => $student->strand,
                    'dept'           => $student->dept,
                    'school_year'    => $student->schoolYear,
                    'classification' => $student->classification,
                    'status'         => $student->status,
                    'section'        => $student->section,
                    'remarks'        => $student->remarks ?? null,
                ],
                'pending_reenrollment' => $pending ? [
                    'public_id'   => $pending->public_id,
                    'school_year' => $pending->schoolYear,
                    'grade_level' => $pending->gradeLevel,
                    'status'      => $pending->status,
                ] : null,
            ],
        ]);
    }

    /**
     * Parent submits a re-enrollment request on behalf of their child.
     */
    public function childReEnroll(Request $request, string $publicId): JsonResponse
    {
        $user    = $request->user();
        $student = $this->findLinkedChild($user, $publicId);

        if ($student->status !== 'Enrolled') {
            return response()->json([
                'message' => 'Only currently enrolled students can be re-enrolled.',
            ], 422);
        }

        $existing = Student::where('prev_sy_reg_id', $student->reg_id)->first();
        if ($existing) {
            return response()->json([
                'message' => 'A re-enrollment request already exists for this student.',
                'data'    => ['status' => $existing->status, 'school_year' => $existing->schoolYear],
            ], 422);
        }

        $validated = $request->validate([
            'gradeLevel'     => ['required', 'string', 'max:55'],
            'dept'           => ['required', 'string', 'max:55'],
            'strand'         => ['nullable', 'string', 'max:55'],
            'classification' => ['required', 'string', 'max:55'],
            'schoolYear'     => ['required', 'string', 'max:10'],
        ]);

        $promoted = DB::transaction(function () use ($student, $validated) {
            return Student::create([
                ...$student->only([
                    'lrn', 'esc_id', 'lname', 'fname', 'mname', 'suffix',
                    'bdMM', 'bdDD', 'bdYYYY', 'sex', 'age',
                    'address_street', 'address_brgy', 'address_city_mun', 'address_province',
                    'guardian_lname', 'guardian_fname', 'guardian_contact', 'guardian_relation',
                    'g_address_street', 'g_address_brgy', 'g_address_city_mun', 'g_address_province',
                    'last_school', 'last_school_sy', 'last_school_type', 'gen_average',
                ]),
                'student_id'     => 'APP-' . strtoupper(Str::random(8)),
                'dept'           => $validated['dept'],
                'gradeLevel'     => $validated['gradeLevel'],
                'strand'         => $validated['strand'] ?? 'N/A',
                'major'          => $student->major ?? 'N/A',
                'classification' => $validated['classification'],
                'schoolYear'     => $validated['schoolYear'],
                'sem'            => '1st Semester',
                'section'        => '-',
                'status'         => 'Pending',
                'appDate'        => now()->format('m/d/Y'),
                'appTime'        => now()->format('h:i A'),
                'prev_sy_reg_id' => $student->reg_id,
            ]);
        });

        return response()->json([
            'message' => 'Re-enrollment request submitted. The registrar will review the application.',
            'data'    => [
                'public_id'   => $promoted->public_id,
                'grade_level' => $promoted->gradeLevel,
                'school_year' => $promoted->schoolYear,
                'status'      => $promoted->status,
            ],
        ], 201);
    }

    /**
     * Child LMS progress — assignment/quiz/discussion stats for the parent to monitor.
     */
    public function childLmsProgress(Request $request, string $publicId): JsonResponse
    {
        $user    = $request->user();
        $student = $this->findLinkedChild($user, $publicId);

        if (! $student->class_id) {
            return response()->json(['data' => null]);
        }

        $assignmentIds = LmsAssignment::where('class_id', $student->class_id)
            ->where('type', 'assignment')
            ->pluck('id');

        $quizIds = LmsAssignment::where('class_id', $student->class_id)
            ->where('type', 'quiz')
            ->pluck('id');

        // Assignments
        $submissions = LmsSubmission::whereIn('assignment_id', $assignmentIds)
            ->where('student_reg_id', $student->reg_id)
            ->get(['assignment_id', 'status', 'score', 'submitted_at', 'graded_at']);

        $submittedCount = $submissions
            ->whereIn('status', ['turned_in', 'graded', 'returned', 'late'])
            ->count();
        $gradedCount = $submissions->whereIn('status', ['graded', 'returned'])->count();
        $lateCount   = $submissions->where('status', 'late')->count();
        $totalAssign = $assignmentIds->count();

        // Quizzes
        $attempts = LmsQuizAttempt::whereIn('assignment_id', $quizIds)
            ->where('student_reg_id', $student->reg_id)
            ->whereNotNull('submitted_at')
            ->get(['assignment_id', 'score', 'max_score', 'submitted_at']);

        $takenQuizzes  = $attempts->pluck('assignment_id')->unique()->count();
        $validAttempts = $attempts->filter(fn($a) => $a->max_score > 0);
        $avgScorePct   = $validAttempts->isEmpty() ? null
            : round($validAttempts->avg(fn($a) => ($a->score / $a->max_score) * 100), 1);

        // Find child's portal user_id for discussion lookup
        $childUser   = DB::table('users')->where('reg_id', $student->reg_id)->first(['id']);
        $childUserId = $childUser?->id;

        $postCount  = $childUserId
            ? LmsDiscussion::where('class_id', $student->class_id)->where('user_id', $childUserId)->count()
            : 0;
        $replyCount = $childUserId
            ? LmsDiscussionReply::whereHas(
                'discussion',
                fn($q) => $q->where('class_id', $student->class_id)
            )->where('user_id', $childUserId)->count()
            : 0;

        // Recent graded submissions
        $recentGrades = LmsSubmission::whereIn('assignment_id', $assignmentIds)
            ->where('student_reg_id', $student->reg_id)
            ->whereIn('status', ['graded', 'returned'])
            ->with(['assignment:id,title,points'])
            ->latest('graded_at')
            ->take(5)
            ->get()
            ->map(fn($s) => [
                'title'     => $s->assignment->title ?? '—',
                'score'     => $s->score,
                'points'    => $s->assignment->points ?? null,
                'pct'       => ($s->assignment->points ?? 0) > 0
                    ? round(($s->score / $s->assignment->points) * 100, 1)
                    : null,
                'graded_at' => $s->graded_at?->toDateString(),
            ]);

        return response()->json([
            'data' => [
                'assignments' => [
                    'total'     => $totalAssign,
                    'submitted' => $submittedCount,
                    'graded'    => $gradedCount,
                    'pending'   => max(0, $totalAssign - $submittedCount),
                    'late'      => $lateCount,
                    'rate_pct'  => $totalAssign > 0
                        ? round(($submittedCount / $totalAssign) * 100, 1) : 0,
                ],
                'quizzes' => [
                    'total'         => $quizIds->count(),
                    'taken'         => $takenQuizzes,
                    'avg_score_pct' => $avgScorePct,
                ],
                'discussions' => [
                    'posts'   => $postCount,
                    'replies' => $replyCount,
                ],
                'recent_grades' => $recentGrades,
            ],
        ]);
    }

    /**
     * Find a student linked to this parent by public_id; abort 403 if not linked.
     */
    private function findLinkedChild($user, string $publicId): Student
    {
        $student = Student::where('public_id', $publicId)->firstOrFail();
        $linked = $user->children()->where('students.reg_id', $student->reg_id)->exists();
        if (!$linked && !$user->isAdmin()) {
            abort(403, 'You are not authorized to view this student.');
        }

        return $student;
    }
}
