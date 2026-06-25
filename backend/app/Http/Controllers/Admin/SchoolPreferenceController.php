<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SchoolPreference;
use App\Services\CacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SchoolPreferenceController extends Controller
{
    /**
     * Public-safe school info for the website (no auth required).
     */
    public function publicInfo(): JsonResponse
    {
        $prefs = SchoolPreference::first();

        if (!$prefs) {
            return response()->json(['data' => null]);
        }

        return response()->json(['data' => [
            'schoolName'       => $prefs->schoolName,
            'logo'             => $prefs->logo ? asset('storage/' . $prefs->logo) : null,
            'address'          => $prefs->address,
            'emailAddress'     => $prefs->emailAddress,
            'contactNumber'    => $prefs->contactNumber,
            'region'           => $prefs->region,
            'division'         => $prefs->division,
            'activeSchoolYear' => $prefs->activeSchoolYear,
            'activeSemester'   => $prefs->activeSemester,
        ]]);
    }

    public function show(): JsonResponse
    {
        $prefs = SchoolPreference::first();
        return response()->json(['data' => $prefs]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'deped_id' => ['sometimes', 'string', 'max:20'],
            'region' => ['sometimes', 'string', 'max:100'],
            'division' => ['sometimes', 'string', 'max:100'],
            'schoolName' => ['sometimes', 'string', 'max:255'],
            'address' => ['sometimes', 'string', 'max:500'],
            'emailAddress' => ['sometimes', 'email', 'max:255'],
            'contactNumber' => ['sometimes', 'string', 'max:50'],
            'activeSchoolYear' => ['sometimes', 'string', 'max:9'],
            'activeSemester' => ['sometimes', 'string', 'max:55'],
        ]);

        $prefs = SchoolPreference::firstOrCreate([], ['schoolName' => 'My School']);
        $prefs->update($validated);

        CacheService::bustLookups();

        return response()->json(['data' => $prefs->fresh()]);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => ['required', 'image', 'max:2048'],
        ]);

        $prefs = SchoolPreference::firstOrCreate([], ['schoolName' => 'My School']);

        // Delete old logo if exists
        if ($prefs->logo && Storage::disk('public')->exists($prefs->logo)) {
            Storage::disk('public')->delete($prefs->logo);
        }

        $path = $request->file('logo')->store('logos', 'public');
        $prefs->update(['logo' => $path]);

        CacheService::bustLookups();

        return response()->json(['data' => $prefs->fresh()]);
    }

    /**
     * Update GL system account mappings (which COA entries serve each
     * system purpose — A/R, Cash, Bank, Income Summary, Retained Earnings).
     */
    public function updateGlAccounts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'gl_ar_coa_id'             => ['nullable', 'integer', 'exists:chart_of_accounts,coa_id'],
            'gl_cash_coa_id'           => ['nullable', 'integer', 'exists:chart_of_accounts,coa_id'],
            'gl_bank_coa_id'           => ['nullable', 'integer', 'exists:chart_of_accounts,coa_id'],
            'gl_ewallet_coa_id'        => ['nullable', 'integer', 'exists:chart_of_accounts,coa_id'],
            'gl_voucher_coa_id'        => ['nullable', 'integer', 'exists:chart_of_accounts,coa_id'],
            'gl_income_summary_coa_id' => ['nullable', 'integer', 'exists:chart_of_accounts,coa_id'],
            'gl_retained_coa_id'       => ['nullable', 'integer', 'exists:chart_of_accounts,coa_id'],
        ]);

        $prefs = SchoolPreference::firstOrCreate([], ['schoolName' => 'My School']);
        $prefs->update($validated);

        CacheService::bustLookups();

        return response()->json(['data' => $prefs->fresh()]);
    }
}
