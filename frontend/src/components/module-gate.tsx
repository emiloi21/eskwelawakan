import { useNavigate } from 'react-router-dom';
import { useOnboarding, type OnboardingStep } from '@/hooks/use-onboarding';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';

interface ModuleGateProps {
  /** The module key to check, e.g. 'accounting', 'registrar', 'custodian', 'hrms' */
  moduleKey: string;
  /** Display name of the module, shown in the blocked screen */
  moduleLabel: string;
  /** Children rendered when module is accessible */
  children: React.ReactNode;
}

/**
 * Wraps a module layout outlet. If Admin has incomplete prerequisite steps
 * that block this module, a full-screen setup prompt is shown instead.
 * For non-admin users the gate is transparent (admin is responsible for setup).
 */
export function ModuleGate({ moduleKey, moduleLabel, children }: ModuleGateProps) {
  const { user } = useAuthStore();
  const { data, isLoading } = useOnboarding();
  const navigate = useNavigate();

  // Only admins see the gate — other staff roles don't block their own portal
  if (!user || user.access !== 'Administrator' || isLoading || !data) {
    return <>{children}</>;
  }

  const blockedSteps: OnboardingStep[] = data.steps.filter(
    s => !s.done && s.blocking.includes(moduleKey),
  );

  if (blockedSteps.length === 0) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        {/* Icon + headline */}
        <div className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-orange-600" />
          </div>
          <h2 className="text-xl font-bold">{moduleLabel} is not ready yet</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The following setup steps must be completed before this module can be used.
            Complete them from the System Setup page.
          </p>
        </div>

        {/* Blocked steps list */}
        <div className="space-y-2">
          {blockedSteps.map(step => (
            <div
              key={step.key}
              className="flex items-start gap-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 px-4 py-3"
            >
              <div className="flex-shrink-0 mt-0.5">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground/30" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{step.label}</span>
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 text-xs gap-1 h-7"
                onClick={() => navigate(step.action_url)}
              >
                Fix <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate('/admin/setup')} className="gap-2">
            Open System Setup <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
