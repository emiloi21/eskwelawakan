<?php

namespace App\Http\Controllers\Enrollment;

use App\Http\Controllers\Controller;
use App\Mail\ApplicationReceivedMail;
use App\Models\SchoolPreference;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class EnrollmentApplicationController extends Controller
{
    /**
     * GET /apply-info — public: returns school name and active school year for the form.
     */
    public function info(): JsonResponse
    {
        $prefs = SchoolPreference::first();

        return response()->json([
            'school_name'        => $prefs?->schoolName ?? 'School',
            'active_school_year' => $prefs?->activeSchoolYear ?? (date('Y') . '-' . (date('Y') + 1)),
        ]);
    }

    /**
     * POST /apply — public: submit a new enrollment application.
     * Creates a Student record (status=Pending) + User account (access=Applicant).
     */
    public function apply(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // Personal
            'lname'             => ['required', 'string', 'max:255'],
            'fname'             => ['required', 'string', 'max:255'],
            'mname'             => ['nullable', 'string', 'max:255'],
            'suffix'            => ['nullable', 'string', 'max:5'],
            'lrn'               => ['nullable', 'string', 'max:12'],
            'bdMM'              => ['required', 'string', 'max:2'],
            'bdDD'              => ['required', 'string', 'max:2'],
            'bdYYYY'            => ['required', 'string', 'max:4'],
            'sex'               => ['required', 'string', 'in:Male,Female'],
            // Guardian
            'guardian_lname'    => ['nullable', 'string', 'max:55'],
            'guardian_fname'    => ['nullable', 'string', 'max:55'],
            'guardian_contact'  => ['required', 'string', 'max:25'],
            'guardian_relation' => ['required', 'string', 'max:55'],
            // Previous school
            'last_school'       => ['required', 'string', 'max:255'],
            'last_school_sy'    => ['required', 'string', 'max:9'],
            'last_school_type'  => ['required', 'string', 'max:25'],
            // Enrollment
            'dept'              => ['required', 'string', 'max:55'],
            'gradeLevel'        => ['required', 'string', 'max:55'],
            'strand'            => ['nullable', 'string', 'max:55'],
            'classification'    => ['required', 'string', 'max:55'],
            // Account
            'email'             => ['required', 'string', 'email', 'max:190'],
            'password'          => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $prefs      = SchoolPreference::first();
        $schoolYear = $prefs?->activeSchoolYear ?? (date('Y') . '-' . (date('Y') + 1));

        return DB::transaction(function () use ($validated, $schoolYear) {
            // Auto-generate a unique username from applicant's name
            $lnSlug       = strtolower(preg_replace('/[^a-zA-Z]/', '', $validated['lname']));
            $fnSlug       = strtolower(preg_replace('/[^a-zA-Z]/', '', $validated['fname']));
            $baseUsername = 'app_' . substr($lnSlug, 0, 10) . '_' . substr($fnSlug, 0, 6);
            $username     = $baseUsername;
            $counter      = 1;
            while (User::where('username', $username)->exists()) {
                $username = $baseUsername . $counter++;
            }

            $student = Student::create([
                'lrn'               => $validated['lrn'] ?? 'PENDING',
                'esc_id'            => '0',
                'student_id'        => 'APP-' . strtoupper(Str::random(8)),
                'lname'             => strtoupper(trim($validated['lname'])),
                'fname'             => ucwords(strtolower(trim($validated['fname']))),
                'mname'             => $validated['mname'] ? ucwords(strtolower(trim($validated['mname']))) : '',
                'suffix'            => $validated['suffix'] ?? '-',
                'bdMM'              => $validated['bdMM'],
                'bdDD'              => $validated['bdDD'],
                'bdYYYY'            => $validated['bdYYYY'],
                'sex'               => $validated['sex'],
                'guardian_lname'    => $validated['guardian_lname'] ?? '',
                'guardian_fname'    => $validated['guardian_fname'] ?? '',
                'guardian_contact'  => $validated['guardian_contact'],
                'guardian_relation' => $validated['guardian_relation'],
                'last_school'       => $validated['last_school'],
                'last_school_sy'    => $validated['last_school_sy'],
                'last_school_type'  => $validated['last_school_type'],
                'dept'              => $validated['dept'],
                'gradeLevel'        => $validated['gradeLevel'],
                'strand'            => $validated['strand'] ?? 'N/A',
                'major'             => 'N/A',
                'section'           => '-',
                'classification'    => $validated['classification'],
                'schoolYear'        => $schoolYear,
                'sem'               => '1st Semester',
                'appDate'           => now()->format('m/d/Y'),
                'appTime'           => now()->format('h:i A'),
                'status'            => 'Pending',
            ]);

            User::create([
                'username' => $username,
                'password' => $validated['password'],
                'email'    => $validated['email'],
                'fname'    => $student->fname,
                'lname'    => $student->lname,
                'mname'    => $student->mname ?: null,
                'access'   => 'Applicant',
                'status'   => 'Active',
                'reg_id'   => $student->reg_id,
            ]);

            $responseData = [
                'message'   => 'Application submitted successfully. Please save your login credentials.',
                'username'  => $username,
                'student'   => [
                    'name'        => "{$student->lname}, {$student->fname}",
                    'grade_level' => $student->gradeLevel,
                    'school_year' => $student->schoolYear,
                    'status'      => $student->status,
                ],
            ];

            // Send confirmation email (fire-and-forget — failures must not block enrollment)
            try {
                Mail::to($validated['email'])->send(new ApplicationReceivedMail(
                    applicantName: "{$student->fname} {$student->lname}",
                    username: $username,
                    gradeLevel: $student->gradeLevel,
                    schoolYear: $student->schoolYear,
                ));
            } catch (\Throwable) {
                // Log automatically captures this via the log mail driver; silent fail in production
            }

            return response()->json($responseData, 201);
        });
    }
}
