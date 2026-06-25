<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\Requirement;
use App\Models\Student;
use App\Models\StudentRequirement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StudentEnrollmentController extends Controller
{
    private function getStudent(Request $request): Student
    {
        $regId = $request->user()->reg_id;

        if (! $regId) {
            abort(403, 'Your account is not linked to a student record.');
        }

        return Student::with(['classInfo'])->findOrFail($regId);
    }

    private function buildChecklist(Student $student): \Illuminate\Support\Collection
    {
        $reqs = Requirement::where('dept', $student->dept)
            ->where('gradeLevel', $student->gradeLevel)
            ->where('classification', $student->classification)
            ->where('schoolYear', $student->schoolYear)
            ->get();

        $submissions = StudentRequirement::where('student_id', $student->student_id)
            ->where('schoolYear', $student->schoolYear)
            ->get()
            ->keyBy('require_id');

        return $reqs->map(function ($req) use ($submissions) {
            $sub = $submissions->get($req->require_id);

            return [
                'require_id'       => $req->require_id,
                'public_id'        => $req->public_id,
                'requirement_name' => $req->requirement_name,
                'description'      => $req->description,
                'type'             => $req->type,
                'purpose'          => $req->purpose,
                'submission'       => $sub ? [
                    'stud_reqs_id' => $sub->stud_reqs_id,
                    'public_id'    => $sub->public_id,
                    'status'       => $sub->status,
                    'file_path'    => $sub->file_path
                        ? url('storage/' . $sub->file_path)
                        : null,
                    'remarks'      => $sub->remarks,
                ] : null,
            ];
        });
    }

    /**
     * GET /student/enrollment — current enrollment status + re-enrollment info.
     */
    public function status(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);
        $pending = Student::where('prev_sy_reg_id', $student->reg_id)->first();

        return response()->json([
            'data' => [
                'current' => [
                    'student_id'     => $student->student_id,
                    'name'           => "{$student->lname}, {$student->fname}",
                    'grade_level'    => $student->gradeLevel,
                    'strand'         => $student->strand,
                    'dept'           => $student->dept,
                    'school_year'    => $student->schoolYear,
                    'classification' => $student->classification,
                    'status'         => $student->status,
                    'section'        => $student->section,
                    'remarks'        => $student->remarks,
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
     * GET /student/enrollment/requirements — requirement checklist for current SY.
     */
    public function requirements(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);

        return response()->json(['data' => $this->buildChecklist($student)]);
    }

    /**
     * POST /student/enrollment/requirements/{requirePublicId}/submit
     * Ensure a StudentRequirement row exists.
     */
    public function submitRequirement(Request $request, string $requirePublicId): JsonResponse
    {
        $student = $this->getStudent($request);
        $req     = Requirement::where('public_id', $requirePublicId)->firstOrFail();

        $sub = StudentRequirement::firstOrCreate(
            [
                'require_id' => $req->require_id,
                'student_id' => $student->student_id,
                'schoolYear' => $student->schoolYear,
            ],
            [
                'reg_id' => $student->reg_id,
                'status' => 'Pending',
            ]
        );

        return response()->json(['data' => $sub]);
    }

    /**
     * POST /student/enrollment/requirements/{studReqPublicId}/upload
     */
    public function uploadRequirement(Request $request, string $studReqPublicId): JsonResponse
    {
        $student = $this->getStudent($request);

        $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $sr = StudentRequirement::where('public_id', $studReqPublicId)
            ->where('student_id', $student->student_id)
            ->firstOrFail();

        if ($sr->file_path && Storage::disk('public')->exists($sr->file_path)) {
            Storage::disk('public')->delete($sr->file_path);
        }

        $path = $request->file('file')->store('requirements/' . $sr->reg_id, 'public');

        $sr->update(['file_path' => $path, 'status' => 'For Validation']);

        return response()->json(['data' => $sr->fresh()]);
    }

    /**
     * POST /student/enrollment/re-enroll
     * Submit a re-enrollment request for the next school year.
     */
    public function reEnroll(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);

        if ($student->status !== 'Enrolled') {
            return response()->json([
                'message' => 'Only currently enrolled students can submit a re-enrollment request.',
            ], 422);
        }

        $existing = Student::where('prev_sy_reg_id', $student->reg_id)->first();
        if ($existing) {
            return response()->json([
                'message' => 'A re-enrollment request already exists.',
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
            'message' => 'Re-enrollment request submitted. The registrar will review your application.',
            'data'    => [
                'public_id'   => $promoted->public_id,
                'grade_level' => $promoted->gradeLevel,
                'school_year' => $promoted->schoolYear,
                'status'      => $promoted->status,
            ],
        ], 201);
    }
}
