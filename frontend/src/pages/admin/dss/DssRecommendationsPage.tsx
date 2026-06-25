import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DssRecommendation, PaginatedResponse } from '@/types/dss';
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
import { Sparkles, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const PRIORITY_BADGE: Record<string, string> = {
  high:   'text-red-600 border-red-200',
  medium: 'text-yellow-600 border-yellow-200',
  low:    'text-blue-600 border-blue-200',
};

type TabValue = 'all' | 'pending' | 'actioned' | 'enrollment' | 'academic' | 'faculty' | 'resource' | 'general';

function RecsTable({
  recs,
  loading,
  onAction,
  acting,
}: {
  recs: DssRecommendation[];
  loading: boolean;
  onAction: (publicId: string) => void;
  acting: boolean;
}) {
  const colHelper = createColumnHelper<DssRecommendation>();
  const columns = [
    colHelper.accessor('priority', {
      header: 'Priority',
      cell: info => (
        <Badge variant="outline" className={cn('text-[10px]', PRIORITY_BADGE[info.getValue()])}>
          {info.getValue().toUpperCase()}
        </Badge>
      ),
    }),
    colHelper.accessor('category', {
      header: 'Category',
      cell: info => <Badge variant="secondary" className="text-[10px]">{info.getValue()}</Badge>,
    }),
    colHelper.accessor('recommendation_text', {
      header: 'Recommendation',
      cell: info => <span className="text-xs">{info.getValue()}</span>,
    }),
    colHelper.accessor('basis', {
      header: 'Basis',
      cell: info => <span className="text-xs text-muted-foreground">{info.getValue()}</span>,
    }),
    colHelper.accessor('generated_at', {
      header: 'Generated',
      cell: info => <span className="text-xs text-muted-foreground">{format(new Date(info.getValue()), 'MMM d, yyyy')}</span>,
    }),
    colHelper.accessor('is_actioned', {
      header: 'Status',
      cell: info => info.getValue()
        ? <Badge variant="secondary" className="text-[10px]">Actioned</Badge>
        : <Badge variant="outline" className="text-[10px]">Pending</Badge>,
    }),
  ];

  const table = useReactTable({ data: recs, columns, getCoreRowModel: getCoreRowModel() });

  if (loading) return <div className="p-4"><Skeleton className="h-40 w-full" /></div>;

  if (recs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Sparkles className="h-10 w-10 mb-2 text-blue-400" />
        <p className="text-sm">No recommendations found for this filter.</p>
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
            <TableRow key={row.id}>
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id} className="text-xs">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
              <TableCell>
                {!row.original.is_actioned && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2 gap-1"
                    disabled={acting}
                    onClick={() => onAction(row.original.public_id)}
                  >
                    <CheckCircle className="h-3 w-3" />
                    Mark Actioned
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

export default function DssRecommendationsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabValue>('all');

  function buildParams() {
    const p: Record<string, string> = {};
    if (tab === 'pending')  { p.actioned = '0'; }
    else if (tab === 'actioned') { p.actioned = '1'; }
    else if (!['all'].includes(tab)) { p.category = tab; }
    return p;
  }

  const { data, isLoading } = useQuery<PaginatedResponse<DssRecommendation>>({
    queryKey: ['dss-recommendations', tab],
    queryFn: () => api.get('/admin/dss/recommendations', { params: buildParams() }).then(r => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/admin/dss/recommendations/generate'),
    onSuccess: (res) => {
      toast.success(`Generated ${res.data.generated} new recommendations`);
      queryClient.invalidateQueries({ queryKey: ['dss-recommendations'] });
    },
    onError: () => toast.error('Generation failed'),
  });

  const actionMutation = useMutation({
    mutationFn: (publicId: string) => api.patch(`/admin/dss/recommendations/${publicId}/action`),
    onSuccess: () => {
      toast.success('Recommendation marked as actioned');
      queryClient.invalidateQueries({ queryKey: ['dss-recommendations'] });
    },
    onError: () => toast.error('Failed to update'),
  });

  const recs = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recommendations</h1>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} total · {recs.filter(r => !r.is_actioned).length} pending
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          size="sm"
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Generate Recommendations
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recommendations Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
            <div className="px-4 pt-2 overflow-x-auto">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="actioned">Actioned</TabsTrigger>
                <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
                <TabsTrigger value="academic">Academic</TabsTrigger>
                <TabsTrigger value="faculty">Faculty</TabsTrigger>
                <TabsTrigger value="resource">Resource</TabsTrigger>
                <TabsTrigger value="general">General</TabsTrigger>
              </TabsList>
            </div>
            {(['all', 'pending', 'actioned', 'enrollment', 'academic', 'faculty', 'resource', 'general'] as TabValue[]).map(t => (
              <TabsContent key={t} value={t} className="mt-0">
                <RecsTable
                  recs={tab === t ? recs : []}
                  loading={isLoading}
                  onAction={(id) => actionMutation.mutate(id)}
                  acting={actionMutation.isPending}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
