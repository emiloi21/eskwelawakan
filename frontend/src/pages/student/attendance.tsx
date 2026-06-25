import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, LogIn, LogOut, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface AttendanceRecord {
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused' | 'Half Day';
  remarks: string | null;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  half_day: number;
  total: number;
}

interface AttendanceData {
  summary: AttendanceSummary;
  records: AttendanceRecord[];
}

interface KioskLogEntry {
  id: number;
  direction: 'in' | 'out';
  log_time: string;
  method: string;
  kiosk_code: string | null;
  kiosk_name: string | null;
}

interface KioskLogData {
  summary: { total_in: number; total_out: number };
  logs: KioskLogEntry[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_COLORS: Record<string, { badge: 'default' | 'secondary' | 'destructive' | 'outline'; cell: string }> = {
  Present:  { badge: 'default',     cell: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  Absent:   { badge: 'destructive', cell: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  Late:     { badge: 'outline',     cell: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500' },
  Excused:  { badge: 'secondary',   cell: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  'Half Day': { badge: 'secondary', cell: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
};

function buildCalendar(year: number, month: number, records: AttendanceRecord[]) {
  const recordMap: Record<string, AttendanceRecord> = {};
  for (const r of records) {
    recordMap[r.date] = r;
  }

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return { weeks, recordMap };
}

export default function StudentAttendancePage() {
  const now = new Date();

  const [activeTab, setActiveTab] = useState<'records' | 'kiosk'>('records');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const { data, isLoading } = useQuery<AttendanceData>({
    queryKey: ['student-attendance', year, month],
    queryFn: async () => {
      const { data } = await api.get('/student/attendance', {
        params: { year, month: month + 1 },
      });
      return data;
    },
  });

  const { data: kioskData, isLoading: kioskLoading } = useQuery<KioskLogData>({
    queryKey: ['student-kiosk-logs', year, month],
    queryFn: () =>
      api.get('/student/kiosk-logs', { params: { year, month: month + 1 } }).then(r => r.data),
    enabled: activeTab === 'kiosk',
  });

  const summary = data?.summary;
  const records = data?.records ?? [];
  const { weeks, recordMap } = buildCalendar(year, month, records);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const dateKey = (d: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">Your attendance record and monthly overview</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'records' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Class Attendance
        </button>
        <button
          onClick={() => setActiveTab('kiosk')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'kiosk' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Monitor className="h-3.5 w-3.5" /> Kiosk Scans
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-base font-semibold w-40 text-center">
          {MONTHS[month]} {year}
        </span>
        <Button variant="outline" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {activeTab === 'records' ? (
        isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid gap-3 grid-cols-3 sm:grid-cols-5">
              {[
                { label: 'Present',  value: summary?.present ?? 0,  color: 'text-green-600' },
                { label: 'Absent',   value: summary?.absent ?? 0,   color: 'text-destructive' },
                { label: 'Late',     value: summary?.late ?? 0,     color: 'text-yellow-600' },
                { label: 'Excused',  value: summary?.excused ?? 0,  color: 'text-blue-600' },
                { label: 'Half Day', value: summary?.half_day ?? 0, color: 'text-purple-600' },
              ].map(({ label, value, color }) => (
                <Card key={label}>
                  <CardContent className="pt-3 pb-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Calendar grid */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Calendar View</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <th key={d} className="py-1.5 text-center text-xs font-medium text-muted-foreground">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((week, wi) => (
                      <tr key={wi}>
                        {week.map((day, di) => {
                          if (day === null) {
                            return <td key={di} className="p-1 text-center text-xs text-muted-foreground/30">—</td>;
                          }
                          const key = dateKey(day);
                          const rec = recordMap[key];
                          const cellClass = rec ? STATUS_COLORS[rec.status]?.cell : 'text-muted-foreground';
                          return (
                            <td key={di} className="p-1 text-center">
                              <div
                                className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${cellClass}`}
                                title={rec ? `${rec.status}${rec.remarks ? ` — ${rec.remarks}` : ''}` : undefined}
                              >
                                {day}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Legend */}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {Object.entries(STATUS_COLORS).map(([status, { cell }]) => (
                    <span key={status} className="flex items-center gap-1.5">
                      <span className={`inline-block h-3 w-3 rounded-full ${cell}`} />
                      {status}
                    </span>
                  ))}
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full bg-transparent border" />
                    No record
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Detailed list */}
            {records.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Daily Records</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.date} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-2">{r.date}</td>
                          <td className="px-4 py-2">
                            <Badge variant={STATUS_COLORS[r.status]?.badge ?? 'secondary'}>
                              {r.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">{r.remarks ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No attendance records for {MONTHS[month]} {year}.
              </p>
            )}
          </>
        )
      ) : (
        /* ── Kiosk Scans Tab ── */
        kioskLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {/* Kiosk summary cards */}
            <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
              <Card>
                <CardContent className="pt-3 pb-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><LogIn className="h-3.5 w-3.5 text-green-600" /> Time-In</p>
                  <p className="text-2xl font-bold text-green-600">{kioskData?.summary.total_in ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-3 pb-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><LogOut className="h-3.5 w-3.5 text-blue-600" /> Time-Out</p>
                  <p className="text-2xl font-bold text-blue-600">{kioskData?.summary.total_out ?? 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Kiosk scan log list */}
            {(kioskData?.logs ?? []).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                <Monitor className="h-8 w-8 opacity-30" />
                <p className="text-sm">No kiosk scan records for {MONTHS[month]} {year}.</p>
              </div>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Scan History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left">Date &amp; Time</th>
                        <th className="px-4 py-2 text-left">Direction</th>
                        <th className="px-4 py-2 text-left">Kiosk</th>
                        <th className="px-4 py-2 text-left">Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(kioskData?.logs ?? []).map(l => (
                        <tr key={l.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-2 whitespace-nowrap">
                            {format(new Date(l.log_time), 'MMM d, yyyy')}<br />
                            <span className="text-xs text-muted-foreground">{format(new Date(l.log_time), 'hh:mm:ss a')}</span>
                          </td>
                          <td className="px-4 py-2">
                            {l.direction === 'in'
                              ? <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium"><LogIn className="h-3.5 w-3.5" /> Time-In</span>
                              : <span className="inline-flex items-center gap-1 text-xs text-blue-700 font-medium"><LogOut className="h-3.5 w-3.5" /> Time-Out</span>}
                          </td>
                          <td className="px-4 py-2">
                            {l.kiosk_code ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded w-fit">{l.kiosk_code}</span>
                                {l.kiosk_name && <span className="text-xs text-muted-foreground">{l.kiosk_name}</span>}
                              </div>
                            ) : <span className="text-xs text-muted-foreground italic">—</span>}
                          </td>
                          <td className="px-4 py-2 text-xs capitalize text-muted-foreground">{l.method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </>
        )
      )}
    </div>
  );
}
