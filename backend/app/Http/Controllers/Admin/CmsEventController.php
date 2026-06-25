<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CmsEvent;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CmsEventController extends Controller
{
    public function index(): JsonResponse
    {
        $events = CmsEvent::orderBy('start_date')->get();

        return response()->json($events);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date'  => 'required|date',
            'end_date'    => 'nullable|date|after_or_equal:start_date',
            'location'    => 'nullable|string|max:255',
            'category'    => 'required|string|max:100',
            'color'       => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'is_public'   => 'boolean',
        ]);

        $event = CmsEvent::create($data);

        return response()->json($event, 201);
    }

    public function show(CmsEvent $cmsEvent): JsonResponse
    {
        return response()->json($cmsEvent);
    }

    public function update(Request $request, CmsEvent $cmsEvent): JsonResponse
    {
        $data = $request->validate([
            'title'       => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'start_date'  => 'sometimes|required|date',
            'end_date'    => 'nullable|date|after_or_equal:start_date',
            'location'    => 'nullable|string|max:255',
            'category'    => 'sometimes|required|string|max:100',
            'color'       => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'is_public'   => 'boolean',
        ]);

        $cmsEvent->update($data);

        return response()->json($cmsEvent->fresh());
    }

    public function destroy(CmsEvent $cmsEvent): JsonResponse
    {
        $cmsEvent->delete();

        return response()->json(['message' => 'Event deleted.']);
    }
}
