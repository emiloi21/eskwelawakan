import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { FacultyLoad, ClassroomUtilization, MaterialsInventoryItem } from '@/types/dss';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  useReactTable, getCoreRowModel, flexRender, createColumnHelper,
} from '@tanstack/react-table';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type SchoolYear = { id: number; school_year: string; status: string };

const LOAD_STATUS_COLOR: Record<string, 'destructive' | 'secondary' | 'outline'> = {
  overloaded:  'destructive',
  optimal:     'secondary',
  underloaded: 'outline',
};

const facultyColHelper = createColumnHelper<FacultyLoad>();
const facultyColumns = [
  facultyColHelper.accessor('faculty_name',  { header: 'Faculty' }),
  facultyColHelper.accessor('department',    { header: 'Department' }),
  facultyColHelper.accessor('subject_count', { header: 'Subjects' }),
  facultyColHelper.accessor('total_units',   { header: 'Total Units' }),
  facultyColHelper.accessor('load_status', {
    header: 'Status',
    cell: info => (
      <Badge variant={LOAD_STATUS_COLOR[info.getValue()]}>
        {info.getValue()}
      </Badge>
    ),
  }),
];

const classroomColHelper = createColumnHelper<ClassroomUtilization>();
const classroomColumns = [
  classroomColHelper.accessor('room_name',              { header: 'Room' }),
  classroomColHelper.accessor('location',               { header: 'Location', cell: info => info.getValue() ?? '—' }),
  classroomColHelper.accessor('capacity',               { header: 'Capacity' }),
  classroomColHelper.accessor('sections_assigned',      { header: 'Sections' }),
  classroomColHelper.accessor('utilization_pct', {
    header: 'Utilization',
    cell: info => `${info.getValue()}%`,
  }),
  classroomColHelper.accessor('status', {
    header: 'Status',
    cell: info => {
      const v = info.getValue();
      const color = v === 'overcapacity' ? 'destructive' : v === 'optimal' ? 'secondary' : 'outline';
      return <Badge variant={color as 'destructive' | 'secondary' | 'outline'}>{v}</Badge>;
    },
  }),
];

const matColHelper = createColumnHelper<MaterialsInventoryItem>();
const matColumns = [
  matColHelper.accessor('item_name',        { header: 'Item' }),
  matColHelper.accessor('category',         { header: 'Category' }),
  matColHelper.accessor('unit',             { header: 'Unit' }),
  matColHelper.accessor('quantity_on_hand', { header: 'Qty on Hand' }),
  matColHelper.accessor('reorder_point',    { header: 'Reorder Point' }),
  matColHelper.accessor('status', {
    header: 'Status',
    cell: info => (
      <Badge variant={info.getValue() === 'shortage' ? 'destructive' : 'secondary'}>
        {info.getValue()}
      </Badge>
    ),
  }),
];

export default function DssResourcesPage() {
  const [schoolYearId, setSchoolYearId] = useState<string>('');

  const { data: schoolYears } = useQuery<{ data: SchoolYear[] }>({
    queryKey: ['school-years-list'],
    queryFn: () => api.get('/admin/school-years').then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const syParam = schoolYearId ? { school_year_id: schoolYearId } : {};

  const { data: facultyData, isLoading: facultyLoading } = useQuery<{ data: FacultyLoad[] }>({
    queryKey: ['dss-faculty-load', schoolYearId],
    queryFn: () => api.get('/admin/dss/resources/faculty-load', { params: syParam }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: classroomData, isLoading: classroomLoading } = useQuery<{ data: ClassroomUtilization[] }>({
    queryKey: ['dss-classroom-util', schoolYearId],
    queryFn: () => api.get('/admin/dss/resources/classroom-utilization', { params: syParam }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: matData, isLoading: matLoading } = useQuery<{ data: MaterialsInventoryItem[] }>({
    queryKey: ['dss-materials', schoolYearId],
    queryFn: () => api.get('/admin/dss/resources/materials-inventory', { params: syParam }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const facultyTable    = useReactTable({ data: facultyData?.data ?? [],   columns: facultyColumns,   getCoreRowModel: getCoreRowModel() });
  const classroomTable  = useReactTable({ data: classroomData?.data ?? [], columns: classroomColumns, getCoreRowModel: getCoreRowModel() });
  const matTable        = useReactTable({ data: matData?.data ?? [],       columns: matColumns,       getCoreRowModel: getCoreRowModel() });

  const loadCounts = (facultyData?.data ?? []).reduce(
    (acc, f) => { acc[f.load_status] = (acc[f.load_status] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );
  const loadChartData = Object.entries(loadCounts).map(([name, value]) => ({ name, value }));
  const LOAD_COLORS: Record<string, string> = { overloaded: '#dc2626', optimal: '#16a34a', underloaded: '#d97706' };

  function renderTable<T>(
    table: ReturnType<typeof useReactTable<T>>,
    loading: boolean,
    cols: number,
    emptyMsg: string,
  ) {
    return loading ? (
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
                <TableCell colSpan={cols} className="text-center text-muted-foreground py-8 text-sm">
                  {emptyMsg}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
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
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resource Utilization</h1>
          <p className="text-sm text-muted-foreground">Faculty load, classrooms, and materials</p>
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

      {/* Faculty Load Summary Chart */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-sm">Faculty Load Distribution</CardTitle></CardHeader>
          <CardContent>
            {facultyLoading ? <Skeleton className="h-40 w-full" /> : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={loadChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {loadChartData.map((entry) => (
                      <Cell key={entry.name} fill={LOAD_COLORS[entry.name] ?? '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Faculty Load Detail</CardTitle></CardHeader>
          <CardContent className="p-0">
            {renderTable(facultyTable, facultyLoading, facultyColumns.length, 'No faculty data available.')}
          </CardContent>
        </Card>
      </div>

      {/* Classroom Utilization */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Classroom Utilization</CardTitle></CardHeader>
        <CardContent className="p-0">
          {renderTable(classroomTable, classroomLoading, classroomColumns.length, 'No classroom data available.')}
        </CardContent>
      </Card>

      {/* Materials Inventory */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Materials Inventory</CardTitle></CardHeader>
        <CardContent className="p-0">
          {renderTable(matTable, matLoading, matColumns.length, 'No inventory data available.')}
        </CardContent>
      </Card>
    </div>
  );
}
