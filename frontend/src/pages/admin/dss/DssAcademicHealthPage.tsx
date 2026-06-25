import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  PromotionRetentionRate, GradeDistributionBracket, AtRiskStudent, SubjectPerformance,
} from '@/types/dss';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  useReactTable, getCoreRowModel, flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

type SchoolYear = { id: number; school_year: string; status: string };

const DIST_COLORS = ['#16a34a', '#65a30d', '#ca8a04', '#d97706', '#dc2626'];

// ── At-Risk Table ─────────────────────────────────────────────────
const riskColHelper = createColumnHelper<AtRiskStudent>();
const riskColumns = [
  riskColHelper.accessor('student_name', { header: 'Student' }),
  riskColHelper.accessor('grade_level',  { header: 'Grade' }),
  riskColHelper.accessor('section',      { header: 'Section' }),
  riskColHelper.accessor('flag_reasons', {
    header: 'Reasons',
    cell: info => (
      <div className="flex flex-wrap gap-1">
        {info.getValue().map((r, i) => (
          <Badge key={i} variant="destructive" className="text-[10px]">{r}</Badge>
        ))}
      </div>
    ),
  }),
  riskColHelper.accessor('intervention_status', {
    header: 'Status',
    cell: info => {
      const v = info.getValue();
      const color = v === 'resolved' ? 'secondary' : v === 'under_intervention' ? 'default' : 'outline';
      return <Badge variant={color as 'secondary' | 'default' | 'outline'}>{v.replace('_', ' ')}</Badge>;
    },
  }),
  riskColHelper.accessor('notes', {
    header: 'Notes',
    cell: info => <span className="text-xs text-muted-foreground">{info.getValue() ?? '—'}</span>,
  }),
];

// ── Subject Performance Table ─────────────────────────────────────
const subjColHelper = createColumnHelper<SubjectPerformance>();
const subjColumns = [
  subjColHelper.accessor('grade_level', { header: 'Grade' }),
  subjColHelper.accessor('subject',     { header: 'Subject' }),
  subjColHelper.accessor('avg_grade',   {
    header: 'Avg Grade',
    cell: info => info.getValue().toFixed(1),
  }),
  subjColHelper.accessor('student_count', { header: 'Students' }),
  subjColHelper.accessor('failed_count',  { header: 'Failed' }),
  subjColHelper.accessor('status', {
    header: 'Status',
    cell: info => (
      <Badge variant={info.getValue() === 'pass' ? 'secondary' : 'destructive'}>
        {info.getValue()}
      </Badge>
    ),
  }),
];

