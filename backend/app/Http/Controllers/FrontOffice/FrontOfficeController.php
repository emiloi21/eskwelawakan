<?php

namespace App\Http\Controllers\FrontOffice;

use App\Http\Controllers\Controller;
use App\Models\CorrespondenceLog;
use App\Models\GatePass;
use App\Models\Student;
use App\Models\VisitorLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FrontOfficeController extends Controller
{
    // ── Visitor Log ───────────────────────────────────────────────────────────

    public function visitors(Request $request): JsonResponse
    {
        $q = VisitorLog::with('processedBy:id,fname,lname')->latest();

        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        if ($date = $request->query('date')) {
            $q->whereDate('check_in_at', $date);
        }
        if ($search = $request->query('search')) {
            $q->where('visitor_name', 'like', "%{$search}%");
        }

        return response()->json($q->paginate(20));
    }

    public function checkIn(Request $request): JsonResponse
    {
        $data = $request->validate([
            'visitor_name' => 'required|string|max:150',
            'company_org'  => 'nullable|string|max:150',
            'purpose'      => 'required|string|max:255',
            'host_name'    => 'nullable|string|max:150',
            'id_type'      => 'nullable|in:PhilSys ID,Passport,Drivers License,UMID,Voters ID,Other',
            'id_number'    => 'nullable|string|max:60',
            'badge_no'     => 'nullable|string|max:20',
            'notes'        => 'nullable|string',
        ]);

        $data['check_in_at']  = now();
        $data['status']       = 'In';
        $data['processed_by'] = $request->user()->id;

        return response()->json(['data' => VisitorLog::create($data)], 201);
    }

    public function checkOut(Request $request, string $publicId): JsonResponse
    {
        $visitor = VisitorLog::findByPublicIdOrFail($publicId);

        if ($visitor->status === 'Out') {
            return response()->json(['message' => 'Visitor already checked out.'], 422);
        }

        $visitor->update([
            'check_out_at' => now(),
            'status'       => 'Out',
        ]);

        return response()->json(['data' => $visitor]);
    }

    public function destroyVisitor(string $publicId): JsonResponse
    {
        VisitorLog::findByPublicIdOrFail($publicId)->delete();
        return response()->json(null, 204);
    }

    // ── Gate Passes ───────────────────────────────────────────────────────────

    public function gatePasses(Request $request): JsonResponse
    {
        $q = GatePass::with('student:reg_id,fname,lname,gradeLevel,section', 'authorizedBy:id,fname,lname')
                     ->latest();

        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        if ($date = $request->query('date')) {
            $q->whereDate('issued_at', $date);
        }

        return response()->json($q->paginate(20));
    }

    public function issueGatePass(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id'      => 'required|exists:students,reg_id',
            'purpose'         => 'required|string|max:255',
            'destination'     => 'required|string|max:150',
            'expected_return' => 'nullable|date',
            'notes'           => 'nullable|string',
        ]);

        $data['issued_at']     = now();
        $data['authorized_by'] = $request->user()->id;
        $data['status']        = 'Active';

        return response()->json(['data' => GatePass::create($data)], 201);
    }

    public function returnGatePass(string $publicId): JsonResponse
    {
        $pass = GatePass::findByPublicIdOrFail($publicId);

        if ($pass->status !== 'Active') {
            return response()->json(['message' => 'Gate pass is not active.'], 422);
        }

        $pass->update(['actual_return' => now(), 'status' => 'Returned']);
        return response()->json(['data' => $pass]);
    }

    public function destroyGatePass(string $publicId): JsonResponse
    {
        GatePass::findByPublicIdOrFail($publicId)->delete();
        return response()->json(null, 204);
    }

    // ── Correspondence Log ────────────────────────────────────────────────────

    public function correspondence(Request $request): JsonResponse
    {
        $q = CorrespondenceLog::with('handledBy:id,fname,lname')->latest();

        if ($direction = $request->query('direction')) {
            $q->where('direction', $direction);
        }
        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        if ($search = $request->query('search')) {
            $q->where(function ($query) use ($search) {
                $query->where('subject', 'like', "%{$search}%")
                      ->orWhere('from_to', 'like', "%{$search}%")
                      ->orWhere('reference_no', 'like', "%{$search}%");
            });
        }

        return response()->json($q->paginate(20));
    }

    public function storeCorrespondence(Request $request): JsonResponse
    {
        $data = $request->validate([
            'direction'     => 'required|in:Incoming,Outgoing',
            'reference_no'  => 'nullable|string|max:50',
            'from_to'       => 'required|string|max:200',
            'subject'       => 'required|string|max:255',
            'category'      => 'nullable|string|max:80',
            'document_date' => 'required|date',
            'follow_up_date' => 'nullable|date',
            'status'        => 'nullable|in:Pending,Noted,Action Taken,Archived',
            'notes'         => 'nullable|string',
        ]);

        $data['handled_by'] = $request->user()->id;
        $data['status']     = $data['status'] ?? 'Pending';

        return response()->json(['data' => CorrespondenceLog::create($data)], 201);
    }

    public function updateCorrespondence(Request $request, string $publicId): JsonResponse
    {
        $log = CorrespondenceLog::findByPublicIdOrFail($publicId);
        $data = $request->validate([
            'subject'       => 'sometimes|string|max:255',
            'from_to'       => 'sometimes|string|max:200',
            'status'        => 'sometimes|in:Pending,Noted,Action Taken,Archived',
            'follow_up_date' => 'nullable|date',
            'notes'         => 'nullable|string',
        ]);
        $log->update($data);
        return response()->json(['data' => $log]);
    }

    public function destroyCorrespondence(string $publicId): JsonResponse
    {
        CorrespondenceLog::findByPublicIdOrFail($publicId)->delete();
        return response()->json(null, 204);
    }
}
