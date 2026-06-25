import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, ChevronLeft, ChevronRight, Filter, Info } from 'lucide-react';

interface ImpersonatedAs {
  id: number;
  name: string;
  role: string;
}

interface ActivityLog {
  id: number;
  description: string;
  event: string | null;
  subject_type: string | null;
  subject_id: number | null;
  causer_name: string;
  causer_id: number | null;
  impersonated_as: ImpersonatedAs | null;
  properties: Record<string, unknown>;
  created_at: string;
}

const EVENT_COLORS: Record<string, string> = {
  created: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  updated: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  deleted: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

export default function ActivityLogPage() {
  const [page, setPage] = useState(1);
  const [event, setEvent] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: events } = useQuery<string[]>({
    queryKey: ['activity-log-events'],
    queryFn: async () => {
      const { data } = await api.get('/admin/activity-log/events');
      return data.data;
    },
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery<PaginatedResponse<ActivityLog>>({
    queryKey: ['activity-log', page, event, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: '20' });
      if (event) params.set('event', event);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const { data } = await api.get(`/admin/activity-log?${params}`);
      return data;
    },
  });

  const clearFilters = () => {
    setEvent('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters = event || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-muted-foreground">Track all system actions and changes.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Event</Label>
              <Select value={event} onValueChange={(v) => { setEvent(v ?? ''); setPage(1); }}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  {events?.map((e) => (
                    <SelectItem key={e} value={e} className="text-xs capitalize">{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" className="h-8 w-[155px] text-xs" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" className="h-8 w-[155px] text-xs" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            {data?.total ?? 0} total entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data && data.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col gap-0.5">
                          <span>{log.causer_name}</span>
                          {log.impersonated_as && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                              acting as {log.impersonated_as.name} ({log.impersonated_as.role})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.event && (
                          <Badge variant="secondary" className={`text-xs capitalize ${EVENT_COLORS[log.event] || ''}`}>
                            {log.event}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm max-w-[300px] truncate">{log.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.subject_type && (
                          <span>{log.subject_type} #{log.subject_id}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.properties && Object.keys(log.properties).length > 0 && (
                          <Popover>
                            <PopoverTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" />}>
                              <Info className="h-3.5 w-3.5" />
                            </PopoverTrigger>
                            <PopoverContent className="w-96" align="end">
                              <div className="space-y-1">
                                <p className="text-sm font-medium">Properties</p>
                                <pre className="max-h-60 overflow-auto rounded bg-muted p-2 text-xs">
                                  {JSON.stringify(log.properties, null, 2)}
                                </pre>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.last_page > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Page {data.current_page} of {data.last_page}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={data.current_page <= 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={data.current_page >= data.last_page} onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No activity recorded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
