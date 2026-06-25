<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HrmsPersonnel;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with([
            'hrmsPersonnel:id,user_id,employee_id,fname,lname,photo,position_id',
            'hrmsPersonnel.position:id,name',
        ]);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                  ->orWhere('fname', 'like', "%{$search}%")
                  ->orWhere('lname', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhereHas('hrmsPersonnel', fn ($q2) => $q2->where('employee_id', 'like', "%{$search}%"));
            });
        }

        if ($access = $request->query('access')) {
            $query->where('access', $access);
        }

        if ($accessNotIn = $request->query('access_not_in')) {
            $excluded = array_map('trim', explode(',', $accessNotIn));
            $query->whereNotIn('access', $excluded);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $users = $query->orderBy('lname')->orderBy('fname')
            ->paginate($request->query('per_page', 15));

        return response()->json($users);
    }

    /**
     * Search HRMS personnel that are not yet linked to any system user.
     * Used by the admin "Add / Edit User" combobox.
     */
    public function personnelSearch(Request $request): JsonResponse
    {
        $q = $request->query('q', '');
        $excludeUserId = $request->query('exclude_user_id'); // allow current user's linked record through

        $results = HrmsPersonnel::with(['department:id,name', 'position:id,name'])
            ->where(function ($query) use ($excludeUserId) {
                $query->whereNull('user_id');
                if ($excludeUserId) {
                    $query->orWhere('user_id', $excludeUserId);
                }
            })
            ->where(function ($query) use ($q) {
                if ($q) {
                    $query->where('fname', 'like', "%{$q}%")
                          ->orWhere('lname', 'like', "%{$q}%")
                          ->orWhere('employee_id', 'like', "%{$q}%");
                }
            })
            ->orderBy('lname')
            ->orderBy('fname')
            ->limit(20)
            ->get(['id', 'public_id', 'employee_id', 'user_id', 'fname', 'mname', 'lname',
                   'department_id', 'position_id', 'email', 'contact', 'status']);

        return response()->json(['data' => $results]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username'            => ['required', 'string', 'max:255', 'unique:users,username'],
            'password'            => ['required', 'string', 'min:6'],
            'fname'               => ['required', 'string', 'max:255'],
            'mname'               => ['nullable', 'string', 'max:255'],
            'lname'               => ['required', 'string', 'max:255'],
            'suffix'              => ['nullable', 'string', 'max:10'],
            'email'               => ['nullable', 'email', 'max:255'],
            'contact_number'      => ['nullable', 'string', 'max:20'],
            'access'              => ['required', 'string', Rule::in(['Administrator', 'Encoder', 'Registrar', 'Cashier', 'Accounting Staff', 'HR', 'Custodian', 'Librarian', 'School Nurse', 'Front Desk'])],
            'department'          => ['nullable', 'string', 'max:55'],
            'sub_department'      => ['nullable', 'string', 'max:55'],
            'hrms_personnel_id'   => ['nullable', 'integer', 'exists:hrms_personnel,id'],
        ]);

        $personnelId = $validated['hrms_personnel_id'] ?? null;
        unset($validated['hrms_personnel_id']);

        $user = User::create($validated);

        if ($personnelId) {
            // Unlink anyone who was previously using this personnel record
            HrmsPersonnel::where('user_id', $user->id)->update(['user_id' => null]);
            HrmsPersonnel::where('id', $personnelId)->update(['user_id' => $user->id]);
        }

        return response()->json(['data' => $user->load('hrmsPersonnel')], 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(['data' => $user->load('hrmsPersonnel')]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'username'          => ['sometimes', 'string', 'max:255', Rule::unique('users')->ignore($user->id)],
            'fname'             => ['sometimes', 'string', 'max:255'],
            'mname'             => ['nullable', 'string', 'max:255'],
            'lname'             => ['sometimes', 'string', 'max:255'],
            'suffix'            => ['nullable', 'string', 'max:10'],
            'email'             => ['nullable', 'email', 'max:255'],
            'contact_number'    => ['nullable', 'string', 'max:20'],
            'access'            => ['sometimes', 'string', Rule::in(['Administrator', 'Encoder', 'Registrar', 'Cashier', 'Accounting Staff', 'Teacher', 'HR', 'Custodian', 'Librarian', 'School Nurse', 'Front Desk', 'Student', 'Parent'])],
            'department'        => ['nullable', 'string', 'max:55'],
            'sub_department'    => ['nullable', 'string', 'max:55'],
            'status'            => ['sometimes', 'string', Rule::in(['Active', 'Inactive'])],
            'hrms_personnel_id' => ['nullable', 'integer', 'exists:hrms_personnel,id'],
        ]);

        $newPersonnelId = array_key_exists('hrms_personnel_id', $validated) ? $validated['hrms_personnel_id'] : false;
        unset($validated['hrms_personnel_id']);

        $user->update($validated);

        if ($newPersonnelId !== false) {
            // Unlink previous record for this user
            HrmsPersonnel::where('user_id', $user->id)->update(['user_id' => null]);
            if ($newPersonnelId) {
                HrmsPersonnel::where('id', $newPersonnelId)->update(['user_id' => $user->id]);
            }
        }

        // Sync name / email / contact to linked personnel record so both modules stay consistent
        $linkedPersonnel = HrmsPersonnel::where('user_id', $user->id)->first();
        if ($linkedPersonnel) {
            $sync = [];
            if (isset($validated['fname']))                       $sync['fname']   = $validated['fname'];
            if (array_key_exists('mname', $validated))           $sync['mname']   = $validated['mname'];
            if (isset($validated['lname']))                       $sync['lname']   = $validated['lname'];
            if (array_key_exists('email', $validated))           $sync['email']   = $validated['email'];
            if (array_key_exists('contact_number', $validated))  $sync['contact'] = $validated['contact_number'];
            if (!empty($sync)) $linkedPersonnel->update($sync);
        }

        return response()->json(['data' => $user->fresh()->load(['hrmsPersonnel', 'hrmsPersonnel.position:id,name'])]);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $newPassword = str()->random(8);
        $user->update(['password' => $newPassword]);

        return response()->json([
            'message' => 'Password reset successfully.',
            'data' => ['new_password' => $newPassword],
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->id === request()->user()?->id) {
            return response()->json(['message' => 'Cannot delete your own account.'], 422);
        }

        // Unlink from HRMS personnel on deactivation
        HrmsPersonnel::where('user_id', $user->id)->update(['user_id' => null]);

        $user->update(['status' => 'Inactive']);
        return response()->json(['message' => 'User deactivated.']);
    }
}
