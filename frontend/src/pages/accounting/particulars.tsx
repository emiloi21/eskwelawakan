import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { AccountParticular, PaginatedResponse } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { toast } from 'sonner';
import { Loader2, Plus, Search, Pencil, Trash2, Link2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ACCOUNT_GROUPS } from '@/lib/constants';
import { useLookups } from '@/hooks/use-lookups';
import { useGradeLevelOptions } from '@/hooks/use-grade-level-options';
import { DataTableFilterSheet, DataTableFilterButton } from '@/components/ui/data-table-filter-sheet';

interface COAccount {
  coa_id: number;
  public_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  is_header: boolean;
}

const schema = z.object({
  coa_id: z.string().min(1, 'Select a Chart of Account entry'),
  gradeLevel: z.string().optional(),
  strand: z.string().optional(),
  major: z.string().optional(),
  schoolYear: z.string().min(1, 'Required'),
  semester: z.string().optional(),
  account_group: z.string().min(1, 'Required'),
  account_code: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  amount: z.coerce.number().min(0, 'Must be >= 0') as unknown as z.ZodNumber,
  par_acct_class: z.string().optional(),
  status: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

export default function ParticularsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: lookups } = useLookups();
  const sy = user?.selected_sy || lookups?.active_school_year || '';
  const sem = user?.selected_sem || lookups?.active_semester || '';
  const gradeLevelsByDept = useGradeLevelOptions(sy);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<AccountParticular | null>(null);
  const [selectedGradeLevels, setSelectedGradeLevels] = useState<string[]>([]);

  // ── COA accounts (for linking) ──
  const { data: coaAccounts } = useQuery<COAccount[]>({
    queryKey: ['coa-flat-particulars'],
    queryFn: async () => {
      const { data } = await api.get('/accounting/chart-of-accounts?flat=1');
      return (data.data as COAccount[]).filter((a) => !a.is_header);
    },
  });

  const { data, isLoading } = useQuery<PaginatedResponse<AccountParticular>>({
    queryKey: ['particulars', page, pageSize, filterGroup, filterGrade, filterStatus, sy],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: String(pageSize) });
      if (filterGroup) params.set('account_group', filterGroup);
      if (filterGrade) params.set('gradeLevel', filterGrade);
      if (filterStatus) params.set('status', filterStatus);
      if (sy) params.set('schoolYear', sy);
      const { data } = await api.get(`/accounting/particulars?${params}`);
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { coa_id: '', schoolYear: sy, account_group: '', description: '', amount: 0 },
  });

  const openAdd = () => {
    form.reset({ coa_id: '', schoolYear: sy, semester: sem, gradeLevel: '', account_group: '', account_code: '', description: '', amount: 0, par_acct_class: 'Assessment Account', status: 'Active' });
    setSelectedGradeLevels([]);
    setEditItem(null);
    setDialogOpen(true);
  };

  const openEdit = (item: AccountParticular) => {
    form.reset({ ...item, coa_id: item.chart_account?.public_id ?? '' });
    setEditItem(item);
    setDialogOpen(true);
  };

  // When user selects a COA account, pre-populate fields
  const handleCoaSelect = (coaIdStr: string) => {
    form.setValue('coa_id', coaIdStr);
    const acct = coaAccounts?.find(a => a.public_id === coaIdStr);
    if (acct) {
      form.setValue('account_code', acct.account_code);
      form.setValue('description', acct.account_name);
      // Map account_type to account_group
      if (acct.account_type === 'Revenue') {
        form.setValue('account_group', 'Tuition Fee');
      }
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editItem) {
        const { data } = await api.put(`/accounting/particulars/${editItem.public_id}`, values);
        return data;
      }
      // Create mode: send gradeLevels array
      const { gradeLevel: _gl, ...rest } = values;
      const payload = { ...rest, gradeLevels: selectedGradeLevels };
      const { data } = await api.post('/accounting/particulars', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['particulars'] });
      toast.success(editItem ? 'Particular updated.' : 'Particular created.');
      setDialogOpen(false);
    },
    onError: () => toast.error('Failed to save particular.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/accounting/particulars/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['particulars'] });
      toast.success('Particular deleted.');
    },
    onError: () => toast.error('Failed to delete. May have existing payments.'),
  });

  const items = data?.data ?? [];
  const filtered = search ? items.filter((p) => p.description.toLowerCase().includes(search.toLowerCase()) || p.account_code.toLowerCase().includes(search.toLowerCase())) : items;

  const columns: ColumnDef<AccountParticular>[] = [
    {
      accessorKey: 'account_code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.account_code}</span>,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.description}</span>
          {(row.original as any).chart_account && (
            <span className="ml-2 text-xs text-muted-foreground">
              <Link2 className="inline h-3 w-3 mr-0.5" />
              {(row.original as any).chart_account.account_name}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'account_group',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Group" />,
      cell: ({ row }) => <Badge variant="secondary">{row.original.account_group}</Badge>,
    },
    { accessorKey: 'gradeLevel', header: 'Grade' },
    {
      accessorKey: 'amount',
      header: () => <span className="flex justify-end">Amount</span>,
      cell: ({ row }) => <div className="text-right tabular-nums font-medium">{formatPeso(row.original.amount)}</div>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge variant={row.original.status === 'Active' ? 'default' : 'secondary'}>{row.original.status}</Badge>,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(p)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Delete this particular?')) deleteMutation.mutate(p.public_id); }}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
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
          <h1 className="text-2xl font-bold tracking-tight">Particulars</h1>
          <p className="text-muted-foreground">Manage individual fee line items</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Particular</Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        page={page}
        pageCount={data?.last_page ?? 1}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        total={data?.total}
        from={data?.from}
        to={data?.to}
        getRowId={(row) => row.public_id}
        noResultsMessage="No particulars found."
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search code or description..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <DataTableFilterButton onClick={() => setFilterOpen(true)} activeCount={[filterGroup, filterGrade, filterStatus].filter(Boolean).length} />
          </div>
        }
      />

      {/* ── Advanced Filters Sheet ─────────────────────────── */}
      <DataTableFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeCount={[filterGroup, filterGrade, filterStatus].filter(Boolean).length}
        onReset={() => { setFilterGroup(''); setFilterGrade(''); setFilterStatus(''); setPage(1); }}
      >
        <div className="space-y-2">
          <Label>Account Group</Label>
          <Select value={filterGroup || 'all'} onValueChange={(v) => { setFilterGroup((v ?? '') === 'all' ? '' : (v ?? '')); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {ACCOUNT_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Grade Level</Label>
          <Select value={filterGrade || 'all'} onValueChange={(v) => { setFilterGrade((v ?? '') === 'all' ? '' : (v ?? '')); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grade Levels</SelectItem>
              {Object.values(gradeLevelsByDept).flat().map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={filterStatus || 'all'} onValueChange={(v) => { setFilterStatus((v ?? '') === 'all' ? '' : (v ?? '')); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Particular' : 'Add Particular'}</DialogTitle>
            <DialogDescription>
              {editItem ? 'Modify fee line item details.' : 'Select a Chart of Account entry first, then set grade-level and amount details.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => {
            if (!editItem && selectedGradeLevels.length === 0) {
              toast.error('Select at least one grade level.');
              return;
            }
            saveMutation.mutate(v as FormValues);
          })} className="space-y-4">
            {/* Step 1: Select COA Account */}
            <div className="space-y-2">
              <Label>Chart of Account <span className="text-destructive">*</span></Label>
              <Select
                value={form.watch('coa_id') || ''}
                onValueChange={(v) => handleCoaSelect(v ?? '')}
              >
                <SelectTrigger>
                  {(() => {
                    const coa = coaAccounts?.find(a => a.public_id === form.watch('coa_id'));
                    return coa
                      ? <span className="flex flex-1 text-left truncate"><span className="font-mono text-xs mr-2">{coa.account_code}</span>{coa.account_name}</span>
                      : <SelectValue placeholder="Select COA account..." />;
                  })()}
                </SelectTrigger>
                <SelectContent>
                  {(coaAccounts ?? []).map((a) => (
                    <SelectItem key={a.public_id} value={a.public_id}>
                      <span className="font-mono text-xs mr-2">{a.account_code}</span>
                      {a.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.coa_id && <p className="text-sm text-destructive">{form.formState.errors.coa_id.message}</p>}
            </div>

            {/* Pre-populated from COA (editable) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Code</Label>
                <Input {...form.register('account_code')} placeholder="Auto from COA" className="font-mono" readOnly />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input {...form.register('description')} placeholder="Auto from COA" />
                {form.formState.errors.description && <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>}
              </div>
            </div>

            {/* Step 2: Determining data */}
            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-medium text-muted-foreground">Fee Details (per school year)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {editItem ? (
                  <div className="space-y-2">
                    <Label>Grade Level <span className="text-destructive">*</span></Label>
                    <Input value={form.watch('gradeLevel')} readOnly className="bg-muted" />
                  </div>
                ) : (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Grade / Year Levels <span className="text-destructive">*</span></Label>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-3">
                      {Object.entries(gradeLevelsByDept).map(([dept, grades]) => (
                        <div key={dept}>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">{dept}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                            {grades.map((g) => (
                              <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox
                                  checked={selectedGradeLevels.includes(g)}
                                  onCheckedChange={(checked) => {
                                    setSelectedGradeLevels(prev =>
                                      checked ? [...prev, g] : prev.filter(v => v !== g)
                                    );
                                  }}
                                />
                                {g}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedGradeLevels.length > 0 && (
                      <p className="text-xs text-muted-foreground">{selectedGradeLevels.length} selected</p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Amount <span className="text-destructive">*</span></Label>
                  <Input type="number" step="0.01" {...form.register('amount')} />
                </div>
                <div className="space-y-2">
                  <Label>Account Group <span className="text-destructive">*</span></Label>
                  <Select value={form.watch('account_group')} onValueChange={(v) => form.setValue('account_group', v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{ACCOUNT_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.watch('status') || 'Active'} onValueChange={(v) => form.setValue('status', v ?? '')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editItem ? 'Save Changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
