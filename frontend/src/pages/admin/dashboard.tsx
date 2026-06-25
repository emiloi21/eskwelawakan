import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DashboardStats } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Users, GraduationCap, BookOpen, CreditCard, TrendingUp, Banknote, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────
type TrendRow = { school_year: string; total: number; enrolled: number };
type PaymentRow = { month: string; month_num: number; total: number };
type BalanceData = {
  total_assessed: number;
  total_discount: number;
  total_collected: number;
  outstanding: number;
  collection_rate: number;
};
type StatusRow = { status: string; count: number };

const STATUS_COLORS: Record<string, string> = {
  'Enrolled':                   '#16a34a',
  'For Payment':                '#2563eb',
  'For Accounts Assessment':    '#d97706',
  'For Application Assessment': '#7c3aed',
  'Pending':                    '#6b7280',
  'Withdrawn':                  '#dc2626',
  'Transferred Out':            '#ea580c',
  'Dropped':                    '#991b1b',
};
const DEFAULT_SLICE_COLOR = '#94a3b8';

function peso(n: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP', maximumFractionDigits: 0,
  }).format(n);
}

export default function AdminDashboard() {
  const { user, filterBySem } = useAuthStore();
  const sy  = user?.selected_sy  || '';
  const sem = user?.selected_sem || '';

  const activeSem = filterBySem ? sem : '';

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard', sy, activeSem],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard', { params: { sy, sem: activeSem } });
      return data;
    },
  });

  // Enrollment trend
  const { data: trendData, isLoading: trendLoading } = useQuery<{ data: TrendRow[] }>({
    queryKey: ['admin-analytics-trend'],
    queryFn: () => api.get('/registrar/analytics/enrollment-trend').then(r => r.data),
  });

  // Monthly payment collection
  const { data: paymentData, isLoading: paymentLoading } = useQuery<{ data: PaymentRow[] }>({
    queryKey: ['admin-analytics-payment', sy, activeSem],
    queryFn: () =>
      api.get('/registrar/analytics/payment-by-month', { params: { school_year: sy, sem: activeSem } }).then(r => r.data),
  });

  // Balance summary
  const { data: balanceData, isLoading: balanceLoading } = useQuery<{ data: BalanceData }>({
    queryKey: ['admin-analytics-balance', sy, activeSem],
    queryFn: () =>
      api.get('/registrar/analytics/balance-summary', { params: { school_year: sy, sem: activeSem } }).then(r => r.data),
  });

  // Status breakdown
  const { data: statusData, isLoading: statusLoading } = useQuery<{ data: StatusRow[] }>({
    queryKey: ['admin-analytics-status', sy, activeSem],
    queryFn: () =>
      api.get('/registrar/analytics/status-breakdown', { params: { school_year: sy, sem: activeSem } }).then(r => r.data),
  });

  const balance   = balanceData?.data;
  const trend     = trendData?.data ?? [];
  const payments  = paymentData?.data ?? [];
  const statusPie = statusData?.data ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trendFormatter = ((v: any, n: any) =>
    [Number(v ?? 0), n === 'enrolled' ? 'Enrolled' : 'Total']) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentFormatter = ((v: any) => [peso(Number(v ?? 0)), 'Collected']) as any;

  const statCards = [
    {
      title: 'Total Students',
      value: data?.stats.total_students ?? 0,
      icon: GraduationCap,
      description: `${data?.stats.enrolled_students ?? 0} enrolled`,
      footer: 'Student enrollment overview',
    },
    {
      title: 'Total Classes',
      value: data?.stats.total_classes ?? 0,
      icon: BookOpen,
      description: 'Active sections',
      footer: 'Current academic period',
    },
    {
      title: 'Active Users',
      value: data?.stats.total_users ?? 0,
      icon: Users,
      description: 'System accounts',
      footer: 'All registered accounts',
    },
    {
      title: 'Total Payments',
      value: `₱${(data?.stats.total_payments ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      icon: CreditCard,
      description: `${data?.stats.transaction_count ?? 0} transactions`,
      footer: 'Revenue collection',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your school management system
          {sy && ` — ${sy}`}
          {filterBySem && sem && ` / ${sem}`}
        </p>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className={cn(
              'relative overflow-hidden border-none shadow-sm transition-all hover:shadow-md',
              'bg-gradient-to-br from-background to-muted/30 dark:to-muted/10',
            )}
          >
            <CardHeader className="space-y-2.5 pb-4">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardDescription>
                <card.icon className="h-5 w-5 text-muted-foreground/60" />
              </div>
              {isLoading ? (
                <Skeleton className="h-9 w-28" />
              ) : (
                <CardTitle className="text-3xl font-bold tracking-tight tabular-nums">
                  {card.value}
                </CardTitle>
              )}
            </CardHeader>
            <CardFooter className="flex flex-col items-start gap-1 border-t border-primary/5 pt-4 text-sm">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                {card.footer}
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-xs text-muted-foreground">{card.description}</div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* ── Balance Summary ─────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: 'Total Assessed',
            value: balance?.total_assessed,
            icon: Banknote,
            colorClass: 'text-foreground',
            sub: null,
          },
          {
            label: 'Collected',
            value: balance?.total_collected,
            icon: TrendingUp,
            colorClass: 'text-green-600',
            sub: balance ? `${balance.collection_rate}% collection rate` : null,
          },
          {
            label: 'Outstanding',
            value: balance?.outstanding,
            icon: AlertCircle,
            colorClass: balance?.outstanding ? 'text-destructive' : 'text-muted-foreground',
            sub: null,
          },
        ].map((card) => (
          <Card key={card.label} className="border-none shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={cn('h-4 w-4', card.colorClass)} />
            </CardHeader>
            <CardContent>
              {balanceLoading || !balance
                ? <Skeleton className="h-8 w-28" />
                : (
                  <div className={cn('text-2xl font-bold tabular-nums', card.colorClass)}>
                    {peso(card.value ?? 0)}
                  </div>
                )}
              {card.sub && (
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts: Enrollment trend + Status pie ───────────────── */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-none shadow-sm md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Enrollment Trend by School Year</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : trend.length === 0 ? (
              <p className="text-sm text-muted-foreground py-16 text-center">No data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="school_year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={trendFormatter}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="total"    name="Total"    fill="#94a3b8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="enrolled" name="Enrolled" fill="#16a34a" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : statusPie.length === 0 ? (
              <p className="text-sm text-muted-foreground py-16 text-center">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusPie}
                    dataKey="count"
                    nameKey="status"
                    cx="50%" cy="45%"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {statusPie.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] ?? DEFAULT_SLICE_COLOR}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Monthly Payment Collection ──────────────────────────── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Monthly Collections — {sy || 'Current SY'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={payments} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`
                  }
                />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={paymentFormatter}
                />
                <Bar dataKey="total" name="Collected" fill="#2563eb" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Existing dept + status summary lists ────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm bg-gradient-to-br from-background to-muted/30 dark:to-muted/10">
          <CardHeader>
            <CardTitle className="text-base">Students by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : data?.by_department && Object.keys(data.by_department).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(data.by_department).map(([dept, count]) => (
                  <div key={dept} className="flex items-center justify-between">
                    <span className="text-sm">{dept}</span>
                    <Badge variant="secondary" className="tabular-nums">{count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-background to-muted/30 dark:to-muted/10">
          <CardHeader>
            <CardTitle className="text-base">Students by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : data?.by_status && Object.keys(data.by_status).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(data.by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm">{status}</span>
                    <Badge variant="secondary" className="tabular-nums">{count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
