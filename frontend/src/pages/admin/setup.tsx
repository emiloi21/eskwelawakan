import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { OnboardingStatus, OnboardingStep } from '@/hooks/use-onboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  RefreshCw,
  CalendarDays,
  School,
  Users,
  BookOpen,
  Settings2,
  ClipboardList,
  UserCog,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STEP_ICONS: Record<string, React.ElementType> = {
  school_year:        CalendarDays,
  school_preferences: School,
  staff_users:        Users,
  chart_of_accounts:  BookOpen,
  gl_settings:        Settings2,
  assessments:        ClipboardList,
  hrms_personnel:     UserCog,
};

const MODULE_LABELS: Record<string, string> = {
  registrar:  'Registrar',
  accounting: 'Accounting',
  custodian:  'Custodian',
  hrms:       'HRMS',
};

function StepCard({ step, index }: { step: OnboardingStep; index: number }) {
  const navigate = useNavigate();
  const Icon = STEP_ICONS[step.key] ?? Circle;

  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-lg border p-4 transition-colors',
        step.done ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-background hover:bg-muted/40',
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {step.done ? (
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        ) : (
          <div className="relative">
            <Circle className="h-6 w-6 text-muted-foreground/40" />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
              {index + 1}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className={cn('font-semibold text-sm', step.done ? 'text-green-800 dark:text-green-300' : '')}>
            {step.label}
          </span>
          {step.done ? (
            <Badge variant="outline" className="text-xs text-green-700 border-green-400">Done</Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">Required</Badge>
          )}
          {!step.done && step.blocking.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {step.blocking.map(m => (
                <Badge key={m} variant="outline" className="text-xs text-orange-700 border-orange-300 bg-orange-50">
                  <ShieldAlert className="mr-1 h-2.5 w-2.5" />
                  Blocks {MODULE_LABELS[m] ?? m}
                </Badge>
              ))}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
      </div>

      {!step.done && (
        <Button
          size="sm"
          variant="outline"
          className="flex-shrink-0 gap-1.5"
          onClick={() => navigate(step.action_url)}
        >
          Go <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export default function SetupPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<OnboardingStatus>({
    queryKey: ['onboarding-status'],
    queryFn: () => api.get('/admin/onboarding-status').then(r => r.data),
    staleTime: 0,
  });

  const progressPct = data ? Math.round((data.done_count / data.total_count) * 100) : 0;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Setup</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Complete each step before using the corresponding module. Incomplete steps will block access
          to dependent features.
        </p>
      </div>

      {/* Progress card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {isLoading ? (
                <Skeleton className="h-5 w-40" />
              ) : data?.complete ? (
                <span className="text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" /> System is fully configured
                </span>
              ) : (
                `${data?.done_count ?? 0} of ${data?.total_count ?? 0} steps completed`
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-muted-foreground"
              onClick={() => qc.invalidateQueries({ queryKey: ['onboarding-status'] })}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
          {!isLoading && (
            <CardDescription>
              <Progress value={progressPct} className="h-2 mt-2" />
            </CardDescription>
          )}
        </CardHeader>

        {/* Blocked modules summary */}
        {!isLoading && data && !data.complete && data.blocked_modules.length > 0 && (
          <CardContent className="pt-0 pb-3">
            <div className="rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 px-3 py-2 flex flex-wrap items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-orange-600 flex-shrink-0" />
              <span className="text-xs font-medium text-orange-800 dark:text-orange-300">Currently blocked:</span>
              {data.blocked_modules.map(m => (
                <Badge key={m} variant="outline" className="text-xs border-orange-400 text-orange-700 bg-white dark:bg-transparent">
                  {MODULE_LABELS[m] ?? m}
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Steps */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))
          : (data?.steps ?? []).map((step, i) => (
              <StepCard key={step.key} step={step} index={i} />
            ))
        }
      </div>

      {data?.complete && (
        <Card className="border-green-300 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6 pb-5 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">All set! All modules are operational.</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You can revisit this page anytime from Admin → System Setup.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
