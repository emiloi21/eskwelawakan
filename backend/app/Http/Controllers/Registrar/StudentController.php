<?php

namespace App\Http\Controllers\Registrar;

use App\Http\Controllers\Controller;
use App\Models\AccountsAssessment;
use App\Models\AccountsCatParticular;
use App\Models\AssessmentPayable;
use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\IdcodeGen;
use App\Services\CacheService;
use App\Services\GlJournalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Student::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('lname', 'like', "%{$search}%")
                  ->orWhere('fname', 'like', "%{$search}%")
                  ->orWhere('student_id', 'like', "%{$search}%")
                  ->orWhere('lrn', 'like', "%{$search}%");
            });
        }

        if ($dept = $request->query('dept')) {
            $query->where('dept', $dept);
        }

        if ($gradeLevel = $request->query('gradeLevel')) {
            $query->where('gradeLevel', $gradeLevel);
        }

        if ($strand = $request->query('strand')) {
            $query->where('strand', $strand);
        }

        if ($sex = $request->query('sex')) {
            $query->where('sex', $sex);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }

        if ($classId = $request->query('class_id')) {
            $query->where('class_id', $classId);
        }

        if ($classification = $request->query('classification')) {
            $query->where('classification', $classification);
        }

        $students = $query->with('classInfo')
            ->orderBy('lname')
            ->orderBy('fname')
            ->paginate($request->query('per_page', 25));

        return response()->json($students);
    }

    public function export(Request $request)
    {
        $query = Student::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('lname', 'like', "%{$search}%")
                  ->orWhere('fname', 'like', "%{$search}%")
                  ->orWhere('student_id', 'like', "%{$search}%")
                  ->orWhere('lrn', 'like', "%{$search}%");
            });
        }

        if ($dept = $request->query('dept')) {
            $query->where('dept', $dept);
        }

        if ($gradeLevel = $request->query('gradeLevel')) {
            $query->where('gradeLevel', $gradeLevel);
        }

        if ($strand = $request->query('strand')) {
            $query->where('strand', $strand);
        }

        if ($sex = $request->query('sex')) {
            $query->where('sex', $sex);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }

        $students = $query->orderBy('lname')->orderBy('fname')->get();

        $headers = ['Student ID', 'LRN', 'Last Name', 'First Name', 'Middle Name', 'Suffix', 'Sex', 'Age', 'Department', 'Grade Level', 'Strand', 'Section', 'Classification', 'School Year', 'Semester', 'Status'];

        $callback = function () use ($students, $headers) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $headers);
            foreach ($students as $s) {
                fputcsv($file, [
                    $s->student_id,
                    $s->lrn,
                    $s->lname,
                    $s->fname,
                    $s->mname ?: '',
                    $s->suffix !== '-' ? $s->suffix : '',
                    $s->sex,
                    $s->age,
                    $s->dept,
                    $s->gradeLevel,
                    $s->strand !== 'N/A' ? $s->strand : '',
                    $s->section !== '-' ? $s->section : '',
                    $s->classification,
                    $s->schoolYear,
                    $s->sem,
                    $s->status,
                ]);
            }
            fclose($file);
        };

        $filename = 'students_' . ($request->query('schoolYear') ?? 'all') . '.csv';

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lrn' => ['required', 'string', 'max:12'],
            'esc_id' => ['nullable', 'string', 'max:8'],
            'student_id' => ['nullable', 'string', 'max:25', 'unique:students,student_id'],
            'lname' => ['required', 'string', 'max:255'],
            'fname' => ['required', 'string', 'max:255'],
            'mname' => ['nullable', 'string', 'max:255'],
            'suffix' => ['nullable', 'string', 'max:5'],
            'bdMM' => ['required', 'string', 'max:2'],
            'bdDD' => ['required', 'string', 'max:2'],
            'bdYYYY' => ['required', 'string', 'max:4'],
            'sex' => ['required', 'string', Rule::in(['Male', 'Female'])],
            'age' => ['nullable', 'integer', 'min:1', 'max:99'],
            'address_street' => ['nullable', 'string', 'max:55'],
            'address_brgy' => ['nullable', 'string', 'max:55'],
            'address_city_mun' => ['nullable', 'string', 'max:55'],
            'address_province' => ['nullable', 'string', 'max:55'],
            'guardian_lname' => ['nullable', 'string', 'max:55'],
            'guardian_fname' => ['nullable', 'string', 'max:55'],
            'guardian_contact' => ['required', 'string', 'max:25'],
            'guardian_relation' => ['required', 'string', 'max:55'],
            'g_address_street' => ['nullable', 'string', 'max:55'],
            'g_address_brgy' => ['nullable', 'string', 'max:55'],
            'g_address_city_mun' => ['nullable', 'string', 'max:55'],
            'g_address_province' => ['nullable', 'string', 'max:55'],
            'last_school' => ['required', 'string', 'max:255'],
            'last_school_sy' => ['required', 'string', 'max:9'],
            'last_school_type' => ['required', 'string', 'max:25'],
            'gen_average' => ['nullable', 'integer', 'min:0', 'max:100'],
            'dept' => ['required', 'string', 'max:55'],
            'gradeLevel' => ['required', 'string', 'max:55'],
            'strand' => ['nullable', 'string', 'max:55'],
            'major' => ['nullable', 'string', 'max:55'],
            'classification' => ['required', 'string', 'max:55'],
            'schoolYear' => ['required', 'string', 'max:10'],
            'sem' => ['nullable', 'string', 'max:25'],
            'status' => ['nullable', 'string', 'max:55'],
            'remarks' => ['nullable', 'string', 'max:190'],
        ]);

        $validated['suffix'] = $validated['suffix'] ?? '-';
        $validated['mname'] = $validated['mname'] ?? '';
        $validated['esc_id'] = $validated['esc_id'] ?? '0';
        $validated['strand'] = $validated['strand'] ?? 'N/A';
        $validated['major'] = $validated['major'] ?? 'N/A';
        $validated['sem'] = $validated['sem'] ?? '1st Semester';
        $validated['section'] = '-';
        $validated['appDate'] = now()->format('m/d/Y');
        $validated['appTime'] = now()->format('h:i A');
        $validated['status'] = $validated['status'] ?? 'For Accounts Assessment';

        // Auto-generate student ID if not provided
        if (empty($validated['student_id'])) {
            $validated['student_id'] = $this->generateStudentId($validated['dept']);
        }

        $student = Student::create($validated);

        CacheService::bustStudentStats();

        return response()->json(['data' => $student->load('classInfo')], 201);
    }

    public function show(string $regId): JsonResponse
    {
        $student = Student::with(['classInfo', 'requirements.requirement', 'assessments'])
            ->where('public_id', $regId)->firstOrFail();

        return response()->json(['data' => $student]);
    }

    public function update(Request $request, string $regId): JsonResponse
    {
        /** @var Student $student */
        $student = Student::findByPublicIdOrFail($regId);

        $validated = $request->validate([
            'lrn' => ['sometimes', 'string', 'max:12'],
            'esc_id' => ['nullable', 'string', 'max:8'],
            'student_id' => ['sometimes', 'string', 'max:25',
                Rule::unique('students')->ignore($student->reg_id, 'reg_id')],
            'lname' => ['sometimes', 'string', 'max:255'],
            'fname' => ['sometimes', 'string', 'max:255'],
            'mname' => ['nullable', 'string', 'max:255'],
            'suffix' => ['nullable', 'string', 'max:5'],
            'bdMM' => ['sometimes', 'string', 'max:2'],
            'bdDD' => ['sometimes', 'string', 'max:2'],
            'bdYYYY' => ['sometimes', 'string', 'max:4'],
            'sex' => ['sometimes', 'string', Rule::in(['Male', 'Female'])],
            'age' => ['nullable', 'integer', 'min:1', 'max:99'],
            'address_street' => ['nullable', 'string', 'max:55'],
            'address_brgy' => ['nullable', 'string', 'max:55'],
            'address_city_mun' => ['nullable', 'string', 'max:55'],
            'address_province' => ['nullable', 'string', 'max:55'],
            'guardian_lname' => ['nullable', 'string', 'max:55'],
            'guardian_fname' => ['nullable', 'string', 'max:55'],
            'guardian_contact' => ['sometimes', 'string', 'max:25'],
            'guardian_relation' => ['sometimes', 'string', 'max:55'],
            'g_address_street' => ['nullable', 'string', 'max:55'],
            'g_address_brgy' => ['nullable', 'string', 'max:55'],
            'g_address_city_mun' => ['nullable', 'string', 'max:55'],
            'g_address_province' => ['nullable', 'string', 'max:55'],
            'last_school' => ['sometimes', 'string', 'max:255'],
            'last_school_sy' => ['sometimes', 'string', 'max:9'],
            'last_school_type' => ['sometimes', 'string', 'max:25'],
            'gen_average' => ['nullable', 'integer', 'min:0', 'max:100'],
            'class_id' => ['nullable', 'integer'],
            'dept' => ['sometimes', 'string', 'max:55'],
            'gradeLevel' => ['sometimes', 'string', 'max:55'],
            'strand' => ['nullable', 'string', 'max:55'],
            'major' => ['nullable', 'string', 'max:55'],
            'section' => ['nullable', 'string', 'max:55'],
            'classification' => ['sometimes', 'string', 'max:55'],
            'schoolYear' => ['sometimes', 'string', 'max:10'],
            'sem' => ['nullable', 'string', 'max:25'],
            'assessment_id' => ['nullable', 'integer', 'exists:accounts_assessments,assessment_id'],
            'status' => ['sometimes', 'string', 'max:55'],
            'remarks' => ['nullable', 'string', 'max:190'],
        ]);

        $validated['suffix'] = $validated['suffix'] ?? '-';
        $validated['mname'] = $validated['mname'] ?? '';
        $validated['esc_id'] = $validated['esc_id'] ?? '0';
        $validated['strand'] = $validated['strand'] ?? 'N/A';
        $validated['major'] = $validated['major'] ?? 'N/A';
        $validated['sem'] = $validated['sem'] ?? '1st Semester';

        // When status changes from "For Accounts Assessment" to "For Payment", require assessment assignment
        $isTransitionToPayment = ($student->status === 'For Accounts Assessment')
            && isset($validated['status'])
            && $validated['status'] === 'For Payment';

        if ($isTransitionToPayment) {
            if (empty($validated['assessment_id'])) {
                return response()->json([
                    'message' => 'An assessment must be selected when moving to "For Payment".',
                ], 422);
            }

            return DB::transaction(function () use ($student, $validated, $request) {
                $this->assignAssessment($student, $validated['assessment_id'], $request->user()->id);
                $validated['stat_date'] = now()->format('m/d/Y');
                $student->update($validated);
                CacheService::bustStudentStats();
                return response()->json(['data' => $student->fresh()->load('classInfo')]);
            });
        }

        $student->update($validated);

        CacheService::bustStudentStats();

        return response()->json(['data' => $student->fresh()->load('classInfo')]);
    }

    public function destroy(string $regId): JsonResponse
    {
        $student = Student::findByPublicIdOrFail($regId);
        $student->delete();

        CacheService::bustStudentStats();

        return response()->json(['message' => 'Student record deleted.']);
    }

    public function counts(Request $request): JsonResponse
    {
        $sy = $request->query('schoolYear');
        $query = Student::query();

        if ($sy) {
            $query->where('schoolYear', $sy);
        }

        $byStatus = (clone $query)->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        // Raw rows grouped by dept / gradeLevel / strand / sex
        $rawRows = (clone $query)
            ->selectRaw("
                CASE WHEN dept = 'Junior High' THEN 'Junior High School' ELSE dept END as dept,
                gradeLevel,
                strand,
                sex,
                count(*) as cnt
            ")
            ->groupBy('dept', 'gradeLevel', 'strand', 'sex')
            ->get();

        // Build grade-level breakdown (male / female / total)
        $gradeMap = [];
        foreach ($rawRows as $row) {
            $key = $row->dept . '||' . $row->gradeLevel . '||' . ($row->strand ?? '');
            if (!isset($gradeMap[$key])) {
                $gradeMap[$key] = [
                    'dept'       => $row->dept,
                    'gradeLevel' => $row->gradeLevel,
                    'strand'     => ($row->strand && $row->strand !== 'N/A') ? $row->strand : null,
                    'male'       => 0,
                    'female'     => 0,
                    'total'      => 0,
                ];
            }
            if (strtolower($row->sex ?? '') === 'male') {
                $gradeMap[$key]['male'] += $row->cnt;
            } elseif (strtolower($row->sex ?? '') === 'female') {
                $gradeMap[$key]['female'] += $row->cnt;
            }
            $gradeMap[$key]['total'] += $row->cnt;
        }

        // Build department breakdown (male / female / total)
        $deptMap = [];
        foreach ($rawRows as $row) {
            $dept = $row->dept;
            if (!isset($deptMap[$dept])) {
                $deptMap[$dept] = ['male' => 0, 'female' => 0, 'total' => 0];
            }
            if (strtolower($row->sex ?? '') === 'male') {
                $deptMap[$dept]['male'] += $row->cnt;
            } elseif (strtolower($row->sex ?? '') === 'female') {
                $deptMap[$dept]['female'] += $row->cnt;
            }
            $deptMap[$dept]['total'] += $row->cnt;
        }

        return response()->json([
            'total'          => $query->count(),
            'by_status'      => $byStatus,
            'by_department'  => $deptMap,
            'by_grade_level' => array_values($gradeMap),
        ]);
    }

    public function uploadPhoto(Request $request, string $regId): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:2048'],
        ]);

        $student = Student::findByPublicIdOrFail($regId);

        // Delete old photo if exists
        if ($student->img && Storage::disk('public')->exists($student->img)) {
            Storage::disk('public')->delete($student->img);
        }

        $path = $request->file('photo')->store('photos/' . $regId, 'public');
        $student->update(['img' => $path]);

        return response()->json([
            'data' => $student->fresh()->load('classInfo'),
            'message' => 'Photo uploaded.',
        ]);
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
        $yearPrefix = date('y');

        $idCode = IdcodeGen::where('prefix', $deptCode)->lockForUpdate()->first();

        if (!$idCode) {
            $idCode = IdcodeGen::create(['dept' => $dept, 'prefix' => $deptCode, 'last_idNum' => 0]);
        }

        $newNum = $idCode->last_idNum + 1;

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
}
