<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\SchoolPreference;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('username', $request->username)
            ->where('status', 'Active')
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            // Check if this is a legacy MD5+salt password and rehash
            if ($user && $this->checkLegacyPassword($request->password, $user->password)) {
                $user->password = Hash::make($request->password);
                $user->save();
            } else {
                throw ValidationException::withMessages([
                    'username' => ['The provided credentials are incorrect.'],
                ]);
            }
        }

        // Revoke existing tokens for this device
        $user->tokens()->where('name', 'spa-token')->delete();

        $token = $user->createToken('spa-token')->plainTextToken;

        return response()->json([
            'user' => $this->formatUser($user),
            'token' => $token,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->formatUser($request->user()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();
        if ($token) {
            $token->delete();
        }

        return response()->json(['message' => 'Logged out']);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fname' => ['sometimes', 'string', 'max:255'],
            'lname' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255'],
            'contact_number' => ['sometimes', 'string', 'max:20'],
            'selected_sy' => ['sometimes', 'nullable', 'string', 'max:9'],
            'selected_sem' => ['sometimes', 'nullable', 'string', 'max:25'],
        ]);

        $request->user()->update($validated);

        return response()->json([
            'user' => $this->formatUser($request->user()->fresh()),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json(['message' => 'Password updated']);
    }

    private function checkLegacyPassword(string $password, string $hash): bool
    {
        $salt = 'a1Bz20ydqelm8m1wql';
        $legacyHash = $salt . md5($password);
        return $legacyHash === $hash;
    }

    private function formatUser(User $user): array
    {
        $prefs = SchoolPreference::first();

        // Eager-load designations if not already loaded
        if (! $user->relationLoaded('designations')) {
            $user->load('designations');
        }

        return [
            'id' => $user->id,
            'username' => $user->username,
            'fname' => $user->fname,
            'mname' => $user->mname,
            'lname' => $user->lname,
            'suffix' => $user->suffix,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'contact_number' => $user->contact_number,
            'access' => $user->access,
            'department' => $user->department,
            'sub_department' => $user->sub_department,
            'selected_sy' => $user->selected_sy ?? $prefs?->activeSchoolYear,
            'selected_sem' => $user->selected_sem ?? $prefs?->activeSemester,
            'status' => $user->status,
            'profile_image' => $user->profile_image,
            // All roles this user may access (primary + extra designations)
            'designations' => $user->designations->map(fn ($d) => [
                'designation'    => $d->designation,
                'position_title' => $d->position_title,
                'department'     => $d->department,
                'is_primary'     => $d->is_primary,
            ])->values(),
        ];
    }
}
