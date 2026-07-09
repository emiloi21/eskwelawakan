import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Plus, CalendarRange, MoreVertical, Search } from 'lucide-react';
import { format } from 'date-fns';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DataTableFilterButton, DataTableFilterSheet } from '@/components/ui/data-table-filter-sheet';
import type { ColumnDef } from '@tanstack/react-table';

type LeaveType = { id: number; public_id: string; name: string; days_per_year: number; is_paid: boolean };
type Personnel = { id: number; public_id: string; employee_id: string; fname: string; lname: string };
type LeaveApplication = {
  id: number; public_id: string;
  personnel: { fname: string; lname: string; employee_id: string } | null;
  leave_type: { name: string; is_paid: boolean } | null;
  start_date: string; end_date: string; total_days: number;
  reason: string; status: string;
  approver_remarks: string | null;
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending: 'outline', Approved: 'default', Rejected: 'destructive',
};

// ── Apply Leave dialog ────────────────────────────────────────────
function ApplyLeaveDialog({ open, onClose, myPersonnelId }: { open: boolean; onClose: () => void; myPersonnelId: string | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    leave_type_public_id: '', start_date: '', end_date: '', reason: '',
  });
  const [workdays, setWorkdays] = useState<number | null>(null);

  const { data: ltData } = useQuery<{ data: LeaveType[] }>({
    queryKey: ['leave-types'],
    queryFn: () => api.get('/teacher/leave-types').then(r => r.data),
  });

  const calcWorkdays = (start: string, end: string) => {
    if (!start || !end) return;
    const s = new Date(start); const e = new Date(end);
    if (e < s) { setWorkdays(null); return; }
    let count = 0;
    const cur = new Date(s);
    while (cur <= e) { const d = cur.getDay(); if (d !== 0 && d !== 6) count++; cur.setDate(cur.getDate() + 1); }
    setWorkdays(count);
  };

  const setField = (k: keyof typeof form, v: string) => {
    const next = { ...form, [k]: v };
    setForm(next);
    if (k === 'start_date' || k === 'end_date') calcWorkdays(k === 'start_date' ? v : form.start_date, k === 'end_date' ? v : form.end_date);
  };

  const mutation = useMutation({
    mutationFn: () => api.post('/teacher/leaves', {
      personnel_public_id: myPersonnelId,
      leave_type_public_id: form.leave_type_public_id,
      start_date: form.start_date, end_date: form.end_date, reason: form.reason,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-leaves'] });
      toast.success('Leave application submitted.');
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Submit failed.'),
  });

  const leaveTypes = ltData?.data ?? [];
  const canSubmit = form.leave_type_public_id && form.start_date && form.end_date && form.reason && myPersonnelId;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
          <DialogDescription>Submit your leave application for approval.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          {!myPersonnelId && (
             <div className="text-destructive text-sm font-semibold">Your Personnel record could not be found. Contact HR.</div>
          )}
          <div className="space-y-1.5">
            <Label>Leave Type <span className="text-destructive">*</span></Label>
            <Select value={form.leave_type_public_id} onValueChange={(v: string) => setField('leave_type_public_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select leave type…" /></SelectTrigger>
              <SelectContent>
                {leaveTypes.map(lt => (
                  <SelectItem key={lt.id} value={lt.public_id}>{lt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.start_date} onChange={e => setField('start_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.end_date} onChange={e => setField('end_date', e.target.value)} />
            </div>
          </div>
          {workdays !== null && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CalendarRange className="h-4 w-4" />
              Approx. <strong>{workdays}</strong> working day{workdays !== 1 ? 's' : ''}
            </p>
          )}
          <div className="space-y-1.5">
            <Label>Reason <span className="text-destructive">*</span></Label>
            <Textarea rows={2} value={form.reason} onChange={e => setField('reason', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={mutation.isPending || !canSubmit} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function TeacherLeavesPage() {
  const { user } = useAuthStore();
  const [applyOpen, setApplyOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: LeaveApplication[] }>({
    queryKey: ['teacher-leaves', statusFilter],
    queryFn: () =>
      api.get('/teacher/leaves', {
        params: statusFilter !== 'all' ? { status: statusFilter } : {},
      }).then(r => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (pid: string) => api.delete(`/teacher/leaves/${pid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-leaves'] }); toast.success('Application cancelled.'); },
    onError: () => toast.error('Cancel failed.'),
  });

  const myApplications = useMemo(() => {
    const all = data?.data ?? [];
    return all.filter(a => a.personnel?.fname === user?.fname && a.personnel?.lname === user?.lname);
  }, [data, user]);

  const { data: allPersonnelData } = useQuery<{ data: Personnel[] }>({
    queryKey: ['hrms-personnel-fallback'],
    queryFn: () => api.get('/hrms/personnel', { params: { per_page: 500 } }).then(r => r.data),
    enabled: myApplications.length === 0,
    retry: false
  });

  const myPersonnelId = useMemo(() => {
    const matched = allPersonnelData?.data?.find(p => p.fname === user?.fname && p.lname === user?.lname);
    return matched?.public_id ?? null;
  }, [allPersonnelData, user]);

  const activeFilterCount = [statusFilter !== 'all' ? statusFilter : ''].filter(Boolean).length;

  const columns: ColumnDef<LeaveApplication>[] = useMemo(() => [
    {
      id: 'leave_type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Leave Type" />,
      accessorFn: (row) => row.leave_type?.name ?? '',
      cell: ({ row }) => {
        const app = row.original;
        return (
          <div>
            <p className="text-sm font-medium">{app.leave_type?.name ?? '—'}</p>
            {app.leave_type && (
              <Badge variant={app.leave_type.is_paid ? 'default' : 'secondary'} className="text-xs mt-0.5">
                {app.leave_type.is_paid ? 'Paid' : 'Unpaid'}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'dates',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dates" />,
      accessorFn: (row) => row.start_date,
      cell: ({ row }) => {
        const app = row.original;
        return (
          <span className="text-sm whitespace-nowrap">
            {format(new Date(app.start_date), 'MMM d')} – {format(new Date(app.end_date), 'MMM d, yyyy')}
          </span>
        );
      },
    },
    {
      accessorKey: 'total_days',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Days" />,
      cell: ({ row }) => `${row.original.total_days}d`,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.status] ?? 'outline'}>{row.original.status}</Badge>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const app = row.original;
        if (app.status !== 'Pending') return null;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { if (confirm('Cancel this application?')) cancelMutation.mutate(app.public_id); }}>
                  Cancel Application
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [cancelMutation]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Leave Applications</h1>
          <p className="text-muted-foreground">Submit and track your leave requests.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setApplyOpen(true)}><Plus className="mr-2 h-4 w-4" /> Apply Leave</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={myApplications}
            isLoading={isLoading}
            noResultsMessage="No applications found."
            toolbar={
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search leaves…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <DataTableFilterButton activeCount={activeFilterCount} onClick={() => setFilterOpen(true)} />
              </div>
            }
          />
        </CardContent>
      </Card>

      <DataTableFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeCount={activeFilterCount}
        onReset={() => setStatusFilter('all')}
      >
        <div className="space-y-1">
          <Label className="text-sm font-medium">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      <ApplyLeaveDialog open={applyOpen} onClose={() => setApplyOpen(false)} myPersonnelId={myPersonnelId} />
    </div>
  );
}
