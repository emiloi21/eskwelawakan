<?php

namespace App\Http\Controllers\Custodian;

use App\Http\Controllers\Controller;
use App\Models\Facility;
use App\Models\FacilityBooking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacilityController extends Controller
{
    // ── Facilities ───────────────────────────────────────────────────────────

    public function index(): JsonResponse
    {
        $facilities = Facility::withCount([
            'bookings as pending_bookings' => fn($q) => $q->where('status', 'Pending'),
            'bookings as approved_bookings' => fn($q) => $q->where('status', 'Approved'),
        ])->orderBy('name')->get();

        return response()->json(['data' => $facilities]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:150',
            'description' => 'nullable|string',
            'location'    => 'nullable|string|max:150',
            'capacity'    => 'nullable|integer|min:1',
            'amenities'   => 'nullable|string',
            'status'      => 'nullable|in:Available,Under Maintenance,Inactive',
        ]);

        return response()->json(['data' => Facility::create($data)], 201);
    }

    public function update(Request $request, string $publicId): JsonResponse
    {
        $facility = Facility::findByPublicIdOrFail($publicId);
        $data = $request->validate([
            'name'        => 'required|string|max:150',
            'description' => 'nullable|string',
            'location'    => 'nullable|string|max:150',
            'capacity'    => 'nullable|integer|min:1',
            'amenities'   => 'nullable|string',
            'status'      => 'nullable|in:Available,Under Maintenance,Inactive',
        ]);
        $facility->update($data);
        return response()->json(['data' => $facility]);
    }

    public function destroy(string $publicId): JsonResponse
    {
        $facility = Facility::findByPublicIdOrFail($publicId);
        if ($facility->bookings()->whereIn('status', ['Pending', 'Approved'])->exists()) {
            return response()->json(['message' => 'Facility has active bookings. Cannot delete.'], 422);
        }
        $facility->delete();
        return response()->json(null, 204);
    }

    // ── Bookings ─────────────────────────────────────────────────────────────

    public function bookings(Request $request): JsonResponse
    {
        $q = FacilityBooking::with([
                'facility:id,name,location',
                'requester:id,fname,lname',
                'approver:id,fname,lname',
            ])
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->facility_id, fn($q, $id) => $q->where('facility_id', $id))
            ->when($request->event_date, fn($q, $d) => $q->where('event_date', $d))
            ->when($request->date_from, fn($q, $d) => $q->where('event_date', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('event_date', '<=', $d))
            ->orderByDesc('event_date')
            ->orderBy('start_time');

        return response()->json($q->paginate((int) ($request->per_page ?? 30)));
    }

    public function showBooking(string $publicId): JsonResponse
    {
        $booking = FacilityBooking::with([
            'facility', 'requester:id,fname,lname', 'approver:id,fname,lname',
        ])->findByPublicIdOrFail($publicId);

        return response()->json(['data' => $booking]);
    }

    /**
     * Any authenticated user can request a booking.
     */
    public function requestBooking(Request $request): JsonResponse
    {
        $data = $request->validate([
            'facility_id'    => 'required|integer|exists:facilities,id',
            'title'          => 'required|string|max:150',
            'purpose'        => 'nullable|string',
            'event_date'     => 'required|date|after_or_equal:today',
            'start_time'     => 'required|date_format:H:i',
            'end_time'       => 'required|date_format:H:i|after:start_time',
            'attendee_count' => 'nullable|integer|min:1',
            'notes'          => 'nullable|string',
        ]);

        // Check for conflicts with approved bookings
        $conflict = FacilityBooking::where('facility_id', $data['facility_id'])
            ->where('event_date', $data['event_date'])
            ->where('status', 'Approved')
            ->where(function ($q) use ($data) {
                $q->whereBetween('start_time', [$data['start_time'], $data['end_time']])
                  ->orWhereBetween('end_time', [$data['start_time'], $data['end_time']])
                  ->orWhere(function ($q) use ($data) {
                      $q->where('start_time', '<=', $data['start_time'])
                        ->where('end_time', '>=', $data['end_time']);
                  });
            })->exists();

        if ($conflict) {
            return response()->json([
                'message' => 'The facility is already booked during that time slot.',
            ], 422);
        }

        $booking = FacilityBooking::create([
            ...$data,
            'requested_by' => $request->user()->id,
            'status'       => 'Pending',
        ]);

        return response()->json(['data' => $booking->load('facility:id,name')], 201);
    }

    public function approveBooking(Request $request, string $publicId): JsonResponse
    {
        $booking = FacilityBooking::findByPublicIdOrFail($publicId);

        if ($booking->status !== 'Pending') {
            return response()->json(['message' => 'Only Pending bookings can be approved.'], 422);
        }

        $data = $request->validate([
            'approver_remarks' => 'nullable|string',
        ]);

        $booking->update([
            'status'           => 'Approved',
            'approved_by'      => $request->user()->id,
            'approver_remarks' => $data['approver_remarks'] ?? null,
        ]);

        return response()->json(['data' => $booking->fresh(['facility', 'requester', 'approver'])]);
    }

    public function rejectBooking(Request $request, string $publicId): JsonResponse
    {
        $booking = FacilityBooking::findByPublicIdOrFail($publicId);

        if ($booking->status !== 'Pending') {
            return response()->json(['message' => 'Only Pending bookings can be rejected.'], 422);
        }

        $data = $request->validate([
            'approver_remarks' => 'required|string',
        ]);

        $booking->update([
            'status'           => 'Rejected',
            'approved_by'      => $request->user()->id,
            'approver_remarks' => $data['approver_remarks'],
        ]);

        return response()->json(['data' => $booking->fresh()]);
    }

    public function cancelBooking(Request $request, string $publicId): JsonResponse
    {
        $booking = FacilityBooking::findByPublicIdOrFail($publicId);

        // Requester can cancel their own; Custodian/Admin can cancel any
        $user = $request->user();
        if (
            $booking->requested_by !== $user->id
            && ! in_array($user->access, ['Administrator', 'Custodian'])
        ) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if (! in_array($booking->status, ['Pending', 'Approved'])) {
            return response()->json(['message' => 'This booking cannot be cancelled.'], 422);
        }

        $booking->update([
            'status'       => 'Cancelled',
            'cancelled_at' => now(),
        ]);

        return response()->json(['data' => $booking->fresh()]);
    }

    /**
     * Returns facilities list with booking counts — public to all logged-in users
     * so they can browse what's available before placing a request.
     */
    public function publicList(): JsonResponse
    {
        $facilities = Facility::where('status', 'Available')
            ->select('id', 'public_id', 'name', 'description', 'location', 'capacity', 'amenities', 'status')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $facilities]);
    }

    /**
     * Returns booked (Approved) slots for a facility on a given date.
     * Used by the booking form to show unavailable time ranges.
     */
    public function bookedSlots(Request $request, string $publicId): JsonResponse
    {
        $facility = Facility::findByPublicIdOrFail($publicId);
        $date     = $request->validate(['date' => 'required|date'])['date'];

        $slots = FacilityBooking::where('facility_id', $facility->id)
            ->where('event_date', $date)
            ->where('status', 'Approved')
            ->get(['public_id', 'title', 'start_time', 'end_time']);

        return response()->json(['data' => $slots]);
    }
}
