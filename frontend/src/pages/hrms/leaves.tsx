import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Plus, CheckCircle2, XCircle, CalendarRange, MoreVertical, Printer, Download, Search } from 'lucide-react';
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
function ApplyLeaveDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    personnel_public_id: '', leave_type_public_id: '',
    start_date: '', end_date: '', reason: '',
  });
  const [workdays, setWorkdays] = useState<number | null>(null);

  const { data: personnelData } = useQuery<{ data: Personnel[] }>({
    queryKey: ['hrms-personnel-all'],
    queryFn: () => api.get('/hrms/personnel', { params: { per_page: 200 } }).then(r => r.data),
  });

  const { data: ltData } = useQuery<{ data: LeaveType[] }>({
    queryKey: ['leave-types'],
    queryFn: () => api.get('/hrms/leave-types').then(r => r.data),
  });

  // Calculate approximate weekday count
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
    mutationFn: () => api.post('/hrms/leaves', {
      personnel_public_id: form.personnel_public_id,
      leave_type_public_id: form.leave_type_public_id,
      start_date: form.start_date, end_date: form.end_date, reason: form.reason,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-applications'] });
      toast.success('Leave application submitted.');
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Submit failed.'),
  });

  const personnel = personnelData?.data ?? [];
  const leaveTypes = ltData?.data ?? [];
  const canSubmit = form.personnel_public_id && form.leave_type_public_id && form.start_date && form.end_date && form.reason;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
          <DialogDescription>Submit a leave application on behalf of personnel.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Personnel <span className="text-destructive">*</span></Label>
            <Select value={form.personnel_public_id} onValueChange={(v: string) => setField('personnel_public_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select staff member…" /></SelectTrigger>
              <SelectContent>
                {personnel.map(p => (
                  <SelectItem key={p.id} value={p.public_id}>{p.lname}, {p.fname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

// ── Approve / Reject dialog ───────────────────────────────────────
function ResolveDialog({
  application, action, onClose,
}: { application: LeaveApplication | null; action: 'approve' | 'reject' | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [remarks, setRemarks] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      action === 'approve'
        ? api.post(`/hrms/leaves/${application!.public_id}/approve`, { remarks })
        : api.post(`/hrms/leaves/${application!.public_id}/reject`, { remarks }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-applications'] });
      toast.success(action === 'approve' ? 'Application approved.' : 'Application rejected.');
      onClose();
    },
    onError: () => toast.error('Action failed.'),
  });

  return (
    <Dialog open={!!application && !!action} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{action === 'approve' ? 'Approve Leave' : 'Reject Leave'}</DialogTitle>
          <DialogDescription>
            {application?.personnel ? `${application.personnel.lname}, ${application.personnel.fname}` : ''}
            {' — '}
            {application?.leave_type?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Remarks {action === 'reject' && <span className="text-destructive">*</span>}</Label>
          <Textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional notes…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant={action === 'approve' ? 'default' : 'destructive'}
            disabled={mutation.isPending || (action === 'reject' && !remarks)}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function HrmsLeavesPage() {
  const [applyOpen, setApplyOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<LeaveApplication | null>(null);
  const [resolveAction, setResolveAction] = useState<'approve' | 'reject' | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: LeaveApplication[] }>({
    queryKey: ['leave-applications', statusFilter],
    queryFn: () =>
      api.get('/hrms/leaves', {
        params: statusFilter !== 'all' ? { status: statusFilter } : {},
      }).then(r => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (pid: string) => api.delete(`/hrms/leaves/${pid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-applications'] }); toast.success('Application cancelled.'); },
    onError: () => toast.error('Cancel failed.'),
  });

  const apps = useMemo(() => {
    const all = data?.data ?? [];
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(a => {
      const name = `${a.personnel?.lname ?? ''} ${a.personnel?.fname ?? ''} ${a.personnel?.employee_id ?? ''}`.toLowerCase();
      return name.includes(q);
    });
  }, [data, search]);

  const activeFilterCount = [statusFilter !== 'all' ? statusFilter : ''].filter(Boolean).length;

  const columns: ColumnDef<LeaveApplication>[] = useMemo(() => [
    {
      id: 'personnel',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Personnel" />,
      accessorFn: (row) => `${row.personnel?.lname ?? ''} ${row.personnel?.fname ?? ''}`,
      cell: ({ row }) => {
        const app = row.original;
        return (
          <div>
            <p className="font-medium text-sm">{app.personnel ? `${app.personnel.lname}, ${app.personnel.fname}` : '—'}</p>
            <p className="text-xs text-muted-foreground">{app.personnel?.employee_id}</p>
          </div>
        );
      },
    },
    {
      id: 'leave_type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Leave Type" />,
      accessorFn: (row) => row.leave_type?.name ?? '',
      cell: ({ row }) => {
        const app = row.original;
        return (
          <div>
            <p className="text-sm">{app.leave_type?.name ?? '—'}</p>
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
                <DropdownMenuItem onClick={() => { setResolveTarget(app); setResolveAction('approve'); }}>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Approve
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => { setResolveTarget(app); setResolveAction('reject'); }}>
                  <XCircle className="mr-2 h-4 w-4" /> Reject
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { if (confirm('Cancel this application?')) cancelMutation.mutate(app.public_id); }}>
                  Cancel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [cancelMutation]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Leave Applications</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        h2 { margin-bottom: 4px; } p { margin-top: 0; color: #666; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h2>Leave Applications</h2>
      <p>Status: ${statusFilter !== 'all' ? statusFilter : 'All'}</p>
      <table>
        <thead><tr><th>Personnel</th><th>Leave Type</th><th>Start</th><th>End</th><th>Days</th><th>Status</th></tr></thead>
        <tbody>${apps.map(a => `<tr>
          <td>${a.personnel ? `${a.personnel.lname}, ${a.personnel.fname}` : '—'}</td>
          <td>${a.leave_type?.name ?? '—'}</td>
          <td>${format(new Date(a.start_date), 'MMM d, yyyy')}</td>
          <td>${format(new Date(a.end_date), 'MMM d, yyyy')}</td>
          <td>${a.total_days}d</td>
          <td>${a.status}</td>
        </tr>`).join('')}</tbody>
      </table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExport = () => {
    const header = ['Personnel', 'Employee ID', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status'];
    const rows = apps.map(a => [
      a.personnel ? `${a.personnel.lname}, ${a.personnel.fname}` : '',
      a.personnel?.employee_id ?? '',
      a.leave_type?.name ?? '',
      a.start_date, a.end_date,
      String(a.total_days), a.status,
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'leave-applications.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Applications</h1>
          <p className="text-muted-foreground">Review and manage personnel leave requests.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => setApplyOpen(true)}><Plus className="mr-2 h-4 w-4" /> Apply Leave</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={apps}
            isLoading={isLoading}
            noResultsMessage="No applications found."
            toolbar={
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search personnel…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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

      <ApplyLeaveDialog open={applyOpen} onClose={() => setApplyOpen(false)} />
      <ResolveDialog
        application={resolveTarget}
        action={resolveAction}
        onClose={() => { setResolveTarget(null); setResolveAction(null); }}
      />
    </div>
  );
}
