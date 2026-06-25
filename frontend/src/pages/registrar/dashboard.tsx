import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { StudentCounts, GradeLevelRow, DeptRow } from '@/types';
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
import { Users, GraduationCap, BookOpen, ClipboardList, TrendingUp, Banknote, AlertCircle } from 'lucide-react';
import { DEPARTMENTS } from '@/lib/constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import React, { useState } from 'react';

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

const GRADE_ORDER = [
  'Nursery', 'Preparatory', 'Kinder',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade 11', 'Grade 12',
];
const DEPT_ORDER = ['Grade School', 'Junior High School', 'Senior High School'];

function sortGradeLevelRows(rows: GradeLevelRow[]): GradeLevelRow[] {
  return [...rows].sort((a, b) => {
    const dA = DEPT_ORDER.indexOf(a.dept);
    const dB = DEPT_ORDER.indexOf(b.dept);
    if (dA !== dB) return (dA === -1 ? 99 : dA) - (dB === -1 ? 99 : dB);
    const gA = GRADE_ORDER.indexOf(a.gradeLevel);
    const gB = GRADE_ORDER.indexOf(b.gradeLevel);
    if (gA !== gB) return (gA === -1 ? 99 : gA) - (gB === -1 ? 99 : gB);
    return (a.strand ?? '').localeCompare(b.strand ?? '');
  });
}

function sortDeptEntries(entries: [string, DeptRow][]): [string, DeptRow][] {
  return [...entries].sort(([a], [b]) => {
    const iA = DEPT_ORDER.indexOf(a);
    const iB = DEPT_ORDER.indexOf(b);
    return (iA === -1 ? 99 : iA) - (iB === -1 ? 99 : iB);
  });
}

