<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Impersonation middleware.
 *
 * When an Administrator sends the X-Impersonate-User-Id header the middleware:
 *  1. Validates the real user is an Administrator.
 *  2. Loads the target user record.
 *  3. Swaps Auth::user() to the target so ALL downstream business logic
 *     (role checks, data queries, reg_id lookups, etc.) runs as that user.
 *  4. Stores the original admin on the request so activity logging can
 *     attribute actions to the admin with impersonation context.
 */
class HandleImpersonation
{
    public function handle(Request $request, Closure $next): Response
    {
        $targetId = $request->header('X-Impersonate-User-Id');

        if (! $targetId) {
            return $next($request);
        }

        $admin = $request->user();

        // No authenticated user — ignore the header (e.g. the login request
        // itself may carry a stale impersonation header from a previous session).
        if (! $admin) {
            return $next($request);
        }

        // Only Administrators may impersonate
        if (! $admin->isAdmin()) {
            return response()->json(['message' => 'Only Administrators can use impersonation.'], 403);
        }

        $targetUser = User::find((int) $targetId);

        if (! $targetUser) {
            return response()->json(['message' => 'Impersonation target user not found.'], 404);
        }

        // Store original admin for activity logging
        $request->attributes->set('impersonated_by', $admin);
        $request->attributes->set('impersonating_as', $targetUser);

        // Swap the resolved user — all code that calls $request->user()
        // or auth()->user() will now see $targetUser.
        Auth::setUser($targetUser);

        return $next($request);
    }
}
