import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, LogIn, LogOut, Users, GraduationCap, ChevronLeft, ChevronRight, Monitor } from 'lucide-react';
import { format } from 'date-fns';

type LogEntry = {
  id: number; public_id: string;
  entity_type: 'student' | 'personnel';
  entity_id: string;
  name: string;
  detail: string | null;
  log_time: string;
  direction: 'in' | 'out';
  method: string;
  kiosk_code: string | null;
  kiosk_name: string | null;
};

type SummaryData = {
  studentIn: number; studentOut: number;
  staffIn: number; staffOut: number;
};

const today = () => format(new Date(), 'yyyy-MM-dd');

export default function HrmsAttendancePage() {
  const [entityType, setEntityType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [search, setSearch] = useState('');
  const [kioskCode, setKioskCode] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{
    data: LogEntry[];
    meta: { current_page: number; last_page: number; total: number };
  }>({
    queryKey: ['attendance-logs', entityType, dateFrom, dateTo, search, kioskCode, page],
    queryFn: () =>
      api.get('/hrms/attendance', {
        params: {
          entity_type: entityType !== 'all' ? entityType : undefined,
          date_from: dateFrom,
          date_to: dateTo,
          search: search || undefined,
          kiosk_code: kioskCode || undefined,
          page,
          per_page: 50,
        },
      }).then(r => r.data),
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<SummaryData>({
    queryKey: ['attendance-summary', dateFrom],
    queryFn: () =>
      api.get('/hrms/attendance/summary', { params: { date: dateFrom } }).then(r => r.data),
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance Logs</h1>
        <p className="text-muted-foreground">View and filter student and personnel attendance records.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Students — IN
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <p className="text-2xl font-bold">{summaryLoading ? '—' : (summary?.studentIn ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Students — OUT
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <p className="text-2xl font-bold">{summaryLoading ? '—' : (summary?.studentOut ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Staff — IN
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <p className="text-2xl font-bold">{summaryLoading ? '—' : (summary?.staffIn ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Staff — OUT
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4">
            <p className="text-2xl font-bold">{summaryLoading ? '—' : (summary?.staffOut ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Input
            placeholder="Search name or ID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={entityType} onValueChange={v => { setEntityType(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="student">Students</SelectItem>
            <SelectItem value="personnel">Personnel</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Filter by Kiosk ID…"
          value={kioskCode}
          onChange={e => { setKioskCode(e.target.value.toUpperCase()); setPage(1); }}
          className="w-40 font-mono text-xs"
        />
        <Input
          type="date" className="w-40"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(1); }}
        />
        <Input
          type="date" className="w-40"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(1); }}
        />
      </div>

      {/* Logs table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date / Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Kiosk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              )
              : logs.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">
                      No logs found for the selected filters.
                    </TableCell>
                  </TableRow>
                )
                : logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(log.log_time), 'MMM d, yyyy')}<br />
                      <span className="text-xs text-muted-foreground">{format(new Date(log.log_time), 'hh:mm:ss a')}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{log.entity_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{log.name}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{log.entity_id}</TableCell>
                    <TableCell>
                      {log.direction === 'in'
                        ? <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium"><LogIn className="h-3.5 w-3.5" /> TIME IN</span>
                        : <span className="inline-flex items-center gap-1 text-xs text-blue-700 font-medium"><LogOut className="h-3.5 w-3.5" /> TIME OUT</span>
                      }
                    </TableCell>
                    <TableCell className="text-xs capitalize text-muted-foreground">{log.method}</TableCell>
                    <TableCell>
                      {log.kiosk_code ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded w-fit">{log.kiosk_code}</span>
                          {log.kiosk_name && <span className="text-xs text-muted-foreground">{log.kiosk_name}</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
            }
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {meta.current_page} of {meta.last_page} &nbsp;·&nbsp; {meta.total} records
          </p>
          <div className="flex gap-2">
            <Button
              size="sm" variant="outline"
              disabled={meta.current_page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm" variant="outline"
              disabled={meta.current_page === meta.last_page}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
