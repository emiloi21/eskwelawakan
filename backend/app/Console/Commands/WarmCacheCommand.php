<?php

namespace App\Console\Commands;

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Registrar\AnalyticsController;
use App\Http\Controllers\Accounting\DashboardController as AccountingDashboard;
use App\Http\Controllers\LookupController;
use App\Models\SchoolPreference;
use App\Models\SchoolYear;
use Illuminate\Console\Command;
use Illuminate\Http\Request;

/**
 * Artisan command to pre-warm the application cache.
 *
 * Usage:
 *   php artisan cache:warm              # warms active school year only
 *   php artisan cache:warm --sy=2024-2025   # specific school year
 *   php artisan cache:warm --all        # all known school years
 */
class WarmCacheCommand extends Command
{
    protected $signature = 'cache:warm
                            {--sy= : School year to warm (e.g. 2024-2025)}
                            {--all : Warm all known school years}';

    protected $description = 'Pre-populate the application cache for dashboards and analytics';

    public function handle(): int
    {
        $this->info('Warming application cache...');

        // ── Which school years to warm ──────────────────────────────────────
        if ($this->option('all')) {
            $schoolYears = SchoolYear::pluck('school_year')->toArray();
        } elseif ($sy = $this->option('sy')) {
            $schoolYears = [$sy];
        } else {
            $prefs = SchoolPreference::first();
            $activeSy = $prefs?->activeSchoolYear;
            if (!$activeSy) {
                $this->warn('No active school year found. Pass --sy=YYYY-YYYY or --all.');
                return self::FAILURE;
            }
            $schoolYears = [$activeSy];
        }

        $this->line('School years: ' . implode(', ', $schoolYears));

        // ── 1. Lookups ────────────────────────────────────────────────────────
        $this->warmLookups();

        // ── 2. Per-SY endpoints ───────────────────────────────────────────────
        foreach ($schoolYears as $sy) {
            $this->warmAdminDashboard($sy);
            $this->warmAnalytics($sy);
            $this->warmAccountingDashboard($sy);
        }

        $this->info('Cache warm-up complete.');
        return self::SUCCESS;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function warmLookups(): void
    {
        $this->output->write('  Lookups... ');
        app(LookupController::class)->index();
        $this->info('done');
    }

    private function warmAdminDashboard(string $sy): void
    {
        $this->output->write("  Admin dashboard [{$sy}]... ");
        $req = Request::create('/admin/dashboard', 'GET', ['sy' => $sy]);
        app(DashboardController::class)->index($req);
        $this->info('done');
    }

    private function warmAnalytics(string $sy): void
    {
        $controller = app(AnalyticsController::class);

        $this->output->write("  Enrollment trend... ");
        $controller->enrollmentTrend(Request::create('/analytics', 'GET'));
        $this->info('done');

        $this->output->write("  Payment by month [{$sy}]... ");
        $controller->paymentByMonth(Request::create('/analytics', 'GET', ['school_year' => $sy]));
        $this->info('done');

        $this->output->write("  Balance summary [{$sy}]... ");
        $controller->balanceSummary(Request::create('/analytics', 'GET', ['school_year' => $sy]));
        $this->info('done');

        $this->output->write("  Status breakdown [{$sy}]... ");
        $controller->statusBreakdown(Request::create('/analytics', 'GET', ['school_year' => $sy]));
        $this->info('done');
    }

    private function warmAccountingDashboard(string $sy): void
    {
        $this->output->write("  Accounting dashboard [{$sy}]... ");
        $req = Request::create('/accounting/dashboard', 'GET', ['schoolYear' => $sy]);
        app(AccountingDashboard::class)->index($req);
        $this->info('done');
    }
}
