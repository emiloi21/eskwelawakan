<?php

namespace App\Http\Controllers\Registrar;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use App\Models\Student;
use App\Models\ClassModel;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Class roster — list of students in a specific class.
     */
    public function classRoster(Request $request, string $classId): JsonResponse
    {
        $class = ClassModel::with(['students' => function ($q) {
            $q->orderBy('lname')->orderBy('fname');
        }])->where('public_id', $classId)->firstOrFail();

        return response()->json([
            'data' => [
                'class' => $class->only(['class_id', 'gradeLevel', 'strand', 'section', 'dept', 'adviser', 'schoolYear']),
                'students' => $class->students->map(fn ($s) => [
                    'reg_id' => $s->reg_id,
                    'student_id' => $s->student_id,
                    'lrn' => $s->lrn,
                    'name' => "{$s->lname}, {$s->fname} {$s->mname}" . ($s->suffix !== '-' ? " {$s->suffix}" : ''),
                    'sex' => $s->sex,
                    'status' => $s->status,
                    'guardian_contact' => $s->guardian_contact,
                ]),
                'total' => $class->students->count(),
                'male_count' => $class->students->where('sex', 'Male')->count(),
                'female_count' => $class->students->where('sex', 'Female')->count(),
            ],
        ]);
    }

    /**
     * Students grouped by grade level, with per-section breakdown.
     */
    public function byGradeLevel(Request $request): JsonResponse
    {
        $sy = $request->query('schoolYear');
        $dept = $request->query('dept');
        $gradeLevel = $request->query('gradeLevel');
        $sex = $request->query('sex');
        $status = $request->query('status', 'Enrolled');

        $query = Student::query();
        if ($sy) $query->where('schoolYear', $sy);
        if ($dept) $query->where('dept', $dept);
        if ($gradeLevel) $query->where('gradeLevel', $gradeLevel);
        if ($sex) $query->where('sex', $sex);
        if ($status) $query->where('status', $status);

        $grouped = $query->selectRaw('gradeLevel, section, sex, count(*) as count')
            ->groupBy('gradeLevel', 'section', 'sex')
            ->get();

        $result = [];
        foreach ($grouped as $row) {
            $gl = $row->gradeLevel;
            if (!isset($result[$gl])) {
                $result[$gl] = ['total' => 0, 'male' => 0, 'female' => 0, 'sections' => []];
            }

            $sec = $row->section;
            if (!isset($result[$gl]['sections'][$sec])) {
                $result[$gl]['sections'][$sec] = ['total' => 0, 'male' => 0, 'female' => 0];
            }

            $result[$gl]['sections'][$sec][$row->sex === 'Male' ? 'male' : 'female'] += $row->count;
            $result[$gl]['sections'][$sec]['total'] += $row->count;
            $result[$gl][$row->sex === 'Male' ? 'male' : 'female'] += $row->count;
            $result[$gl]['total'] += $row->count;
        }

        return response()->json(['data' => $result]);
    }

    /**
     * Enrollment summary — counts by dept, grade level, status.
     */
    public function enrollmentSummary(Request $request): JsonResponse
    {
        $sy = $request->query('schoolYear');
        $dept = $request->query('dept');
        $gradeLevel = $request->query('gradeLevel');
        $sex = $request->query('sex');
        $status = $request->query('status');

        $query = Student::query();
        if ($sy) $query->where('schoolYear', $sy);
        if ($dept) $query->where('dept', $dept);
        if ($gradeLevel) $query->where('gradeLevel', $gradeLevel);
        if ($sex) $query->where('sex', $sex);
        if ($status) $query->where('status', $status);

        $summary = $query->selectRaw('dept, gradeLevel, status, count(*) as count')
            ->groupBy('dept', 'gradeLevel', 'status')
            ->get();

        // Group into a structured response
        $result = [];
        $grandTotal = 0;

        foreach ($summary as $row) {
            $dept = $row->dept;
            if (!isset($result[$dept])) {
                $result[$dept] = ['total' => 0, 'grade_levels' => []];
            }

            $gl = $row->gradeLevel;
            if (!isset($result[$dept]['grade_levels'][$gl])) {
                $result[$dept]['grade_levels'][$gl] = ['total' => 0, 'statuses' => []];
            }

            $result[$dept]['grade_levels'][$gl]['statuses'][$row->status] = $row->count;
            $result[$dept]['grade_levels'][$gl]['total'] += $row->count;
            $result[$dept]['total'] += $row->count;
            $grandTotal += $row->count;
        }

        return response()->json([
            'data' => $result,
            'grand_total' => $grandTotal,
        ]);
    }

    /**
     * Grade sheet — blank template data per class with student list.
     */
    public function gradeSheet(Request $request, string $classId): JsonResponse
    {
        $class = ClassModel::with(['students' => function ($q) {
            $q->where('status', 'Enrolled')
              ->orderBy('lname')->orderBy('fname');
        }])->where('public_id', $classId)->firstOrFail();

        return response()->json([
            'data' => [
                'class' => $class->only(['class_id', 'gradeLevel', 'strand', 'section', 'dept', 'adviser', 'schoolYear', 'semester']),
                'students' => $class->students->map(fn ($s, $i) => [
                    'no' => $i + 1,
                    'reg_id' => $s->reg_id,
                    'student_id' => $s->student_id,
                    'lrn' => $s->lrn,
                    'name' => "{$s->lname}, {$s->fname} {$s->mname}" . ($s->suffix !== '-' ? " {$s->suffix}" : ''),
                    'sex' => $s->sex,
                ]),
                'total' => $class->students->count(),
                'male_count' => $class->students->where('sex', 'Male')->count(),
                'female_count' => $class->students->where('sex', 'Female')->count(),
            ],
        ]);
    }

    /**
     * By grade level with contact information.
     */
    public function byGradeLevelContact(Request $request): JsonResponse
    {
        $sy = $request->query('schoolYear');
        $dept = $request->query('dept');
        $gradeLevel = $request->query('gradeLevel');
        $sex = $request->query('sex');
        $status = $request->query('status', 'Enrolled');

        $query = Student::query();
        if ($sy) $query->where('schoolYear', $sy);
        if ($dept) $query->where('dept', $dept);
        if ($gradeLevel) $query->where('gradeLevel', $gradeLevel);
        if ($sex) $query->where('sex', $sex);
        if ($status) $query->where('status', $status);

        $students = $query->orderBy('lname')->orderBy('fname')
            ->get(['reg_id', 'student_id', 'lrn', 'lname', 'fname', 'mname', 'suffix', 'sex',
                    'gradeLevel', 'section', 'dept',
                    'guardian_lname', 'guardian_fname', 'guardian_contact', 'guardian_relation',
                    'address_street', 'address_brgy', 'address_city_mun', 'address_province']);

        return response()->json([
            'data' => $students->map(fn ($s) => [
                'reg_id' => $s->reg_id,
                'student_id' => $s->student_id,
                'lrn' => $s->lrn,
                'name' => "{$s->lname}, {$s->fname} {$s->mname}" . ($s->suffix !== '-' ? " {$s->suffix}" : ''),
                'sex' => $s->sex,
                'gradeLevel' => $s->gradeLevel,
                'section' => $s->section,
                'guardian' => trim("{$s->guardian_lname}, {$s->guardian_fname}"),
                'guardian_contact' => $s->guardian_contact,
                'guardian_relation' => $s->guardian_relation,
                'address' => implode(', ', array_filter([
                    $s->address_street, $s->address_brgy, $s->address_city_mun, $s->address_province,
                ])),
            ]),
            'total' => $students->count(),
        ]);
    }

    /**
     * Attendance sheet — blank template data per class for a given month.
     */
    public function attendanceSheet(Request $request, string $classId): JsonResponse
    {
        $class = ClassModel::with(['students' => function ($q) {
            $q->where('status', 'Enrolled')
              ->orderBy('lname')->orderBy('fname');
        }])->where('public_id', $classId)->firstOrFail();

        $month = (int) $request->query('month', now()->month);
        $year = (int) $request->query('year', now()->year);

        $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);

        return response()->json([
            'data' => [
                'class' => $class->only(['class_id', 'gradeLevel', 'strand', 'section', 'dept', 'adviser', 'schoolYear']),
                'month' => $month,
                'year' => $year,
                'days_in_month' => $daysInMonth,
                'students' => $class->students->map(fn ($s, $i) => [
                    'no' => $i + 1,
                    'reg_id' => $s->reg_id,
                    'name' => "{$s->lname}, {$s->fname}" . ($s->suffix !== '-' ? " {$s->suffix}" : ''),
                    'sex' => $s->sex,
                ]),
                'total' => $class->students->count(),
                'male_count' => $class->students->where('sex', 'Male')->count(),
                'female_count' => $class->students->where('sex', 'Female')->count(),
            ],
        ]);
    }

    // ── Form 137 — Permanent Academic Record ──────────────────────────────────

    /**
     * Generate and stream a Form 137 PDF for a student.
     * Walks the prev_sy_reg_id chain to collect grades across all school years.
     *
     * GET /registrar/reports/students/{reg_id}/form-137
     */
    public function form137(Request $request, string $regId): Response
    {
        $student = Student::where('public_id', $regId)->firstOrFail();

        // Walk the prev_sy_reg_id chain oldest-first.
        $chain = $this->buildAcademicChain($student);

        // Load grades for every record in the chain.
        $academicHistory = [];
        foreach ($chain as $record) {
            $grades = Grade::where('reg_id', $record->reg_id)
                ->with('classInfo:class_id,gradeLevel,strand,section,schoolYear,semester')
                ->orderBy('subject')
                ->get();

            $withFinal  = $grades->filter(fn ($g) => $g->final_grade !== null);
            $avg        = $withFinal->isNotEmpty()
                ? round((float) $withFinal->avg('final_grade'), 2)
                : null;

            $academicHistory[] = [
                'school_year'     => $record->schoolYear,
                'grade_level'     => $record->gradeLevel,
                'dept'            => $record->dept,
                'strand'          => $record->strand,
                'section'         => $record->section,
                'student_id'      => $record->student_id,
                'general_average' => $avg,
                'passed'          => $avg !== null ? ($avg >= 75) : null,
                'grades'          => $grades->map(fn ($g) => [
                    'subject'     => $g->subject,
                    'q1'          => $g->q1,
                    'q2'          => $g->q2,
                    'q3'          => $g->q3,
                    'q4'          => $g->q4,
                    'final_grade' => $g->final_grade,
                    'remarks'     => $g->remarks,
                ])->values()->toArray(),
            ];
        }

        $pdf = Pdf::loadView('pdf.form-137', [
            'student'         => $student,
            'academicHistory' => $academicHistory,
            'generatedAt'     => now()->format('F j, Y'),
        ])->setPaper('legal', 'portrait');

        $filename = "Form137_{$student->lname}_{$student->fname}_{$student->schoolYear}.pdf";

        return $pdf->stream($filename);
    }

    /**
     * Build oldest-to-newest chain of Student records via prev_sy_reg_id.
     *
     * @return \App\Models\Student[]
     */
    private function buildAcademicChain(Student $student): array
    {
        $chain   = [];
        $current = $student;

        while ($current !== null) {
            array_unshift($chain, $current); // prepend so oldest ends up first
            $current = $current->prev_sy_reg_id
                ? Student::find($current->prev_sy_reg_id)
                : null;
        }

        return $chain;
    }
}
