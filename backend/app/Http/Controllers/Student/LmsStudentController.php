<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\LmsAssignment;
use App\Models\LmsDiscussion;
use App\Models\LmsDiscussionReply;
use App\Models\LmsQuizAttempt;
use App\Models\LmsSubmission;
use App\Models\LmsSubmissionFile;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class LmsStudentController extends Controller
{
    // ── Helpers ────────────────────────────────────────────────────────────────

    private function getStudent(Request $request): Student
    {
        $regId = $request->user()->reg_id;

        if (! $regId) {
            abort(403, 'Your account is not linked to a student record.');
        }

        return Student::findOrFail($regId);
    }

    // ── Assignments (read) ─────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);

        if (! $student->class_id) {
            return response()->json(['data' => []]);
        }

        $assignments = LmsAssignment::where('class_id', $student->class_id)
            ->with([
                'submissions' => fn($q) => $q->where('student_reg_id', $student->reg_id)->with('files'),
                'deck:id,public_id,title',
            ])
            ->orderByDesc('created_at')
            ->get();

        // Attach the student's own submission inline for convenience
        $assignments = $assignments->map(function ($a) {
            $a->my_submission = $a->submissions->first();
            unset($a->submissions);
            return $a;
        });

        return response()->json(['data' => $assignments]);
    }

    public function show(Request $request, string $publicId): JsonResponse
    {
        $student = $this->getStudent($request);

        $assignment = LmsAssignment::where('public_id', $publicId)
            ->where('class_id', $student->class_id)
            ->with('deck:id,public_id,title')
            ->firstOrFail();

        $submission = LmsSubmission::where('assignment_id', $assignment->id)
            ->where('student_reg_id', $student->reg_id)
            ->with('files')
            ->first();

        return response()->json([
            'data'       => $assignment,
            'submission' => $submission,
        ]);
    }

    // ── Submission ─────────────────────────────────────────────────────────────

    public function submit(Request $request, string $publicId): JsonResponse
    {
        $student = $this->getStudent($request);

        $assignment = LmsAssignment::where('public_id', $publicId)
            ->where('class_id', $student->class_id)
            ->firstOrFail();

        $request->validate([
            'student_note' => 'nullable|string|max:5000',
            'files'        => 'nullable|array|max:10',
            'files.*'      => 'file|max:20480', // 20MB per file
        ]);

        $isLate = $assignment->due_date && now()->isAfter($assignment->due_date);

        if ($isLate && ! $assignment->allow_late) {
            return response()->json(['message' => 'Late submissions are not allowed for this assignment.'], 422);
        }

        $submission = DB::transaction(function () use ($request, $assignment, $student, $isLate) {
            $submission = LmsSubmission::updateOrCreate(
                [
                    'assignment_id'   => $assignment->id,
                    'student_reg_id'  => $student->reg_id,
                ],
                [
                    'status'          => $isLate ? 'late' : 'turned_in',
                    'student_note'    => $request->input('student_note'),
                    'submitted_at'    => now(),
                ]
            );

            if ($request->hasFile('files')) {
                foreach ($request->file('files') as $file) {
                    $path = $file->store("lms/submissions/{$submission->id}", 'public');
                    LmsSubmissionFile::create([
                        'submission_id' => $submission->id,
                        'original_name' => $file->getClientOriginalName(),
                        'stored_path'   => $path,
                        'file_type'     => $file->getMimeType(),
                        'file_size'     => $file->getSize(),
                    ]);
                }
            }

            return $submission->load('files');
        });

        return response()->json([
            'data'    => $submission,
            'message' => $isLate ? 'Submitted (late).' : 'Submitted successfully.',
        ], 201);
    }

    public function unsubmit(Request $request, string $publicId): JsonResponse
    {
        $student = $this->getStudent($request);

        $assignment = LmsAssignment::where('public_id', $publicId)
            ->where('class_id', $student->class_id)
            ->firstOrFail();

        $submission = LmsSubmission::where('assignment_id', $assignment->id)
            ->where('student_reg_id', $student->reg_id)
            ->whereIn('status', ['turned_in', 'late'])
            ->firstOrFail();

        // Delete attached files
        foreach ($submission->files as $file) {
            Storage::disk('public')->delete($file->stored_path);
        }

        $submission->files()->delete();
        $submission->update([
            'status'       => 'assigned',
            'student_note' => null,
            'submitted_at' => null,
        ]);

        return response()->json(['message' => 'Submission retracted.']);
    }

    public function destroyFile(Request $request, int $fileId): JsonResponse
    {
        $student = $this->getStudent($request);

        $file = LmsSubmissionFile::with('submission.assignment')
            ->findOrFail($fileId);

        // Ensure this file belongs to the authenticated student
        if ($file->submission->student_reg_id !== $student->reg_id) {
            abort(403);
        }

        // Only allow removal when not yet graded
        if (in_array($file->submission->status, ['graded', 'returned'])) {
            return response()->json(['message' => 'Cannot remove files from a graded submission.'], 422);
        }

        Storage::disk('public')->delete($file->stored_path);
        $file->delete();

        return response()->json(['message' => 'File removed.']);
    }

    // ── Progress Dashboard ──────────────────────────────────────────────────

    public function progress(Request $request): JsonResponse
    {
        $student = $this->getStudent($request);

        if (! $student->class_id) {
            return response()->json(['data' => null]);
        }

        $assignmentIds = LmsAssignment::where('class_id', $student->class_id)
            ->where('type', 'assignment')
            ->pluck('id');

        $quizIds = LmsAssignment::where('class_id', $student->class_id)
            ->where('type', 'quiz')
            ->pluck('id');

        // ── Assignments ──────────────────────────────────────────────────────
        $submissions = LmsSubmission::whereIn('assignment_id', $assignmentIds)
            ->where('student_reg_id', $student->reg_id)
            ->get(['assignment_id', 'status', 'score', 'submitted_at', 'graded_at']);

        $submittedCount = $submissions
            ->whereIn('status', ['turned_in', 'graded', 'returned', 'late'])
            ->count();
        $gradedCount = $submissions->whereIn('status', ['graded', 'returned'])->count();
        $lateCount   = $submissions->where('status', 'late')->count();
        $totalAssign = $assignmentIds->count();

        // ── Quizzes ──────────────────────────────────────────────────────────
        $attempts = LmsQuizAttempt::whereIn('assignment_id', $quizIds)
            ->where('student_reg_id', $student->reg_id)
            ->whereNotNull('submitted_at')
            ->get(['assignment_id', 'score', 'max_score', 'submitted_at']);

        $takenQuizzes  = $attempts->pluck('assignment_id')->unique()->count();
        $validAttempts = $attempts->filter(fn($a) => $a->max_score > 0);

        $avgScorePct  = $validAttempts->isEmpty() ? null
            : round($validAttempts->avg(fn($a) => ($a->score / $a->max_score) * 100), 1);
        $bestScorePct = $validAttempts->isEmpty() ? null
            : round($validAttempts->max(fn($a) => ($a->score / $a->max_score) * 100), 1);

        // ── Discussions ──────────────────────────────────────────────────────
        $userId     = $request->user()->id;
        $postCount  = LmsDiscussion::where('class_id', $student->class_id)
            ->where('user_id', $userId)->count();
        $replyCount = LmsDiscussionReply::whereHas(
            'discussion',
            fn($q) => $q->where('class_id', $student->class_id)
        )->where('user_id', $userId)->count();

        // ── Recent graded submissions ────────────────────────────────────────
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
                    'total'          => $quizIds->count(),
                    'taken'          => $takenQuizzes,
                    'avg_score_pct'  => $avgScorePct,
                    'best_score_pct' => $bestScorePct,
                ],
                'discussions' => [
                    'posts'   => $postCount,
                    'replies' => $replyCount,
                ],
                'recent_grades' => $recentGrades,
            ],
        ]);
    }
}
