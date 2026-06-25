<?php

namespace App\Http\Controllers\Registrar;

use App\Http\Controllers\Controller;
use App\Models\Requirement;
use App\Models\Student;
use App\Models\StudentRequirement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class RequirementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Requirement::query();

        if ($dept = $request->query('dept')) {
            $query->where('dept', $dept);
        }

        if ($classification = $request->query('classification')) {
            $query->where('classification', $classification);
        }

        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }

        if ($gradeLevel = $request->query('gradeLevel')) {
            $query->where('gradeLevel', $gradeLevel);
        }

        $requirements = $query->withCount('studentRequirements')
            ->orderBy('dept')
            ->orderBy('gradeLevel')
            ->orderBy('requirement_name')
            ->paginate($request->query('per_page', 50));

        return response()->json($requirements);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'dept'             => ['required', 'string', 'max:55'],
            'gradeLevel'       => ['required', 'string', 'max:55'],
            'classification'   => ['required', 'string', 'max:255'],
            'requirement_name' => ['required', 'string', 'max:255'],
            'description'      => ['nullable', 'string', 'max:255'],
            'schoolYear'       => ['required', 'string', 'max:9'],
            'type'             => ['nullable', 'string', 'max:55'],
            'purpose'          => ['nullable', 'string', 'max:55'],
        ]);

        $requirement = Requirement::create($validated);

        return response()->json(['data' => $requirement], 201);
    }

    public function show(string $requireId): JsonResponse
    {
        $requirement = Requirement::withCount('studentRequirements')
            ->where('public_id', $requireId)->firstOrFail();

        return response()->json(['data' => $requirement]);
    }

    public function update(Request $request, string $requireId): JsonResponse
    {
        $requirement = Requirement::findByPublicIdOrFail($requireId);

        $validated = $request->validate([
            'dept'             => ['sometimes', 'string', 'max:55'],
            'gradeLevel'       => ['sometimes', 'string', 'max:55'],
            'classification'   => ['sometimes', 'string', 'max:255'],
            'requirement_name' => ['sometimes', 'string', 'max:255'],
            'description'      => ['nullable', 'string', 'max:255'],
            'schoolYear'       => ['sometimes', 'string', 'max:9'],
            'type'             => ['nullable', 'string', 'max:55'],
            'purpose'          => ['nullable', 'string', 'max:55'],
        ]);

        $requirement->update($validated);

        return response()->json(['data' => $requirement->fresh()]);
    }

    public function destroy(string $requireId): JsonResponse
    {
        $requirement = Requirement::findByPublicIdOrFail($requireId);

        if ($requirement->studentRequirements()->exists()) {
            return response()->json([
                'message' => 'Cannot delete requirement with student records. Remove student assignments first.',
            ], 422);
        }

        $requirement->delete();

        return response()->json(['message' => 'Requirement deleted.']);
    }

    /**
     * Get the checklist of a student's submitted requirements.
     */
    public function studentChecklist(Request $request, string $studentId): JsonResponse
    {
        $sy    = $request->query('schoolYear');
        $regId = $request->query('reg_id');

        // Resolve the student record to filter requirements by their profile
        $student = null;
        if ($regId) {
            $student = Student::find($regId);
        }
        if (!$student) {
            $student = Student::where('student_id', $studentId)
                ->when($sy, fn ($q) => $q->where('schoolYear', $sy))
                ->latest('reg_id')
                ->first();
        }

        $query = Requirement::query();

        if ($student) {
            $query->where('dept', $student->dept)
                  ->where('gradeLevel', $student->gradeLevel)
                  ->where('classification', $student->classification)
                  ->where('schoolYear', $student->schoolYear);
        } elseif ($sy) {
            $query->where('schoolYear', $sy);
        }

        $requirements = $query->orderBy('dept')->orderBy('requirement_name')->get();

        $submissions = StudentRequirement::where('student_id', $studentId)
            ->when($sy, fn ($q) => $q->where('schoolYear', $sy))
            ->get()
            ->keyBy('require_id');

        $checklist = $requirements->map(function ($r) use ($submissions) {
            /** @var \App\Models\Requirement $r */
            $sub = $submissions->get($r->require_id);
            return [
                ...$r->toArray(),
                'submitted'          => $sub !== null,
                'stud_reqs_id'       => $sub?->stud_reqs_id,
                'stud_req_public_id' => $sub?->public_id,
                'req_status'         => $sub?->status ?? 'Not Submitted',
                'file_path'          => $sub?->file_path
                    ? url('storage/' . $sub->file_path)
                    : null,
                'remarks'            => $sub?->remarks,
            ];
        });

        return response()->json(['data' => $checklist]);
    }

    /**
     * Toggle a requirement as submitted/not submitted for a student.
     */
    public function toggleStudentRequirement(Request $request, string $studentId, string $requireId): JsonResponse
    {
        $requirement = Requirement::findByPublicIdOrFail($requireId);

        $validated = $request->validate([
            'submitted'  => ['required', 'boolean'],
            'schoolYear' => ['required', 'string', 'max:9'],
            'reg_id'     => ['nullable', 'integer'],
        ]);

        if ($validated['submitted']) {
            StudentRequirement::firstOrCreate([
                'require_id' => $requirement->require_id,
                'student_id' => $studentId,
                'schoolYear' => $validated['schoolYear'],
            ], [
                'reg_id' => $validated['reg_id'] ?? 0,
            ]);
        } else {
            StudentRequirement::where('require_id', $requirement->require_id)
                ->where('student_id', $studentId)
                ->where('schoolYear', $validated['schoolYear'])
                ->delete();
        }

        return response()->json(['message' => 'Requirement updated.']);
    }

    /**
     * Upload a file for a student requirement.
     */
    public function uploadFile(Request $request, string $studReqId): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $sr = StudentRequirement::findByPublicIdOrFail($studReqId);

        // Delete old file if exists
        if ($sr->file_path && Storage::disk('public')->exists($sr->file_path)) {
            Storage::disk('public')->delete($sr->file_path);
        }

        $path = $request->file('file')->store(
            'requirements/' . $sr->reg_id,
            'public'
        );

        $sr->update([
            'file_path' => $path,
            'status' => 'For Validation',
        ]);

        return response()->json(['data' => $sr->fresh()]);
    }

    /**
     * Approve a student requirement + run auto-gate check.
     */
    public function approveRequirement(Request $request, string $studReqId): JsonResponse
    {
        $sr = StudentRequirement::findByPublicIdOrFail($studReqId);
        $remarks = $request->input('remarks', '');

        $sr->update([
            'status' => 'Approved',
            'remarks' => $remarks,
        ]);

        // Auto-gate: check if all "for Admission" requirements are now approved
        $this->checkAdmissionGate($sr);

        return response()->json(['data' => $sr->fresh()]);
    }

    /**
     * Disapprove a student requirement.
     */
    public function disapproveRequirement(Request $request, string $studReqId): JsonResponse
    {
        $sr = StudentRequirement::findByPublicIdOrFail($studReqId);

        $sr->update([
            'status' => 'Disapproved',
            'remarks' => $request->input('remarks', ''),
        ]);

        return response()->json(['data' => $sr->fresh()]);
    }

    /**
     * Auto-gate: if all "for Admission" requirements for this student are Approved,
     * auto-transition the student from "For Application Assessment" to "For Accounts Assessment".
     */
    private function checkAdmissionGate(StudentRequirement $sr): void
    {
        $student = Student::where('student_id', $sr->student_id)
            ->where('schoolYear', $sr->schoolYear)
            ->first();

        if (!$student) return;

        // Only auto-transition from these statuses
        if (!in_array($student->status, ['For Application Assessment', 'For Accounts Assessment'])) {
            return;
        }

        // Get all "for Admission" requirements for this student's profile
        $admissionReqs = Requirement::where('dept', $student->dept)
            ->where('gradeLevel', $student->gradeLevel)
            ->where('classification', $student->classification)
            ->where('purpose', 'for Admission')
            ->where('schoolYear', $student->schoolYear)
            ->pluck('require_id');

        if ($admissionReqs->isEmpty()) return;

        // Check how many are NOT yet approved
        $incomplete = 0;
        foreach ($admissionReqs as $reqId) {
            $sub = StudentRequirement::where('require_id', $reqId)
                ->where('student_id', $sr->student_id)
                ->where('schoolYear', $sr->schoolYear)
                ->first();

            if (!$sub || $sub->status !== 'Approved') {
                $incomplete++;
            }
        }

        if ($incomplete === 0) {
            // All approved — auto-transition
            $student->update(['status' => 'For Accounts Assessment']);
        } else {
            // Not all approved — keep at For Application Assessment
            if ($student->status === 'For Accounts Assessment') {
                $student->update(['status' => 'For Application Assessment']);
            }
        }
    }
}
