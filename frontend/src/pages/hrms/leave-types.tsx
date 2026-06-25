import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Plus, Pencil, Trash2, CalendarDays, MoreVertical, Printer, Download, Search } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DataTableFilterButton, DataTableFilterSheet } from '@/components/ui/data-table-filter-sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ColumnDef } from '@tanstack/react-table';

type LeaveType = {
  id: number; public_id: string; name: string; days_per_year: number; is_paid: boolean;
};

const blankForm = { name: '', days_per_year: '15', is_paid: true };

function LeaveTypeDialog({
  open, leaveType, onClose,
}: { open: boolean; leaveType: LeaveType | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!leaveType;
  const [form, setForm] = useState(
    leaveType ? { name: leaveType.name, days_per_year: String(leaveType.days_per_year), is_paid: leaveType.is_paid } : blankForm,
  );

  const mutation = useMutation({
    mutationFn: () => {
      const body = { name: form.name, days_per_year: parseInt(form.days_per_year, 10), is_paid: form.is_paid };
      return isEdit
        ? api.put(`/hrms/leave-types/${leaveType!.public_id}`, body)
        : api.post('/hrms/leave-types', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-types'] });
      toast.success(isEdit ? 'Leave type updated.' : 'Leave type added.');
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Save failed.'),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Leave Type' : 'Add Leave Type'}</DialogTitle>
          <DialogDescription>Configure a leave type for leave applications.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Leave Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g. Sick Leave"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Days Allowed Per Year <span className="text-destructive">*</span></Label>
            <Input
              type="number" min={1} max={365}
              value={form.days_per_year}
              onChange={e => setForm(f => ({ ...f, days_per_year: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Paid Leave</p>
              <p className="text-xs text-muted-foreground">Employee is compensated during this leave.</p>
            </div>
            <Switch checked={form.is_paid} onCheckedChange={v => setForm(f => ({ ...f, is_paid: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={mutation.isPending || !form.name || !form.days_per_year}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Leave Type'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HrmsLeaveTypesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editType, setEditType] = useState<LeaveType | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPaid, setFilterPaid] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<{ data: LeaveType[] }>({
    queryKey: ['leave-types'],
    queryFn: () => api.get('/hrms/leave-types').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => api.delete(`/hrms/leave-types/${publicId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-types'] }); toast.success('Deleted.'); },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Delete failed.'),
  });

  const leaveTypes = data?.data ?? [];

  const filtered = useMemo(() => {
    let rows = leaveTypes;
    if (search) rows = rows.filter(lt => lt.name.toLowerCase().includes(search.toLowerCase()));
    if (filterPaid === 'paid') rows = rows.filter(lt => lt.is_paid);
    if (filterPaid === 'unpaid') rows = rows.filter(lt => !lt.is_paid);
    return rows;
  }, [leaveTypes, search, filterPaid]);

  const columns: ColumnDef<LeaveType>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Leave Name" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'days_per_year',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Days / Year" />,
      cell: ({ row }) => `${row.original.days_per_year} days`,
    },
    {
      accessorKey: 'is_paid',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => (
        <Badge variant={row.original.is_paid ? 'default' : 'secondary'}>
          {row.original.is_paid ? 'Paid' : 'Unpaid'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const lt = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setEditType(lt); setDialogOpen(true); }}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => { if (confirm(`Delete "${lt.name}"?`)) deleteMutation.mutate(lt.public_id); }}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [deleteMutation]);

  const activeFilterCount = [filterPaid].filter(Boolean).length;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Leave Types</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        h2 { margin-bottom: 4px; } p { margin-top: 0; color: #666; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h2>Leave Types</h2>
      <p>${filterPaid ? `Type: ${filterPaid === 'paid' ? 'Paid' : 'Unpaid'}` : 'All Types'}</p>
      <table>
        <thead><tr><th>Leave Name</th><th>Days / Year</th><th>Type</th></tr></thead>
        <tbody>${filtered.map(lt => `<tr><td>${lt.name}</td><td>${lt.days_per_year} days</td><td>${lt.is_paid ? 'Paid' : 'Unpaid'}</td></tr>`).join('')}</tbody>
      </table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExport = () => {
    const header = ['Leave Name', 'Days Per Year', 'Type'];
    const rows = filtered.map(lt => [lt.name, String(lt.days_per_year), lt.is_paid ? 'Paid' : 'Unpaid']);
    const csv = [header, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'leave-types.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Types</h1>
          <p className="text-muted-foreground">Define leave categories available to personnel.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => { setEditType(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Leave Type
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        noResultsMessage="No leave types defined."
        toolbar={
          <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search leave types..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <DataTableFilterButton activeCount={activeFilterCount} onClick={() => setFilterOpen(true)} />
          </div>
        }
      />

      <DataTableFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeCount={activeFilterCount}
        onReset={() => setFilterPaid('')}
      >
        <div className="space-y-1">
          <Label className="text-sm font-medium">Type</Label>
          <Select value={filterPaid || 'all'} onValueChange={(v) => setFilterPaid(v === 'all' ? '' : (v ?? ''))}>
            <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      <LeaveTypeDialog
        open={dialogOpen}
        leaveType={editType}
        onClose={() => { setDialogOpen(false); setEditType(null); }}
      />
    </div>
  );
}
