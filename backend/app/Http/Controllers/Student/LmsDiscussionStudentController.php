<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\LmsDiscussion;
use App\Models\LmsDiscussionReply;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LmsDiscussionStudentController extends Controller
{
    // ── Helper ─────────────────────────────────────────────────────────────────

    private function getClassId(Request $request): int
    {
        $regId = $request->user()->reg_id;

        if (! $regId) {
            abort(403, 'Your account is not linked to a student record.');
        }

        $student = Student::findOrFail($regId);

        if (! $student->class_id) {
            abort(403, 'You are not assigned to a class.');
        }

        return $student->class_id;
    }

    // ── Discussions ────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $classId = $this->getClassId($request);

        $discussions = LmsDiscussion::where('class_id', $classId)
            ->with('author:id,fname,lname')
            ->orderByDesc('is_pinned')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json(['data' => $discussions]);
    }

    public function show(Request $request, string $publicId): JsonResponse
    {
        $classId = $this->getClassId($request);

        $discussion = LmsDiscussion::where('public_id', $publicId)
            ->where('class_id', $classId)
            ->with('author:id,fname,lname')
            ->firstOrFail();

        $replies = $discussion->replies()
            ->with('author:id,fname,lname')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'discussion' => $discussion,
            'replies'    => $replies,
        ]);
    }

    // ── Replies ────────────────────────────────────────────────────────────────

    public function storeReply(Request $request, string $publicId): JsonResponse
    {
        $classId = $this->getClassId($request);

        $discussion = LmsDiscussion::where('public_id', $publicId)
            ->where('class_id', $classId)
            ->firstOrFail();

        $validated = $request->validate([
            'body' => 'required|string|max:10000',
        ]);

        $reply = LmsDiscussionReply::create([
            'discussion_id' => $discussion->id,
            'user_id'       => $request->user()->id,
            'body'          => $validated['body'],
        ]);

        $discussion->increment('replies_count');

        $reply->load('author:id,fname,lname');

        return response()->json(['data' => $reply], 201);
    }

    public function destroyReply(Request $request, string $publicId, string $replyPublicId): JsonResponse
    {
        $classId = $this->getClassId($request);

        $discussion = LmsDiscussion::where('public_id', $publicId)
            ->where('class_id', $classId)
            ->firstOrFail();

        $reply = LmsDiscussionReply::where('public_id', $replyPublicId)
            ->where('discussion_id', $discussion->id)
            ->where('user_id', $request->user()->id) // students can only delete their own
            ->firstOrFail();

        $reply->delete();
        $discussion->decrement('replies_count');

        return response()->json(['message' => 'Reply deleted.']);
    }
}
