<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Spatie\Activitylog\Models\Activity;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // Login: 5 attempts per minute per IP
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // General API: 120 requests per minute per user/IP
        RateLimiter::for('api', function (Request $request) {
            return $request->user()
                ? Limit::perMinute(120)->by($request->user()->id)
                : Limit::perMinute(60)->by($request->ip());
        });

        // Impersonation audit: when an admin is impersonating, attribute the
        // activity to the admin (real actor) and record who was being impersonated.
        Activity::saving(function (Activity $activity) {
            $request = request();
            if (! $request->attributes->has('impersonated_by')) {
                return;
            }

            /** @var \App\Models\User $admin */
            $admin = $request->attributes->get('impersonated_by');
            /** @var \App\Models\User $targetUser */
            $targetUser = $request->attributes->get('impersonating_as');

            // Override causer to the real admin
            $activity->causer_type = get_class($admin);
            $activity->causer_id   = $admin->id;

            // Append impersonation context to properties
            $props = $activity->properties ?? collect();
            $activity->properties = $props->merge([
                'impersonated_as' => [
                    'id'   => $targetUser->id,
                    'name' => $targetUser->full_name,
                    'role' => $targetUser->access,
                ],
            ]);
        });
    }
}
