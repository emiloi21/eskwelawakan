<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Activity::with('causer')
            ->latest();

        if ($request->filled('causer_id')) {
            $query->where('causer_id', $request->causer_id);
        }

        if ($request->filled('event')) {
            $query->where('event', $request->event);
        }

        if ($request->filled('subject_type')) {
            $query->where('subject_type', 'like', '%' . class_basename($request->subject_type) . '%');
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $activities = $query->paginate($request->integer('per_page', 25));

        $activities->getCollection()->transform(function (Activity $activity) {
            $props = $activity->properties ?? collect();
            $impersonatedAs = $props->get('impersonated_as');

            return [
                'id' => $activity->id,
                'description' => $activity->description,
                'event' => $activity->event,
                'subject_type' => $activity->subject_type ? class_basename($activity->subject_type) : null,
                'subject_id' => $activity->subject_id,
                'causer_name' => $activity->causer?->full_name ?? 'System',
                'causer_id' => $activity->causer_id,
                'impersonated_as' => $impersonatedAs,
                'properties' => $props->except('impersonated_as'),
                'created_at' => $activity->created_at->toDateTimeString(),
            ];
        });

        return response()->json($activities);
    }

    public function events(): JsonResponse
    {
        $events = Activity::distinct()->pluck('event')->filter()->values();

        return response()->json(['data' => $events]);
    }
}
