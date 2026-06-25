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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Loader2, Plus, Pencil, Trash2, Search,
  ArrowDownToLine, ArrowUpFromLine, History, Tags, MoreVertical, Printer, Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DataTableFilterButton, DataTableFilterSheet } from '@/components/ui/data-table-filter-sheet';
import type { ColumnDef } from '@tanstack/react-table';

type Category = {
  id: number; public_id: string; name: string; default_unit: string; items_count: number;
  gl_asset_account_id: number | null;
  gl_expense_account_id: number | null;
};
type CoaAccount = { coa_id: number; account_code: string; account_name: string; account_type: string };
type ConsumableItem = {
  id: number; public_id: string; name: string; unit: string;
  quantity_on_hand: number; reorder_point: number;
  location: string | null;
  category: Category | null;
};
type TxRow = {
  id: number; type: string; quantity: number; reference_no: string | null;
  remarks: string | null; transacted_at: string;
  performer: { fname: string; lname: string } | null;
};

// ── Category management dialog ───────────────────────────────────
function CategoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const BLANK = { name: '', default_unit: 'pcs', gl_asset_account_id: '', gl_expense_account_id: '' };
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const { data: catData, isLoading: catsLoading } = useQuery<{ data: Category[] }>({
    queryKey: ['consumable-categories'],
    queryFn: () => api.get('/custodian/consumable-categories').then(r => r.data),
    enabled: open,
  });

  const { data: coaData } = useQuery<CoaAccount[]>({
    queryKey: ['coa-flat'],
    queryFn: () => api.get('/custodian/chart-of-accounts', { params: { flat: 1, active_only: 1 } }).then(r => r.data),
    enabled: open,
  });

  const cats = catData?.data ?? [];
  const accounts = coaData ?? [];

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        default_unit: form.default_unit || 'pcs',
        gl_asset_account_id: form.gl_asset_account_id ? parseInt(form.gl_asset_account_id) : null,
        gl_expense_account_id: form.gl_expense_account_id ? parseInt(form.gl_expense_account_id) : null,
      };
      return editId
        ? api.put(`/custodian/consumable-categories/${editId}`, body)
        : api.post('/custodian/consumable-categories', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consumable-categories'] });
      toast.success(editId ? 'Category updated.' : 'Category added.');
      setForm(BLANK); setEditId(null);
    },
    onError: () => toast.error('Save failed.'),
  });

  const delMutation = useMutation({
    mutationFn: (pid: string) => api.delete(`/custodian/consumable-categories/${pid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['consumable-categories'] }); toast.success('Deleted.'); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Cannot delete.'),
  });

  function startEdit(c: Category) {
    setEditId(c.public_id);
    setForm({
      name: c.name,
      default_unit: c.default_unit,
      gl_asset_account_id: c.gl_asset_account_id ? String(c.gl_asset_account_id) : '',
      gl_expense_account_id: c.gl_expense_account_id ? String(c.gl_expense_account_id) : '',
    });
  }

  function CoaSelect({ field, label }: { field: 'gl_asset_account_id' | 'gl_expense_account_id'; label: string }) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{label}</Label>
        <Select value={form[field]} onValueChange={v => set(field, v === '__none__' ? '' : (v ?? ''))}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="— Not linked —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Not linked —</SelectItem>
            {accounts.map(a => (
              <SelectItem key={a.coa_id} value={String(a.coa_id)}>
                {a.account_code} — {a.account_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setForm(BLANK); setEditId(null); } }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Manage Consumable Categories</DialogTitle>
          <DialogDescription>Add or update categories and link GL accounts for automatic journal entries.</DialogDescription>
        </DialogHeader>

        {/* Existing categories */}
        <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
          {catsLoading
            ? <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            : cats.length === 0
              ? <p className="text-sm text-muted-foreground italic text-center py-4">No categories yet.</p>
              : cats.map(c => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{c.name}</span>
                    <span className="ml-2 text-muted-foreground text-xs">{c.default_unit} · {c.items_count} items</span>
                    {(c.gl_asset_account_id || c.gl_expense_account_id) && (
                      <span className="ml-2 text-xs text-green-700 font-medium">GL linked</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEdit(c)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      disabled={c.items_count > 0}
                      onClick={() => { if (confirm(`Delete "${c.name}"?`)) delMutation.mutate(c.public_id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
          }
        </div>

        {/* Add/edit form */}
        <div className="border rounded-md p-3 space-y-3 bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {editId ? 'Edit Category' : 'New Category'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
              <Input className="h-8 text-sm" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Default Unit</Label>
              <Input className="h-8 text-sm" value={form.default_unit} onChange={e => set('default_unit', e.target.value)} placeholder="pcs / reams / boxes" />
            </div>
          </div>
          {accounts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">GL Accounts (optional — enables automatic journal entries)</p>
              <div className="grid grid-cols-2 gap-3">
                <CoaSelect field="gl_asset_account_id" label="Supplies Inventory Account (Asset)" />
                <CoaSelect field="gl_expense_account_id" label="Supplies Expense Account" />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            {editId && (
              <Button size="sm" variant="ghost" onClick={() => { setForm(BLANK); setEditId(null); }}>Cancel</Button>
            )}
            <Button size="sm" disabled={saveMutation.isPending || !form.name} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {editId ? 'Save Changes' : 'Add Category'}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setForm(BLANK); setEditId(null); }}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Stock Transaction dialog (in or out) ─────────────────────────
function StockDialog({
  open, item, type, onClose,
}: { open: boolean; item: ConsumableItem | null; type: 'in' | 'out'; onClose: () => void }) {
  const qc = useQueryClient();
  const [qty, setQty] = useState('');
  const [ref, setRef] = useState('');
  const [remarks, setRemarks] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/custodian/consumables/${item!.public_id}/stock-${type}`, {
        quantity: parseInt(qty, 10),
        reference_no: ref || null,
        remarks: remarks || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consumable-items'] });
      toast.success(type === 'in' ? 'Stock added.' : 'Stock issued.');
      onClose(); setQty(''); setRef(''); setRemarks('');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Failed.'),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{type === 'in' ? 'Stock In' : 'Issue / Stock Out'}</DialogTitle>
          <DialogDescription>{item?.name} — Current: {item?.quantity_on_hand} {item?.unit}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Quantity <span className="text-destructive">*</span></Label>
            <Input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div className="space-y-1.5"><Label>Reference No.</Label><Input value={ref} onChange={e => setRef(e.target.value)} placeholder="PO/RIS/etc." /></div>
          <div className="space-y-1.5"><Label>Remarks</Label><Textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant={type === 'out' ? 'destructive' : 'default'}
            disabled={mutation.isPending || !qty || parseInt(qty) < 1}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {type === 'in' ? 'Add Stock' : 'Issue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Transaction history sheet ─────────────────────────────────────
function TxSheet({ item, open, onClose }: { item: ConsumableItem | null; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useQuery<{ data: TxRow[]; meta: { current_page: number; last_page: number } }>({
    queryKey: ['consumable-tx', item?.public_id],
    queryFn: () => api.get(`/custodian/consumables/${item!.public_id}/transactions`).then(r => r.data),
    enabled: !!item,
  });

  const txColor: Record<string, string> = { in: 'text-green-700', out: 'text-red-700', adjustment: 'text-blue-700' };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4"><SheetTitle>Transaction History — {item?.name}</SheetTitle></SheetHeader>
        {isLoading
          ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          : (data?.data ?? []).length === 0
            ? <p className="text-sm text-muted-foreground italic text-center py-10">No transactions yet.</p>
            : (
              <div className="divide-y">
                {(data?.data ?? []).map(tx => (
                  <div key={tx.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold text-sm uppercase ${txColor[tx.type] ?? ''}`}>{tx.type}</span>
                      <span className={`text-sm font-bold ${txColor[tx.type] ?? ''}`}>
                        {tx.type === 'out' ? '−' : '+'}{tx.quantity}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.transacted_at), 'MMM d, yyyy hh:mm a')}
                      {tx.performer && ` · ${tx.performer.fname} ${tx.performer.lname}`}
                    </p>
                    {tx.reference_no && <p className="text-xs text-muted-foreground">Ref: {tx.reference_no}</p>}
                    {tx.remarks && <p className="text-xs mt-0.5 text-muted-foreground italic">{tx.remarks}</p>}
                  </div>
                ))}
              </div>
            )
        }
      </SheetContent>
    </Sheet>
  );
}

// ── Add/Edit item dialog ──────────────────────────────────────────
function ItemDialog({
  open, item, categories, onClose,
}: { open: boolean; item: ConsumableItem | null; categories: Category[]; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!item;
  const [form, setForm] = useState({
    name: item?.name ?? '', category_id: String(item?.category?.id ?? ''),
    unit: item?.unit ?? 'pcs', quantity_on_hand: String(item?.quantity_on_hand ?? 0),
    reorder_point: String(item?.reorder_point ?? 5), location: item?.location ?? '', description: '',
  });
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name, category_id: form.category_id || null, unit: form.unit || 'pcs',
        reorder_point: parseInt(form.reorder_point, 10) || 5,
        location: form.location || null, description: form.description || null,
        ...(isEdit ? {} : { quantity_on_hand: parseInt(form.quantity_on_hand, 10) || 0 }),
      };
      return isEdit ? api.put(`/custodian/consumables/${item!.public_id}`, body) : api.post('/custodian/consumables', body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['consumable-items'] }); toast.success(isEdit ? 'Updated.' : 'Added.'); onClose(); },
    onError: () => toast.error('Save failed.'),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Item' : 'Add Consumable Item'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5"><Label>Item Name <span className="text-destructive">*</span></Label><Input value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={v => set('category_id', v != null && v !== '__none__' ? v : '')}>
                <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Unit of Measure</Label><Input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="pcs / reams / boxes" /></div>
          </div>
          {!isEdit && (
            <div className="space-y-1.5"><Label>Opening Quantity</Label><Input type="number" min={0} value={form.quantity_on_hand} onChange={e => set('quantity_on_hand', e.target.value)} /></div>
          )}
          <div className="space-y-1.5"><Label>Reorder Point</Label><Input type="number" min={0} value={form.reorder_point} onChange={e => set('reorder_point', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Storage Location</Label><Input value={form.location} onChange={e => set('location', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={1} value={form.description} onChange={e => set('description', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={mutation.isPending || !form.name} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {isEdit ? 'Save' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function CustodianConsumablesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ConsumableItem | null>(null);
  const [stockItem, setStockItem] = useState<ConsumableItem | null>(null);
  const [stockType, setStockType] = useState<'in' | 'out'>('in');
  const [txItem, setTxItem] = useState<ConsumableItem | null>(null);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: catData } = useQuery<{ data: Category[] }>({
    queryKey: ['consumable-categories'],
    queryFn: () => api.get('/custodian/consumable-categories').then(r => r.data),
  });

  const { data, isLoading } = useQuery<{
    data: ConsumableItem[];
    meta: { current_page: number; last_page: number; total: number; per_page: number };
  }>({
    queryKey: ['consumable-items', search, lowStockOnly, page, pageSize],
    queryFn: () => api.get('/custodian/consumables', {
      params: { search: search || undefined, low_stock: lowStockOnly ? 1 : undefined, page, per_page: pageSize },
    }).then(r => r.data),
  });

  const del = useMutation({
    mutationFn: (pid: string) => api.delete(`/custodian/consumables/${pid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['consumable-items'] }); toast.success('Deleted.'); },
    onError: () => toast.error('Delete failed.'),
  });

  const items = data?.data ?? [];
  const meta  = data?.meta;
  const categories = catData?.data ?? [];

  const activeFilterCount = [lowStockOnly ? 'low' : ''].filter(Boolean).length;

  const columns: ColumnDef<ConsumableItem>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item" />,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.unit}</p>
        </div>
      ),
    },
    {
      id: 'category',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      accessorFn: (row) => row.category?.name ?? '',
      cell: ({ row }) => <span className="text-sm">{row.original.category?.name ?? '—'}</span>,
    },
    {
      accessorKey: 'quantity_on_hand',
      header: ({ column }) => <DataTableColumnHeader column={column} title="On Hand" />,
      cell: ({ row }) => {
        const item = row.original;
        const isLow = item.quantity_on_hand <= item.reorder_point;
        return (
          <Badge variant={isLow ? 'destructive' : 'default'} className="text-xs">
            {item.quantity_on_hand} {item.unit}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'reorder_point',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reorder Point" />,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.reorder_point} {row.original.unit}</span>,
    },
    {
      accessorKey: 'location',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
      cell: ({ row }) => <span className="text-sm">{row.original.location ?? '—'}</span>,
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
                <DropdownMenuItem onClick={() => { setStockItem(item); setStockType('in'); }}>
                  <ArrowDownToLine className="mr-2 h-4 w-4 text-green-600" /> Stock In
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setStockItem(item); setStockType('out'); }}>
                  <ArrowUpFromLine className="mr-2 h-4 w-4 text-orange-600" /> Issue / Stock Out
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTxItem(item)}>
                  <History className="mr-2 h-4 w-4" /> History
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setEditItem(item); setDialogOpen(true); }}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
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
      <html><head><title>Consumables</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        h2 { margin-bottom: 4px; } p { margin-top: 0; color: #666; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h2>Consumables Inventory</h2>
      <p>${lowStockOnly ? 'Low stock only' : 'All items'}</p>
      <table>
        <thead><tr><th>Item</th><th>Category</th><th>On Hand</th><th>Reorder Point</th><th>Location</th></tr></thead>
        <tbody>${items.map(item => `<tr>
          <td>${item.name} (${item.unit})</td>
          <td>${item.category?.name ?? '—'}</td>
          <td>${item.quantity_on_hand}</td>
          <td>${item.reorder_point}</td>
          <td>${item.location ?? '—'}</td>
        </tr>`).join('')}</tbody>
      </table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (lowStockOnly) params.set('low_stock', '1');
    window.open(`${import.meta.env.VITE_API_URL || '/api'}/custodian/consumables/export?${params}`, '_blank');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consumables</h1>
          <p className="text-muted-foreground">Manage supply inventory, stock-in, and issuance</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => setCatDialogOpen(true)}><Tags className="mr-2 h-4 w-4" /> Categories</Button>
          <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
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
                  <Input className="pl-9" placeholder="Search items…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
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
        onReset={() => { setLowStockOnly(false); setPage(1); }}
      >
        <div className="space-y-1">
          <Label className="text-sm font-medium">Stock Level</Label>
          <Select value={lowStockOnly ? 'low' : 'all'} onValueChange={(v) => { setLowStockOnly(v === 'low'); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="low">Low Stock Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      <CategoryDialog open={catDialogOpen} onClose={() => setCatDialogOpen(false)} />
      <ItemDialog open={dialogOpen} item={editItem} categories={categories} onClose={() => { setDialogOpen(false); setEditItem(null); }} />
      <StockDialog open={!!stockItem} item={stockItem} type={stockType} onClose={() => setStockItem(null)} />
      <TxSheet item={txItem} open={!!txItem} onClose={() => setTxItem(null)} />
    </div>
  );
}
