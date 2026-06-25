<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\Kiosk;
use App\Models\KioskSlide;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class KioskManagementController extends Controller
{
    // ── Kiosks ───────────────────────────────────────────────────────

    public function index(): JsonResponse
    {
        return response()->json(Kiosk::orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kiosk_code'     => 'nullable|string|max:8',
            'name'           => 'required|string|max:100',
            'gate_label'     => 'required|string|max:100',
            'direction_mode' => 'required|in:auto,force_in,force_out',
            'is_active'      => 'boolean',
        ]);

        return response()->json(Kiosk::create($data), 201);
    }

    public function update(Request $request, Kiosk $kiosk): JsonResponse
    {
        $data = $request->validate([
            'kiosk_code'     => 'sometimes|nullable|string|max:8',
            'name'           => 'sometimes|string|max:100',
            'gate_label'     => 'sometimes|string|max:100',
            'direction_mode' => 'sometimes|in:auto,force_in,force_out',
            'is_active'      => 'sometimes|boolean',
        ]);

        $kiosk->update($data);

        return response()->json($kiosk->fresh());
    }

    /**
     * POST /admin/kiosk-management/device-register
     * Called from the kiosk device settings dialog (using the admin's Bearer token).
     * Creates or updates a kiosk record identified by kiosk_code.
     */
    public function deviceRegister(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kiosk_code'     => 'required|string|max:8',
            'name'           => 'required|string|max:100',
            'gate_label'     => 'required|string|max:100',
            'direction_mode' => 'required|in:auto,force_in,force_out',
            'is_active'      => 'boolean',
        ]);

        $kiosk = Kiosk::updateOrCreate(
            ['kiosk_code' => $data['kiosk_code']],
            $data
        );

        return response()->json($kiosk, $kiosk->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Kiosk $kiosk): JsonResponse
    {
        $kiosk->delete();
        return response()->json(['message' => 'Kiosk deleted.']);
    }

    /**
     * GET /admin/kiosk-management/stats
     * Overall and per-kiosk attendance log KPIs.
     * Params: date (default today), date_from / date_to for range.
     */
    public function stats(Request $request): JsonResponse
    {
        $date     = $request->input('date', now()->toDateString());
        $dateFrom = $request->input('date_from', $date);
        $dateTo   = $request->input('date_to',   $date);

        $base = AttendanceLog::whereBetween(DB::raw('DATE(log_time)'), [$dateFrom, $dateTo]);

        $overall = [
            'total_in'         => (clone $base)->where('direction', 'in')->count(),
            'total_out'        => (clone $base)->where('direction', 'out')->count(),
            'student_in'       => (clone $base)->where('direction', 'in')->where('entity_type', 'student')->count(),
            'student_out'      => (clone $base)->where('direction', 'out')->where('entity_type', 'student')->count(),
            'personnel_in'     => (clone $base)->where('direction', 'in')->where('entity_type', 'personnel')->count(),
            'personnel_out'    => (clone $base)->where('direction', 'out')->where('entity_type', 'personnel')->count(),
            'unique_students'  => (clone $base)->where('entity_type', 'student')->distinct('entity_id')->count('entity_id'),
            'unique_personnel' => (clone $base)->where('entity_type', 'personnel')->distinct('entity_id')->count('entity_id'),
        ];

        $kiosks = Kiosk::orderBy('name')->get();
        $perKiosk = $kiosks->map(function (Kiosk $kiosk) use ($dateFrom, $dateTo) {
            $q = AttendanceLog::where('kiosk_code', $kiosk->kiosk_code)
                    ->whereBetween(DB::raw('DATE(log_time)'), [$dateFrom, $dateTo]);
            return [
                'id'            => $kiosk->id,
                'kiosk_code'    => $kiosk->kiosk_code,
                'name'          => $kiosk->name,
                'gate_label'    => $kiosk->gate_label,
                'is_active'     => (bool) $kiosk->is_active,
                'student_in'    => (clone $q)->where('direction', 'in')->where('entity_type', 'student')->count(),
                'student_out'   => (clone $q)->where('direction', 'out')->where('entity_type', 'student')->count(),
                'personnel_in'  => (clone $q)->where('direction', 'in')->where('entity_type', 'personnel')->count(),
                'personnel_out' => (clone $q)->where('direction', 'out')->where('entity_type', 'personnel')->count(),
                'total'         => (clone $q)->count(),
            ];
        });

        return response()->json([
            'date_from' => $dateFrom,
            'date_to'   => $dateTo,
            'overall'   => $overall,
            'kiosks'    => $perKiosk,
        ]);
    }

    // ── Slides ────────────────────────────────────────────────────────

    public function slides(): JsonResponse
    {
        return response()->json(
            KioskSlide::orderBy('sort_order')->orderBy('id')->get()
        );
    }

    public function storeSlide(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'      => 'nullable|string|max:200',
            'subtitle'   => 'nullable|string|max:400',
            'bg_color'   => 'nullable|string|max:20',
            'sort_order' => 'nullable|integer|min:0',
            'is_active'  => 'boolean',
        ]);

        return response()->json(KioskSlide::create($data), 201);
    }

    public function updateSlide(Request $request, KioskSlide $slide): JsonResponse
    {
        $data = $request->validate([
            'title'      => 'nullable|string|max:200',
            'subtitle'   => 'nullable|string|max:400',
            'bg_color'   => 'nullable|string|max:20',
            'sort_order' => 'nullable|integer|min:0',
            'is_active'  => 'sometimes|boolean',
        ]);

        $slide->update($data);

        return response()->json($slide->fresh());
    }

    public function uploadSlideImage(Request $request, KioskSlide $slide): JsonResponse
    {
        $request->validate(['image' => 'required|image|max:4096']);

        if ($slide->image_path && Storage::disk('public')->exists($slide->image_path)) {
            Storage::disk('public')->delete($slide->image_path);
        }

        $path = $request->file('image')->store('kiosk-slides', 'public');
        $slide->update(['image_path' => $path]);

        return response()->json([
            'image_path' => $path,
            'image_url'  => asset('storage/' . $path),
        ]);
    }

    public function destroySlide(KioskSlide $slide): JsonResponse
    {
        if ($slide->image_path && Storage::disk('public')->exists($slide->image_path)) {
            Storage::disk('public')->delete($slide->image_path);
        }

        $slide->delete();

        return response()->json(['message' => 'Slide deleted.']);
    }
}
