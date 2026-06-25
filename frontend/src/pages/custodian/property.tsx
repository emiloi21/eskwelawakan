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
import {
  Loader2, Plus, Pencil, Trash2, Search, TrendingDown, MoreVertical, Printer, Download,
} from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DataTableFilterButton, DataTableFilterSheet } from '@/components/ui/data-table-filter-sheet';
import type { ColumnDef } from '@tanstack/react-table';

type Category = {
  id: number; public_id: string; name: string; description: string | null; items_count: number;
  gl_asset_account_id: number | null;
  gl_accum_depr_account_id: number | null;
  gl_depr_expense_account_id: number | null;
};
type CoaAccount = { coa_id: number; account_code: string; account_name: string; account_type: string };
type PropertyItem = {
  id: number; public_id: string; property_no: string; name: string;
  category: Category | null;
  brand: string | null; model: string | null; serial_no: string | null;
  condition: string; status: string;
  location: string | null; date_acquired: string | null;
  acquisition_cost: string | null; useful_life_years: number | null;
  depreciation_method: string | null; salvage_value: string | null;
  accumulated_depreciation: string | null; last_depreciation_date: string | null;
  assigned_to: string | null; remarks: string | null;
};

const CONDITIONS = ['Good', 'Fair', 'Poor', 'Condemned'] as const;
const STATUSES   = ['Active', 'In Repair', 'Disposed', 'Lost'] as const;

const conditionColor: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Good: 'default', Fair: 'outline', Poor: 'secondary', Condemned: 'destructive',
};
const statusColor: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Active: 'default', 'In Repair': 'outline', Disposed: 'secondary', Lost: 'destructive',
};

