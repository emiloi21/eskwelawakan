<?php

namespace App\Http\Controllers\Applicant;

use App\Http\Controllers\Controller;
use App\Models\EntranceExamBooking;
use App\Models\Requirement;
use App\Models\Student;
use App\Models\StudentRequirement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ApplicantPortalController extends Controller
{
    private function getStudent(Request $request): Student
    {
        $regId = $request->user()->reg_id;

        if (! $regId) {
            abort(403, 'Your account is not linked to a student record.');
        }

        return Student::findOrFail($regId);
    }

    /**
     * GET /applicant/status — applicant's current application status.
     */
    public function status(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);

        return response()->json([
            'data' => [
                'name'           => "{$student->lname}, {$student->fname}",
                'student_id'     => $student->student_id,
                'grade_level'    => $student->gradeLevel,
                'strand'         => $student->strand,
                'dept'           => $student->dept,
                'school_year'    => $student->schoolYear,
                'classification' => $student->classification,
                'status'         => $student->status,
                'app_date'       => $student->appDate,
                'remarks'        => $student->remarks,
            ],
        ]);
    }

    /**
     * GET /applicant/requirements — requirements checklist for this applicant.
     */
    public function requirements(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);

        $reqs = Requirement::where('dept', $student->dept)
            ->where('gradeLevel', $student->gradeLevel)
            ->where('classification', $student->classification)
            ->where('schoolYear', $student->schoolYear)
            ->get();

        $submissions = StudentRequirement::where('student_id', $student->student_id)
            ->where('schoolYear', $student->schoolYear)
            ->get()
            ->keyBy('require_id');

        $checklist = $reqs->map(function ($req) use ($submissions) {
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

        return response()->json(['data' => $checklist]);
    }

    /**
     * POST /applicant/requirements/{requirePublicId}/submit
     * Ensure a StudentRequirement row exists (creates if not present).
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
     * POST /applicant/requirements/{studReqPublicId}/upload
     * Upload a document for an existing StudentRequirement.
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

        if ($sr->file_path && Storage::disk('local')->exists($sr->file_path)) {
            Storage::disk('local')->delete($sr->file_path);
        }

        $path = $request->file('file')->store('requirements/' . $sr->reg_id, 'local');

        $sr->update([
            'file_path' => $path,
            'status'    => 'For Validation',
        ]);

        return response()->json(['data' => $sr->fresh()]);
    }

    /**
     * GET /applicant/exam-schedule
     * Return the applicant's assigned entrance exam slot (if any).
     */
    public function examSchedule(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);

        $booking = EntranceExamBooking::where('reg_id', $student->reg_id)
            ->with('slot')
            ->latest()
            ->first();

        if (! $booking || ! $booking->slot) {
            return response()->json(['data' => null]);
        }

        return response()->json([
            'data' => [
                'booking_id'   => $booking->id,
                'result'       => $booking->result,
                'remarks'      => $booking->remarks,
                'slot' => [
                    'public_id'   => $booking->slot->public_id,
                    'exam_date'   => $booking->slot->exam_date?->format('Y-m-d'),
                    'exam_time'   => $booking->slot->exam_time,
                    'location'    => $booking->slot->location,
                    'school_year' => $booking->slot->school_year,
                    'dept'        => $booking->slot->dept,
                    'grade_level' => $booking->slot->grade_level,
                    'notes'       => $booking->slot->notes,
                ],
            ],
        ]);
    }
}
