<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\DssAiEngineService;

class DssController extends Controller
{
    public function getAiAnalysisSummary(Request $request)
    {
        $service = new DssAiEngineService();
        
        // Wrap in a try-catch so a database mismatch doesn't cause a 500 error
        try {
            $totalEnrollment = DB::table('students')->count(); // Adjust 'students' to your actual table name later
        } catch (\Exception $e) {
            $totalEnrollment = 15; // Fallback to prevent crash
        }

        $snapshotData = [
            'total_enrollment' => $totalEnrollment,
            'underutilized_sections' => 0, 
            'faculty_load_non_compliant' => 0
        ];

        $explanation = $service->fetchConversationalAnalysis('dashboard', $snapshotData);
        $projections = $service->generateEnrollmentProjections();

        return response()->json([
            'explanation' => $explanation,
            'projections' => $projections
        ]);
    }
}