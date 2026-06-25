<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\PaymentDue;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SendPaymentDueNotifications extends Command
{
    protected $signature = 'notifications:payment-due';

    protected $description = 'Send in-app payment due notifications to students (and their parents) with outstanding balances.';

    public function handle(): int
    {
        // ── 1. Find enrolled students with a positive outstanding balance ──────
        $rows = DB::table('student_assessments as sa')
            ->join('students as s', 'sa.reg_id', '=', 's.reg_id')
            ->where('s.status', 'Enrolled')
            ->where('sa.total_amt_bal', '>', 0)
            ->selectRaw('sa.reg_id, SUM(sa.total_amt_bal) as total_balance, MAX(s.schoolYear) as school_year')
            ->groupBy('sa.reg_id')
            ->get();

        if ($rows->isEmpty()) {
            $this->info('No outstanding balances found.');
            return self::SUCCESS;
        }

        $regIds     = $rows->pluck('reg_id');
        $balanceMap = $rows->keyBy('reg_id');

        // ── 2. Notify student portal accounts ────────────────────────────────
        $studentUsers = User::whereIn('reg_id', $regIds)
            ->where('access', 'Student')
            ->get();

        $studentCount = 0;
        foreach ($studentUsers as $user) {
            $row = $balanceMap->get($user->reg_id);
            if (! $row) {
                continue;
            }

            // Deduplicate: skip if already sent a PaymentDue notice in the last 7 days
            $alreadySent = $user->notifications()
                ->where('type', PaymentDue::class)
                ->where('created_at', '>=', now()->subDays(7))
                ->exists();

            if ($alreadySent) {
                continue;
            }

            try {
                $user->notify(new PaymentDue(
                    description: 'school fees',
                    balance:     (float) $row->total_balance,
                    schoolYear:  (string) $row->school_year,
                ));
                $studentCount++;
            } catch (\Throwable $e) {
                $this->warn("Failed to notify student user #{$user->id}: {$e->getMessage()}");
            }
        }

        // ── 3. Notify parent portal accounts ─────────────────────────────────
        $parentUsers = User::where('access', 'Parent')
            ->whereHas('children', fn ($q) => $q->whereIn('students.reg_id', $regIds))
            ->with(['children' => fn ($q) => $q->whereIn('students.reg_id', $regIds)])
            ->get();

        $parentCount = 0;
        foreach ($parentUsers as $parentUser) {
            foreach ($parentUser->children as $child) {
                $row = $balanceMap->get($child->reg_id);
                if (! $row) {
                    continue;
                }

                // Deduplicate per child: check school_year in stored JSON data
                $alreadySent = $parentUser->notifications()
                    ->where('type', PaymentDue::class)
                    ->where('created_at', '>=', now()->subDays(7))
                    ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.school_year')) = ?", [(string) $row->school_year])
                    ->exists();

                if ($alreadySent) {
                    continue;
                }

                $childName = trim("{$child->fname} {$child->lname}");

                try {
                    $parentUser->notify(new PaymentDue(
                        description: "school fees for {$childName}",
                        balance:     (float) $row->total_balance,
                        schoolYear:  (string) $row->school_year,
                        url:         '/parent',
                    ));
                    $parentCount++;
                } catch (\Throwable $e) {
                    $this->warn("Failed to notify parent user #{$parentUser->id}: {$e->getMessage()}");
                }
            }
        }

        $this->info("Payment due notifications sent: {$studentCount} student(s), {$parentCount} parent(s).");

        return self::SUCCESS;
    }
}
