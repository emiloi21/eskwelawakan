<?php

namespace App\Http\Controllers\Hrms;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\HrmsDepartment;
use App\Models\HrmsPersonnel;
use App\Models\HrmsPosition;
use App\Models\LeaveApplication;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class HrmsController extends Controller
{
    // ──────────────────────────────────────────────────────────────────────────
    // Dashboard
    // ──────────────────────────────────────────────────────────────────────────

    public function dashboard(): JsonResponse
    {
        $today = now()->toDateString();

        $totalPersonnel  = HrmsPersonnel::where('status', 'Active')->count();
        $onLeaveToday    = LeaveApplication::where('status', 'Approved')
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->count();
        $presentToday    = AttendanceLog::where('entity_type', 'personnel')
            ->whereDate('log_time', $today)
            ->where('direction', 'in')
            ->distinct('entity_id')
            ->count('entity_id');
        $pendingLeaves   = LeaveApplication::where('status', 'Pending')->count();

        return response()->json([
            'data' => compact('totalPersonnel', 'onLeaveToday', 'presentToday', 'pendingLeaves'),
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Departments
    // ──────────────────────────────────────────────────────────────────────────

    public function departments(): JsonResponse
    {
        $depts = HrmsDepartment::withCount('personnel')->orderBy('name')->get();
        return response()->json(['data' => $depts]);
    }

    public function storeDepartment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100|unique:hrms_departments,name',
            'description' => 'nullable|string',
        ]);

        $dept = HrmsDepartment::create($data);
        return response()->json(['data' => $dept], 201);
    }

    public function updateDepartment(Request $request, string $publicId): JsonResponse
    {
        $dept = HrmsDepartment::where('public_id', $publicId)->firstOrFail();
        $data = $request->validate([
            'name'        => 'required|string|max:100|unique:hrms_departments,name,' . $dept->id,
            'description' => 'nullable|string',
        ]);
        $dept->update($data);
        return response()->json(['data' => $dept]);
    }

    public function destroyDepartment(string $publicId): JsonResponse
    {
        $dept = HrmsDepartment::where('public_id', $publicId)->firstOrFail();
        if ($dept->personnel()->count() > 0) {
            return response()->json(['message' => 'Cannot delete department with active personnel.'], 422);
        }
        $dept->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Positions
    // ──────────────────────────────────────────────────────────────────────────

    public function positions(): JsonResponse
    {
        $positions = HrmsPosition::with('department')->orderBy('name')->get();
        return response()->json(['data' => $positions]);
    }

    public function storePosition(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:100',
            'department_id' => 'nullable|exists:hrms_departments,id',
            'description'   => 'nullable|string',
        ]);
        $pos = HrmsPosition::create($data);
        return response()->json(['data' => $pos->load('department')], 201);
    }

    public function updatePosition(Request $request, string $publicId): JsonResponse
    {
        $pos  = HrmsPosition::where('public_id', $publicId)->firstOrFail();
        $data = $request->validate([
            'name'          => 'required|string|max:100',
            'department_id' => 'nullable|exists:hrms_departments,id',
            'description'   => 'nullable|string',
        ]);
        $pos->update($data);
        return response()->json(['data' => $pos->load('department')]);
    }

    public function destroyPosition(string $publicId): JsonResponse
    {
        $pos = HrmsPosition::where('public_id', $publicId)->firstOrFail();
        $pos->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Personnel
    // ──────────────────────────────────────────────────────────────────────────

    public function personnel(Request $request): JsonResponse
    {
        $query = HrmsPersonnel::with(['department', 'position', 'user:id,username,access,status'])
            ->when($request->search, fn($q, $s) =>
                $q->where(fn($q2) =>
                    $q2->where('fname', 'like', "%{$s}%")
                       ->orWhere('lname', 'like', "%{$s}%")
                       ->orWhere('employee_id', 'like', "%{$s}%")
                       ->orWhere('email', 'like', "%{$s}%")
                ))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->department_id === 'unassigned', fn($q) => $q->whereNull('department_id'))
            ->when($request->department_id && $request->department_id !== 'unassigned', fn($q, $d) => $q->where('department_id', $d))
            ->orderBy('lname')
            ->orderBy('fname');

        $perPage = min((int) ($request->per_page ?? 20), 100);
        $data    = $query->paginate($perPage);

        return response()->json([
            'data' => $data->items(),
            'meta' => [
                'current_page' => $data->currentPage(),
                'last_page'    => $data->lastPage(),
                'total'        => $data->total(),
                'per_page'     => $data->perPage(),
            ],
        ]);
    }

    public function showPersonnel(string $publicId): JsonResponse
    {
        $p = HrmsPersonnel::with(['department', 'position', 'leaveApplications.leaveType'])
            ->where('public_id', $publicId)
            ->firstOrFail();

        return response()->json(['data' => $p]);
    }

    public function assignDepartment(Request $request, string $publicId): JsonResponse
    {
        $person = HrmsPersonnel::where('public_id', $publicId)->firstOrFail();
        $data   = $request->validate([
            'department_id' => 'nullable|exists:hrms_departments,id',
        ]);
        $person->update(['department_id' => $data['department_id'] ?? null]);
        return response()->json(['data' => $person->load(['department', 'position'])]);
    }

    public function storePersonnel(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id'              => 'required|string|max:30|unique:hrms_personnel,employee_id',
            'pin_code'                 => 'nullable|integer|min:1000|max:999999|unique:hrms_personnel,pin_code',
            'fname'                    => 'required|string|max:100',
            'mname'                    => 'nullable|string|max:100',
            'lname'                    => 'required|string|max:100',
            'department_id'            => 'nullable|exists:hrms_departments,id',
            'position_id'              => 'nullable|exists:hrms_positions,id',
            'employment_type'          => 'required|in:Regular,Contractual,Part-time',
            'date_hired'               => 'nullable|date',
            'status'                   => 'required|in:Active,Inactive,On Leave',
            'gender'                   => 'nullable|in:Male,Female',
            'birthdate'                => 'nullable|date',
            'contact'                  => 'nullable|string|max:25',
            'email'                    => 'nullable|email|max:150',
            'address'                  => 'nullable|string',
            'emergency_contact_name'   => 'nullable|string|max:150',
            'emergency_contact_number' => 'nullable|string|max:25',
        ]);

        $person = HrmsPersonnel::create($data);
        return response()->json(['data' => $person->load(['department', 'position'])], 201);
    }

    public function updatePersonnel(Request $request, string $publicId): JsonResponse
    {
        $person = HrmsPersonnel::where('public_id', $publicId)->firstOrFail();

        $data = $request->validate([
            'employee_id'              => "required|string|max:30|unique:hrms_personnel,employee_id,{$person->id}",
            'pin_code'                 => "nullable|integer|min:1000|max:999999|unique:hrms_personnel,pin_code,{$person->id}",
            'fname'                    => 'required|string|max:100',
            'mname'                    => 'nullable|string|max:100',
            'lname'                    => 'required|string|max:100',
            'department_id'            => 'nullable|exists:hrms_departments,id',
            'position_id'              => 'nullable|exists:hrms_positions,id',
            'employment_type'          => 'required|in:Regular,Contractual,Part-time',
            'date_hired'               => 'nullable|date',
            'date_separated'           => 'nullable|date',
            'status'                   => 'required|in:Active,Inactive,On Leave',
            'gender'                   => 'nullable|in:Male,Female',
            'birthdate'                => 'nullable|date',
            'contact'                  => 'nullable|string|max:25',
            'email'                    => 'nullable|email|max:150',
            'address'                  => 'nullable|string',
            'emergency_contact_name'   => 'nullable|string|max:150',
            'emergency_contact_number' => 'nullable|string|max:25',
        ]);

        $person->update($data);

        // Sync name / email / contact to linked user account so both modules stay consistent
        if ($person->user_id) {
            \App\Models\User::where('id', $person->user_id)->update([
                'fname'          => $data['fname'],
                'mname'          => $data['mname'] ?? null,
                'lname'          => $data['lname'],
                'email'          => $data['email'] ?? null,
                'contact_number' => $data['contact'] ?? null,
            ]);
        }

        return response()->json(['data' => $person->load(['department', 'position'])]);
    }

    public function destroyPersonnel(string $publicId): JsonResponse
    {
        $person = HrmsPersonnel::where('public_id', $publicId)->firstOrFail();
        $person->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    public function uploadPersonnelPhoto(Request $request, string $publicId): JsonResponse
    {
        $person = HrmsPersonnel::where('public_id', $publicId)->firstOrFail();
        $request->validate(['photo' => 'required|image|max:3072']);

        $path = $request->file('photo')->store("hrms/photos/{$publicId}", 'public');
        $person->update(['photo' => "/storage/{$path}"]);

        return response()->json(['data' => ['photo' => $person->photo]]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Grant System Access
    // ──────────────────────────────────────────────────────────────────────────

    public function grantAccess(Request $request, string $publicId): JsonResponse
    {
        $person = HrmsPersonnel::where('public_id', $publicId)->firstOrFail();

        if ($person->user_id) {
            return response()->json(['message' => 'This personnel already has a system account.'], 422);
        }

        $data = $request->validate([
            'username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'password' => ['required', 'string', 'min:6'],
            'access'   => ['required', 'string', Rule::in([
                'Administrator', 'Encoder', 'Registrar', 'Cashier',
                'Accounting Staff', 'HR', 'Custodian', 'Librarian',
                'School Nurse', 'Front Desk',
            ])],
        ]);

        $user = User::create([
            'fname'          => $person->fname,
            'mname'          => $person->mname ?? '',
            'lname'          => $person->lname,
            'email'          => $person->email,
            'contact_number' => $person->contact,
            'username'       => $data['username'],
            'password'       => $data['password'],
            'access'         => $data['access'],
            'status'         => 'Active',
        ]);

        $person->update(['user_id' => $user->id]);

        return response()->json(['data' => $user], 201);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Attendance (query for HR reports)
    // ──────────────────────────────────────────────────────────────────────────

    public function attendanceLogs(Request $request): JsonResponse
    {
        $query = AttendanceLog::query()
            ->when($request->entity_type,  fn($q, $t)  => $q->where('entity_type', $t))
            ->when($request->entity_id,    fn($q, $id) => $q->where('entity_id', $id))
            ->when($request->date_from,    fn($q, $d)  => $q->where('log_time', '>=', $d . ' 00:00:00'))
            ->when($request->date_to,      fn($q, $d)  => $q->where('log_time', '<=', $d . ' 23:59:59'))
            ->when($request->kiosk_code,   fn($q, $kc) => $q->where('kiosk_code', $kc))
            ->orderByDesc('log_time');

        $perPage = min((int) ($request->per_page ?? 50), 200);
        $data    = $query->paginate($perPage);

        // Build kiosk name lookup from kiosk_code
        $kioskCodes = collect($data->items())->pluck('kiosk_code')->filter()->unique()->values();
        $kioskNames = [];
        if ($kioskCodes->isNotEmpty()) {
            \App\Models\Kiosk::whereIn('kiosk_code', $kioskCodes)
                ->get(['kiosk_code', 'name', 'gate_label'])
                ->each(function ($k) use (&$kioskNames) {
                    $kioskNames[$k->kiosk_code] = "{$k->name} ({$k->gate_label})";
                });
        }

        // Enrich: attach name and kiosk info to each log
        $logs = collect($data->items())->map(function ($log) use ($kioskNames) {
            $row = $log->toArray();
            if ($log->entity_type === 'student') {
                $s = Student::where('student_id', $log->entity_id)->first();
                $row['name']   = $s ? "{$s->fname} {$s->lname}" : '(Unknown)';
                $row['detail'] = $s ? $s->grade_level : '';
            } else {
                $p = HrmsPersonnel::where('employee_id', $log->entity_id)->first();
                $row['name']   = $p ? $p->full_name : '(Unknown)';
                $row['detail'] = $p?->position?->name ?? '';
            }
            $row['kiosk_name'] = $log->kiosk_code ? ($kioskNames[$log->kiosk_code] ?? $log->kiosk_code) : null;
            return $row;
        });

        return response()->json([
            'data' => $logs,
            'meta' => [
                'current_page' => $data->currentPage(),
                'last_page'    => $data->lastPage(),
                'total'        => $data->total(),
                'per_page'     => $data->perPage(),
            ],
        ]);
    }

    public function attendanceSummary(Request $request): JsonResponse
    {
        $date = $request->date ?? now()->toDateString();

        $studentIn   = AttendanceLog::where('entity_type', 'student')
            ->whereDate('log_time', $date)->where('direction', 'in')
            ->distinct('entity_id')->count('entity_id');
        $studentOut  = AttendanceLog::where('entity_type', 'student')
            ->whereDate('log_time', $date)->where('direction', 'out')
            ->distinct('entity_id')->count('entity_id');
        $staffIn     = AttendanceLog::where('entity_type', 'personnel')
            ->whereDate('log_time', $date)->where('direction', 'in')
            ->distinct('entity_id')->count('entity_id');
        $staffOut    = AttendanceLog::where('entity_type', 'personnel')
            ->whereDate('log_time', $date)->where('direction', 'out')
            ->distinct('entity_id')->count('entity_id');

        return response()->json(compact('date', 'studentIn', 'studentOut', 'staffIn', 'staffOut'));
    }
}
