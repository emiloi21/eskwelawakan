<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthorized. Insufficient permissions.'], 403);
        }

        // Check primary role first (fast path), then extra designations
        if ($user->hasRole(...$roles)) {
            return $next($request);
        }

        return response()->json(['message' => 'Unauthorized. Insufficient permissions.'], 403);
    }
}
