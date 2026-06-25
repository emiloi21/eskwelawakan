import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';

type CheckItem = {
  id: number; item_name: string; property_no: string | null; expected_quantity: number;
  counted_quantity: number | null; condition_found: string | null; remarks: string | null;
};
type InventoryTask = {
  id: number; public_id: string; title: string; location: string; school_year: string;
  status: string; due_date: string | null; submitted_at: string | null;
  custodian_remarks: string | null; check_items_count?: number;
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending: 'secondary', 'In Progress': 'default', Submitted: 'outline', Reviewed: 'default',
};

// ── Task detail sheet ─────────────────────────────────────────────
function TaskSheet({ task, open, onClose }: { task: InventoryTask | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [counts, setCounts] = useState<Record<number, { counted: string; condition: string; remarks: string }>>({});
  const [assigneeRemarks, setAssigneeRemarks] = useState('');

  const { data, isLoading } = useQuery<{ data: InventoryTask & { check_items: CheckItem[] } }>({
    queryKey: ['my-inventory-task', task?.public_id],
    queryFn: () => api.get(`/inventory-tasks/${task!.public_id}`).then(r => r.data),
    enabled: !!task,
    onSuccess: (d) => {
      const initial: typeof counts = {};
      d.data.check_items.forEach(it => {
        initial[it.id] = {
          counted: it.counted_quantity != null ? String(it.counted_quantity) : '',
          condition: it.condition_found ?? '',
          remarks: it.remarks ?? '',
        };
      });
      setCounts(initial);
      setAssigneeRemarks(d.data.status === 'Pending' || d.data.status === 'In Progress' ? '' : '');
    },
  });

  const submit = useMutation({
    mutationFn: (doSubmit: boolean) => {
      const items = (data?.data.check_items ?? []).map(it => ({
        id: it.id,
        counted_quantity: parseInt(counts[it.id]?.counted ?? '0') || 0,
        condition_found: counts[it.id]?.condition || 'Good',
        remarks: counts[it.id]?.remarks || null,
      }));
      return api.post(`/inventory-tasks/${task!.public_id}/submit`, {
        items, assignee_remarks: assigneeRemarks || null, submit: doSubmit,
      });
    },
    onSuccess: (_, doSubmit) => {
      qc.invalidateQueries({ queryKey: ['my-inventory-tasks'] });
      qc.invalidateQueries({ queryKey: ['my-inventory-task', task?.public_id] });
      toast.success(doSubmit ? 'Inventory submitted to custodian.' : 'Progress saved.');
    },
    onError: () => toast.error('Save failed.'),
  });

  const detail = data?.data;
  const canEdit = detail?.status === 'Pending' || detail?.status === 'In Progress';

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{task?.title}</SheetTitle>
          <p className="text-sm text-muted-foreground">{task?.location} · {task?.school_year}</p>
        </SheetHeader>

        {isLoading
          ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant={statusVariant[detail?.status ?? ''] ?? 'outline'}>{detail?.status}</Badge>
                {task?.due_date && <span className="text-xs text-muted-foreground">Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</span>}
              </div>

              {detail?.custodian_remarks && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
                  <p className="font-medium text-blue-900">Custodian Remarks:</p>
                  <p className="text-blue-800 italic">{detail.custodian_remarks}</p>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Property No.</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Counted</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detail?.check_items ?? []).map(it => (
                    <TableRow key={it.id}>
                      <TableCell className="text-sm font-medium">{it.item_name}</TableCell>
                      <TableCell className="text-xs font-mono">{it.property_no ?? '—'}</TableCell>
                      <TableCell className="text-sm">{it.expected_quantity}</TableCell>
                      <TableCell>
                        {canEdit
                          ? <Input type="number" min={0} className="h-8 w-20 text-sm" value={counts[it.id]?.counted ?? ''} onChange={e => setCounts(prev => ({ ...prev, [it.id]: { ...prev[it.id], counted: e.target.value } }))} />
                          : <span className="text-sm">{it.counted_quantity ?? '—'}</span>
                        }
                      </TableCell>
                      <TableCell>
                        {canEdit
                          ? (
                            <Select value={counts[it.id]?.condition ?? ''} onValueChange={v => setCounts(prev => ({ ...prev, [it.id]: { ...prev[it.id], condition: v } }))}>
                              <SelectTrigger className="h-8 text-sm w-28"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                {['Good', 'Fair', 'Poor', 'Missing'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )
                          : <span className="text-sm">{it.condition_found ?? '—'}</span>
                        }
                      </TableCell>
                      <TableCell>
                        {canEdit
                          ? <Input className="h-8 text-sm w-28" value={counts[it.id]?.remarks ?? ''} onChange={e => setCounts(prev => ({ ...prev, [it.id]: { ...prev[it.id], remarks: e.target.value } }))} />
                          : <span className="text-xs text-muted-foreground">{it.remarks ?? '—'}</span>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {canEdit && (
                <div className="space-y-2 border-t pt-3">
                  <Label>Your Remarks (optional)</Label>
                  <Textarea rows={2} value={assigneeRemarks} onChange={e => setAssigneeRemarks(e.target.value)} />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" disabled={submit.isPending} onClick={() => submit.mutate(false)}>
                      {submit.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save Progress
                    </Button>
                    <Button className="bg-green-700 hover:bg-green-800" disabled={submit.isPending} onClick={() => submit.mutate(true)}>
                      {submit.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Submit to Custodian
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        }
      </SheetContent>
    </Sheet>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function MyInventoryTasksPage() {
  const [selectedTask, setSelectedTask] = useState<InventoryTask | null>(null);

  const { data, isLoading } = useQuery<{ data: InventoryTask[] }>({
    queryKey: ['my-inventory-tasks'],
    queryFn: () => api.get('/inventory-tasks').then(r => r.data),
  });

  const tasks = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Inventory Tasks</h1>
        <p className="text-muted-foreground">Year-end inventory assignments from the Custodian office</p>
      </div>

      {isLoading
        ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
        : tasks.length === 0
          ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium">No inventory tasks assigned to you.</p>
                <p className="text-sm text-muted-foreground">When the Custodian assigns you a room or office inventory, it will appear here.</p>
              </CardContent>
            </Card>
          )
          : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tasks.map(task => (
                <Card key={task.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setSelectedTask(task)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold line-clamp-2">{task.title}</CardTitle>
                      <Badge variant={statusVariant[task.status] ?? 'outline'} className="text-xs shrink-0">{task.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p className="text-muted-foreground">📍 {task.location}</p>
                    <p className="text-muted-foreground">🗓 {task.school_year}</p>
                    {task.due_date && <p className="text-muted-foreground">Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</p>}
                    {task.submitted_at && (
                      <p className="text-green-700 text-xs">Submitted {format(new Date(task.submitted_at), 'MMM d, yyyy')}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )
      }

      <TaskSheet task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
}
