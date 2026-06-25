<?php

namespace App\Http\Controllers\Clearance;

use App\Http\Controllers\Controller;
use App\Models\ClearanceRecord;
use App\Models\ClearanceRecordOffice;
use App\Models\ClearanceTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClearanceController extends Controller
{
    // ── Admin / Custodian ─────────────────────────────────────────────────────

    /** List all clearance templates */
    public function templates(): JsonResponse
    {
        $templates = ClearanceTemplate::with('offices')->withCount('records')->orderByDesc('created_at')->get();
        return response()->json(['data' => $templates]);
    }

    /** Create a new template */
    public function storeTemplate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'         => 'required|string|max:200',
            'school_year'  => 'required|string|max:20',
            'for_type'     => 'required|in:Student,Personnel,Both',
            'is_active'    => 'nullable|boolean',
            'offices'      => 'required|array|min:1',
            'offices.*.office_name'       => 'required|string|max:100',
            'offices.*.responsible_role'  => 'required|string|max:60',
            'offices.*.description'       => 'nullable|string',
            'offices.*.sort_order'        => 'nullable|integer|min:1',
        ]);

        DB::transaction(function () use ($data, $request, &$template) {
            // Deactivate others in same school year if setting active
            if ($data['is_active'] ?? false) {
                ClearanceTemplate::where('school_year', $data['school_year'])->update(['is_active' => false]);
            }

            $template = ClearanceTemplate::create([
                'name'          => $data['name'],
                'school_year'   => $data['school_year'],
                'for_type'      => $data['for_type'],
                'is_active'     => $data['is_active'] ?? false,
                'created_by_id' => $request->user()->id,
            ]);

            foreach ($data['offices'] as $idx => $office) {
                $template->offices()->create([
                    'office_name'      => $office['office_name'],
                    'responsible_role' => $office['responsible_role'],
                    'description'      => $office['description'] ?? null,
                    'sort_order'       => $office['sort_order'] ?? ($idx + 1),
                ]);
            }
        });

        return response()->json(['data' => $template->load('offices')], 201);
    }

    /** Update template */
    public function updateTemplate(Request $request, string $publicId): JsonResponse
    {
        $template = ClearanceTemplate::findByPublicIdOrFail($publicId);
        $data = $request->validate([
            'name'      => 'sometimes|string|max:200',
            'for_type'  => 'sometimes|in:Student,Personnel,Both',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($data['is_active']) && $data['is_active']) {
            ClearanceTemplate::where('school_year', $template->school_year)
                ->where('id', '!=', $template->id)
                ->update(['is_active' => false]);
        }

        $template->update($data);
        return response()->json(['data' => $template]);
    }

    /** Delete template (block if has records) */
    public function destroyTemplate(string $publicId): JsonResponse
    {
        $template = ClearanceTemplate::findByPublicIdOrFail($publicId);
        if ($template->records()->exists()) {
            return response()->json(['message' => 'Template has existing clearance records. Cannot delete.'], 422);
        }
        $template->delete();
        return response()->json(null, 204);
    }

    /** All clearance records (admin/custodian) */
    public function allRecords(Request $request): JsonResponse
    {
        $records = ClearanceRecord::with(['user:id,fname,lname,access', 'template:id,name,school_year', 'officeStatuses'])
            ->when($request->template_id, fn($q, $id) => $q->where('template_id', $id))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at')
            ->paginate(30);

        return response()->json($records);
    }

    // ── All authenticated users ───────────────────────────────────────────────

    /** Get the active clearance template for the current user's type */
    public function activeTemplate(Request $request): JsonResponse
    {
        $user = $request->user();
        $isStudent = $user->access === 'Student';
        $types = $isStudent ? ['Student', 'Both'] : ['Personnel', 'Both'];

        $template = ClearanceTemplate::with('offices')
            ->where('is_active', true)
            ->whereIn('for_type', $types)
            ->latest()
            ->first();

        return response()->json(['data' => $template]);
    }

    /** Get the current user's clearance record */
    public function myRecord(Request $request): JsonResponse
    {
        $record = ClearanceRecord::with([
            'template:id,name,school_year,for_type',
            'officeStatuses.clearedBy:id,fname,lname',
        ])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->first();

        return response()->json(['data' => $record]);
    }

    /** Apply for clearance using the active template */
    public function apply(Request $request): JsonResponse
    {
        $user = $request->user();
        $isStudent = $user->access === 'Student';
        $types = $isStudent ? ['Student', 'Both'] : ['Personnel', 'Both'];

        $template = ClearanceTemplate::with('offices')
            ->where('is_active', true)
            ->whereIn('for_type', $types)
            ->latest()
            ->first();

        if (!$template) {
            return response()->json(['message' => 'No active clearance template available.'], 422);
        }

        // Check for existing record
        $existing = ClearanceRecord::where('template_id', $template->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'You already have a clearance record for this period.'], 422);
        }

        $record = DB::transaction(function () use ($template, $user) {
            $record = ClearanceRecord::create([
                'template_id' => $template->id,
                'user_id'     => $user->id,
                'status'      => 'Applied',
            ]);

            foreach ($template->offices as $office) {
                ClearanceRecordOffice::create([
                    'record_id'   => $record->id,
                    'office_id'   => $office->id,
                    'office_name' => $office->office_name,
                    'status'      => 'Pending',
                ]);
            }

            return $record;
        });

        return response()->json(['data' => $record->load('officeStatuses')], 201);
    }

    /**
     * Get clearance records pending sign-off for the current user's office/role.
     * Each role can see records where their role is responsible.
     */
    public function pendingForOffice(Request $request): JsonResponse
    {
        $role = $request->user()->access;

        $officeStatuses = ClearanceRecordOffice::with([
            'record.user:id,fname,lname,access',
            'record.template:id,name,school_year',
        ])
            ->whereHas('office', fn($q) => $q->where('responsible_role', $role))
            ->when(
                !in_array($role, ['Administrator']),
                fn($q) => $q->where('status', 'Pending')
            )
            ->orderByDesc('id')
            ->paginate(30);

        return response()->json($officeStatuses);
    }

    /** Clear an office requirement */
    public function clearOffice(Request $request, string $recordPublicId, int $officeStatusId): JsonResponse
    {
        $record = ClearanceRecord::with('officeStatuses.office')
            ->where('public_id', $recordPublicId)
            ->firstOrFail();

        $officeStatus = $record->officeStatuses->find($officeStatusId);
        if (!$officeStatus) {
            return response()->json(['message' => 'Office status not found.'], 404);
        }

        $userRole = $request->user()->access;
        if ($officeStatus->office->responsible_role !== $userRole && $userRole !== 'Administrator') {
            return response()->json(['message' => 'You are not authorized to clear this office.'], 403);
        }

        $data = $request->validate(['remarks' => 'nullable|string']);

        $officeStatus->update([
            'status'        => 'Cleared',
            'cleared_by_id' => $request->user()->id,
            'cleared_at'    => now(),
            'remarks'       => $data['remarks'] ?? null,
        ]);

        // Check if all offices are cleared — if so, mark record Complete
        $allCleared = $record->officeStatuses()->where('status', '!=', 'Cleared')->doesntExist();
        if ($allCleared) {
            $record->update(['status' => 'Complete', 'completed_at' => now()]);
        } else {
            $record->update(['status' => 'In Progress']);
        }

        return response()->json(['data' => $officeStatus]);
    }

    /** Return (reject) an office requirement back to the applicant */
    public function returnOffice(Request $request, string $recordPublicId, int $officeStatusId): JsonResponse
    {
        $record = ClearanceRecord::with('officeStatuses.office')
            ->where('public_id', $recordPublicId)
            ->firstOrFail();

        $officeStatus = $record->officeStatuses->find($officeStatusId);
        if (!$officeStatus) {
            return response()->json(['message' => 'Office status not found.'], 404);
        }

        $userRole = $request->user()->access;
        if ($officeStatus->office->responsible_role !== $userRole && $userRole !== 'Administrator') {
            return response()->json(['message' => 'You are not authorized to process this office.'], 403);
        }

        $data = $request->validate(['remarks' => 'required|string']);

        $officeStatus->update([
            'status'        => 'Returned',
            'cleared_by_id' => $request->user()->id,
            'cleared_at'    => now(),
            'remarks'       => $data['remarks'],
        ]);

        $record->update(['status' => 'In Progress']);

        return response()->json(['data' => $officeStatus]);
    }
}
