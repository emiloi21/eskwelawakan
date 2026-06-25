<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Models\LmsAssignment;
use App\Models\LmsDiscussion;
use App\Models\LmsDiscussionReply;
use App\Models\LmsQuizAttempt;
use App\Models\LmsSubmission;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LmsAnalyticsController extends Controller
{
    // ── Helpers ────────────────────────────────────────────────────────────────

    private function ownerClass(Request $request, string $classId): ClassModel
    {
        return ClassModel::where('class_id', $classId)
            ->where('adviser_id', $request->user()->id)
            ->firstOrFail();
    }

    // ── Class Analytics ────────────────────────────────────────────────────────

    public function index(Request $request, string $classId): JsonResponse
    {
        $class = $this->ownerClass($request, $classId);

        // Collect assignment & quiz IDs for this class
        $assignmentIds = LmsAssignment::where('class_id', $class->class_id)
            ->where('type', 'assignment')
            ->pluck('id');

        $quizIds = LmsAssignment::where('class_id', $class->class_id)
            ->where('type', 'quiz')
            ->pluck('id');

        $totalAssignments = $assignmentIds->count();
        $totalQuizzes     = $quizIds->count();

        // Students enrolled in this class
        $students = Student::where('class_id', $class->class_id)
            ->orderBy('lname')
            ->get(['reg_id', 'fname', 'lname', 'student_id']);

        // Bulk submission counts (turned-in or later) keyed by reg_id
        $submissionCounts = LmsSubmission::whereIn('assignment_id', $assignmentIds)
            ->whereIn('status', ['turned_in', 'graded', 'returned', 'late'])
            ->select('student_reg_id', DB::raw('COUNT(*) as cnt'))
            ->groupBy('student_reg_id')
            ->pluck('cnt', 'student_reg_id');

        // Bulk quiz attempts keyed by reg_id
        $allAttempts = LmsQuizAttempt::whereIn('assignment_id', $quizIds)
            ->whereNotNull('submitted_at')
            ->select('student_reg_id', 'assignment_id', 'score', 'max_score')
            ->get()
            ->groupBy('student_reg_id');

        $uniqueQuizzesTaken = $allAttempts->map(
            fn($rows) => $rows->pluck('assignment_id')->unique()->count()
        );

        $avgScorePct = $allAttempts->map(function ($rows) {
            $valid = $rows->filter(fn($r) => $r->max_score > 0);
            if ($valid->isEmpty()) return null;
            return round($valid->avg(fn($r) => ($r->score / $r->max_score) * 100), 1);
        });

        // Map students.reg_id → users.id for discussion lookup
        $userIdMap = DB::table('users')
            ->whereIn('reg_id', $students->pluck('reg_id'))
            ->pluck('id', 'reg_id');

        // Bulk discussion post counts keyed by user_id
        $postCounts = LmsDiscussion::where('class_id', $class->class_id)
            ->select('user_id', DB::raw('COUNT(*) as cnt'))
            ->groupBy('user_id')
            ->pluck('cnt', 'user_id');

        // Bulk reply counts keyed by user_id (replies within this class's discussions)
        $replyCounts = LmsDiscussionReply::whereHas(
            'discussion',
            fn($q) => $q->where('class_id', $class->class_id)
        )
            ->select('user_id', DB::raw('COUNT(*) as cnt'))
            ->groupBy('user_id')
            ->pluck('cnt', 'user_id');

        $data = $students->map(function ($s) use (
            $totalAssignments, $totalQuizzes,
            $submissionCounts, $uniqueQuizzesTaken, $avgScorePct,
            $userIdMap, $postCounts, $replyCounts
        ) {
            $regId  = $s->reg_id;
            $userId = $userIdMap[$regId] ?? null;
            $submitted = (int) ($submissionCounts[$regId] ?? 0);
            $taken     = (int) ($uniqueQuizzesTaken[$regId] ?? 0);
            $avgPct    = $avgScorePct[$regId] ?? null;

            return [
                'reg_id'     => $regId,
                'student_id' => $s->student_id,
                'name'       => "{$s->fname} {$s->lname}",
                'assignments' => [
                    'submitted' => $submitted,
                    'total'     => $totalAssignments,
                    'rate_pct'  => $totalAssignments > 0
                        ? round(($submitted / $totalAssignments) * 100, 1)
                        : 0,
                ],
                'quizzes' => [
                    'taken'         => $taken,
                    'total'         => $totalQuizzes,
                    'avg_score_pct' => $avgPct,
                ],
                'discussions' => [
                    'posts'   => (int) ($userId ? ($postCounts[$userId]  ?? 0) : 0),
                    'replies' => (int) ($userId ? ($replyCounts[$userId] ?? 0) : 0),
                ],
            ];
        });

        return response()->json([
            'data'   => $data,
            'totals' => [
                'assignments' => $totalAssignments,
                'quizzes'     => $totalQuizzes,
            ],
        ]);
    }
}
