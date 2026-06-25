import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DataTableFilterButton, DataTableFilterSheet } from '@/components/ui/data-table-filter-sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Search, MoreVertical, Printer, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──

interface COAccount {
  coa_id: number;
  public_id: string;
  account_code: string;
  account_name: string;
  account_type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  code_prefix: string | null;
  code_number: string | null;
  code_suffix: string | null;
  parent_id: number | null;
  description: string | null;
  is_active: boolean;
  is_header: boolean;
  is_system: boolean;
  children?: COAccount[];
}

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] as const;

const TYPE_COLORS: Record<string, string> = {
  Asset: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  Liability: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  Equity: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  Revenue: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  Expense: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

interface FlatCOAccount extends COAccount {
  depth: number;
  hasChildren: boolean;
}

function flattenTree(nodes: COAccount[], expandedSet: Set<string>, depth = 0): FlatCOAccount[] {
  const result: FlatCOAccount[] = [];
  for (const node of nodes) {
    const hasChildren = !!(node.children && node.children.length > 0);
    result.push({ ...node, depth, hasChildren });
    if (hasChildren && expandedSet.has(node.public_id)) {
      result.push(...flattenTree(node.children!, expandedSet, depth + 1));
    }
  }
  return result;
}

const emptyForm = {
  account_code: '', account_name: '', account_type: '' as string,
  code_prefix: '', code_number: '', code_suffix: '',
  parent_id: null as number | null, description: '', is_header: false,
};

function buildCode(prefix: string, number: string, suffix: string): string {
  const parts = [prefix, number, suffix].filter(Boolean);
  return parts.join('-');
}

export default function ChartOfAccountsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filterOpen, setFilterOpen] = useState(false);

  // ── Queries ──
  const { data: treeData, isLoading } = useQuery<COAccount[]>({
    queryKey: ['coa-tree'],
    queryFn: async () => {
      const { data } = await api.get('/accounting/chart-of-accounts');
      return data.data;
    },
  });

  const { data: flatData } = useQuery<COAccount[]>({
    queryKey: ['coa-flat'],
    queryFn: async () => {
      const { data } = await api.get('/accounting/chart-of-accounts?flat=1');
      return data.data;
    },
  });

  // ── Mutations ──
  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      if (editId) {
        await api.put(`/accounting/chart-of-accounts/${editId}`, payload);
      } else {
        await api.post('/accounting/chart-of-accounts', payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coa-tree'] });
      qc.invalidateQueries({ queryKey: ['coa-flat'] });
      setDialogOpen(false);
      toast.success(editId ? 'Account updated.' : 'Account created.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/accounting/chart-of-accounts/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coa-tree'] });
      qc.invalidateQueries({ queryKey: ['coa-flat'] });
      toast.success('Account deleted.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Cannot delete.'),
  });

  // ── Handlers ──
  const openCreate = (parentId?: number) => {
    setEditId(null);
    setForm({ ...emptyForm, parent_id: parentId ?? null });
    setDialogOpen(true);
  };

  const openEdit = (acct: COAccount) => {
    setEditId(acct.public_id);
    setForm({
      account_code: acct.account_code,
      account_name: acct.account_name,
      account_type: acct.account_type,
      code_prefix: acct.code_prefix ?? '',
      code_number: acct.code_number ?? '',
      code_suffix: acct.code_suffix ?? '',
      parent_id: acct.parent_id,
      description: acct.description ?? '',
      is_header: acct.is_header,
    });
    setDialogOpen(true);
  };

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Filtered & flattened data ──
  const filteredTree = filterType === 'all'
    ? (treeData ?? [])
    : (treeData ?? []).filter(a => a.account_type === filterType);

  const flatVisible = useMemo(() => flattenTree(filteredTree, expanded), [filteredTree, expanded]);

  const searched = useMemo(() => {
    if (!search.trim()) return flatVisible;
    const q = search.toLowerCase();
    return flatVisible.filter(a =>
      a.account_code.toLowerCase().includes(q) ||
      a.account_name.toLowerCase().includes(q) ||
      a.account_type.toLowerCase().includes(q)
    );
  }, [flatVisible, search]);

  // Client-side pagination
  const totalRows = searched.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePageNum = Math.min(page, pageCount);
  const fromIdx = (safePageNum - 1) * pageSize;
  const pageData = searched.slice(fromIdx, fromIdx + pageSize);

  // Count by type
  const allAccounts = flatData ?? [];
  const typeCounts = ACCOUNT_TYPES.map(t => ({
    type: t,
    count: allAccounts.filter(a => a.account_type === t).length,
  }));

  // ── Columns ──
  const columns: ColumnDef<FlatCOAccount>[] = useMemo(() => [
    {
      id: 'account_code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => {
        const acct = row.original;
        return (
          <div className="font-mono" style={{ paddingLeft: `${acct.depth * 24}px` }}>
            {acct.hasChildren ? (
              <button onClick={() => toggle(acct.public_id)} className="inline-flex items-center gap-1">
                {expanded.has(acct.public_id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {acct.account_code}
              </button>
            ) : (
              <span className="pl-4">{acct.account_code}</span>
            )}
          </div>
        );
      },
      size: 150,
    },
    {
      id: 'account_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account Name" />,
      cell: ({ row }) => {
        const acct = row.original;
        return (
          <span className={cn(acct.is_header && 'font-bold')}>
            {acct.account_name}
            {acct.is_header && <Badge variant="outline" className="ml-2 text-[10px]">Header</Badge>}
            {acct.is_system && <Badge variant="secondary" className="ml-1 text-[10px]">System</Badge>}
          </span>
        );
      },
      size: 350,
    },
    {
      id: 'account_type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => (
        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', TYPE_COLORS[row.original.account_type])}>
          {row.original.account_type}
        </span>
      ),
      size: 120,
    },
    {
      id: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => row.original.is_active
        ? <Badge variant="default">Active</Badge>
        : <Badge variant="secondary">Inactive</Badge>,
      size: 100,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const acct = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!acct.is_system && (
                  <DropdownMenuItem onClick={() => openEdit(acct)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                )}
                {acct.hasChildren && (
                  <DropdownMenuItem onClick={() => openCreate(acct.coa_id)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Sub-account
                  </DropdownMenuItem>
                )}
                {!acct.is_system && !acct.hasChildren && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => { if (confirm('Delete this account?')) deleteMutation.mutate(acct.public_id); }}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      size: 100,
    },
  ], [expanded, deleteMutation, flatData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground">Manage the school's account structure</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const printWindow = window.open('', '_blank');
            if (!printWindow) return;
            const rows = pageData;
            printWindow.document.write(`
              <html><head><title>Chart of Accounts</title>
              <style>
                body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
                h2 { margin-bottom: 4px; } p { margin-top: 0; color: #666; font-size: 11px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
                th { background: #f5f5f5; font-weight: 600; }
                @media print { body { margin: 0; } }
              </style></head><body>
              <h2>Chart of Accounts</h2>
              <p>${filterType !== 'all' ? 'Type: ' + filterType : 'All Types'}</p>
              <table>
                <thead><tr><th>Code</th><th>Account Name</th><th>Type</th><th>Status</th></tr></thead>
                <tbody>${rows.map(r => `<tr><td>${r.account_code}</td><td>${' '.repeat(r.depth * 4)}${r.account_name}</td><td>${r.account_type}</td><td>${r.is_active ? 'Active' : 'Inactive'}</td></tr>`).join('')}</tbody>
              </table></body></html>`);
            printWindow.document.close();
            printWindow.print();
          }}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const params = new URLSearchParams();
            if (filterType !== 'all') params.set('type', filterType);
            window.open(`${import.meta.env.VITE_API_URL || '/api'}/accounting/chart-of-accounts/export?${params}`, '_blank');
          }}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => openCreate()}>
            <Plus className="mr-2 h-4 w-4" /> New Account
          </Button>
        </div>
      </div>

      {/* Type Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-5">
        {typeCounts.map(({ type, count }) => (
          <button
            key={type}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors',
              filterType === type ? 'ring-2 ring-primary' : 'hover:bg-muted/50',
            )}
            onClick={() => { setFilterType(filterType === type ? 'all' : type); setPage(1); }}
          >
            <div className="text-xs text-muted-foreground">{type}</div>
            <div className="text-xl font-bold">{count}</div>
          </button>
        ))}
      </div>

      {/* Accounts Table */}
      <DataTable
        columns={columns}
        data={pageData}
        isLoading={isLoading}
        page={safePageNum}
        pageCount={pageCount}
        onPageChange={setPage}
        total={totalRows}
        from={totalRows > 0 ? fromIdx + 1 : null}
        to={totalRows > 0 ? Math.min(fromIdx + pageSize, totalRows) : null}
        pageSize={pageSize}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        getRowId={(row) => row.public_id}
        noResultsMessage='No accounts found. Click "New Account" to create one.'
        toolbar={
          <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search accounts..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            {filterType !== 'all' && (
              <div className="flex items-center gap-2">
                <Badge>{filterType}</Badge>
                <Button variant="ghost" size="sm" onClick={() => { setFilterType('all'); setPage(1); }}>Show All</Button>
              </div>
            )}
            <DataTableFilterButton activeCount={filterType !== 'all' ? 1 : 0} onClick={() => setFilterOpen(true)} />
          </div>
        }
      />

      <DataTableFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeCount={filterType !== 'all' ? 1 : 0}
        onReset={() => { setFilterType('all'); setPage(1); }}
      >
        <div className="space-y-1">
          <Label className="text-sm font-medium">Account Type</Label>
          <Select value={filterType} onValueChange={(v) => { setFilterType(v ?? 'all'); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ACCOUNT_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Account' : 'New Account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Structured Code Builder */}
            <div className="space-y-2">
              <Label>Account Code (Prefix-Number-Suffix)</Label>
              <div className="flex items-center gap-2">
                <Input
                  className="w-24 font-mono text-center uppercase"
                  value={form.code_prefix}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase();
                    setForm(p => ({ ...p, code_prefix: v, account_code: buildCode(v, p.code_number, p.code_suffix) }));
                  }}
                  placeholder="TF"
                  maxLength={10}
                />
                <span className="text-lg font-bold text-muted-foreground">-</span>
                <Input
                  className="w-24 font-mono text-center"
                  value={form.code_number}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm(p => ({ ...p, code_number: v, account_code: buildCode(p.code_prefix, v, p.code_suffix) }));
                  }}
                  placeholder="001"
                  maxLength={10}
                />
                <span className="text-lg font-bold text-muted-foreground">-</span>
                <Input
                  className="w-20 font-mono text-center uppercase"
                  value={form.code_suffix}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase();
                    setForm(p => ({ ...p, code_suffix: v, account_code: buildCode(p.code_prefix, p.code_number, v) }));
                  }}
                  placeholder="A"
                  maxLength={5}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Generated code: <span className="font-mono font-bold">{form.account_code || '—'}</span>
                &nbsp;(e.g. TF-001-A = Tuition Fee for Grade School)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Account Type</Label>
                <Select
                  value={form.account_type}
                  onValueChange={(v) => setForm(p => ({ ...p, account_type: v ?? '' }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                value={form.account_name}
                onChange={(e) => setForm(p => ({ ...p, account_name: e.target.value }))}
                placeholder="e.g. Cash on Hand"
              />
            </div>
            <div className="space-y-2">
              <Label>Parent Account (optional)</Label>
              <Select
                value={form.parent_id ? String(form.parent_id) : 'none'}
                onValueChange={(v) => setForm(p => ({ ...p, parent_id: v === 'none' ? null : Number(v) }))}
              >
                <SelectTrigger>
                  <span className="flex flex-1 text-left line-clamp-1">
                    {form.parent_id
                      ? (() => {
                          const p = (flatData ?? []).find(a => a.coa_id === form.parent_id);
                          return p
                            ? `${p.account_code} — ${p.account_name}`
                            : 'None (top-level)';
                        })()
                      : 'None (top-level)'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {(flatData ?? []).filter(a => a.public_id !== editId).map(a => (
                    <SelectItem key={a.public_id} value={String(a.coa_id)}>
                      {a.account_code} — {a.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_header}
                onCheckedChange={(v) => setForm(p => ({ ...p, is_header: v }))}
              />
              <Label>Header account (grouping only, no posting)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.account_code || !form.account_name || !form.account_type || saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
