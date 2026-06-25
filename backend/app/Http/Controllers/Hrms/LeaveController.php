<?php

namespace App\Http\Controllers\Hrms;

use App\Http\Controllers\Controller;
use App\Models\LeaveApplication;
use App\Models\LeaveType;
use App\Models\HrmsPersonnel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    // ── Leave Types ────────────────────────────────────────────────────────────

    public function leaveTypes(): JsonResponse
    {
        return response()->json(['data' => LeaveType::orderBy('name')->get()]);
    }

    public function storeLeaveType(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:80|unique:leave_types,name',
            'days_per_year' => 'required|integer|min:1|max:365',
            'is_paid'       => 'required|boolean',
        ]);
        return response()->json(['data' => LeaveType::create($data)], 201);
    }

    public function updateLeaveType(Request $request, string $publicId): JsonResponse
    {
        $lt   = LeaveType::where('public_id', $publicId)->firstOrFail();
        $data = $request->validate([
            'name'          => "required|string|max:80|unique:leave_types,name,{$lt->id}",
            'days_per_year' => 'required|integer|min:1|max:365',
            'is_paid'       => 'required|boolean',
        ]);
        $lt->update($data);
        return response()->json(['data' => $lt]);
    }

    public function destroyLeaveType(string $publicId): JsonResponse
    {
        $lt = LeaveType::where('public_id', $publicId)->firstOrFail();
        if ($lt->applications()->count() > 0) {
            return response()->json(['message' => 'Cannot delete leave type that has applications.'], 422);
        }
        $lt->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    // ── Leave Applications ─────────────────────────────────────────────────────

    public function applications(Request $request): JsonResponse
    {
        $query = LeaveApplication::with(['personnel', 'leaveType', 'approver'])
            ->when($request->status,       fn($q, $s) => $q->where('status', $s))
            ->when($request->personnel_id, fn($q, $id) =>
                $q->whereHas('personnel', fn($q2) => $q2->where('public_id', $id))
            )
            ->orderByDesc('created_at');

        $perPage = min((int) ($request->per_page ?? 20), 100);
        $data    = $query->paginate($perPage);

        return response()->json([
            'data' => $data->items(),
            'meta' => ['current_page' => $data->currentPage(), 'last_page' => $data->lastPage(), 'total' => $data->total()],
        ]);
    }

    public function apply(Request $request): JsonResponse
    {
        $data = $request->validate([
            'personnel_public_id'  => 'required|string|exists:hrms_personnel,public_id',
            'leave_type_public_id' => 'required|string|exists:leave_types,public_id',
            'start_date'           => 'required|date|after_or_equal:today',
            'end_date'             => 'required|date|after_or_equal:start_date',
            'reason'               => 'nullable|string|max:1000',
        ]);

        $person    = HrmsPersonnel::where('public_id', $data['personnel_public_id'])->firstOrFail();
        $leaveType = LeaveType::where('public_id', $data['leave_type_public_id'])->firstOrFail();

        // Count working days (Mon–Fri)
        $start     = \Carbon\Carbon::parse($data['start_date']);
        $end       = \Carbon\Carbon::parse($data['end_date']);
        $totalDays = 0;
        $current   = $start->copy();
        while ($current->lte($end)) {
            if ($current->isWeekday()) {
                $totalDays++;
            }
            $current->addDay();
        }

        $app = LeaveApplication::create([
            'personnel_id'  => $person->id,
            'leave_type_id' => $leaveType->id,
            'start_date'    => $data['start_date'],
            'end_date'      => $data['end_date'],
            'total_days'    => $totalDays ?: 0.5,
            'reason'        => $data['reason'] ?? null,
            'status'        => 'Pending',
        ]);

        return response()->json(['data' => $app->load(['personnel', 'leaveType'])], 201);
    }

    public function approve(Request $request, string $publicId): JsonResponse
    {
        $app  = LeaveApplication::where('public_id', $publicId)->firstOrFail();
        $data = $request->validate(['remarks' => 'nullable|string|max:500']);

        $app->update([
            'status'           => 'Approved',
            'approved_by'      => $request->user()->id,
            'approver_remarks' => $data['remarks'] ?? null,
        ]);

        // Update personnel status if leave starts today or earlier
        if ($app->personnel && $app->start_date->lte(now()->toDateString())) {
            $app->personnel->update(['status' => 'On Leave']);
        }

        return response()->json(['data' => $app->fresh(['personnel', 'leaveType', 'approver'])]);
    }

    public function reject(Request $request, string $publicId): JsonResponse
    {
        $app  = LeaveApplication::where('public_id', $publicId)->firstOrFail();
        $data = $request->validate(['remarks' => 'required|string|max:500']);

        $app->update([
            'status'           => 'Rejected',
            'approved_by'      => $request->user()->id,
            'approver_remarks' => $data['remarks'],
        ]);

        return response()->json(['data' => $app->fresh(['personnel', 'leaveType', 'approver'])]);
    }

    public function cancelApplication(string $publicId): JsonResponse
    {
        $app = LeaveApplication::where('public_id', $publicId)->firstOrFail();
        if ($app->status !== 'Pending') {
            return response()->json(['message' => 'Only pending applications can be cancelled.'], 422);
        }
        $app->delete();
        return response()->json(['message' => 'Application cancelled.']);
    }
}
