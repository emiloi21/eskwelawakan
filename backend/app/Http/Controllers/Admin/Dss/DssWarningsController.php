<?php

namespace App\Http\Controllers\Admin\Dss;

use App\Http\Controllers\Controller;
use App\Models\EarlyWarning;
use App\Services\Dss\DssEarlyWarningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DssWarningsController extends Controller
{
    public function __construct(
        private readonly DssEarlyWarningService $warningService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $severity  = $request->query('severity');
        $showAcked = filter_var($request->query('acknowledged', 'false'), FILTER_VALIDATE_BOOLEAN);

        $query = EarlyWarning::query();

        if ($severity && in_array($severity, ['critical', 'warning', 'info'], true)) {
            $query->where('severity', $severity);
        }

        if ($showAcked) {
            $query->where('is_acknowledged', true);
        } else {
            $query->where('is_acknowledged', false);
        }

        $warnings = $query
            ->orderByRaw("FIELD(severity, 'critical', 'warning', 'info')")
            ->orderBy('triggered_at', 'desc')
            ->paginate(50);

        return response()->json($warnings);
    }

    public function evaluate(Request $request): JsonResponse
    {
        $schoolYearId = (int) $request->input('school_year_id', $this->activeSchoolYearId());
        $result       = $this->warningService->evaluate($schoolYearId);

        activity()->causedBy(auth()->user())->log("DSS: Evaluated warnings. Created: {$result['created']}, Skipped: {$result['skipped']}.");

        return response()->json($result);
    }

    public function acknowledge(Request $request, string $publicId): JsonResponse
    {
        $warning = EarlyWarning::findByPublicIdOrFail($publicId);

        $warning->update([
            'is_acknowledged'  => true,
            'acknowledged_by'  => auth()->id(),
            'acknowledged_at'  => now(),
        ]);

        activity()->causedBy(auth()->user())->log("DSS: Acknowledged warning {$publicId}.");

        return response()->json($warning);
    }

    private function activeSchoolYearId(): int
    {
        return (int) DB::table('school_years')->where('status', 'Active')->value('id');
    }
}
