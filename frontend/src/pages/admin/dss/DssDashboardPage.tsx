import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DssDashboardData, EarlyWarning, DssRecommendation } from '@/types/dss';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Users, TrendingUp, TrendingDown, AlertTriangle,
  BookOpen, BarChart2, RefreshCw, CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SEVERITY_COLORS = {
  critical: '#dc2626',
  warning:  '#d97706',
  info:     '#2563eb',
};

const GRADE_BAR_COLORS = ['#16a34a', '#65a30d', '#ca8a04', '#d97706', '#dc2626'];

const PIE_COLORS = ['#16a34a', '#d97706', '#dc2626'];

function KpiCard({
  title, value, sub, icon: Icon, delta, className,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  delta?: number;
  className?: string;
}) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {delta !== undefined && (
          <p className={cn('text-xs mt-1 flex items-center gap-1', delta >= 0 ? 'text-green-600' : 'text-red-500')}>
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta >= 0 ? '+' : ''}{delta}% vs prev year
          </p>
        )}
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function DssDashboardPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<DssDashboardData>({
    queryKey: ['dss-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dss/dashboard');
      return data;
    },
    refetchInterval: 5 * 60 * 1000, // 5 min
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const sy = data?.kpi ? undefined : undefined;
      await api.post('/admin/dss/warnings/evaluate');
      await api.post('/admin/dss/recommendations/generate');
    },
    onSuccess: () => {
      toast.success('Warnings and recommendations refreshed');
      queryClient.invalidateQueries({ queryKey: ['dss-dashboard'] });
    },
    onError: () => toast.error('Failed to refresh'),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (publicId: string) => api.patch(`/admin/dss/warnings/${publicId}/acknowledge`),
    onSuccess: () => {
      toast.success('Warning acknowledged');
      queryClient.invalidateQueries({ queryKey: ['dss-dashboard'] });
    },
    onError: () => toast.error('Failed to acknowledge'),
  });

  const actionMutation = useMutation({
    mutationFn: (publicId: string) => api.patch(`/admin/dss/recommendations/${publicId}/action`),
    onSuccess: () => {
      toast.success('Recommendation marked as actioned');
      queryClient.invalidateQueries({ queryKey: ['dss-dashboard'] });
    },
    onError: () => toast.error('Failed to update'),
  });

  const kpi = data?.kpi;

  // Build resource pie data
  const resourcePie = kpi
    ? [
        { name: 'Load Compliant', value: kpi.faculty_load_compliance_pct },
        { name: 'Non-Compliant',  value: 100 - kpi.faculty_load_compliance_pct },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Decision Support System</h1>
          <p className="text-sm text-muted-foreground">
            {data?.active_school_year ? `School Year ${data.active_school_year}` : 'Analytics Dashboard'}
          </p>
        </div>
        <Button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          size="sm"
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', refreshMutation.isPending && 'animate-spin')} />
          Refresh Warnings & Recommendations
        </Button>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            title="Total Enrolled"
            value={kpi?.total_enrolled ?? 0}
            delta={kpi?.enrolled_delta_pct}
            icon={Users}
          />
          <KpiCard
            title="Promotion Rate"
            value={`${kpi?.promotion_rate ?? 0}%`}
            sub="current SY"
            icon={TrendingUp}
          />
          <KpiCard
            title="Retention Rate"
            value={`${kpi?.retention_rate ?? 0}%`}
            icon={BookOpen}
          />
          <KpiCard
            title="At-Risk Students"
            value={kpi?.at_risk_count ?? 0}
            sub="flagged this SY"
            icon={AlertTriangle}
            className={kpi && kpi.at_risk_count > 10 ? 'border-red-200' : ''}
          />
          <KpiCard
            title="Faculty Compliance"
            value={`${kpi?.faculty_load_compliance_pct ?? 0}%`}
            sub="within optimal load"
            icon={Users}
          />
          <KpiCard
            title="Classroom Utilization"
            value={`${kpi?.classroom_utilization_pct ?? 0}%`}
            icon={BarChart2}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Enrollment Trend */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Enrollment Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data?.enrollment_trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="school_year" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total_enrolled" stroke="#2563eb" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data?.grade_distribution ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bracket" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {(data?.grade_distribution ?? []).map((_, idx) => (
                      <Cell key={idx} fill={GRADE_BAR_COLORS[idx % GRADE_BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Resource Utilization */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Faculty Load Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={resourcePie}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    dataKey="value"
                  >
                    {resourcePie.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts + Recommendations */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (data?.active_alerts ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active warnings — your school is looking healthy 🎉
              </p>
            ) : (
              <div className="space-y-2">
                {(data?.active_alerts ?? []).map((w: EarlyWarning) => (
                  <div
                    key={w.public_id}
                    className="flex items-start justify-between gap-2 rounded border p-2 text-xs"
                    style={{ borderLeftColor: SEVERITY_COLORS[w.severity], borderLeftWidth: 3 }}
                  >
                    <div className="flex-1 min-w-0">
                      <Badge
                        variant="outline"
                        className="text-[10px] mb-1"
                        style={{ color: SEVERITY_COLORS[w.severity] }}
                      >
                        {w.severity.toUpperCase()}
                      </Badge>
                      <p className="text-muted-foreground line-clamp-2">{w.message}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs shrink-0"
                      disabled={acknowledgeMutation.isPending}
                      onClick={() => acknowledgeMutation.mutate(w.public_id)}
                    >
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              Recent Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (data?.recent_recommendations ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No pending recommendations.</p>
            ) : (
              <div className="space-y-2">
                {(data?.recent_recommendations ?? []).map((r: DssRecommendation) => (
                  <div key={r.public_id} className="flex items-start justify-between gap-2 rounded border p-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-1 mb-1">
                        <Badge
                          variant="outline"
                          className={cn('text-[10px]', {
                            'text-red-600': r.priority === 'high',
                            'text-yellow-600': r.priority === 'medium',
                            'text-blue-600': r.priority === 'low',
                          })}
                        >
                          {r.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">{r.category}</Badge>
                      </div>
                      <p className="text-muted-foreground line-clamp-2">{r.recommendation_text}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs shrink-0"
                      disabled={actionMutation.isPending}
                      onClick={() => actionMutation.mutate(r.public_id)}
                    >
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