// ── Main Component ─────────────────────────────────────────────────
export default function RegistrarDashboard() {
  const { user } = useAuthStore();
  const sy = user?.selected_sy || '';
  const [filterDept, setFilterDept] = useState('');

  // Existing counts
  const { data, isLoading } = useQuery<StudentCounts>({
    queryKey: ['registrar-dashboard', sy],
    queryFn: async () => {
      const { data } = await api.get('/registrar/students/counts', { params: { schoolYear: sy } });
      return data;
    },
  });

  // Enrollment trend (all-time, last 6 SYs)
  const { data: trendData, isLoading: trendLoading } = useQuery<{ data: TrendRow[] }>({
    queryKey: ['registrar-analytics-trend', filterDept],
    queryFn: () =>
      api.get('/registrar/analytics/enrollment-trend', {
        params: filterDept ? { dept: filterDept } : {},
      }).then(r => r.data),
  });

  // Monthly payment collection for current SY
  const { data: paymentData, isLoading: paymentLoading } = useQuery<{ data: PaymentRow[] }>({
    queryKey: ['registrar-analytics-payment', sy],
    queryFn: () =>
      api.get('/registrar/analytics/payment-by-month', {
        params: { school_year: sy },
      }).then(r => r.data),
  });

  // Balance / financial summary
  const { data: balanceData, isLoading: balanceLoading } = useQuery<{ data: BalanceData }>({
    queryKey: ['registrar-analytics-balance', sy, filterDept],
    queryFn: () =>
      api.get('/registrar/analytics/balance-summary', {
        params: { school_year: sy, ...(filterDept ? { dept: filterDept } : {}) },
      }).then(r => r.data),
  });

  // Status breakdown pie
  const { data: statusData, isLoading: statusLoading } = useQuery<{ data: StatusRow[] }>({
    queryKey: ['registrar-analytics-status', sy, filterDept],
    queryFn: () =>
      api.get('/registrar/analytics/status-breakdown', {
        params: { school_year: sy, ...(filterDept ? { dept: filterDept } : {}) },
      }).then(r => r.data),
  });

  const enrolled   = data?.by_status?.['Enrolled'] ?? 0;
  const forAssess  = data?.by_status?.['For Accounts Assessment'] ?? 0;
  const forPayment = data?.by_status?.['For Payment'] ?? 0;
  const balance    = balanceData?.data;
  const trend      = trendData?.data ?? [];
  const payments   = paymentData?.data ?? [];
  const statusPie  = statusData?.data ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trendFormatter = ((v: any, n: any) =>
    [Number(v ?? 0), n === 'enrolled' ? 'Enrolled' : 'Total']) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentFormatter = ((v: any) => [peso(Number(v ?? 0)), 'Collected']) as any;

  const statCards = [
    {
      title: 'Total Students',
      value: data?.total ?? 0,
      icon: Users,
      description: `${enrolled} enrolled`,
      footer: 'All students in system',
    },
    {
      title: 'Enrolled',
      value: enrolled,
      icon: GraduationCap,
      description: 'Fully enrolled students',
      footer: 'Payment confirmed',
    },
    {
      title: 'For Assessment',
      value: forAssess,
      icon: ClipboardList,
      description: 'Awaiting accounts assessment',
      footer: 'Pending billing setup',
    },
    {
      title: 'For Payment',
      value: forPayment,
      icon: BookOpen,
      description: 'Assessed, awaiting payment',
      footer: 'Ready for cashiering',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Title + department filter ─────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Registrar Dashboard</h1>
          <p className="text-muted-foreground">
            Student information overview
            {sy && ` — ${sy}`}
          </p>
        </div>
        <Select value={filterDept || 'all'} onValueChange={(v) => setFilterDept(v === 'all' ? '' : (v ?? ''))}>

          <SelectTrigger className="w-52">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
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
              <div className="font-semibold text-foreground">{card.footer}</div>
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

      {/* ── Charts row: Enrollment trend + Status pie ───────────── */}
      <div className="grid gap-4 md:grid-cols-5">
        {/* Enrollment Trend — 3/5 width */}
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
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip contentStyle={{ fontSize: 12 }} formatter={trendFormatter} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="total"    name="Total"    fill="#94a3b8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="enrolled" name="Enrolled" fill="#16a34a" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown donut — 2/5 width */}
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

      {/* ── Department + Grade Level summary ────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Students by Department */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-background to-muted/30 dark:to-muted/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Students by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : data?.by_department && Object.keys(data.by_department).length > 0 ? (() => {
              const entries = sortDeptEntries(Object.entries(data.by_department));
              const totalMale   = entries.reduce((s, [, v]) => s + v.male,   0);
              const totalFemale = entries.reduce((s, [, v]) => s + v.female, 0);
              const totalAll    = entries.reduce((s, [, v]) => s + v.total,  0);
              return (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="pb-1.5 text-left font-medium text-muted-foreground text-xs">Department</th>
                      <th className="pb-1.5 text-right font-medium text-muted-foreground text-xs w-12">Male</th>
                      <th className="pb-1.5 text-right font-medium text-muted-foreground text-xs w-14">Female</th>
                      <th className="pb-1.5 text-right font-medium text-muted-foreground text-xs w-12">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(([dept, row]) => (
                      <tr key={dept} className="border-b border-border/30 last:border-0">
                        <td className="py-1.5">{dept}</td>
                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">{row.male}</td>
                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">{row.female}</td>
                        <td className="py-1.5 text-right tabular-nums font-medium">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border font-semibold">
                      <td className="pt-2 text-xs">Overall Total</td>
                      <td className="pt-2 text-right tabular-nums text-xs">{totalMale}</td>
                      <td className="pt-2 text-right tabular-nums text-xs">{totalFemale}</td>
                      <td className="pt-2 text-right tabular-nums">{totalAll}</td>
                    </tr>
                  </tfoot>
                </table>
              );
            })() : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Students by Grade Level */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-background to-muted/30 dark:to-muted/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Students by Grade Level</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : data?.by_grade_level && data.by_grade_level.length > 0 ? (() => {
              const sorted = sortGradeLevelRows(data.by_grade_level);
              // Group rows by dept for section headers
              const sections: { dept: string; rows: GradeLevelRow[] }[] = [];
              for (const row of sorted) {
                const last = sections[sections.length - 1];
                if (!last || last.dept !== row.dept) {
                  sections.push({ dept: row.dept, rows: [row] });
                } else {
                  last.rows.push(row);
                }
              }
              return (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="pb-1.5 text-left font-medium text-muted-foreground text-xs">Grade Level</th>
                      <th className="pb-1.5 text-right font-medium text-muted-foreground text-xs w-12">Male</th>
                      <th className="pb-1.5 text-right font-medium text-muted-foreground text-xs w-14">Female</th>
                      <th className="pb-1.5 text-right font-medium text-muted-foreground text-xs w-12">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map(({ dept, rows }) => (
                      <React.Fragment key={`section-${dept}`}>
                        <tr>
                          <td
                            colSpan={4}
                            className="pt-3 pb-0.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                          >
                            {dept}
                          </td>
                        </tr>
                        {rows.map((row) => {
                          const label = row.strand
                            ? `${row.gradeLevel} — ${row.strand}`
                            : row.gradeLevel;
                          return (
                            <tr
                              key={`${row.dept}-${row.gradeLevel}-${row.strand ?? ''}`}
                              className="border-b border-border/20 last:border-0"
                            >
                              <td className="py-1 pl-2">{label}</td>
                              <td className="py-1 text-right tabular-nums text-muted-foreground">{row.male}</td>
                              <td className="py-1 text-right tabular-nums text-muted-foreground">{row.female}</td>
                              <td className="py-1 text-right tabular-nums font-medium">{row.total}</td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              );
            })() : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
