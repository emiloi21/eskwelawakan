<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Models\LmsAssignment;
use App\Models\LmsQuizAttempt;
use App\Models\LmsQuizChoice;
use App\Models\LmsQuizQuestion;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LmsQuizController extends Controller
{
    // ── Helpers ────────────────────────────────────────────────────────────────

    private function ownerAssignment(Request $request, string $classId, string $publicId): LmsAssignment
    {
        $class = ClassModel::where('class_id', $classId)
            ->where('adviser_id', $request->user()->id)
            ->firstOrFail();

        return LmsAssignment::where('public_id', $publicId)
            ->where('class_id', $class->class_id)
            ->where('type', 'quiz')
            ->firstOrFail();
    }

    // ── Questions CRUD ─────────────────────────────────────────────────────────

    /**
     * GET /teacher/classes/{classId}/assignments/{publicId}/questions
     * Return all questions with their choices (teacher view — shows correct answers).
     */
    public function index(Request $request, string $classId, string $publicId): JsonResponse
    {
        $assignment = $this->ownerAssignment($request, $classId, $publicId);

        $questions = LmsQuizQuestion::where('assignment_id', $assignment->id)
            ->with('choices')
            ->orderBy('order')
            ->get();

        return response()->json(['data' => $questions, 'assignment' => $assignment]);
    }

    /**
     * POST /teacher/classes/{classId}/assignments/{publicId}/questions
     * Bulk-replace questions (simplifies builder UX: always send full set).
     * Body: { questions: [{ type, question, points, order, choices: [{ text, is_correct, order }] }] }
     */
    public function sync(Request $request, string $classId, string $publicId): JsonResponse
    {
        $assignment = $this->ownerAssignment($request, $classId, $publicId);

        $validated = $request->validate([
            'questions'                     => 'required|array|max:100',
            'questions.*.type'              => 'required|in:multiple_choice,true_false,short_answer',
            'questions.*.question'          => 'required|string|max:5000',
            'questions.*.points'            => 'integer|min:1|max:100',
            'questions.*.order'             => 'integer|min:0',
            'questions.*.choices'           => 'required_unless:questions.*.type,short_answer|array|max:6',
            'questions.*.choices.*.text'    => 'required|string|max:500',
            'questions.*.choices.*.is_correct' => 'required|boolean',
            'questions.*.choices.*.order'   => 'integer|min:0',
        ]);

        DB::transaction(function () use ($assignment, $validated) {
            // Wipe existing questions (cascade deletes choices + answers)
            LmsQuizQuestion::where('assignment_id', $assignment->id)->delete();

            foreach ($validated['questions'] as $qData) {
                $question = LmsQuizQuestion::create([
                    'assignment_id' => $assignment->id,
                    'type'          => $qData['type'],
                    'question'      => $qData['question'],
                    'points'        => $qData['points'] ?? 1,
                    'order'         => $qData['order'] ?? 0,
                ]);

                foreach ($qData['choices'] ?? [] as $cData) {
                    LmsQuizChoice::create([
                        'question_id' => $question->id,
                        'text'        => $cData['text'],
                        'is_correct'  => $cData['is_correct'],
                        'order'       => $cData['order'] ?? 0,
                    ]);
                }
            }
        });

        $questions = LmsQuizQuestion::where('assignment_id', $assignment->id)
            ->with('choices')
            ->orderBy('order')
            ->get();

        return response()->json(['data' => $questions, 'message' => 'Quiz questions saved.']);
    }

    /**
     * GET /teacher/classes/{classId}/assignments/{publicId}/results
     * Return all student attempts with scores (teacher results view).
     */
    public function results(Request $request, string $classId, string $publicId): JsonResponse
    {
        $assignment = $this->ownerAssignment($request, $classId, $publicId);

        $students = Student::where('class_id', function ($q) use ($assignment) {
            $q->select('class_id')->from('lms_assignments')->where('id', $assignment->id);
        })
            ->whereIn('status', ['Enrolled', 'For Payment', 'Accounts Assessment'])
            ->orderBy('lname')->orderBy('fname')
            ->get(['reg_id', 'student_id', 'lname', 'fname', 'mname']);

        $attempts = LmsQuizAttempt::where('assignment_id', $assignment->id)
            ->get()
            ->groupBy('student_reg_id');

        $roster = $students->map(function ($student) use ($attempts) {
            $studentAttempts = $attempts->get($student->reg_id, collect());
            $best = $studentAttempts->sortByDesc('score')->first();
            return [
                'reg_id'     => $student->reg_id,
                'student_id' => $student->student_id,
                'name'       => trim("{$student->lname}, {$student->fname}" . ($student->mname ? " {$student->mname}" : '')),
                'attempts'   => $studentAttempts->count(),
                'best_score' => $best?->score,
                'max_score'  => $best?->max_score,
                'submitted_at' => $best?->submitted_at,
            ];
        });

        return response()->json([
            'assignment' => $assignment,
            'roster'     => $roster,
        ]);
    }

    /**
     * GET /teacher/classes/{classId}/assignments/{publicId}/results/{attemptId}
     * Full attempt detail — all answers with correctness.
     */
    public function attemptDetail(Request $request, string $classId, string $publicId, int $attemptId): JsonResponse
    {
        $assignment = $this->ownerAssignment($request, $classId, $publicId);

        $attempt = LmsQuizAttempt::where('id', $attemptId)
            ->where('assignment_id', $assignment->id)
            ->with(['answers.question.choices', 'answers.choice', 'student'])
            ->firstOrFail();

        return response()->json(['data' => $attempt]);
    }

    /**
     * POST /teacher/classes/{classId}/assignments/{publicId}/results/{attemptId}/grade-short
     * Manually grade short-answer questions in an attempt.
     * Body: { grades: [{ answer_id, points_earned, is_correct }] }
     */
    public function gradeShortAnswers(Request $request, string $classId, string $publicId, int $attemptId): JsonResponse
    {
        $assignment = $this->ownerAssignment($request, $classId, $publicId);

        $attempt = LmsQuizAttempt::where('id', $attemptId)
            ->where('assignment_id', $assignment->id)
            ->firstOrFail();

        $validated = $request->validate([
            'grades'                   => 'required|array',
            'grades.*.answer_id'       => 'required|integer|exists:lms_quiz_answers,id',
            'grades.*.points_earned'   => 'required|numeric|min:0',
            'grades.*.is_correct'      => 'required|boolean',
        ]);

        DB::transaction(function () use ($attempt, $validated) {
            foreach ($validated['grades'] as $grade) {
                $attempt->answers()
                    ->where('id', $grade['answer_id'])
                    ->update([
                        'points_earned' => $grade['points_earned'],
                        'is_correct'    => $grade['is_correct'],
                    ]);
            }

            // Recompute total score
            $total = $attempt->answers()->sum('points_earned');
            $attempt->update(['score' => $total]);
        });

        return response()->json(['message' => 'Short answers graded.', 'score' => $attempt->fresh()->score]);
    }
}
