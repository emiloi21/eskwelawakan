<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FacultyStaff;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PortalAccountController extends Controller
{
    // ── Lookups ───────────────────────────────────────────────────────────────

    /**
     * Search students for linking (returns lightweight list).
     */
    public function searchStudents(Request $request): JsonResponse
    {
        $q = $request->query('q', '');

        $students = Student::query()
            ->where(function ($query) use ($q) {
                $query->where('lname', 'like', "%{$q}%")
                      ->orWhere('fname', 'like', "%{$q}%")
                      ->orWhere('student_id', 'like', "%{$q}%")
                      ->orWhere('lrn', 'like', "%{$q}%");
            })
            ->whereIn('status', ['Enrolled', 'Pending'])
            ->orderBy('lname')->orderBy('fname')
            ->limit(20)
            ->get(['reg_id', 'student_id', 'lrn', 'fname', 'lname', 'mname', 'suffix',
                   'gradeLevel', 'section', 'strand', 'dept', 'schoolYear']);

        return response()->json(['data' => $students]);
    }

    /**
     * Search faculty/staff for linking.
     */
    public function searchFaculty(Request $request): JsonResponse
    {
        $q = $request->query('q', '');

        $faculty = FacultyStaff::query()
            ->where('fullname', 'like', "%{$q}%")
            ->orderBy('fullname')
            ->limit(20)
            ->get(['personnel_id', 'fullname', 'classification']);

        return response()->json(['data' => $faculty]);
    }

    // ── Portal accounts list ──────────────────────────────────────────────────

    /**
     * List all portal accounts (Student / Teacher / Parent).
     * Eager-loads the linked profile record.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->whereIn('access', ['Student', 'Teacher', 'Parent'])
            ->with(['student', 'facultyStaff', 'children']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                  ->orWhere('fname', 'like', "%{$search}%")
                  ->orWhere('lname', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($role = $request->query('access')) {
            $query->where('access', $role);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $users = $query->orderBy('access')->orderBy('lname')->orderBy('fname')
            ->paginate($request->query('per_page', 20));

        return response()->json($users);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'access'    => ['required', Rule::in(['Student', 'Teacher', 'Parent'])],
            'username'  => ['required', 'string', 'max:255', 'unique:users,username'],
            'password'  => ['required', 'string', 'min:6'],
            'fname'     => ['required', 'string', 'max:255'],
            'mname'     => ['nullable', 'string', 'max:255'],
            'lname'     => ['required', 'string', 'max:255'],
            'suffix'    => ['nullable', 'string', 'max:10'],
            'email'     => ['nullable', 'email', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:20'],
            // Role-specific links
            'reg_id'       => ['nullable', 'integer', 'exists:students,reg_id'],
            'personnel_id' => ['nullable', 'integer', 'exists:faculty_staff,personnel_id'],
            'child_reg_ids' => ['nullable', 'array'],
            'child_reg_ids.*' => ['integer', 'exists:students,reg_id'],
        ]);

        // Guard: Student must have reg_id; Teacher must have personnel_id
        if ($validated['access'] === 'Student' && empty($validated['reg_id'])) {
            return response()->json(['message' => 'A student account must be linked to a student record (reg_id).'], 422);
        }
        if ($validated['access'] === 'Teacher' && empty($validated['personnel_id'])) {
            return response()->json(['message' => 'A teacher account must be linked to a faculty/staff record (personnel_id).'], 422);
        }

        // Guard: one account per student record
        if (!empty($validated['reg_id'])) {
            $existing = User::where('reg_id', $validated['reg_id'])->first();
            if ($existing) {
                return response()->json([
                    'message' => "Student record is already linked to user account '{$existing->username}'.",
                ], 422);
            }
        }

        // Guard: one account per personnel record
        if (!empty($validated['personnel_id'])) {
            $existing = User::where('personnel_id', $validated['personnel_id'])->first();
            if ($existing) {
                return response()->json([
                    'message' => "Faculty record is already linked to user account '{$existing->username}'.",
                ], 422);
            }
        }

        $user = DB::transaction(function () use ($validated) {
            $user = User::create([
                'access'         => $validated['access'],
                'username'       => $validated['username'],
                'password'       => $validated['password'],
                'fname'          => $validated['fname'],
                'mname'          => $validated['mname'] ?? null,
                'lname'          => $validated['lname'],
                'suffix'         => $validated['suffix'] ?? null,
                'email'          => $validated['email'] ?? null,
                'contact_number' => $validated['contact_number'] ?? null,
                'reg_id'         => $validated['reg_id'] ?? null,
                'personnel_id'   => $validated['personnel_id'] ?? null,
                'status'         => 'Active',
            ]);

            // Sync parent→children
            if ($validated['access'] === 'Parent' && !empty($validated['child_reg_ids'])) {
                DB::table('parent_students')->insert(
                    array_map(fn($rid) => ['user_id' => $user->id, 'reg_id' => $rid],
                              $validated['child_reg_ids'])
                );
            }

            return $user;
        });

        return response()->json(['data' => $user->load(['student', 'facultyStaff', 'children'])], 201);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public function update(Request $request, User $user): JsonResponse
    {
        if (!in_array($user->access, ['Student', 'Teacher', 'Parent'])) {
            return response()->json(['message' => 'Not a portal account.'], 422);
        }

        $validated = $request->validate([
            'username'  => ['sometimes', 'string', 'max:255', Rule::unique('users')->ignore($user->id)],
            'fname'     => ['sometimes', 'string', 'max:255'],
            'mname'     => ['nullable', 'string', 'max:255'],
            'lname'     => ['sometimes', 'string', 'max:255'],
            'suffix'    => ['nullable', 'string', 'max:10'],
            'email'     => ['nullable', 'email', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:20'],
            'status'    => ['sometimes', Rule::in(['Active', 'Inactive'])],
            'reg_id'    => ['nullable', 'integer', 'exists:students,reg_id'],
            'personnel_id' => ['nullable', 'integer', 'exists:faculty_staff,personnel_id'],
            'child_reg_ids' => ['nullable', 'array'],
            'child_reg_ids.*' => ['integer', 'exists:students,reg_id'],
        ]);

        DB::transaction(function () use ($user, $validated) {
            // Guard duplicate reg_id / personnel_id (excluding self)
            if (array_key_exists('reg_id', $validated) && $validated['reg_id'] !== null) {
                $conflict = User::where('reg_id', $validated['reg_id'])
                                ->where('id', '!=', $user->id)->first();
                if ($conflict) {
                    abort(422, "Student record already linked to '{$conflict->username}'.");
                }
            }
            if (array_key_exists('personnel_id', $validated) && $validated['personnel_id'] !== null) {
                $conflict = User::where('personnel_id', $validated['personnel_id'])
                                ->where('id', '!=', $user->id)->first();
                if ($conflict) {
                    abort(422, "Faculty record already linked to '{$conflict->username}'.");
                }
            }

            $user->update(collect($validated)->except('child_reg_ids')->toArray());

            if ($user->access === 'Parent' && isset($validated['child_reg_ids'])) {
                DB::table('parent_students')->where('user_id', $user->id)->delete();
                if (!empty($validated['child_reg_ids'])) {
                    DB::table('parent_students')->insert(
                        array_map(fn($rid) => ['user_id' => $user->id, 'reg_id' => $rid],
                                  $validated['child_reg_ids'])
                    );
                }
            }
        });

        return response()->json(['data' => $user->fresh()->load(['student', 'facultyStaff', 'children'])]);
    }

    // ── Password reset ────────────────────────────────────────────────────────

    public function resetPassword(User $user): JsonResponse
    {
        if (!in_array($user->access, ['Student', 'Teacher', 'Parent'])) {
            return response()->json(['message' => 'Not a portal account.'], 422);
        }

        $newPassword = str()->random(8);
        $user->update(['password' => $newPassword]);

        return response()->json([
            'message' => 'Password reset successfully.',
            'data'    => ['new_password' => $newPassword],
        ]);
    }

    // ── Toggle active ─────────────────────────────────────────────────────────

    public function toggleStatus(User $user): JsonResponse
    {
        if (!in_array($user->access, ['Student', 'Teacher', 'Parent'])) {
            return response()->json(['message' => 'Not a portal account.'], 422);
        }

        $newStatus = $user->status === 'Active' ? 'Inactive' : 'Active';
        $user->update(['status' => $newStatus]);

        return response()->json(['data' => $user->fresh(), 'status' => $newStatus]);
    }
}
