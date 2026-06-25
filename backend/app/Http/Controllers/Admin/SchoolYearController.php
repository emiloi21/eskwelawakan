<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SchoolYear;
use App\Models\SchoolPreference;
use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\StudentOtherFee;
use App\Models\FiscalYearClosingLog;
use App\Services\CacheService;
use App\Services\GlJournalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class SchoolYearController extends Controller
{
    public function index(): JsonResponse
    {
        $schoolYears = SchoolYear::orderByDesc('school_year')->get();
        return response()->json(['data' => $schoolYears]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'school_year' => ['required', 'string', 'max:9', 'unique:school_years,school_year',
                'regex:/^\d{4}-\d{4}$/'],
            'fy_start_date' => ['nullable', 'date'],
            'fy_end_date' => ['nullable', 'date', 'after_or_equal:fy_start_date'],
        ]);

        $sy = SchoolYear::create($validated);

        CacheService::bustLookups();

        return response()->json(['data' => $sy], 201);
    }

    public function show(SchoolYear $schoolYear): JsonResponse
    {
        return response()->json(['data' => $schoolYear]);
    }

    public function update(Request $request, SchoolYear $schoolYear): JsonResponse
    {
        $validated = $request->validate([
            'school_year' => ['sometimes', 'string', 'max:9',
                Rule::unique('school_years')->ignore($schoolYear->id),
                'regex:/^\d{4}-\d{4}$/'],
            'fy_start_date' => ['nullable', 'date'],
            'fy_end_date' => ['nullable', 'date', 'after_or_equal:fy_start_date'],
        ]);

        $schoolYear->update($validated);

        CacheService::bustLookups();

        return response()->json(['data' => $schoolYear->fresh()]);
    }

    public function destroy(SchoolYear $schoolYear): JsonResponse
    {
        // Prevent deleting active SY
        if ($schoolYear->status === 'Active') {
            return response()->json(['message' => 'Cannot delete an active school year.'], 422);
        }

        // Check for students enrolled in this SY
        $hasStudents = Student::where('schoolYear', $schoolYear->school_year)->exists();
        if ($hasStudents) {
            return response()->json(['message' => 'Cannot delete a school year with enrolled students.'], 422);
        }

        $schoolYear->delete();
        return response()->json(['message' => 'School year deleted.']);
    }

    public function activate(Request $request, SchoolYear $schoolYear): JsonResponse
    {
        $validated = $request->validate([
            'semester' => ['required', 'string', Rule::in(['1st Semester', '2nd Semester', 'Summer', '1st Trimester', '2nd Trimester', '3rd Trimester'])],
        ]);

        // Deactivate all first
        SchoolYear::where('status', 'Active')->update(['status' => 'Inactive']);

        $schoolYear->update(['status' => 'Active']);

        // Update school preferences
        SchoolPreference::first()?->update([
            'activeSchoolYear' => $schoolYear->school_year,
            'activeSemester'   => $validated['semester'],
        ]);

        return response()->json(['data' => $schoolYear->fresh()]);
    }

    public function setActiveSemester(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'semester' => ['required', 'string', Rule::in(['1st Semester', '2nd Semester', 'Summer', '1st Trimester', '2nd Trimester', '3rd Trimester'])],
        ]);

        SchoolPreference::first()?->update([
            'activeSemester' => $validated['semester'],
        ]);

        return response()->json(['message' => 'Active semester updated.']);
    }

    public function fiscalYearPreview(SchoolYear $schoolYear): JsonResponse
    {
        if ($schoolYear->fy_closed) {
            return response()->json(['message' => 'Fiscal year already closed.'], 422);
        }

        $sy = $schoolYear->school_year;

        // Count students with outstanding balances
        $studentsWithBalance = StudentAssessment::where('schoolYear', $sy)
            ->where('total_amt_bal', '>', 0)
            ->distinct('reg_id')
            ->count('reg_id');

        // Total outstanding balance
        $totalBalance = StudentAssessment::where('schoolYear', $sy)
            ->where('total_amt_bal', '>', 0)
            ->sum('total_amt_bal');

        // Records that would be converted
        $recordsToConvert = StudentAssessment::where('schoolYear', $sy)
            ->where('total_amt_bal', '>', 0)
            ->count();

        return response()->json([
            'data' => [
                'school_year' => $sy,
                'students_with_balance' => $studentsWithBalance,
                'total_outstanding_balance' => (float) $totalBalance,
                'records_to_convert' => $recordsToConvert,
                'fy_closed' => $schoolYear->fy_closed,
            ],
        ]);
    }

    public function processFiscalYearClosing(Request $request, SchoolYear $schoolYear): JsonResponse
    {
        if ($schoolYear->fy_closed) {
            return response()->json(['message' => 'Fiscal year already closed.'], 422);
        }

        $sy = $schoolYear->school_year;
        $userId = $request->user()->id;

        try {
            DB::beginTransaction();

            // Get all assessment records with outstanding balances
            $assessments = StudentAssessment::where('schoolYear', $sy)
                ->where('total_amt_bal', '>', 0)
                ->get();

            $studentsProcessed = [];
            $totalConverted = 0;
            $recordsUpdated = 0;

            foreach ($assessments as $assessment) {
                /** @var \App\Models\StudentAssessment $assessment */
                $balance = $assessment->total_amt_bal;

                // Create OLD ACCOUNT entry in student_other_fees
                StudentOtherFee::create([
                    'reg_id' => $assessment->reg_id,
                    'category_id' => $assessment->category_id,
                    'account_code' => 'OA-' . str_replace('-', '', $sy),
                    'description' => "OLD ACCOUNT SY {$sy}",
                    'amount' => $balance,
                    'status' => 'Active',
                    'paymentTerm' => 1,
                    'schoolYear' => $sy,
                ]);

                // Mark assessment as debited
                $assessment->update([
                    'total_amt_debit' => $balance,
                    'total_amt_bal' => 0,
                ]);

                $studentsProcessed[$assessment->reg_id] = true;
                $totalConverted += $balance;
                $recordsUpdated++;
            }

            // Mark SY as closed
            $schoolYear->update([
                'fy_closed' => true,
                'fy_closed_at' => now(),
                'fy_closed_by' => $userId,
            ]);

            // Log the closing
            FiscalYearClosingLog::create([
                'schoolYear' => $sy,
                'students_processed' => count($studentsProcessed),
                'total_amount_converted' => $totalConverted,
                'records_updated' => $recordsUpdated,
                'processed_by' => $userId,
                'status' => 'Completed',
            ]);

            DB::commit();

            // GL: record FY closing entries (non-blocking — runs outside main DB transaction)
            try {
                app(GlJournalService::class)->recordFyClosing($sy, $userId);
            } catch (\Throwable $glEx) {
                Log::warning('GL FY closing entry failed for SY ' . $sy . ': ' . $glEx->getMessage());
            }

            return response()->json([
                'message' => 'Fiscal year closing completed.',
                'data' => [
                    'students_processed' => count($studentsProcessed),
                    'total_amount_converted' => $totalConverted,
                    'records_updated' => $recordsUpdated,
                ],
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            FiscalYearClosingLog::create([
                'schoolYear' => $sy,
                'processed_by' => $userId,
                'status' => 'Failed',
                'error_message' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Fiscal year closing failed.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
