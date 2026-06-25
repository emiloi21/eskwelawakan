<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Models\LmsAssignment;
use App\Models\LmsSubmission;
use App\Models\LmsSubmissionFile;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class LmsAssignmentController extends Controller
{
    // ── Helpers ────────────────────────────────────────────────────────────────

    private function ownerClass(Request $request, string $classId): ClassModel
    {
        return ClassModel::where('class_id', $classId)
            ->where('adviser_id', $request->user()->id)
            ->firstOrFail();
    }

    // ── Assignments CRUD ───────────────────────────────────────────────────────

    public function index(Request $request, string $classId): JsonResponse
    {
        $class = $this->ownerClass($request, $classId);

        $assignments = LmsAssignment::where('class_id', $class->class_id)
            ->with(['deck:id,public_id,title'])
            ->withCount(['submissions', 'submissions as turned_in_count' => fn($q) => $q->whereIn('status', ['turned_in', 'graded', 'returned', 'late'])])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $assignments, 'class' => $class]);
    }

    public function store(Request $request, string $classId): JsonResponse
    {
        $class = $this->ownerClass($request, $classId);

        $validated = $request->validate([
            'type'              => 'required|in:assignment,quiz,material',
            'title'             => 'required|string|max:255',
            'instructions'      => 'nullable|string|max:10000',
            'points'            => 'nullable|numeric|min:0|max:9999',
            'due_date'          => 'nullable|date|after:now',
            'topic'             => 'nullable|string|max:100',
            'allow_late'        => 'boolean',
            'flashcard_deck_id' => 'nullable|integer|exists:flashcard_decks,id',
        ]);

        $assignment = LmsAssignment::create([
            'class_id'   => $class->class_id,
            'created_by' => $request->user()->id,
            ...$validated,
        ]);

        return response()->json(['data' => $assignment, 'message' => 'Assignment created.'], 201);
    }

    public function show(Request $request, string $classId, string $publicId): JsonResponse
    {
        $class = $this->ownerClass($request, $classId);

        $assignment = LmsAssignment::where('public_id', $publicId)
            ->where('class_id', $class->class_id)
            ->firstOrFail();

        // All enrolled students with their submission status
        $students = Student::where('class_id', $class->class_id)
            ->whereIn('status', ['Enrolled', 'For Payment', 'Accounts Assessment'])
            ->orderBy('lname')->orderBy('fname')
            ->get(['reg_id', 'student_id', 'lname', 'fname', 'mname']);

        $submissions = LmsSubmission::where('assignment_id', $assignment->id)
            ->with('files')
            ->get()
            ->keyBy('student_reg_id');

        $roster = $students->map(function ($student) use ($submissions) {
            $sub = $submissions->get($student->reg_id);
            return [
                'reg_id'     => $student->reg_id,
                'student_id' => $student->student_id,
                'name'       => trim("{$student->lname}, {$student->fname} {$student->mname}"),
                'submission' => $sub,
            ];
        });

        return response()->json([
            'data'    => $assignment,
            'roster'  => $roster,
            'class'   => $class,
        ]);
    }

    public function update(Request $request, string $classId, string $publicId): JsonResponse
    {
        $class = $this->ownerClass($request, $classId);

        $assignment = LmsAssignment::where('public_id', $publicId)
            ->where('class_id', $class->class_id)
            ->firstOrFail();

        $validated = $request->validate([
            'title'             => 'sometimes|required|string|max:255',
            'instructions'      => 'nullable|string|max:10000',
            'points'            => 'nullable|numeric|min:0|max:9999',
            'due_date'          => 'nullable|date',
            'topic'             => 'nullable|string|max:100',
            'allow_late'        => 'boolean',
            'flashcard_deck_id' => 'nullable|integer|exists:flashcard_decks,id',
        ]);

        $assignment->update($validated);

        return response()->json(['data' => $assignment, 'message' => 'Assignment updated.']);
    }

    public function destroy(Request $request, string $classId, string $publicId): JsonResponse
    {
        $class = $this->ownerClass($request, $classId);

        $assignment = LmsAssignment::where('public_id', $publicId)
            ->where('class_id', $class->class_id)
            ->firstOrFail();

        // Delete stored files from all submissions
        foreach ($assignment->submissions as $submission) {
            foreach ($submission->files as $file) {
                Storage::disk('public')->delete($file->stored_path);
            }
        }

        $assignment->delete();

        return response()->json(['message' => 'Assignment deleted.']);
    }

    // ── Gradebook ─────────────────────────────────────────────────────────────

    public function gradebook(Request $request, string $classId): JsonResponse
    {
        $class = $this->ownerClass($request, $classId);

        $assignments = LmsAssignment::where('class_id', $class->class_id)
            ->whereIn('type', ['assignment', 'quiz'])
            ->orderBy('created_at')
            ->get(['id', 'public_id', 'title', 'points', 'type', 'due_date']);

        $students = Student::where('class_id', $class->class_id)
            ->whereIn('status', ['Enrolled', 'For Payment', 'Accounts Assessment'])
            ->orderBy('lname')->orderBy('fname')
            ->get(['reg_id', 'student_id', 'lname', 'fname', 'mname']);

        $assignmentIds = $assignments->pluck('id');

        $submissions = LmsSubmission::whereIn('assignment_id', $assignmentIds)
            ->get(['assignment_id', 'student_reg_id', 'score', 'status'])
            ->groupBy('student_reg_id');

        $scores = [];
        foreach ($students as $student) {
            $studentSubs = $submissions->get($student->reg_id, collect())->keyBy('assignment_id');
            foreach ($assignments as $assignment) {
                $sub = $studentSubs->get($assignment->id);
                $scores[$student->reg_id][$assignment->id] = [
                    'score'  => $sub?->score,
                    'status' => $sub?->status ?? 'assigned',
                ];
            }
        }

        $studentList = $students->map(fn($s) => [
            'reg_id'     => $s->reg_id,
            'student_id' => $s->student_id,
            'name'       => trim("{$s->lname}, {$s->fname}" . ($s->mname ? " {$s->mname}" : '')),
        ]);

        return response()->json([
            'assignments' => $assignments,
            'students'    => $studentList,
            'scores'      => $scores,
        ]);
    }

    // ── Grading ────────────────────────────────────────────────────────────────

    public function grade(Request $request, string $classId, string $publicId, int $submissionId): JsonResponse
    {
        $class = $this->ownerClass($request, $classId);

        $assignment = LmsAssignment::where('public_id', $publicId)
            ->where('class_id', $class->class_id)
            ->firstOrFail();

        $submission = LmsSubmission::where('id', $submissionId)
            ->where('assignment_id', $assignment->id)
            ->firstOrFail();

        $validated = $request->validate([
            'score'    => ['nullable', 'numeric', 'min:0', $assignment->points ? "max:{$assignment->points}" : 'max:9999'],
            'feedback' => 'nullable|string|max:5000',
            'status'   => 'required|in:graded,returned',
        ]);

        $submission->update([
            'score'      => $validated['score'],
            'feedback'   => $validated['feedback'] ?? null,
            'status'     => $validated['status'],
            'graded_at'  => now(),
            'graded_by'  => $request->user()->id,
        ]);

        return response()->json(['data' => $submission, 'message' => 'Submission graded.']);
    }
}
