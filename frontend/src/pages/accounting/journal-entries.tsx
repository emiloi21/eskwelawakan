import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DataTableFilterButton, DataTableFilterSheet } from '@/components/ui/data-table-filter-sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Loader2, Plus, Eye, Send, Ban, Trash2, X, Search, MoreVertical, Printer, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──

interface COAccount {
  coa_id: number;
  account_code: string;
  account_name: string;
  account_type: string;
}

interface JournalLine {
  jel_id?: number;
  coa_id: number | '';
  debit: string;
  credit: string;
  memo: string;
}

interface JournalEntry {
  je_id: number;
  public_id: string;
  entry_no: string;
  entry_date: string;
  description: string;
  reference_type: string;
  reference_id: string | null;
  status: 'Draft' | 'Posted' | 'Voided';
  created_at: string;
  lines: {
    jel_id: number;
    coa_id: number;
    debit: string;
    credit: string;
    memo: string;
    account: COAccount;
  }[];
  creator?: { name: string };
  poster?: { name: string };
  posted_at?: string;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  Posted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  Voided: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const emptyLine = (): JournalLine => ({ coa_id: '', debit: '', credit: '', memo: '' });

export default function JournalEntriesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);

  // Form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [refType, setRefType] = useState('manual');
  const [refId, setRefId] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);

  // ── Queries ──
  const { data, isLoading } = useQuery<PaginatedResponse<JournalEntry>>({
    queryKey: ['journal-entries', statusFilter, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(pageSize),
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const { data } = await api.get(`/accounting/journal-entries?${params}`);
      return data;
    },
  });

  const { data: accounts } = useQuery<COAccount[]>({
    queryKey: ['coa-flat-je'],
    queryFn: async () => {
      const { data } = await api.get('/accounting/chart-of-accounts?flat=1');
      return (data.data as COAccount[]).filter((a: any) => !a.is_header);
    },
  });

  // ── Mutations ──
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        entry_date: entryDate,
        description,
        reference_type: refType,
        reference_id: refId || null,
        lines: lines.filter(l => l.coa_id).map(l => ({
          coa_id: Number(l.coa_id),
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          memo: l.memo,
        })),
      };
      if (editId) {
        await api.put(`/accounting/journal-entries/${editId}`, payload);
      } else {
        await api.post('/accounting/journal-entries', payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-entries'] });
      setDialogOpen(false);
      toast.success(editId ? 'Entry updated.' : 'Entry created.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save.'),
  });

  const postMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/accounting/journal-entries/${id}/post`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-entries'] });
      setViewEntry(null);
      toast.success('Entry posted.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Cannot post.'),
  });

  const voidMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/accounting/journal-entries/${id}/void`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-entries'] });
      setViewEntry(null);
      toast.success('Entry voided.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Cannot void.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/accounting/journal-entries/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Draft deleted.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Cannot delete.'),
  });

  // ── Handlers ──
  const openCreate = () => {
    setEditId(null);
    setEntryDate(new Date().toISOString().slice(0, 10));
    setDescription('');
    setRefType('manual');
    setRefId('');
    setLines([emptyLine(), emptyLine()]);
    setDialogOpen(true);
  };

  const openEdit = (je: JournalEntry) => {
    setEditId(je.public_id);
    setEntryDate(je.entry_date);
    setDescription(je.description);
    setRefType(je.reference_type);
    setRefId(je.reference_id ?? '');
    setLines((je.lines ?? []).map(l => ({
      coa_id: l.coa_id,
      debit: parseFloat(l.debit) ? l.debit : '',
      credit: parseFloat(l.credit) ? l.credit : '',
      memo: l.memo,
    })));
    setDialogOpen(true);
  };

  const updateLine = (idx: number, field: keyof JournalLine, value: string | number) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));
  const addLine = () => setLines(prev => [...prev, emptyLine()]);

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const entries = data?.data ?? [];

  // Client-side search on loaded page
  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(je =>
      je.entry_no.toLowerCase().includes(q) ||
      je.description.toLowerCase().includes(q) ||
      je.reference_type.toLowerCase().includes(q) ||
      je.status.toLowerCase().includes(q)
    );
  }, [entries, search]);

  // ── Columns ──
  const columns: ColumnDef<JournalEntry>[] = useMemo(() => [
    {
      accessorKey: 'entry_no',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Entry No." />,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.entry_no}</span>,
    },
    {
      accessorKey: 'entry_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span className="max-w-[200px] truncate block">{row.original.description}</span>,
    },
    {
      accessorKey: 'reference_type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => <span className="capitalize">{row.original.reference_type}</span>,
    },
    {
      id: 'debit',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Debit" />,
      cell: ({ row }) => {
        const totD = (row.original.lines ?? []).reduce((s, l) => s + parseFloat(l.debit), 0);
        return <div className="text-right font-mono">{totD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>;
      },
    },
    {
      id: 'credit',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Credit" />,
      cell: ({ row }) => {
        const totC = (row.original.lines ?? []).reduce((s, l) => s + parseFloat(l.credit), 0);
        return <div className="text-right font-mono">{totC.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>;
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', STATUS_COLORS[row.original.status])}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const je = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewEntry(je)}>
                  <Eye className="mr-2 h-4 w-4" /> View
                </DropdownMenuItem>
                {je.status === 'Draft' && (
                  <>
                    <DropdownMenuItem onClick={() => openEdit(je)}>
                      <Plus className="mr-2 h-4 w-4" /> Edit / Add Lines
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => { if (confirm('Delete this draft?')) deleteMutation.mutate(je.public_id); }}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [deleteMutation]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Journal Entries</h1>
          <p className="text-muted-foreground">Record and manage financial transactions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const printWindow = window.open('', '_blank');
            if (!printWindow) return;
            const rows = filtered;
            printWindow.document.write(`
              <html><head><title>Journal Entries</title>
              <style>
                body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
                h2 { margin-bottom: 4px; } p { margin-top: 0; color: #666; font-size: 11px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
                th { background: #f5f5f5; font-weight: 600; }
                .right { text-align: right; }
                @media print { body { margin: 0; } }
              </style></head><body>
              <h2>Journal Entries</h2>
              <p>${statusFilter !== 'all' ? 'Status: ' + statusFilter : 'All Statuses'}</p>
              <table>
                <thead><tr><th>Entry No.</th><th>Date</th><th>Description</th><th>Type</th><th class="right">Debit</th><th class="right">Credit</th><th>Status</th></tr></thead>
                <tbody>${rows.map(je => {
                  const totD = (je.lines ?? []).reduce((s, l) => s + parseFloat(l.debit), 0);
                  const totC = (je.lines ?? []).reduce((s, l) => s + parseFloat(l.credit), 0);
                  return `<tr><td>${je.entry_no}</td><td>${je.entry_date}</td><td>${je.description}</td><td>${je.reference_type}</td><td class="right">${totD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td class="right">${totC.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td>${je.status}</td></tr>`;
                }).join('')}</tbody>
              </table></body></html>`);
            printWindow.document.close();
            printWindow.print();
          }}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.set('status', statusFilter);
            window.open(`${import.meta.env.VITE_API_URL || '/api'}/accounting/journal-entries/export?${params}`, '_blank');
          }}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Entry
          </Button>
        </div>
      </div>

      {/* Entries Table */}
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
        noResultsMessage="No journal entries found."
        toolbar={
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search entries..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              {['all', 'Draft', 'Posted', 'Voided'].map(s => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                >
                  {s === 'all' ? 'All' : s}
                </Button>
              ))}
            </div>
            <DataTableFilterButton activeCount={0} onClick={() => setFilterOpen(true)} />
          </div>
        }
      />

      <DataTableFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeCount={0}
        onReset={() => setPage(1)}
      >
        <div className="space-y-1">
          <Label className="text-sm font-medium">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? 'all'); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {['Draft', 'Posted', 'Voided'].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      {/* View Dialog */}
      <Dialog open={!!viewEntry} onOpenChange={() => setViewEntry(null)}>
        <DialogContent className="sm:max-w-2xl">
          {viewEntry && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {viewEntry.entry_no}
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium', STATUS_COLORS[viewEntry.status])}>
                    {viewEntry.status}
                  </span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Date:</span> {viewEntry.entry_date}</div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{viewEntry.reference_type}</span></div>
                  <div><span className="text-muted-foreground">Created by:</span> {viewEntry.creator?.name ?? '—'}</div>
                </div>
                <p className="text-sm">{viewEntry.description}</p>
                <div className="border rounded-md overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">Account</th>
                        <th className="text-right p-2 w-28">Debit</th>
                        <th className="text-right p-2 w-28">Credit</th>
                        <th className="text-left p-2">Memo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewEntry.lines ?? []).map(l => (
                        <tr key={l.jel_id} className="border-t">
                          <td className="p-2">
                            <span className="font-mono text-xs">{l.account.account_code}</span>{' '}
                            {l.account.account_name}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {parseFloat(l.debit) > 0 ? parseFloat(l.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                          </td>
                          <td className="p-2 text-right font-mono">
                            {parseFloat(l.credit) > 0 ? parseFloat(l.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                          </td>
                          <td className="p-2 text-muted-foreground">{l.memo}</td>
                        </tr>
                      ))}
                      <tr className="border-t font-bold">
                        <td className="p-2">Total</td>
                        <td className="p-2 text-right font-mono">
                          {(viewEntry.lines ?? []).reduce((s, l) => s + parseFloat(l.debit), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {(viewEntry.lines ?? []).reduce((s, l) => s + parseFloat(l.credit), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <DialogFooter>
                {viewEntry.status === 'Draft' && (
                  <Button onClick={() => { if (confirm('Post this entry? This cannot be undone.')) postMutation.mutate(viewEntry.public_id); }}>
                    <Send className="mr-2 h-4 w-4" /> Post
                  </Button>
                )}
                {viewEntry.status === 'Posted' && (
                  <Button variant="destructive" onClick={() => { if (confirm('Void this entry?')) voidMutation.mutate(viewEntry.public_id); }}>
                    <Ban className="mr-2 h-4 w-4" /> Void
                  </Button>
                )}
                <Button variant="outline" onClick={() => setViewEntry(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Journal Entry' : 'New Journal Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Entry Date</Label>
                <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Reference Type</Label>
                <Select value={refType} onValueChange={setRefType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['manual', 'payment', 'refund', 'adjustment'].map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference ID</Label>
                <Input value={refId} onChange={e => setRefId(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>

            {/* Lines */}
            <div className="space-y-2">
              <Label>Line Items</Label>
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Account</th>
                      <th className="text-right p-2 w-28">Debit</th>
                      <th className="text-right p-2 w-28">Credit</th>
                      <th className="text-left p-2 w-32">Memo</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">
                          <Select
                            value={l.coa_id ? String(l.coa_id) : ''}
                            onValueChange={v => updateLine(idx, 'coa_id', v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select account..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(accounts ?? []).map(a => (
                                <SelectItem key={a.coa_id} value={String(a.coa_id)} className="text-xs">
                                  {a.account_code} — {a.account_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Input
                            type="number" step="0.01" min="0" className="h-8 text-right text-xs"
                            value={l.debit} placeholder="0.00"
                            onChange={e => {
                              updateLine(idx, 'debit', e.target.value);
                              if (parseFloat(e.target.value) > 0) updateLine(idx, 'credit', '');
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number" step="0.01" min="0" className="h-8 text-right text-xs"
                            value={l.credit} placeholder="0.00"
                            onChange={e => {
                              updateLine(idx, 'credit', e.target.value);
                              if (parseFloat(e.target.value) > 0) updateLine(idx, 'debit', '');
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <Input className="h-8 text-xs" value={l.memo}
                            onChange={e => updateLine(idx, 'memo', e.target.value)} placeholder="Note..." />
                        </td>
                        <td className="p-2">
                          {lines.length > 2 && (
                            <Button variant="ghost" size="sm" onClick={() => removeLine(idx)}>
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t bg-muted/30 font-bold">
                      <td className="p-2 text-right">Totals</td>
                      <td className="p-2 text-right font-mono">{totalDebit.toFixed(2)}</td>
                      <td className="p-2 text-right font-mono">{totalCredit.toFixed(2)}</td>
                      <td colSpan={2} className="p-2">
                        {isBalanced ? (
                          <Badge variant="default" className="text-[10px]">Balanced</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            Diff: {Math.abs(totalDebit - totalCredit).toFixed(2)}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="mr-1 h-3 w-3" /> Add Line
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!isBalanced || !description || saveMutation.isPending}
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
