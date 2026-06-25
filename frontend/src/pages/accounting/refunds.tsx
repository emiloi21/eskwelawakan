import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { RefundRequest, PaginatedResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DataTableFilterButton, DataTableFilterSheet } from '@/components/ui/data-table-filter-sheet';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Search, CheckCircle2, XCircle, ArrowRightCircle, MoreVertical } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending: 'secondary',
  Approved: 'outline',
  Released: 'default',
  Cancelled: 'destructive',
};

export default function RefundsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [regId, setRegId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amtExcess, setAmtExcess] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse<RefundRequest>>({
    queryKey: ['refunds', page, pageSize, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: String(pageSize) });
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/accounting/refunds?${params}`);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/accounting/refunds', {
        reg_id: regId,
        category_id: categoryId,
        amt_excess: Number(amtExcess),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      toast.success('Refund request created.');
      setAddOpen(false);
      setRegId('');
      setCategoryId('');
      setAmtExcess('');
    },
    onError: () => toast.error('Failed to create refund request.'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.put(`/accounting/refunds/${id}`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      toast.success('Refund status updated.');
    },
    onError: () => toast.error('Failed to update refund status.'),
  });

  const items = data?.data ?? [];
  const filtered = search
    ? items.filter(
        (r) =>
          r.student?.lname?.toLowerCase().includes(search.toLowerCase()) ||
          r.student?.fname?.toLowerCase().includes(search.toLowerCase()) ||
          String(r.reg_id).includes(search),
      )
    : items;

  const columns: ColumnDef<RefundRequest>[] = [
    {
      accessorKey: 'refund_id',
      header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
      cell: ({ row }) => <span className="font-mono text-xs">#{row.original.refund_id}</span>,
    },
    {
      id: 'student',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Student" />,
      cell: ({ row }) => {
        const s = row.original.student;
        return s ? (
          <span className="font-medium">{s.lname}, {s.fname}</span>
        ) : (
          <span className="text-muted-foreground">Reg #{row.original.reg_id}</span>
        );
      },
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => row.original.category?.description ?? '—',
    },
    {
      accessorKey: 'amt_excess',
      header: () => <span className="flex justify-end">Amount</span>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums font-medium">
          {formatPeso(row.original.amt_excess)}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={STATUS_COLORS[row.original.status] ?? 'secondary'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'date_time',
      header: 'Date',
      cell: ({ row }) => new Date(row.original.date_time).toLocaleDateString(),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const r = row.original;
        if (r.status !== 'Pending' && r.status !== 'Approved') return null;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {r.status === 'Pending' && (
                  <>
                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: r.public_id, status: 'Approved' })}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => updateStatusMutation.mutate({ id: r.public_id, status: 'Cancelled' })}>
                      <XCircle className="mr-2 h-4 w-4" /> Cancel
                    </DropdownMenuItem>
                  </>
                )}
                {r.status === 'Approved' && (
                  <DropdownMenuItem onClick={() => { if (confirm('Release refund? This will post a negative payment.')) updateStatusMutation.mutate({ id: r.public_id, status: 'Released' }); }}>
                    <ArrowRightCircle className="mr-2 h-4 w-4" /> Release
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Refunds</h1>
          <p className="text-muted-foreground">Manage student refund requests</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Refund
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        page={page}
        pageCount={data?.last_page ?? 1}
        onPageChange={setPage}
        total={data?.total}
        from={data?.from}
        to={data?.to}
        pageSize={pageSize}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        getRowId={(row) => row.public_id}
        noResultsMessage="No refund requests found."
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <DataTableFilterButton activeCount={statusFilter ? 1 : 0} onClick={() => setFilterOpen(true)} />
          </div>
        }
      />

      <DataTableFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeCount={statusFilter ? 1 : 0}
        onReset={() => { setStatusFilter(''); setPage(1); }}
      >
        <div className="space-y-1">
          <Label className="text-sm font-medium">Status</Label>
          <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : (v ?? '')); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Released">Released</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Refund Request</DialogTitle>
            <DialogDescription>Create a refund request for a student</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Student Public ID</Label>
              <Input
                value={regId}
                onChange={(e) => setRegId(e.target.value)}
                placeholder="Enter student public ID"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category Public ID</Label>
                <Input
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  placeholder="Fee category"
                />
              </div>
              <div className="space-y-2">
                <Label>Refund Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amtExcess}
                  onChange={(e) => setAmtExcess(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !regId || !categoryId || !amtExcess}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
