import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ShieldAlert, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { useState } from 'react';

/**
 * Shown at the top of the Admin Dashboard when setup is incomplete.
 * Dismissible per session only (reappears on reload until complete).
 */
export function SetupBanner() {
  const { user } = useAuthStore();
  const { data } = useOnboarding();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.access !== 'Administrator') return null;
  if (!data || data.complete || dismissed) return null;

  const progressPct = Math.round((data.done_count / data.total_count) * 100);
  const pendingSteps = data.steps.filter(s => !s.done);
  const firstPending = pendingSteps[0];

  return (
    <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-sm text-orange-900 dark:text-orange-200">
                System setup incomplete — {data.done_count}/{data.total_count} steps done
              </p>
              {data.blocked_modules.length > 0 && (
                <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
                  Blocked modules:{' '}
                  <span className="font-medium">
                    {data.blocked_modules
                      .map(m => ({ registrar: 'Registrar', accounting: 'Accounting', custodian: 'Custodian', hrms: 'HRMS' }[m] ?? m))
                      .join(', ')}
                  </span>
                </p>
              )}
            </div>
            <button
              className="text-orange-500 hover:text-orange-700 flex-shrink-0"
              onClick={() => setDismissed(true)}
              title="Dismiss for this session"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Progress value={progressPct} className="h-1.5 bg-orange-200 dark:bg-orange-900 [&>div]:bg-orange-500" />

          {/* Next step hint */}
          {firstPending && (
            <p className="text-xs text-orange-700 dark:text-orange-400">
              <span className="font-medium">Next:</span> {firstPending.label} — {firstPending.description}
            </p>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs gap-1.5 bg-orange-600 hover:bg-orange-700"
              onClick={() => navigate('/admin/setup')}
            >
              View Setup Checklist <ArrowRight className="h-3 w-3" />
            </Button>
            {firstPending && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 border-orange-300 text-orange-800 hover:bg-orange-100"
                onClick={() => navigate(firstPending.action_url)}
              >
                Fix Now: {firstPending.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Small inline badge shown in module-switcher entries for blocked modules.
 */
export function SetupBlockedBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-orange-700 bg-orange-100 border border-orange-200 rounded px-1 py-0.5 ml-1">
      <ShieldAlert className="h-2.5 w-2.5" /> Setup
    </span>
  );
}

/**
 * Minimal tick shown in sidebar items when setup is complete.
 */
export function SetupCompleteBadge() {
  return (
    <span className="inline-flex items-center">
      <CheckCircle2 className="h-3 w-3 text-green-500 ml-1" />
    </span>
  );
}