// ── Property Item Dialog ──────────────────────────────────────────
function PropertyDialog({
  open, item, categories, onClose,
}: { open: boolean; item: PropertyItem | null; categories: Category[]; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!item;
  type F = {
    property_no: string; name: string; category_id: string;
    brand: string; model: string; serial_no: string;
    condition: string; status: string; location: string;
    date_acquired: string; acquisition_cost: string; useful_life_years: string;
    depreciation_method: string; salvage_value: string;
    assigned_to: string; remarks: string;
  };
  const [form, setForm] = useState<F>({
    property_no: item?.property_no ?? '', name: item?.name ?? '',
    category_id: String(item?.category?.id ?? ''),
    brand: item?.brand ?? '', model: item?.model ?? '', serial_no: item?.serial_no ?? '',
    condition: item?.condition ?? 'Good', status: item?.status ?? 'Active',
    location: item?.location ?? '', date_acquired: item?.date_acquired ?? '',
    acquisition_cost: item?.acquisition_cost ?? '', useful_life_years: String(item?.useful_life_years ?? ''),
    depreciation_method: item?.depreciation_method ?? 'Straight-Line',
    salvage_value: item?.salvage_value ?? '0',
    assigned_to: item?.assigned_to ?? '', remarks: item?.remarks ?? '',
  });
  const set = (k: keyof F, v: string) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        category_id: form.category_id || null,
        brand: form.brand || null, model: form.model || null, serial_no: form.serial_no || null,
        location: form.location || null, date_acquired: form.date_acquired || null,
        acquisition_cost: form.acquisition_cost || null,
        useful_life_years: form.useful_life_years || null,
        depreciation_method: form.depreciation_method || null,
        salvage_value: form.salvage_value || null,
        assigned_to: form.assigned_to || null, remarks: form.remarks || null,
      };
      return isEdit
        ? api.put(`/custodian/property/${item!.public_id}`, body)
        : api.post('/custodian/property', body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['property-items'] }); toast.success(isEdit ? 'Updated.' : 'Added.'); onClose(); },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Save failed.'),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Property Item' : 'Add Property Item'}</DialogTitle>
          <DialogDescription>Record a fixed asset or school property.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Property No. / Tag <span className="text-destructive">*</span></Label>
              <Input value={form.property_no} onChange={e => set('property_no', e.target.value)} placeholder="PROP-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={v => set('category_id', (v ?? '') === '__none__' ? '' : (v ?? ''))}>
                <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Item Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Projector" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Brand</Label><Input value={form.brand} onChange={e => set('brand', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Model</Label><Input value={form.model} onChange={e => set('model', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Serial No.</Label><Input value={form.serial_no} onChange={e => set('serial_no', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Condition <span className="text-destructive">*</span></Label>
              <Select value={form.condition} onValueChange={v => set('condition', v ?? 'Good')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status <span className="text-destructive">*</span></Label>
              <Select value={form.status} onValueChange={v => set('status', v ?? 'Active')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Location / Room</Label><Input value={form.location} onChange={e => set('location', e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Date Acquired</Label><Input type="date" value={form.date_acquired} onChange={e => set('date_acquired', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Acquisition Cost (₱)</Label><Input type="number" min={0} value={form.acquisition_cost} onChange={e => set('acquisition_cost', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Useful Life (yrs)</Label><Input type="number" min={1} value={form.useful_life_years} onChange={e => set('useful_life_years', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Depreciation Method</Label>
              <Select value={form.depreciation_method} onValueChange={v => set('depreciation_method', v ?? 'None')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Straight-Line">Straight-Line</SelectItem>
                  <SelectItem value="Double-Declining">Double-Declining Balance</SelectItem>
                  <SelectItem value="None">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Salvage Value (₱)</Label><Input type="number" min={0} value={form.salvage_value} onChange={e => set('salvage_value', e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Assigned To</Label><Input value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} placeholder="Person or department" /></div>
          <div className="space-y-1.5"><Label>Remarks</Label><Textarea rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={mutation.isPending || !form.property_no || !form.name} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Category manager ──────────────────────────────────────────────
function CategoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', description: '',
    gl_asset_account_id: '', gl_accum_depr_account_id: '', gl_depr_expense_account_id: '',
  });

  const { data: coaData } = useQuery<{ data: CoaAccount[] }>({
    queryKey: ['coa-flat-custodian'],
    queryFn: () => api.get('/custodian/chart-of-accounts', { params: { flat: 1, active_only: 1 } }).then(r => r.data),
    enabled: open,
  });
  const accounts = coaData?.data ?? [];

  const save = useMutation({
    mutationFn: () => api.post('/custodian/property-categories', {
      name: form.name,
      description: form.description || null,
      gl_asset_account_id: form.gl_asset_account_id ? parseInt(form.gl_asset_account_id) : null,
      gl_accum_depr_account_id: form.gl_accum_depr_account_id ? parseInt(form.gl_accum_depr_account_id) : null,
      gl_depr_expense_account_id: form.gl_depr_expense_account_id ? parseInt(form.gl_depr_expense_account_id) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['property-categories'] });
      setForm({ name: '', description: '', gl_asset_account_id: '', gl_accum_depr_account_id: '', gl_depr_expense_account_id: '' });
      toast.success('Category added.');
    },
    onError: () => toast.error('Save failed.'),
  });
  const { data } = useQuery<{ data: Category[] }>({
    queryKey: ['property-categories'],
    queryFn: () => api.get('/custodian/property-categories').then(r => r.data),
  });
  const remove = useMutation({
    mutationFn: (pid: string) => api.delete(`/custodian/property-categories/${pid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['property-categories'] }); toast.success('Deleted.'); },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Delete failed.'),
  });
  const cats = data?.data ?? [];

  const CoaSelect = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
    <Select value={value} onValueChange={v => onChange((v ?? '') === '__none__' ? '' : (v ?? ''))}>
      <SelectTrigger className="text-xs h-8"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">— None —</SelectItem>
        {accounts.map(a => (
          <SelectItem key={a.coa_id} value={String(a.coa_id)}>
            {a.account_code} · {a.account_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Property Categories</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>New Category Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={1} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          {accounts.length > 0 && (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">GL Accounts (optional)</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Asset Account</Label>
                <CoaSelect value={form.gl_asset_account_id} onChange={v => setForm(f => ({ ...f, gl_asset_account_id: v }))} placeholder="— Asset account —" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Accum. Depreciation Account</Label>
                <CoaSelect value={form.gl_accum_depr_account_id} onChange={v => setForm(f => ({ ...f, gl_accum_depr_account_id: v }))} placeholder="— Accum. depr. account —" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Depreciation Expense Account</Label>
                <CoaSelect value={form.gl_depr_expense_account_id} onChange={v => setForm(f => ({ ...f, gl_depr_expense_account_id: v }))} placeholder="— Depr. expense account —" />
              </div>
            </div>
          )}
          <Button className="w-full" disabled={save.isPending || !form.name} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Add Category
          </Button>
          <div className="divide-y rounded-md border mt-3 max-h-48 overflow-y-auto">
            {cats.map(c => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{c.name} <span className="text-muted-foreground text-xs">({c.items_count})</span></span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => remove.mutate(c.public_id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function CustodianPropertyPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<PropertyItem | null>(null);
  const [depreciateItem, setDepreciateItem] = useState<PropertyItem | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: catData } = useQuery<{ data: Category[] }>({
    queryKey: ['property-categories'],
    queryFn: () => api.get('/custodian/property-categories').then(r => r.data),
  });

  const { data, isLoading } = useQuery<{
    data: PropertyItem[];
    meta: { current_page: number; last_page: number; total: number; per_page: number };
  }>({
    queryKey: ['property-items', search, statusFilter, conditionFilter, page, pageSize],
    queryFn: () => api.get('/custodian/property', {
      params: {
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        condition: conditionFilter !== 'all' ? conditionFilter : undefined,
        page, per_page: pageSize,
      },
    }).then(r => r.data),
  });

  const del = useMutation({
    mutationFn: (pid: string) => api.delete(`/custodian/property/${pid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['property-items'] }); toast.success('Deleted.'); },
    onError: () => toast.error('Delete failed.'),
  });

  const depreciateMutation = useMutation({
    mutationFn: (pid: string) => api.post(`/custodian/property/${pid}/depreciate`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['property-items'] });
      toast.success(`Depreciation posted: ₱${res.data.charged.toLocaleString()}`);
      setDepreciateItem(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Depreciation failed.'),
  });

  const items = data?.data ?? [];
  const meta  = data?.meta;
  const categories = catData?.data ?? [];

  const activeFilterCount = [
    conditionFilter !== 'all' ? conditionFilter : '',
    statusFilter !== 'all' ? statusFilter : '',
  ].filter(Boolean).length;

  const columns: ColumnDef<PropertyItem>[] = useMemo(() => [
    {
      accessorKey: 'property_no',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Property No." />,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.property_no}</span>,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div>
            <p className="font-medium text-sm">{item.name}</p>
            {(item.brand || item.model) && <p className="text-xs text-muted-foreground">{[item.brand, item.model].filter(Boolean).join(' · ')}</p>}
            {item.accumulated_depreciation && parseFloat(item.accumulated_depreciation) > 0 && (
              <p className="text-xs text-amber-600">Accum. Depr: ₱{parseFloat(item.accumulated_depreciation).toLocaleString()}</p>
            )}
          </div>
        );
      },
    },
    {
      id: 'category',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      accessorFn: (row) => row.category?.name ?? '',
      cell: ({ row }) => <span className="text-sm">{row.original.category?.name ?? '—'}</span>,
    },
    {
      accessorKey: 'location',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
      cell: ({ row }) => <span className="text-sm">{row.original.location ?? '—'}</span>,
    },
    {
      accessorKey: 'condition',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Condition" />,
      cell: ({ row }) => (
        <Badge variant={conditionColor[row.original.condition] ?? 'outline'} className="text-xs">{row.original.condition}</Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={statusColor[row.original.status] ?? 'outline'} className="text-xs">{row.original.status}</Badge>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {item.category?.gl_accum_depr_account_id && item.depreciation_method !== 'None' && (
                  <DropdownMenuItem onClick={() => setDepreciateItem(item)}>
                    <TrendingDown className="mr-2 h-4 w-4" /> Post Depreciation
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => { setEditItem(item); setDialogOpen(true); }}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => { if (confirm(`Delete "${item.name}"?`)) del.mutate(item.public_id); }}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [del]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Fixed Assets</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        h2 { margin-bottom: 4px; } p { margin-top: 0; color: #666; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h2>Fixed Assets</h2>
      <p>Condition: ${conditionFilter !== 'all' ? conditionFilter : 'All'} | Status: ${statusFilter !== 'all' ? statusFilter : 'All'}</p>
      <table>
        <thead><tr><th>Property No.</th><th>Name</th><th>Category</th><th>Location</th><th>Condition</th><th>Status</th></tr></thead>
        <tbody>${items.map(item => `<tr>
          <td>${item.property_no}</td>
          <td>${item.name}</td>
          <td>${item.category?.name ?? '—'}</td>
          <td>${item.location ?? '—'}</td>
          <td>${item.condition}</td>
          <td>${item.status}</td>
        </tr>`).join('')}</tbody>
      </table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (conditionFilter !== 'all') params.set('condition', conditionFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    window.open(`${import.meta.env.VITE_API_URL || '/api'}/custodian/property/export?${params}`, '_blank');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fixed Assets</h1>
          <p className="text-muted-foreground">School property inventory and condition tracking</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => setCatDialogOpen(true)}>Categories</Button>
          <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Property
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={items}
            isLoading={isLoading}
            noResultsMessage="No items found."
            page={page}
            onPageChange={setPage}
            from={meta ? (meta.current_page - 1) * meta.per_page + 1 : null}
            to={meta ? Math.min(meta.current_page * meta.per_page, meta.total) : null}
            total={meta?.total ?? 0}
            pageSize={pageSize}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            getRowId={(row) => row.public_id}
            toolbar={
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search by name, tag, brand…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
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
        onReset={() => { setConditionFilter('all'); setStatusFilter('all'); setPage(1); }}
      >
        <div className="space-y-1">
          <Label className="text-sm font-medium">Condition</Label>
          <Select value={conditionFilter} onValueChange={(v) => { setConditionFilter(v ?? 'all'); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? 'all'); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      <PropertyDialog open={dialogOpen} item={editItem} categories={categories} onClose={() => { setDialogOpen(false); setEditItem(null); }} />
      <CategoryDialog open={catDialogOpen} onClose={() => setCatDialogOpen(false)} />

      {/* Depreciation confirm dialog */}
      <Dialog open={!!depreciateItem} onOpenChange={o => { if (!o) setDepreciateItem(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Post Monthly Depreciation</DialogTitle>
            <DialogDescription>
              Post one month of depreciation for <strong>{depreciateItem?.name}</strong>?
              {depreciateItem?.depreciation_method && (
                <span> Method: {depreciateItem.depreciation_method}.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepreciateItem(null)}>Cancel</Button>
            <Button
              disabled={depreciateMutation.isPending}
              onClick={() => depreciateItem && depreciateMutation.mutate(depreciateItem.public_id)}
            >
              {depreciateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post Depreciation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