export default function DssAcademicHealthPage() {
  const queryClient = useQueryClient();
  const [schoolYearId, setSchoolYearId] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<string>('');

  const { data: schoolYears } = useQuery<{ data: SchoolYear[] }>({
    queryKey: ['school-years-list'],
    queryFn: () => api.get('/admin/school-years').then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const syParam = schoolYearId ? { school_year_id: schoolYearId } : {};

  const { data: summary, isLoading: summaryLoading } = useQuery<{ data: { at_risk_count: number; avg_promotion_rate: number; avg_retention_rate: number } }>({
    queryKey: ['dss-academic-summary', schoolYearId],
    queryFn: () => api.get('/admin/dss/academic-health/summary', { params: syParam }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: promotionData, isLoading: promoLoading } = useQuery<{ data: PromotionRetentionRate[] }>({
    queryKey: ['dss-promotion', schoolYearId],
    queryFn: () => api.get('/admin/dss/academic-health/promotion-rates', { params: syParam }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: gradeDistData, isLoading: distLoading } = useQuery<{ data: GradeDistributionBracket[] }>({
    queryKey: ['dss-grade-dist', schoolYearId, gradeFilter],
    queryFn: () =>
      api.get('/admin/dss/academic-health/grade-distribution', {
        params: { ...syParam, ...(gradeFilter ? { grade_level: gradeFilter } : {}) },
      }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: atRiskData, isLoading: riskLoading } = useQuery<{ data: AtRiskStudent[] }>({
    queryKey: ['dss-at-risk', schoolYearId],
    queryFn: () => api.get('/admin/dss/academic-health/at-risk', { params: syParam }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: subjData, isLoading: subjLoading } = useQuery<{ data: SubjectPerformance[] }>({
    queryKey: ['dss-subject-perf', schoolYearId],
    queryFn: () => api.get('/admin/dss/academic-health/subject-performance', { params: syParam }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const flagMutation = useMutation({
    mutationFn: (regId: number) =>
      api.post('/admin/dss/academic-health/interventions', { student_id: regId }),
    onSuccess: () => {
      toast.success('Student flagged for intervention');
      queryClient.invalidateQueries({ queryKey: ['dss-at-risk'] });
    },
    onError: () => toast.error('Failed to flag student'),
  });

  const handleExportCsv = async () => {
    try {
      const res = await api.get('/admin/dss/academic-health/at-risk/export', {
        params: syParam,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'at-risk-students.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const riskTable = useReactTable({
    data: atRiskData?.data ?? [],
    columns: riskColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const subjTable = useReactTable({
    data: subjData?.data ?? [],
    columns: subjColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const s = summary?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Academic Health</h1>
          <p className="text-sm text-muted-foreground">Promotion rates, grade distribution, and at-risk monitoring</p>
        </div>
        <Select value={schoolYearId} onValueChange={setSchoolYearId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Active School Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Active</SelectItem>
            {(schoolYears?.data ?? []).map(sy => (
              <SelectItem key={sy.id} value={String(sy.id)}>{sy.school_year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-3">
        {summaryLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle className="text-xs text-muted-foreground">Avg Promotion Rate</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{s?.avg_promotion_rate ?? 0}%</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-xs text-muted-foreground">Avg Retention Rate</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{s?.avg_retention_rate ?? 0}%</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-xs text-muted-foreground">At-Risk Students</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{s?.at_risk_count ?? 0}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Promotion Chart + Grade Dist */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Promotion vs Retention by Grade</CardTitle></CardHeader>
          <CardContent>
            {promoLoading ? <Skeleton className="h-56 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={promotionData?.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="grade_level" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="promotion_pct" name="Promotion %" fill="#16a34a" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="retention_pct" name="Retention %" fill="#d97706" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Grade Distribution</CardTitle>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-32 h-7 text-xs">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Grades</SelectItem>
                  {['7','8','9','10','11','12'].map(g => (
                    <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {distLoading ? <Skeleton className="h-56 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gradeDistData?.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bracket" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {(gradeDistData?.data ?? []).map((_, idx) => (
                      <Cell key={idx} fill={DIST_COLORS[idx % DIST_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">At-Risk Students</CardTitle>
            <Button size="sm" variant="outline" className="gap-2 h-7 text-xs" onClick={handleExportCsv}>
              <Download className="h-3 w-3" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {riskLoading ? (
            <div className="p-4"><Skeleton className="h-40 w-full" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {riskTable.getHeaderGroups().map(hg => (
                    <TableRow key={hg.id}>
                      {hg.headers.map(h => (
                        <TableHead key={h.id} className="text-xs">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </TableHead>
                      ))}
                      <TableHead className="text-xs">Action</TableHead>
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {riskTable.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={riskColumns.length + 1} className="text-center text-muted-foreground py-8 text-sm">
                        No at-risk students found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    riskTable.getRowModel().rows.map(row => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map(cell => (
                          <TableCell key={cell.id} className="text-xs">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                        <TableCell>
                          {row.original.intervention_status === 'flagged' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-2"
                              disabled={flagMutation.isPending}
                              onClick={() => flagMutation.mutate(row.original.reg_id)}
                            >
                              Flag
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject Performance Table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Subject Performance</CardTitle></CardHeader>
        <CardContent className="p-0">
          {subjLoading ? (
            <div className="p-4"><Skeleton className="h-40 w-full" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {subjTable.getHeaderGroups().map(hg => (
                    <TableRow key={hg.id}>
                      {hg.headers.map(h => (
                        <TableHead key={h.id} className="text-xs">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {subjTable.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={subjColumns.length} className="text-center text-muted-foreground py-8 text-sm">
                        No subject data available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    subjTable.getRowModel().rows.map(row => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map(cell => (
                          <TableCell key={cell.id} className="text-xs">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
