<?php

namespace App\Http\Controllers\Registrar;

use App\Http\Controllers\Controller;
use App\Models\EntranceExamBooking;
use App\Models\EntranceExamSlot;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EntranceExamController extends Controller
{
    /**
     * GET /registrar/exam-slots
     * List all exam slots, optionally filtered by schoolYear.
     */
    public function index(Request $request): JsonResponse
    {
        $query = EntranceExamSlot::withCount('bookings')
            ->orderBy('exam_date')
            ->orderBy('exam_time');

        if ($sy = $request->query('schoolYear')) {
            $query->where('school_year', $sy);
        }
        if ($dept = $request->query('dept')) {
            $query->where('dept', $dept);
        }

        return response()->json(['data' => $query->get()]);
    }

    /**
     * POST /registrar/exam-slots
     * Create a new exam slot.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'school_year' => ['required', 'string', 'max:10'],
            'dept'        => ['nullable', 'string', 'max:55'],
            'grade_level' => ['nullable', 'string', 'max:55'],
            'exam_date'   => ['required', 'date'],
            'exam_time'   => ['required', 'date_format:H:i'],
            'location'    => ['required', 'string', 'max:200'],
            'capacity'    => ['required', 'integer', 'min:1', 'max:9999'],
            'notes'       => ['nullable', 'string', 'max:1000'],
            'is_active'   => ['boolean'],
        ]);

        $slot = EntranceExamSlot::create($validated);
        $slot->loadCount('bookings');

        return response()->json(['data' => $slot, 'message' => 'Exam slot created.'], 201);
    }

    /**
     * PUT /registrar/exam-slots/{publicId}
     * Update an existing exam slot.
     */
    public function update(Request $request, string $publicId): JsonResponse
    {
        $slot = EntranceExamSlot::where('public_id', $publicId)->firstOrFail();

        $validated = $request->validate([
            'school_year' => ['sometimes', 'string', 'max:10'],
            'dept'        => ['nullable', 'string', 'max:55'],
            'grade_level' => ['nullable', 'string', 'max:55'],
            'exam_date'   => ['sometimes', 'date'],
            'exam_time'   => ['sometimes', 'date_format:H:i'],
            'location'    => ['sometimes', 'string', 'max:200'],
            'capacity'    => ['sometimes', 'integer', 'min:1', 'max:9999'],
            'notes'       => ['nullable', 'string', 'max:1000'],
            'is_active'   => ['boolean'],
        ]);

        $slot->update($validated);
        $slot->loadCount('bookings');

        return response()->json(['data' => $slot, 'message' => 'Exam slot updated.']);
    }

    /**
     * DELETE /registrar/exam-slots/{publicId}
     * Delete an exam slot (only allowed when there are no bookings).
     */
    public function destroy(string $publicId): JsonResponse
    {
        $slot = EntranceExamSlot::where('public_id', $publicId)->firstOrFail();

        if ($slot->bookings()->exists()) {
            return response()->json(['message' => 'Cannot delete a slot with existing bookings. Remove all bookings first.'], 422);
        }

        $slot->delete();

        return response()->json(['message' => 'Exam slot deleted.']);
    }

    /**
     * GET /registrar/exam-slots/{publicId}/bookings
     * List all applicants booked into a specific slot.
     */
    public function bookings(string $publicId): JsonResponse
    {
        $slot = EntranceExamSlot::where('public_id', $publicId)->firstOrFail();

        $bookings = EntranceExamBooking::where('slot_id', $slot->id)
            ->with('student')
            ->get()
            ->map(fn ($b) => [
                'booking_id'  => $b->id,
                'reg_id'      => $b->reg_id,
                'public_id'   => $b->student?->public_id,
                'student_id'  => $b->student?->student_id,
                'name'        => $b->student ? "{$b->student->lname}, {$b->student->fname}" : '—',
                'grade_level' => $b->student?->gradeLevel,
                'dept'        => $b->student?->dept,
                'result'      => $b->result,
                'remarks'     => $b->remarks,
                'booked_at'   => $b->created_at,
            ]);

        return response()->json(['data' => $bookings]);
    }

    /**
     * POST /registrar/exam-slots/{publicId}/book
     * Assign an applicant to this exam slot.
     * Body: { applicant_public_id: string }
     */
    public function book(Request $request, string $publicId): JsonResponse
    {
        $slot = EntranceExamSlot::where('public_id', $publicId)->firstOrFail();

        $request->validate([
            'applicant_public_id' => ['required', 'string'],
        ]);

        $student = Student::where('public_id', $request->applicant_public_id)->firstOrFail();

        // Capacity check
        if ($slot->bookings()->count() >= $slot->capacity) {
            return response()->json(['message' => 'This exam slot is already at full capacity.'], 422);
        }

        // Check if already booked in any slot for this school year
        $existing = EntranceExamBooking::where('reg_id', $student->reg_id)
            ->whereHas('slot', fn ($q) => $q->where('school_year', $slot->school_year))
            ->first();

        if ($existing) {
            return response()->json(['message' => 'This applicant is already assigned to an exam slot for this school year.'], 422);
        }

        $booking = EntranceExamBooking::create([
            'slot_id'   => $slot->id,
            'reg_id'    => $student->reg_id,
            'booked_by' => $request->user()?->id,
        ]);

        return response()->json([
            'data'    => $booking,
            'message' => 'Applicant assigned to exam slot.',
        ], 201);
    }

    /**
     * DELETE /registrar/exam-slots/{publicId}/book/{applicantPublicId}
     * Remove an applicant's booking from a slot.
     */
    public function unbook(string $publicId, string $applicantPublicId): JsonResponse
    {
        $slot    = EntranceExamSlot::where('public_id', $publicId)->firstOrFail();
        $student = Student::where('public_id', $applicantPublicId)->firstOrFail();

        $deleted = EntranceExamBooking::where('slot_id', $slot->id)
            ->where('reg_id', $student->reg_id)
            ->delete();

        if (! $deleted) {
            return response()->json(['message' => 'Booking not found.'], 404);
        }

        return response()->json(['message' => 'Booking removed.']);
    }

    /**
     * PUT /registrar/exam-slots/{publicId}/result/{applicantPublicId}
     * Record the exam result for a specific applicant.
     * Body: { result: 'Pass'|'Fail', remarks?: string }
     */
    public function recordResult(Request $request, string $publicId, string $applicantPublicId): JsonResponse
    {
        $slot    = EntranceExamSlot::where('public_id', $publicId)->firstOrFail();
        $student = Student::where('public_id', $applicantPublicId)->firstOrFail();

        $validated = $request->validate([
            'result'  => ['required', 'in:Pass,Fail'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        $booking = EntranceExamBooking::where('slot_id', $slot->id)
            ->where('reg_id', $student->reg_id)
            ->firstOrFail();

        $booking->update($validated);

        return response()->json(['data' => $booking, 'message' => 'Exam result recorded.']);
    }

    /**
     * GET /registrar/applicants/{applicantPublicId}/exam-booking
     * Get the exam slot booking for a specific applicant (used in the detail sheet).
     */
    public function applicantBooking(string $applicantPublicId): JsonResponse
    {
        $student = Student::where('public_id', $applicantPublicId)->firstOrFail();

        $booking = EntranceExamBooking::where('reg_id', $student->reg_id)
            ->with('slot')
            ->latest()
            ->first();

        if (! $booking) {
            return response()->json(['data' => null]);
        }

        return response()->json([
            'data' => [
                'booking_id'   => $booking->id,
                'result'       => $booking->result,
                'remarks'      => $booking->remarks,
                'slot'         => $booking->slot ? [
                    'public_id'   => $booking->slot->public_id,
                    'exam_date'   => $booking->slot->exam_date?->format('Y-m-d'),
                    'exam_time'   => $booking->slot->exam_time,
                    'location'    => $booking->slot->location,
                    'school_year' => $booking->slot->school_year,
                    'dept'        => $booking->slot->dept,
                    'grade_level' => $booking->slot->grade_level,
                ] : null,
            ],
        ]);
    }
}
