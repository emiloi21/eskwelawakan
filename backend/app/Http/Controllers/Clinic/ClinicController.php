<?php

namespace App\Http\Controllers\Clinic;

use App\Http\Controllers\Controller;
use App\Models\ClinicVisit;
use App\Models\HealthIncident;
use App\Models\Student;
use App\Models\StudentHealthRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClinicController extends Controller
{
    // ── Health Records ────────────────────────────────────────────────────────

    public function healthRecords(Request $request): JsonResponse
    {
        $q = StudentHealthRecord::with('student:reg_id,public_id,fname,lname,gradeLevel,section')
                                ->latest();

        if ($search = $request->query('search')) {
            $q->whereHas('student', function ($query) use ($search) {
                $query->where('fname', 'like', "%{$search}%")
                      ->orWhere('lname', 'like', "%{$search}%");
            });
        }

        return response()->json($q->paginate(20));
    }

    public function showHealthRecord(string $publicId): JsonResponse
    {
        $record = StudentHealthRecord::where('public_id', $publicId)
                                     ->with('student:reg_id,public_id,fname,lname,gradeLevel,section,sex,bdYYYY')
                                     ->firstOrFail();
        return response()->json(['data' => $record]);
    }

    /** Create or update health record for a student (upsert per student) */
    public function saveHealthRecord(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id'           => 'required|exists:students,reg_id',
            'blood_type'           => 'nullable|string|max:5',
            'height_cm'            => 'nullable|numeric|min:0',
            'weight_kg'            => 'nullable|numeric|min:0',
            'vision_left'          => 'nullable|string|max:20',
            'vision_right'         => 'nullable|string|max:20',
            'hearing_left'         => 'nullable|in:Normal,Mild Loss,Moderate Loss,Severe Loss',
            'hearing_right'        => 'nullable|in:Normal,Mild Loss,Moderate Loss,Severe Loss',
            'medical_conditions'   => 'nullable|string',
            'allergies'            => 'nullable|string',
            'current_medications'  => 'nullable|string',
            'vaccination_records'  => 'nullable|array',
            'last_physical_exam'   => 'nullable|date',
            'philhealth_no'        => 'nullable|string|max:30',
            'notes'                => 'nullable|string',
        ]);

        $record = StudentHealthRecord::updateOrCreate(
            ['student_id' => $data['student_id']],
            $data
        );

        return response()->json(['data' => $record], $record->wasRecentlyCreated ? 201 : 200);
    }

    /** Student/Parent: view own health record */
    public function myHealthRecord(Request $request): JsonResponse
    {
        $user = $request->user();

        // Resolve student_id from the authenticated user's linked portal account
        $studentId = Student::where('student_id', $user->username)->value('reg_id');
        if (!$studentId) {
            return response()->json(['data' => null, 'message' => 'No health record on file.'], 200);
        }

        $record = StudentHealthRecord::where('student_id', $studentId)->first();
        if (!$record) {
            return response()->json(['data' => null, 'message' => 'No health record on file.'], 200);
        }

        return response()->json(['data' => $record]);
    }

    // ── Clinic Visits ─────────────────────────────────────────────────────────

    public function visits(Request $request): JsonResponse
    {
        $q = ClinicVisit::with('student:reg_id,public_id,fname,lname,gradeLevel,section', 'handledBy:id,fname,lname')
                        ->latest('visit_date');

        if ($date = $request->query('date')) {
            $q->whereDate('visit_date', $date);
        }
        if ($studentId = $request->query('student_id')) {
            $q->where('student_id', $studentId);
        }

        return response()->json($q->paginate(20));
    }

    public function storeVisit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id'       => 'required|exists:students,reg_id',
            'visit_date'       => 'required|date',
            'visit_time'       => 'nullable|date_format:H:i',
            'complaint'        => 'required|string',
            'diagnosis'        => 'nullable|string',
            'treatment_given'  => 'nullable|string',
            'medicine_given'   => 'nullable|string',
            'vital_signs'      => 'nullable|array',
            'referred_to'      => 'nullable|string|max:150',
            'disposition'      => 'nullable|in:Released,Sent Home,Referred to Hospital,Admitted',
            'notes'            => 'nullable|string',
        ]);

        $data['handled_by']  = $request->user()->id;
        $data['disposition'] = $data['disposition'] ?? 'Released';

        return response()->json(['data' => ClinicVisit::create($data)], 201);
    }

    public function updateVisit(Request $request, string $publicId): JsonResponse
    {
        $visit = ClinicVisit::findByPublicIdOrFail($publicId);
        $data  = $request->validate([
            'diagnosis'       => 'nullable|string',
            'treatment_given' => 'nullable|string',
            'medicine_given'  => 'nullable|string',
            'vital_signs'     => 'nullable|array',
            'disposition'     => 'nullable|in:Released,Sent Home,Referred to Hospital,Admitted',
            'notes'           => 'nullable|string',
        ]);
        $visit->update($data);
        return response()->json(['data' => $visit]);
    }

    public function destroyVisit(string $publicId): JsonResponse
    {
        ClinicVisit::findByPublicIdOrFail($publicId)->delete();
        return response()->json(null, 204);
    }

    // ── Health Incidents ──────────────────────────────────────────────────────

    public function incidents(Request $request): JsonResponse
    {
        $q = HealthIncident::with('student:reg_id,public_id,fname,lname,gradeLevel,section', 'reportedBy:id,fname,lname')
                           ->latest('incident_datetime');

        if ($type = $request->query('incident_type')) {
            $q->where('incident_type', $type);
        }
        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        if ($studentId = $request->query('student_id')) {
            $q->where('student_id', $studentId);
        }

        return response()->json($q->paginate(20));
    }

    public function storeIncident(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id'          => 'required|exists:students,reg_id',
            'incident_type'       => 'required|in:Accident,Illness,Injury,Allergy,Other',
            'incident_datetime'   => 'required|date',
            'location'            => 'nullable|string|max:150',
            'description'         => 'required|string',
            'first_aid_given'     => 'nullable|string',
            'referred_to_hospital' => 'nullable|boolean',
            'hospital_name'       => 'nullable|string|max:150',
            'witnesses'           => 'nullable|string',
            'status'              => 'nullable|in:Open,Closed,Under Follow-up',
            'notes'               => 'nullable|string',
        ]);

        $data['reported_by'] = $request->user()->id;
        $data['status']      = $data['status'] ?? 'Open';

        return response()->json(['data' => HealthIncident::create($data)], 201);
    }

    public function updateIncident(Request $request, string $publicId): JsonResponse
    {
        $incident = HealthIncident::findByPublicIdOrFail($publicId);
        $data     = $request->validate([
            'status'              => 'sometimes|in:Open,Closed,Under Follow-up',
            'first_aid_given'     => 'nullable|string',
            'referred_to_hospital' => 'nullable|boolean',
            'hospital_name'       => 'nullable|string|max:150',
            'notes'               => 'nullable|string',
        ]);
        $incident->update($data);
        return response()->json(['data' => $incident]);
    }

    public function destroyIncident(string $publicId): JsonResponse
    {
        HealthIncident::findByPublicIdOrFail($publicId)->delete();
        return response()->json(null, 204);
    }
}
