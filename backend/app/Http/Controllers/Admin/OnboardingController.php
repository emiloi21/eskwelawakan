<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AccountsAssessment;
use App\Models\HrmsPersonnel;
use App\Models\PropertyItem;
use App\Models\SchoolPreference;
use App\Models\SchoolYear;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class OnboardingController extends Controller
{
    /**
     * Return the current system onboarding status.
     * Each check returns: { done: bool, label: string, description: string, action_url: string }
     */
    public function status(): JsonResponse
    {
        $prefs = SchoolPreference::first();

        // ── Step 1: Active School Year ────────────────────────────
        $activeSY = SchoolYear::where('status', 'Active')->first();
        $step1 = [
            'key'         => 'school_year',
            'label'       => 'Activate a School Year',
            'description' => $activeSY
                ? "Active: {$activeSY->school_year}"
                : 'No active school year found. Enrollment, assessments, and payments cannot proceed.',
            'done'        => (bool) $activeSY,
            'action_url'  => '/admin/school-years',
            'blocking'    => ['registrar', 'accounting'],
        ];

        // ── Step 2: School Preferences filled ────────────────────
        $prefsComplete = $prefs && !empty($prefs->schoolName) && !empty($prefs->address);
        $step2 = [
            'key'         => 'school_preferences',
            'label'       => 'Fill in School Preferences',
            'description' => $prefsComplete
                ? "School: {$prefs->schoolName}"
                : 'School name and address are required for reports and printed documents.',
            'done'        => $prefsComplete,
            'action_url'  => '/admin/school-preferences',
            'blocking'    => [],
        ];

        // ── Step 3: At least one internal staff user beyond admin ─
        $staffCount = User::whereNotIn('access', ['Student', 'Teacher', 'Parent', 'Applicant'])
            ->where('username', '!=', 'admin')
            ->where('status', 'Active')
            ->count();
        $step3 = [
            'key'         => 'staff_users',
            'label'       => 'Create Internal Staff Accounts',
            'description' => $staffCount > 0
                ? "{$staffCount} active staff account(s) configured (Registrar, Accounting, HR, etc.)"
                : 'No staff accounts found. At minimum create a Registrar and Accounting Staff account.',
            'done'        => $staffCount > 0,
            'action_url'  => '/admin/users',
            'blocking'    => [],
        ];

        // ── Step 4: Chart of Accounts has entries ─────────────────
        $coaCount = DB::table('chart_of_accounts')->count();
        $step4 = [
            'key'         => 'chart_of_accounts',
            'label'       => 'Set Up Chart of Accounts',
            'description' => $coaCount > 0
                ? "{$coaCount} account(s) in the COA tree"
                : 'Chart of Accounts is empty. GL journal entries cannot be posted without it.',
            'done'        => $coaCount > 0,
            'action_url'  => '/accounting/chart-of-accounts',
            'blocking'    => ['accounting', 'custodian'],
        ];

        // ── Step 5: GL system accounts mapped ─────────────────────
        $glMapped = $prefs
            && $prefs->gl_ar_coa_id
            && $prefs->gl_cash_coa_id;
        $step5 = [
            'key'         => 'gl_settings',
            'label'       => 'Map GL System Accounts',
            'description' => $glMapped
                ? 'AR and Cash accounts are mapped in GL Settings.'
                : 'AR and Cash/Bank accounts must be mapped before payments can generate journal entries.',
            'done'        => (bool) $glMapped,
            'action_url'  => '/admin/school-preferences',
            'blocking'    => ['accounting'],
        ];

        // ── Step 6: At least one assessment for the active SY ─────
        $assessmentCount = 0;
        if ($activeSY) {
            $assessmentCount = AccountsAssessment::where('schoolYear', $activeSY->school_year)->count();
        }
        $step6 = [
            'key'         => 'assessments',
            'label'       => 'Create Fee Assessments',
            'description' => $assessmentCount > 0
                ? "{$assessmentCount} assessment(s) configured for {$activeSY?->school_year}"
                : 'No fee assessments exist for the active school year. Students cannot be billed.',
            'done'        => $assessmentCount > 0,
            'action_url'  => '/accounting/assessments',
            'blocking'    => ['accounting', 'registrar'],
        ];

        // ── Step 7: At least one HRMS personnel record ────────────
        $personnelCount = HrmsPersonnel::count();
        $unlinkedCount  = HrmsPersonnel::whereNull('user_id')->count();
        $step7 = [
            'key'         => 'hrms_personnel',
            'label'       => 'Add HRMS Personnel',
            'description' => $personnelCount > 0
                ? "{$personnelCount} personnel record(s) · {$unlinkedCount} without a system account"
                : 'No personnel records found in HRMS. Add staff to enable attendance, leave, and system account linking.',
            'done'        => $personnelCount > 0,
            'action_url'  => '/hrms/personnel',
            'blocking'    => ['hrms'],
        ];

        // ── Summary ───────────────────────────────────────────────
        $steps    = [$step1, $step2, $step3, $step4, $step5, $step6, $step7];
        $doneCount = collect($steps)->where('done', true)->count();
        $totalCount = count($steps);

        // Which portals are blocked (any blocking step is not done)
        $blockedModules = collect($steps)
            ->where('done', false)
            ->flatMap(fn ($s) => $s['blocking'])
            ->unique()
            ->values()
            ->all();

        return response()->json([
            'done_count'      => $doneCount,
            'total_count'     => $totalCount,
            'complete'        => $doneCount === $totalCount,
            'blocked_modules' => $blockedModules,
            'steps'           => $steps,
        ]);
    }
}
