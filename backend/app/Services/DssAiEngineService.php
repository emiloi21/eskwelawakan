<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache; // <--- Added this

class DssAiEngineService
{
    public function generateEnrollmentProjections()
    {
        // Enrollment projections change less often, we can cache this too for 1 hour
        return Cache::remember('dss_enrollment_projection', 3600, function () {
            try {
                $historical = DB::table('student_assessments')
                    ->select('school_year', DB::raw('count(*) as total'))
                    ->groupBy('school_year')
                    ->orderBy('school_year', 'asc')
                    ->get();

                if ($historical->count() < 1) {
                    return ['projected_total' => 0, 'status' => 'No historical data found.'];
                }

                if ($historical->count() === 1) {
                    return ['projected_total' => $historical[0]->total, 'confidence_rate' => 70, 'status' => 'Baseline calculation.'];
                }

                $x = []; $y = [];
                foreach ($historical as $index => $data) {
                    $x[] = $index; $y[] = $data->total;
                }

                $n = count($x);
                $sumX = array_sum($x);
                $sumY = array_sum($y);
                $sumXX = 0; $sumXY = 0;
                for ($i = 0; $i < $n; $i++) {
                    $sumXX += ($x[$i] * $x[$i]);
                    $sumXY += ($x[$i] * $y[$i]);
                }

                $denominator = ($n * $sumXX) - ($sumX * $sumX);
                $slope = $denominator != 0 ? (($n * $sumXY) - ($sumX * $sumY)) / $denominator : 0;
                $intercept = ($sumY - ($slope * $sumX)) / $n;
                $nextYearTotal = round(($slope * $n) + $intercept);

                return [
                    'projected_total' => max($nextYearTotal, 1),
                    'confidence_rate' => 85,
                    'status' => 'Success'
                ];
            } catch (\Exception $e) {
                return ['projected_total' => 16, 'confidence_rate' => 50, 'status' => 'Calculation error.'];
            }
        });
    }

    public function fetchConversationalAnalysis($insightsType, $compiledMetricsData)
    {
        $apiKey = trim(env('GROQ_API_KEY'));
        
        // Create a unique key for this specific dataset
        $cacheKey = 'dss_ai_insight_' . $insightsType . '_' . md5(json_encode($compiledMetricsData));

        // 1. Check if we have a valid analysis stored for the last hour
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        if (!$apiKey) {
            return "💡 **System Insight Panel**\n\nGroq API key not found.";
        }

        $prompt = "You are an executive AI consultant for a school Decision Support System. "
                . "Analyze this data and provide 3 concise bullet points with bold headers. Max 150 words.\n\n"
                . "Data: " . json_encode($compiledMetricsData);

        try {
            $response = Http::withOptions(['verify' => false])
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $apiKey,
                    'Content-Type' => 'application/json'
                ])
                ->post("https://api.groq.com/openai/v1/chat/completions", [
                    'model' => 'llama-3.1-8b-instant',
                    'messages' => [
                        ['role' => 'user', 'content' => $prompt]
                    ]
                ]);

            if ($response->successful()) {
                $content = $response->json()['choices'][0]['message']['content'];
                
                // 2. Cache the result for 1 hour (3600 seconds) only if successful
                Cache::put($cacheKey, $content, 3600);
                
                return $content;
            }

            // If we hit a rate limit (429), don't cache!
            return "⚠️ Groq API Error (" . $response->status() . "): System is busy, please try refreshing in a moment.";
            
        } catch (\Exception $e) {
            return "Notice: AI module offline.";
        }
    }
}