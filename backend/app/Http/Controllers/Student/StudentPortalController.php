<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceLog;
use App\Models\ClassAnnouncement;
use App\Models\ClassMaterial;
use App\Models\Grade;
use App\Models\Kiosk;
use App\Models\SchoolPreference;
use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\StudentPayment;
use App\Models\StudentPaymentData;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class StudentPortalController extends Controller
{
    // ── Helpers ────────────────────────────────────────────────────────────────

    private function getStudent(Request $request): Student
    {
        $regId = $request->user()->reg_id;

        if (! $regId) {
            abort(403, 'Your account is not linked to a student record.');
        }

        return Student::with(['classInfo'])->findOrFail($regId);
    }

    // ── Dashboard ──────────────────────────────────────────────────────────────

    public function dashboard(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);

        $sy = $student->schoolYear;

        // Outstanding balance
        $balance = StudentAssessment::where('reg_id', $student->reg_id)
            ->where('par_stat', 'Active')
            ->sum('total_amt_bal');

        // Recent payments (last 5)
        $latestPayments = StudentPayment::where('reg_id', $student->reg_id)
            ->where('schoolYear', $sy)
            ->where('status', '')
            ->orderByDesc('payment_id')
            ->limit(5)
            ->get(['payment_id', 'receipt_num', 'trans_date', 'amt_paid', 'payment_type']);

        return response()->json([
            'student' => [
                'student_id'  => $student->student_id,
                'name'        => "{$student->lname}, {$student->fname}",
                'grade_level' => $student->gradeLevel,
                'strand'      => $student->strand,
                'section'     => $student->section,
                'school_year' => $sy,
                'status'      => $student->status,
            ],
            'balance'          => (float) $balance,
            'recent_payments'  => $latestPayments,
        ]);
    }

    // ── Account Balance ────────────────────────────────────────────────────────

    public function balance(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);

        $rows = StudentAssessment::where('reg_id', $student->reg_id)
            ->where('par_stat', 'Active')
            ->with([
                'catParticular:cat_particular_id,description,category_id,particular_id',
                'category:category_id,description',
            ])
            ->orderBy('category_id')
            ->get([
                'stud_assess_id', 'reg_id', 'category_id', 'cat_particular_id',
                'total_amt_payable', 'total_amt_discount', 'total_amt_paid',
                'total_amt_bal', 'account_type',
            ]);

        // Group by category
        $grouped = $rows->groupBy('category_id')->map(function ($items) {
            $cat = $items->first()->category;
            return [
                'category_id'   => $items->first()->category_id,
                'description'   => $cat?->description ?? 'Unknown',
                'total_payable' => $items->sum('total_amt_payable'),
                'total_discount'=> $items->sum('total_amt_discount'),
                'total_paid'    => $items->sum('total_amt_paid'),
                'total_balance' => $items->sum('total_amt_bal'),
                'particulars'   => $items->map(fn($r) => [
                    'description'  => $r->catParticular?->description ?? $r->account_type,
                    'amt_payable'  => (float) $r->total_amt_payable,
                    'amt_discount' => (float) $r->total_amt_discount,
                    'amt_paid'     => (float) $r->total_amt_paid,
                    'balance'      => (float) $r->total_amt_bal,
                ])->values(),
            ];
        })->values();

        return response()->json(['data' => $grouped]);
    }

    // ── Payment History ────────────────────────────────────────────────────────

    public function payments(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);

        $sy = $request->input('schoolYear', $student->schoolYear);

        $payments = StudentPayment::where('reg_id', $student->reg_id)
            ->when($sy, fn($q) => $q->where('schoolYear', $sy))
            ->where('status', '')
            ->orderByDesc('payment_id')
            ->paginate((int) $request->input('per_page', 20));

        return response()->json($payments);
    }

    // ── Schedule ───────────────────────────────────────────────────────────────

    public function schedule(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);

        $class = $student->classInfo;

        return response()->json([
            'class' => $class ? [
                'class_id'   => $class->class_id,
                'grade_level'=> $class->gradeLevel,
                'strand'     => $class->strand,
                'section'    => $class->section,
                'dept'       => $class->dept,
                'adviser'    => $class->adviser,
                'school_year'=> $class->schoolYear,
                'semester'   => $class->semester,
            ] : null,
        ]);
    }

    // ── Grades ─────────────────────────────────────────────────────────────────

    public function grades(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);

        $sy = $request->input('schoolYear', $student->schoolYear);

        $grades = Grade::where('reg_id', $student->reg_id)
            ->when($sy, fn($q) => $q->where('school_year', $sy))
            ->orderBy('subject')
            ->get(['grade_id', 'subject', 'semester', 'school_year', 'q1', 'q2', 'q3', 'q4', 'final_grade', 'remarks']);

        return response()->json(['data' => $grades]);
    }

    // ── Ledger / Statement of Account ─────────────────────────────────────────

    public function ledger(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);
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

        $txns = $transactions->map(fn($t) => [
            'receipt_num' => $t->receipt_num,
            'date'        => $t->entry_date,
            'type'        => $t->trans_payment_type,
            'amount'      => (float) $t->net_amt_payable,
            'remarks'     => $t->remarks,
        ])->values();

        return response()->json([
            'summary'      => $summary,
            'charges'      => $charges,
            'transactions' => $txns,
        ]);
    }

    // ── Report Card ───────────────────────────────────────────────────────────

    public function reportCard(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);
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

    // ── Academic / Enrollment History ─────────────────────────────────────────

    public function academicHistory(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);

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

    // ── Attendance ────────────────────────────────────────────────────────────

    public function attendance(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);
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
            'present'   => $records->where('status', 'Present')->count(),
            'absent'    => $records->where('status', 'Absent')->count(),
            'late'      => $records->where('status', 'Late')->count(),
            'excused'   => $records->where('status', 'Excused')->count(),
            'half_day'  => $records->where('status', 'Half Day')->count(),
            'total'     => $records->count(),
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

    // ── Kiosk scan logs (time-in / time-out from kiosk) ───────────────────────

    public function kioskLogs(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);
        $month   = $request->input('month');
        $year    = (int) $request->input('year', now()->year);

        $query = AttendanceLog::where('entity_type', 'student')
            ->where('entity_id', $student->student_id)
            ->whereYear('log_time', $year)
            ->when($month, fn($q) => $q->whereMonth('log_time', (int) $month))
            ->orderByDesc('log_time');

        $logs = $query->get(['id', 'direction', 'log_time', 'method', 'kiosk_code']);

        // Build kiosk name map
        $kioskCodes = $logs->pluck('kiosk_code')->filter()->unique()->values();
        $kioskNames = [];
        if ($kioskCodes->isNotEmpty()) {
            Kiosk::whereIn('kiosk_code', $kioskCodes)
                ->get(['kiosk_code', 'name', 'gate_label'])
                ->each(fn($k) => $kioskNames[$k->kiosk_code] = "{$k->name} ({$k->gate_label})");
        }

        $totalIn  = $logs->where('direction', 'in')->count();
        $totalOut = $logs->where('direction', 'out')->count();

        return response()->json([
            'summary' => ['total_in' => $totalIn, 'total_out' => $totalOut],
            'logs'    => $logs->map(fn($l) => [
                'id'         => $l->id,
                'direction'  => $l->direction,
                'log_time'   => $l->log_time->format('Y-m-d H:i:s'),
                'method'     => $l->method,
                'kiosk_code' => $l->kiosk_code,
                'kiosk_name' => $l->kiosk_code ? ($kioskNames[$l->kiosk_code] ?? $l->kiosk_code) : null,
            ])->values(),
        ]);
    }

    // ── Billing Statement PDF ─────────────────────────────────────────────────

    public function ledgerPdf(Request $request): Response
    {
        $student = $this->getStudent($request);
        $sy      = $request->input('schoolYear', $student->schoolYear);

        // Reuse the same ledger data logic
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
                ])->values()->toArray(),
            ];
        })->values()->toArray();

        $txns = $transactions->map(fn($t) => [
            'receipt_num' => $t->receipt_num,
            'date'        => $t->entry_date,
            'type'        => $t->trans_payment_type,
            'amount'      => (float) $t->net_amt_payable,
            'remarks'     => $t->remarks,
        ])->values()->toArray();

        $school = SchoolPreference::first();

        $peso = fn(float $v): string => '₱' . number_format($v, 2);

        $pdf = Pdf::loadView('pdf.billing-statement', [
            'student'     => [
                'name'        => "{$student->lname}, {$student->fname}",
                'student_id'  => $student->student_id,
                'grade_level' => $student->gradeLevel,
                'strand'      => $student->strand,
                'section'     => $student->section,
                'school_year' => $sy,
            ],
            'summary'      => $summary,
            'charges'      => $charges,
            'transactions' => $txns,
            'school'       => $school,
            'generatedAt'  => now()->format('F j, Y g:i A'),
            'peso'         => $peso,
        ])->setPaper('a4', 'portrait');

        $filename = 'SOA_' . str_replace(' ', '_', "{$student->lname}_{$student->fname}") . "_{$sy}.pdf";

        return $pdf->download($filename);
    }

    // ── Form 138 — Report Card PDF ────────────────────────────────────────────

    public function reportCardPdf(Request $request): Response
    {
        $student = $this->getStudent($request)->load('classInfo');
        $sy      = $request->input('schoolYear', $student->schoolYear);

        $grades = Grade::where('reg_id', $student->reg_id)
            ->where('school_year', $sy)
            ->orderBy('semester')
            ->orderBy('subject')
            ->get();

        // Keep string semester keys (e.g. "1st Semester") — do NOT use ->values()
        $semesters = $grades->groupBy('semester')->map(function ($semGrades) {
            $withFinal = $semGrades->filter(fn($g) => $g->final_grade !== null);
            return [
                'subjects'        => $semGrades->map(fn($g) => [
                    'subject'     => $g->subject,
                    'q1'          => $g->q1,
                    'q2'          => $g->q2,
                    'q3'          => $g->q3,
                    'q4'          => $g->q4,
                    'final_grade' => $g->final_grade,
                    'remarks'     => $g->remarks,
                ])->values()->toArray(),
                'general_average' => $withFinal->isNotEmpty()
                    ? round((float) $withFinal->avg('final_grade'), 2)
                    : null,
            ];
        })->toArray(); // toArray preserves string keys

        $allWithFinal = $grades->filter(fn($g) => $g->final_grade !== null);

        $school = SchoolPreference::first();

        $pdf = Pdf::loadView('pdf.form-138', [
            'student' => [
                'name'        => $student->full_name,
                'student_id'  => $student->student_id,
                'lrn'         => $student->lrn,
                'grade_level' => $student->gradeLevel,
                'strand'      => $student->strand,
                'section'     => $student->section,
                'adviser'     => $student->classInfo?->adviser,
                'school_year' => $sy,
            ],
            'semesters'      => $semesters,
            'overallAverage' => $allWithFinal->isNotEmpty()
                ? round((float) $allWithFinal->avg('final_grade'), 2)
                : null,
            'school'         => $school,
            'generatedAt'    => now()->format('F j, Y g:i A'),
        ])->setPaper('a4', 'portrait');

        $filename = 'Form138_' . str_replace(' ', '_', $student->lname) . "_{$sy}.pdf";

        return $pdf->download($filename);
    }

    // ── Certificate of Enrollment PDF ────────────────────────────────────────

    public function enrollmentCertificatePdf(Request $request): Response
    {
        $student = $this->getStudent($request);
        $school  = SchoolPreference::first();

        $controlNo = strtoupper('COE-' . $student->student_id . '-' . date('Ymd') . '-' . strtoupper(substr(md5(uniqid()), 0, 6)));

        $pdf = Pdf::loadView('pdf.certificate-enrollment', [
            'student' => [
                'name'        => $student->full_name,
                'student_id'  => $student->student_id,
                'lrn'         => $student->lrn,
                'grade_level' => $student->gradeLevel,
                'strand'      => $student->strand,
                'section'     => $student->section,
                'dept'        => $student->dept ?? 'Senior High School',
                'school_year' => $student->schoolYear,
                'status'      => $student->status,
            ],
            'school'      => $school,
            'purpose'     => $request->input('purpose', ''),
            'generatedAt' => now()->format('F j, Y g:i A'),
            'controlNo'   => $controlNo,
        ])->setPaper('a4', 'portrait');

        $filename = 'CertEnrollment_' . str_replace(' ', '_', $student->lname) . '_' . date('Ymd') . '.pdf';

        return $pdf->download($filename);
    }

    // ── Announcements (read-only) ──────────────────────────────────────────────

    public function announcements(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);

        if (! $student->class_id) {
            return response()->json(['data' => []]);
        }

        $announcements = ClassAnnouncement::where('class_id', $student->class_id)
            ->with('author:id,fname,lname')
            ->orderByDesc('pinned')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $announcements]);
    }

    // ── Learning Materials (read-only) ────────────────────────────────────────

    public function materials(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);

        if (! $student->class_id) {
            return response()->json(['data' => []]);
        }

        $materials = ClassMaterial::where('class_id', $student->class_id)
            ->with('uploader:id,name')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $materials]);
    }
}
