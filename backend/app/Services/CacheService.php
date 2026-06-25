<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

/**
 * Centralised cache key management and invalidation groups.
 *
 * Uses a "version counter" strategy so that a single Cache::increment()
 * call instantly invalidates every key in a group — no wildcard deletes
 * needed and no dependency on cache tags (works with the file driver).
 *
 * Version counter keys are stored under the `v:*` prefix with a long TTL
 * so they survive cache flushes gracefully (they simply start at 0 again).
 *
 * TTL constants (in seconds):
 *   TTL_LOOKUPS   — school years + active SY (rarely changes)
 *   TTL_ANALYTICS — charts/trend/balance (medium volatility)
 *   TTL_DASHBOARD — admin / accounting summary stats (higher volatility)
 *
 * Invalidation groups:
 *   bustLookups()      — school year or preference writes
 *   bustStudentStats() — student create / update / delete / enrollment changes
 *   bustPaymentStats() — payment complete / void / assessment change
 */
class CacheService
{
    // ── TTL constants ─────────────────────────────────────────────────────────

    /** 1 hour — school years list + active SY preference */
    public const TTL_LOOKUPS = 3600;

    /** 15 minutes — enrollment trend, balance summary, payment charts */
    public const TTL_ANALYTICS = 900;

    /** 5 minutes — admin summary counts and accounting dashboard */
    public const TTL_DASHBOARD = 300;

    /** 2 minutes — accounting "today" stats (near-real-time for cashiers) */
    public const TTL_ACCOUNTING = 120;

    /** 7 days — how long version counter keys live (re-created on next hit if missing) */
    private const VERSION_TTL = 604800;

    // ── Version counter key names ─────────────────────────────────────────────

    private const VK_LOOKUPS    = 'v:lookups';
    private const VK_ANALYTICS  = 'v:analytics';
    private const VK_DASHBOARD  = 'v:dashboard';
    private const VK_ACCOUNTING = 'v:accounting';

    // ── Version helpers ───────────────────────────────────────────────────────

    private static function version(string $vk): int
    {
        return (int) Cache::get($vk, 0);
    }

    // ── Cache key generators ──────────────────────────────────────────────────

    /** Key for GET /api/lookups */
    public static function lookups(): string
    {
        return 'lookups:' . self::version(self::VK_LOOKUPS);
    }

    /** Key for GET /admin/dashboard?sy=&sem= */
    public static function adminDashboard(string $sy, string $sem = ''): string
    {
        $v = self::version(self::VK_DASHBOARD);
        $s = $sem ?: 'all';
        return "adm_dash:{$sy}:{$s}:{$v}";
    }

    /** Key for GET /registrar/analytics/enrollment-trend?dept= */
    public static function analyticsTrend(?string $dept): string
    {
        $d = $dept ?: 'all';
        $v = self::version(self::VK_ANALYTICS);
        return "an_trend:{$d}:{$v}";
    }

    /** Key for GET /registrar/analytics/payment-by-month?school_year=&sem= */
    public static function analyticsPayment(string $sy, string $sem = ''): string
    {
        $v = self::version(self::VK_ANALYTICS);
        $s = $sem ?: 'all';
        return "an_pay:{$sy}:{$s}:{$v}";
    }

    /** Key for GET /registrar/analytics/balance-summary?school_year=&dept=&sem= */
    public static function analyticsBalance(string $sy, ?string $dept, string $sem = ''): string
    {
        $d = $dept ?: 'all';
        $s = $sem ?: 'all';
        $v = self::version(self::VK_ANALYTICS);
        return "an_bal:{$sy}:{$d}:{$s}:{$v}";
    }

    /** Key for GET /registrar/analytics/status-breakdown?school_year=&dept=&sem= */
    public static function analyticsStatus(string $sy, ?string $dept, string $sem = ''): string
    {
        $d = $dept ?: 'all';
        $s = $sem ?: 'all';
        $v = self::version(self::VK_ANALYTICS);
        return "an_stat:{$sy}:{$d}:{$s}:{$v}";
    }

    /** Key for GET /accounting/dashboard?schoolYear=&sem= */
    public static function accountingDashboard(string $sy, string $sem = ''): string
    {
        $v = self::version(self::VK_ACCOUNTING);
        $s = $sem ?: 'all';
        return "acc_dash:{$sy}:{$s}:{$v}";
    }

    // ── Invalidation groups ───────────────────────────────────────────────────

    /**
     * Bust after school-year or school-preference writes.
     * Invalidates: lookups endpoint.
     */
    public static function bustLookups(): void
    {
        Cache::put(self::VK_LOOKUPS, self::version(self::VK_LOOKUPS) + 1, self::VERSION_TTL);
    }

    /**
     * Bust after student create / update / delete / enrollment transitions.
     * Invalidates: enrollment trend, status breakdown, admin dashboard.
     */
    public static function bustStudentStats(): void
    {
        Cache::put(self::VK_ANALYTICS, self::version(self::VK_ANALYTICS) + 1, self::VERSION_TTL);
        Cache::put(self::VK_DASHBOARD, self::version(self::VK_DASHBOARD) + 1, self::VERSION_TTL);
    }

    /**
     * Bust after payment complete / void / assessment update.
     * Invalidates: balance summary, payment charts, admin dashboard, accounting dashboard.
     */
    public static function bustPaymentStats(): void
    {
        Cache::put(self::VK_ANALYTICS,  self::version(self::VK_ANALYTICS)  + 1, self::VERSION_TTL);
        Cache::put(self::VK_DASHBOARD,  self::version(self::VK_DASHBOARD)  + 1, self::VERSION_TTL);
        Cache::put(self::VK_ACCOUNTING, self::version(self::VK_ACCOUNTING) + 1, self::VERSION_TTL);
    }
}
