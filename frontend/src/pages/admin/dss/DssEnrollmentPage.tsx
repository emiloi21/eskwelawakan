import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  EnrollmentTrend, EnrollmentByGradeLevel, SectionFillRate, EnrollmentProjection,
} from '@/types/dss';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import {
  useReactTable, getCoreRowModel, flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type SchoolYear = { id: number; school_year: string; status: string };

const FILL_STATUS_COLOR: Record<string, string> = {
  overcapacity:  'destructive',
  full:          'secondary',
  available:     'outline',
  underutilized: 'outline',
};

const colHelper = createColumnHelper<SectionFillRate>();
const columns = [
  colHelper.accessor('section_name', { header: 'Section' }),
  colHelper.accessor('grade_level',  { header: 'Grade Level' }),
  colHelper.accessor('dept',         { header: 'Department' }),
  colHelper.accessor('semester',     { header: 'Semester' }),
  colHelper.accessor('enrolled_count', { header: 'Enrolled', cell: info => info.getValue() }),
  colHelper.accessor('capacity',     { header: 'Capacity' }),
  colHelper.accessor('fill_rate_pct', {
    header: 'Fill Rate',
    cell: info => `${info.getValue()}%`,
  }),
  colHelper.accessor('status', {
    header: 'Status',
    cell: info => (
      <Badge variant={FILL_STATUS_COLOR[info.getValue()] as 'destructive' | 'secondary' | 'outline' | 'default'}>
        {info.getValue()}
      </Badge>
    ),
  }),
];

const GRADE_COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#0d9488',
];

export default function DssEnrollmentPage() {
  const [schoolYearId, setSchoolYearId] = useState<string>('');

  const { data: schoolYears } = useQuery<{ data: SchoolYear[] }>(
    {
      queryKey: ['school-years-list'],
      queryFn: () => api.get('/admin/school-years').then(r => r.data),
      staleTime: 10 * 60 * 1000,
    }
  );

  const syParam = schoolYearId ? { school_year_id: schoolYearId } : {};

  const { data: trends, isLoading: trendsLoading } = useQuery<{ data: EnrollmentTrend[] }>({
    queryKey: ['dss-enrollment-trends'],
    queryFn: () => api.get('/admin/dss/enrollment/trends').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: gradeBreakdown, isLoading: gradeLoading } = useQuery<{ data: EnrollmentByGradeLevel[] }>({
    queryKey: ['dss-enrollment-grade', schoolYearId],
    queryFn: () => api.get('/admin/dss/enrollment/grade-breakdown', { params: syParam }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: fillRates, isLoading: fillLoading } = useQuery<{ data: SectionFillRate[] }>({
    queryKey: ['dss-enrollment-fill-rates', schoolYearId],
    queryFn: () => api.get('/admin/dss/enrollment/section-fill-rates', { params: syParam }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: projection, isLoading: projLoading } = useQuery<{ data: EnrollmentProjection[] }>({
    queryKey: ['dss-enrollment-projection'],
    queryFn: () => api.get('/admin/dss/enrollment/projection').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const table = useReactTable({
    data: fillRates?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enrollment Analytics</h1>
          <p className="text-sm text-muted-foreground">Trends, grade breakdown, and projections</p>
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

      {/* Enrollment Trend */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Historical Enrollment Trend</CardTitle></CardHeader>
        <CardContent>
          {trendsLoading ? <Skeleton className="h-56 w-full" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trends?.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="school_year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total_enrolled" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Grade Breakdown + Projections */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Enrollment by Grade Level</CardTitle></CardHeader>
          <CardContent>
            {gradeLoading ? <Skeleton className="h-56 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gradeBreakdown?.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="grade_level" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="enrolled_count" radius={[3, 3, 0, 0]}>
                    {(gradeBreakdown?.data ?? []).map((_, idx) => (
                      <Cell key={idx} fill={GRADE_COLORS[idx % GRADE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Enrollment Projections (Next SY)</CardTitle></CardHeader>
          <CardContent>
            {projLoading ? <Skeleton className="h-56 w-full" /> : (
              <div className="space-y-2">
                {(projection?.data ?? []).map(p => (
                  <div key={p.grade_level} className="flex items-center justify-between text-sm border-b py-1 last:border-0">
                    <span className="font-medium">{p.grade_level}</span>
                    <span className="text-muted-foreground text-xs">
                      {p.last_enrolled} → <strong className="text-foreground">{p.projected_next_sy}</strong>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section Fill Rates Table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Section Fill Rates</CardTitle></CardHeader>
        <CardContent className="p-0">
          {fillLoading ? (
            <div className="p-4"><Skeleton className="h-40 w-full" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map(hg => (
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
                  {table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8 text-sm">
                        No sections found for this school year.
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map(row => (
                      <TableRow key={row.id} className={cn(
                        row.original.status === 'overcapacity' && 'bg-red-50',
                        row.original.status === 'underutilized' && 'bg-yellow-50',
                      )}>
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
