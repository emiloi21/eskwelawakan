<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Models\LmsDiscussion;
use App\Models\LmsDiscussionReply;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LmsDiscussionController extends Controller
{
    // ── Discussions ────────────────────────────────────────────────────────────

    public function index(Request $request, int $classId): JsonResponse
    {
        $this->authorizeClass($request, $classId);

        $discussions = LmsDiscussion::where('class_id', $classId)
            ->with('author:id,fname,lname')
            ->orderByDesc('is_pinned')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json(['data' => $discussions]);
    }

    public function store(Request $request, int $classId): JsonResponse
    {
        $this->authorizeClass($request, $classId);

        $validated = $request->validate([
            'title'     => 'required|string|max:255',
            'body'      => 'required|string|max:20000',
            'is_pinned' => 'boolean',
        ]);

        $discussion = LmsDiscussion::create([
            'class_id'  => $classId,
            'user_id'   => $request->user()->id,
            'title'     => $validated['title'],
            'body'      => $validated['body'],
            'is_pinned' => $validated['is_pinned'] ?? false,
        ]);

        $discussion->load('author:id,fname,lname');

        return response()->json(['data' => $discussion], 201);
    }

    public function update(Request $request, int $classId, string $publicId): JsonResponse
    {
        $this->authorizeClass($request, $classId);

        $discussion = LmsDiscussion::where('public_id', $publicId)
            ->where('class_id', $classId)
            ->firstOrFail();

        $validated = $request->validate([
            'title'     => 'sometimes|required|string|max:255',
            'body'      => 'sometimes|required|string|max:20000',
            'is_pinned' => 'boolean',
        ]);

        $discussion->update($validated);

        return response()->json(['data' => $discussion]);
    }

    public function destroy(Request $request, int $classId, string $publicId): JsonResponse
    {
        $this->authorizeClass($request, $classId);

        $discussion = LmsDiscussion::where('public_id', $publicId)
            ->where('class_id', $classId)
            ->firstOrFail();

        $discussion->delete();

        return response()->json(['message' => 'Discussion deleted.']);
    }

    // ── Replies ────────────────────────────────────────────────────────────────

    public function replies(Request $request, int $classId, string $publicId): JsonResponse
    {
        $this->authorizeClass($request, $classId);

        $discussion = LmsDiscussion::where('public_id', $publicId)
            ->where('class_id', $classId)
            ->firstOrFail();

        $replies = $discussion->replies()
            ->with('author:id,fname,lname')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'discussion' => $discussion->load('author:id,fname,lname'),
            'replies'    => $replies,
        ]);
    }

    public function storeReply(Request $request, int $classId, string $publicId): JsonResponse
    {
        $this->authorizeClass($request, $classId);

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

    public function destroyReply(Request $request, int $classId, string $publicId, string $replyPublicId): JsonResponse
    {
        $this->authorizeClass($request, $classId);

        $discussion = LmsDiscussion::where('public_id', $publicId)
            ->where('class_id', $classId)
            ->firstOrFail();

        $reply = LmsDiscussionReply::where('public_id', $replyPublicId)
            ->where('discussion_id', $discussion->id)
            ->firstOrFail();

        $reply->delete();
        $discussion->decrement('replies_count');

        return response()->json(['message' => 'Reply deleted.']);
    }

    // ── Helper ─────────────────────────────────────────────────────────────────

    private function authorizeClass(Request $request, int $classId): void
    {
        ClassModel::where('class_id', $classId)
            ->where('teacher_id', $request->user()->personnel_id)
            ->firstOrFail();
    }
}
