<?php

namespace App\Http\Controllers\Admin\Dss;

use App\Http\Controllers\Controller;
use App\Models\DssRecommendation;
use App\Services\Dss\DssRecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DssRecommendationsController extends Controller
{
    public function __construct(
        private readonly DssRecommendationService $recommendationService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $category  = $request->query('category');
        $showActed = filter_var($request->query('actioned', 'false'), FILTER_VALIDATE_BOOLEAN);

        $query = DssRecommendation::query();

        if ($category && in_array($category, ['enrollment', 'academic', 'faculty', 'resource', 'general'], true)) {
            $query->where('category', $category);
        }

        $query->where('is_actioned', $showActed);

        $recommendations = $query
            ->orderByRaw("FIELD(priority, 'high', 'medium', 'low')")
            ->orderBy('generated_at', 'desc')
            ->paginate(50);

        return response()->json($recommendations);
    }

    public function generate(Request $request): JsonResponse
    {
        $schoolYearId = (int) $request->input('school_year_id', $this->activeSchoolYearId());
        $count        = $this->recommendationService->generate($schoolYearId);

        activity()->causedBy(auth()->user())->log("DSS: Generated {$count} new recommendations.");

        return response()->json(['created' => $count]);
    }

    public function markActioned(Request $request, string $publicId): JsonResponse
    {
        $recommendation = DssRecommendation::findByPublicIdOrFail($publicId);

        $recommendation->update([
            'is_actioned' => true,
            'actioned_by' => auth()->id(),
            'actioned_at' => now(),
        ]);

        activity()->causedBy(auth()->user())->log("DSS: Marked recommendation {$publicId} as actioned.");

        return response()->json($recommendation);
    }

    private function activeSchoolYearId(): int
    {
        return (int) DB::table('school_years')->where('status', 'Active')->value('id');
    }
}
