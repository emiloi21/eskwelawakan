import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DataTableFilterButton, DataTableFilterSheet } from '@/components/ui/data-table-filter-sheet';
import { toast } from 'sonner';
import { Loader2, Plus, ShoppingCart, Search, X } from 'lucide-react';
import { format } from 'date-fns';

type ConsumableItem = { id: number; public_id: string; name: string; unit: string; quantity_on_hand: number };
type RequestItem = { item_id: number | null; item_name: string; unit: string; quantity_requested: number; remarks: string };
type SupplyRequestRow = {
  id: number; public_id: string; status: string; purpose: string | null;
  created_at: string; reviewer_remarks: string | null;
  reviewer: { fname: string; lname: string } | null;
  items: Array<{ id: number; item_name: string; unit: string; quantity_requested: number; quantity_fulfilled: number }>;
};

const STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected', 'Fulfilled', 'Cancelled'];

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending: 'secondary', Approved: 'default', Rejected: 'destructive',
  Fulfilled: 'default', Cancelled: 'outline',
};

// ── New Request Dialog ────────────────────────────────────────────
function NewRequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<RequestItem[]>([
    { item_id: null, item_name: '', unit: 'pcs', quantity_requested: 1, remarks: '' },
  ]);

  const { data: consumablesData } = useQuery<{ data: ConsumableItem[] }>({
    queryKey: ['consumables-list'],
    queryFn: () => api.get('/custodian/consumables').then(r => r.data),
    enabled: open,
  });
  const consumables = consumablesData?.data ?? [];

  const setItem = (idx: number, patch: Partial<RequestItem>) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const addRow = () => setItems(prev => [...prev, { item_id: null, item_name: '', unit: 'pcs', quantity_requested: 1, remarks: '' }]);
  const removeRow = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const mutation = useMutation({
    mutationFn: () => api.post('/supply-requests', { purpose: purpose || null, notes: notes || null, items }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-supply-requests'] });
      toast.success('Supply request submitted.');
      onClose(); setPurpose(''); setNotes('');
      setItems([{ item_id: null, item_name: '', unit: 'pcs', quantity_requested: 1, remarks: '' }]);
    },
    onError: () => toast.error('Submission failed.'),
  });

  const valid = items.every(it => it.item_name.trim() && it.quantity_requested >= 1);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Supply Request</DialogTitle>
          <DialogDescription>Request consumable supplies from the Custodian office.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Purpose</Label>
              <Input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Classroom needs" />
            </div>
            <div className="space-y-1.5">
              <Label>Additional Notes</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Requested Items</Label>
              <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-3.5 w-3.5 mr-1" /> Add Item</Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select
                        value={it.item_id ? String(it.item_id) : '__manual__'}
                        onValueChange={v => {
                          if (v === '__manual__') { setItem(idx, { item_id: null, item_name: '' }); return; }
                          const found = consumables.find(c => c.id === parseInt(v ?? ''));
                          if (found) setItem(idx, { item_id: found.id, item_name: found.name, unit: found.unit });
                        }}
                      >
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select item or type below…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__manual__">— Type manually —</SelectItem>
                          {consumables.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.quantity_on_hand} {c.unit} available)</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {items.length > 1 && (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => removeRow(idx)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Item Name *</Label>
                      <Input className="h-8 text-sm" value={it.item_name} onChange={e => setItem(idx, { item_name: e.target.value })} placeholder="Bond paper, chalk…" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unit</Label>
                      <Input className="h-8 text-sm" value={it.unit} onChange={e => setItem(idx, { unit: e.target.value })} placeholder="pcs/reams/boxes" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Quantity *</Label>
                      <Input className="h-8 text-sm" type="number" min={1} value={it.quantity_requested} onChange={e => setItem(idx, { quantity_requested: parseInt(e.target.value) || 1 })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Remarks</Label>
                    <Input className="h-8 text-sm" value={it.remarks} onChange={e => setItem(idx, { remarks: e.target.value })} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={mutation.isPending || !valid} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page (Personnel / Staff view) ───────────────────────────
export default function MySupplyRequestsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useQuery<{
    data: SupplyRequestRow[];
    meta: { current_page: number; last_page: number; total: number; from: number; to: number };
  }>({
    queryKey: ['my-supply-requests', statusFilter, page, pageSize],
    queryFn: () => api.get('/supply-requests/my', {
      params: { status: statusFilter || undefined, page, per_page: pageSize },
    }).then(r => r.data),
  });

  const cancel = useMutation({
    mutationFn: (pid: string) => api.delete(`/supply-requests/${pid}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-supply-requests'] }); toast.success('Request cancelled.'); },
    onError: () => toast.error('Cancel failed.'),
  });

  const requests = data?.data ?? [];
  const meta = data?.meta;

  // Client-side search filter on purpose
  const filtered = search
    ? requests.filter(r => (r.purpose ?? '').toLowerCase().includes(search.toLowerCase())
        || r.items.some(it => it.item_name.toLowerCase().includes(search.toLowerCase())))
    : requests;

  const columns: ColumnDef<SupplyRequestRow>[] = [
    {
      accessorKey: 'purpose',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Purpose" />,
      cell: ({ row }) => <span className="text-sm">{row.original.purpose ?? '—'}</span>,
    },
    {
      id: 'items',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Items" />,
      cell: ({ row }) => (
        <ul className="text-xs space-y-0.5">
          {row.original.items.map((it, i) => (
            <li key={i}>
              {it.item_name} × {it.quantity_requested} {it.unit}
              {row.original.status === 'Fulfilled' && (
                <span className="text-green-700 ml-1">(fulfilled: {it.quantity_fulfilled})</span>
              )}
            </li>
          ))}
        </ul>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.status] ?? 'outline'} className="text-xs">
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.original.created_at), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      accessorKey: 'reviewer_remarks',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Remarks" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground italic">{row.original.reviewer_remarks ?? '—'}</span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => row.original.status === 'Pending' ? (
        <div className="flex justify-end">
          <Button
            size="sm" variant="ghost" className="h-7 text-destructive"
            onClick={() => { if (confirm('Cancel this request?')) cancel.mutate(row.original.public_id); }}
          >
            Cancel
          </Button>
        </div>
      ) : null,
      meta: { className: 'text-right' },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supply Requests</h1>
          <p className="text-muted-foreground">Request school supplies from the Custodian office</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <ShoppingCart className="mr-2 h-4 w-4" /> New Request
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        page={page}
        pageCount={meta?.last_page ?? 1}
        onPageChange={setPage}
        total={meta?.total}
        from={meta?.from}
        to={meta?.to}
        pageSize={pageSize}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        getRowId={(row) => row.public_id}
        noResultsMessage="No supply requests yet."
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search purpose or item..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <DataTableFilterButton
              activeCount={[statusFilter].filter(Boolean).length}
              onClick={() => setFilterOpen(true)}
            />
          </div>
        }
      />

      <DataTableFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeCount={[statusFilter].filter(Boolean).length}
        onReset={() => { setStatusFilter(''); setPage(1); }}
      >
        <div className="space-y-1">
          <Label className="text-sm font-medium">Status</Label>
          <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : (v ?? '')); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      <NewRequestDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

