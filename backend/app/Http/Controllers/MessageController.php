<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    /**
     * GET /messages/inbox
     * Returns messages received by the authenticated user, newest first.
     */
    public function inbox(Request $request): JsonResponse
    {
        $user = $request->user();

        $messages = Message::with(['sender:id,fname,lname,access'])
            ->where('recipient_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate(25);

        $unread = Message::where('recipient_id', $user->id)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'data'         => $messages->items(),
            'meta'         => [
                'current_page' => $messages->currentPage(),
                'last_page'    => $messages->lastPage(),
                'total'        => $messages->total(),
            ],
            'unread_count' => $unread,
        ]);
    }

    /**
     * GET /messages/sent
     * Returns messages sent by the authenticated user, newest first.
     */
    public function sent(Request $request): JsonResponse
    {
        $user = $request->user();

        $messages = Message::with(['recipient:id,fname,lname,access'])
            ->where('sender_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate(25);

        return response()->json([
            'data' => $messages->items(),
            'meta' => [
                'current_page' => $messages->currentPage(),
                'last_page'    => $messages->lastPage(),
                'total'        => $messages->total(),
            ],
        ]);
    }

    /**
     * GET /messages/{id}
     * Show a single message.  Marks as read if the current user is the recipient.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $message = Message::with(['sender:id,fname,lname,access', 'recipient:id,fname,lname,access'])
            ->where(function ($q) use ($user) {
                $q->where('sender_id', $user->id)
                  ->orWhere('recipient_id', $user->id);
            })
            ->findOrFail($id);

        // Auto-mark as read when recipient opens it
        if ($message->recipient_id === $user->id && $message->read_at === null) {
            $message->update(['read_at' => now()]);
        }

        return response()->json($message);
    }

    /**
     * POST /messages
     * Send a new message.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'recipient_id' => ['required', 'integer', 'exists:users,id'],
            'subject'      => ['required', 'string', 'max:255'],
            'body'         => ['required', 'string', 'max:5000'],
        ]);

        $sender = $request->user();

        // Prevent sending a message to yourself
        if ((int) $validated['recipient_id'] === $sender->id) {
            return response()->json(['message' => 'You cannot send a message to yourself.'], 422);
        }

        $message = Message::create([
            'sender_id'    => $sender->id,
            'recipient_id' => $validated['recipient_id'],
            'subject'      => $validated['subject'],
            'body'         => $validated['body'],
        ]);

        $message->load('recipient:id,fname,lname,access');

        return response()->json($message, 201);
    }

    /**
     * POST /messages/{id}/read
     * Explicitly mark a message as read.
     */
    public function markRead(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $message = Message::where('recipient_id', $user->id)->findOrFail($id);
        $message->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    /**
     * DELETE /messages/{id}
     * Soft-delete a message for the owning user.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $message = Message::where(function ($q) use ($user) {
            $q->where('sender_id', $user->id)
              ->orWhere('recipient_id', $user->id);
        })->findOrFail($id);

        $message->delete();

        return response()->json(['success' => true]);
    }

    /**
     * GET /messages/contacts
     * Returns a list of users the current user can message.
     * Logic: students/parents can message teachers and admins;
     *        teachers/admins can message everyone.
     */
    public function contacts(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = $user->access;

        $query = User::select('id', 'fname', 'lname', 'access')
            ->where('id', '!=', $user->id)
            ->where('status', 'Active');

        if (in_array($role, ['Student', 'Parent'], true)) {
            // Students & parents can only message admin/teacher/registrar roles
            $query->whereIn('access', ['Administrator', 'Teacher', 'Registrar', 'Cashier', 'Accounting Staff']);
        }
        // Admins/Teachers can message everyone — no extra filter

        $contacts = $query->orderBy('lname')->orderBy('fname')->get()
            ->map(fn($u) => [
                'id'       => $u->id,
                'name'     => trim("{$u->fname} {$u->lname}"),
                'role'     => $u->access,
            ]);

        return response()->json($contacts);
    }
}
