<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\LmsAssignment;
use App\Models\LmsQuizAnswer;
use App\Models\LmsQuizAttempt;
use App\Models\LmsQuizQuestion;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LmsQuizStudentController extends Controller
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

    private function getQuizAssignment(Student $student, string $publicId): LmsAssignment
    {
        return LmsAssignment::where('public_id', $publicId)
            ->where('class_id', $student->class_id)
            ->where('type', 'quiz')
            ->firstOrFail();
    }

    // ── Take Quiz ─────────────────────────────────────────────────────────────

    /**
     * GET /student/quizzes/{publicId}
     * Return quiz questions WITHOUT is_correct revealed to the student.
     * If there's an in-progress attempt, return it; otherwise return null.
     */
    public function show(Request $request, string $publicId): JsonResponse
    {
        $student    = $this->getStudent($request);
        $assignment = $this->getQuizAssignment($student, $publicId);

        $questions = LmsQuizQuestion::where('assignment_id', $assignment->id)
            ->with(['choices' => fn($q) => $q->select('id', 'question_id', 'text', 'order')->orderBy('order')])
            ->orderBy('order')
            ->get(['id', 'assignment_id', 'type', 'question', 'points', 'order']);

        $attempt = LmsQuizAttempt::where('assignment_id', $assignment->id)
            ->where('student_reg_id', $student->reg_id)
            ->orderByDesc('attempt_number')
            ->with('answers')
            ->first();

        return response()->json([
            'assignment' => $assignment->only(['id', 'public_id', 'title', 'instructions', 'points', 'due_date', 'allow_late']),
            'questions'  => $questions,
            'attempt'    => $attempt,
        ]);
    }

    /**
     * POST /student/quizzes/{publicId}/start
     * Create a new attempt (or return the current open one).
     */
    public function start(Request $request, string $publicId): JsonResponse
    {
        $student    = $this->getStudent($request);
        $assignment = $this->getQuizAssignment($student, $publicId);

        // Prevent new attempt if last one is already submitted
        $lastAttempt = LmsQuizAttempt::where('assignment_id', $assignment->id)
            ->where('student_reg_id', $student->reg_id)
            ->orderByDesc('attempt_number')
            ->first();

        if ($lastAttempt && ! $lastAttempt->submitted_at) {
            // Already an open attempt — return it
            return response()->json(['data' => $lastAttempt->load('answers')], 200);
        }

        $attemptNumber = ($lastAttempt?->attempt_number ?? 0) + 1;

        $attempt = LmsQuizAttempt::create([
            'assignment_id'  => $assignment->id,
            'student_reg_id' => $student->reg_id,
            'attempt_number' => $attemptNumber,
            'max_score'      => LmsQuizQuestion::where('assignment_id', $assignment->id)->sum('points'),
            'started_at'     => now(),
        ]);

        return response()->json(['data' => $attempt], 201);
    }

    /**
     * PUT /student/quizzes/{publicId}/attempt/{attemptId}/answer
     * Save/update one answer (called per question as the student answers).
     * Body: { question_id, choice_id?, text_answer? }
     */
    public function saveAnswer(Request $request, string $publicId, int $attemptId): JsonResponse
    {
        $student    = $this->getStudent($request);
        $assignment = $this->getQuizAssignment($student, $publicId);

        $attempt = LmsQuizAttempt::where('id', $attemptId)
            ->where('assignment_id', $assignment->id)
            ->where('student_reg_id', $student->reg_id)
            ->whereNull('submitted_at')
            ->firstOrFail();

        $validated = $request->validate([
            'question_id'  => 'required|integer|exists:lms_quiz_questions,id',
            'choice_id'    => 'nullable|integer|exists:lms_quiz_choices,id',
            'text_answer'  => 'nullable|string|max:5000',
        ]);

        $question = LmsQuizQuestion::find($validated['question_id']);

        // Auto-grade MC and T/F; leave short_answer as null
        $isCorrect    = null;
        $pointsEarned = null;

        if ($question->type !== 'short_answer' && $validated['choice_id']) {
            $choice       = $question->choices()->find($validated['choice_id']);
            $isCorrect    = $choice?->is_correct;
            $pointsEarned = $isCorrect ? $question->points : 0;
        }

        LmsQuizAnswer::updateOrCreate(
            ['attempt_id' => $attempt->id, 'question_id' => $validated['question_id']],
            [
                'choice_id'     => $validated['choice_id'] ?? null,
                'text_answer'   => $validated['text_answer'] ?? null,
                'is_correct'    => $isCorrect,
                'points_earned' => $pointsEarned,
            ]
        );

        return response()->json(['message' => 'Answer saved.']);
    }

    /**
     * POST /student/quizzes/{publicId}/attempt/{attemptId}/submit
     * Finalize the attempt — compute score.
     */
    public function submit(Request $request, string $publicId, int $attemptId): JsonResponse
    {
        $student    = $this->getStudent($request);
        $assignment = $this->getQuizAssignment($student, $publicId);

        $attempt = LmsQuizAttempt::where('id', $attemptId)
            ->where('assignment_id', $assignment->id)
            ->where('student_reg_id', $student->reg_id)
            ->whereNull('submitted_at')
            ->firstOrFail();

        DB::transaction(function () use ($attempt, $assignment) {
            $autoScore = $attempt->answers()
                ->whereNotNull('points_earned')
                ->sum('points_earned');

            $attempt->update([
                'score'        => $autoScore,
                'submitted_at' => now(),
            ]);

            // Also create / update lms_submissions so it shows in gradebook
            \App\Models\LmsSubmission::updateOrCreate(
                ['assignment_id' => $attempt->assignment_id, 'student_reg_id' => $attempt->student_reg_id],
                [
                    'status'       => 'graded',
                    'score'        => $autoScore,
                    'submitted_at' => now(),
                ]
            );
        });

        return response()->json(['data' => $attempt->fresh(), 'message' => 'Quiz submitted.']);
    }

    /**
     * GET /student/quizzes/{publicId}/result
     * Return the student's best / most recent attempt with correct answers revealed.
     */
    public function result(Request $request, string $publicId): JsonResponse
    {
        $student    = $this->getStudent($request);
        $assignment = $this->getQuizAssignment($student, $publicId);

        $attempt = LmsQuizAttempt::where('assignment_id', $assignment->id)
            ->where('student_reg_id', $student->reg_id)
            ->whereNotNull('submitted_at')
            ->orderByDesc('attempt_number')
            ->with(['answers.question.choices', 'answers.choice'])
            ->firstOrFail();

        return response()->json(['data' => $attempt, 'assignment' => $assignment]);
    }
}
