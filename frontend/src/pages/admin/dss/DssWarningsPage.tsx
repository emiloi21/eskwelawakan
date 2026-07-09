import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { EarlyWarning, PaginatedResponse } from '@/types/dss';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useReactTable, getCoreRowModel, flexRender, createColumnHelper,
} from '@tanstack/react-table';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  warning:  '#d97706',
  info:     '#2563eb',
};

const SEVERITY_BADGE: Record<string, 'destructive' | 'secondary' | 'outline'> = {
  critical: 'destructive',
  warning:  'secondary',
  info:     'outline',
};

type TabValue = 'all' | 'critical' | 'warning' | 'info' | 'acknowledged';

function WarningsTable({
  warnings,
  loading,
  onAcknowledge,
  acknowledging,
}: {
  warnings: EarlyWarning[];
  loading: boolean;
  onAcknowledge: (publicId: string) => void;
  acknowledging: boolean;
}) {
  const colHelper = createColumnHelper<EarlyWarning>();
  const columns = [
    colHelper.accessor('severity', {
      header: 'Severity',
      cell: info => (
        <Badge variant={SEVERITY_BADGE[info.getValue()]}>
          {info.getValue().toUpperCase()}
        </Badge>
      ),
    }),
    colHelper.accessor('warning_type', { header: 'Type' }),
    colHelper.accessor('message', {
      header: 'Message',
      // Added max-w and whitespace-normal to force text wrapping
      cell: info => <div className="text-xs whitespace-normal min-w-[250px] max-w-[500px] leading-relaxed">{info.getValue()}</div> 
    }),
    colHelper.accessor('triggered_at', {
      header: 'Triggered',
      // Added whitespace-nowrap to keep the date intact
      cell: info => <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(info.getValue()), 'MMM d, yyyy HH:mm')}</span>,
    }),
    colHelper.accessor('is_acknowledged', {
      header: 'Acknowledged',
      cell: info => info.getValue()
        ? <Badge variant="secondary" className="text-[10px]">Yes</Badge>
        : <Badge variant="outline" className="text-[10px]">No</Badge>,
    }),
  ];

  const table = useReactTable({ data: warnings, columns, getCoreRowModel: getCoreRowModel() });

  if (loading) return <div className="p-4"><Skeleton className="h-40 w-full" /></div>;

  if (warnings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <CheckCircle className="h-10 w-10 mb-2 text-green-500" />
        <p className="text-sm font-medium">No active warnings — your school is looking healthy 🎉</p>
      </div>
    );
  }

  return (
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
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow
              key={row.id}
              style={{ borderLeftColor: SEVERITY_COLORS[row.original.severity], borderLeftWidth: 3 }}
            >
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id} className="text-xs">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
              <TableCell>
                {!row.original.is_acknowledged && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2 gap-1"
                    disabled={acknowledging}
                    onClick={() => onAcknowledge(row.original.public_id)}
                  >
                    <CheckCircle className="h-3 w-3" />
                    Acknowledge
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function DssWarningsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabValue>('all');

  function buildParams() {
    const p: Record<string, string> = {};
    if (tab === 'acknowledged') {
      p.acknowledged = '1';
    } else if (tab !== 'all') {
      p.severity = tab;
    }
    return p;
  }

  const { data, isLoading } = useQuery<PaginatedResponse<EarlyWarning>>({
    queryKey: ['dss-warnings', tab],
    queryFn: () => api.get('/admin/dss/warnings', { params: buildParams() }).then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
  });

  const evaluateMutation = useMutation({
    mutationFn: () => api.post('/admin/dss/warnings/evaluate'),
    onSuccess: (res) => {
      const d = res.data;
      toast.success(`Evaluation complete: ${d.created} new, ${d.skipped} skipped`);
      queryClient.invalidateQueries({ queryKey: ['dss-warnings'] });
    },
    onError: () => toast.error('Evaluation failed'),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (publicId: string) => api.patch(`/admin/dss/warnings/${publicId}/acknowledge`),
    onSuccess: () => {
      toast.success('Warning acknowledged');
      queryClient.invalidateQueries({ queryKey: ['dss-warnings'] });
    },
    onError: () => toast.error('Failed to acknowledge'),
  });

  const warnings = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Early Warnings</h1>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} total · {warnings.filter(w => !w.is_acknowledged).length} unacknowledged
          </p>
        </div>
        <Button
          onClick={() => evaluateMutation.mutate()}
          disabled={evaluateMutation.isPending}
          size="sm"
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={evaluateMutation.isPending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Re-evaluate
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Warnings Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
            <div className="px-4 pt-2">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="critical">Critical</TabsTrigger>
                <TabsTrigger value="warning">Warning</TabsTrigger>
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="acknowledged">Acknowledged</TabsTrigger>
              </TabsList>
            </div>
            {(['all', 'critical', 'warning', 'info', 'acknowledged'] as TabValue[]).map(t => (
              <TabsContent key={t} value={t} className="mt-0">
                <WarningsTable
                  warnings={tab === t ? warnings : []}
                  loading={isLoading}
                  onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
                  acknowledging={acknowledgeMutation.isPending}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}