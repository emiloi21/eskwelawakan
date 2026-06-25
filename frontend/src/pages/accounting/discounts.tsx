import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { Discount, PaginatedResponse } from '@/types';
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
import { Loader2, Plus, Search, Pencil, Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { DEPARTMENTS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { DataTableFilterSheet, DataTableFilterButton } from '@/components/ui/data-table-filter-sheet';

const schema = z.object({
  dept: z.string().min(1, 'Required'),
  schoolYear: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  amount: z.coerce.number().min(0) as unknown as z.ZodNumber,
  percentage: z.coerce.number().min(0).max(100) as unknown as z.ZodNumber,
  account_code: z.string().optional(),
  classification: z.string().min(1, 'Required'),
  type: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

export default function AccountingDiscountsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Discount | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<Discount>>({
    queryKey: ['acct-discounts', page, pageSize, filterDept, filterType, filterClass],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: String(pageSize) });
      if (filterDept) params.set('dept', filterDept);
      if (filterType) params.set('type', filterType);
      if (filterClass) params.set('classification', filterClass);
      const { data } = await api.get(`/accounting/discounts?${params}`);
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { dept: '', schoolYear: '', description: '', amount: 0, percentage: 0, type: 'Discount', classification: 'Fixed Amount' },
  });

  const openAdd = () => {
    form.reset({ dept: '', schoolYear: '', description: '', amount: 0, percentage: 0, account_code: '', classification: 'Fixed Amount', type: 'Discount' });
    setEditItem(null);
    setDialogOpen(true);
  };

  const openEdit = (item: Discount) => {
    form.reset({
      dept: item.dept,
      schoolYear: item.schoolYear,
      description: item.description,
      amount: item.amount,
      percentage: item.percentage,
      account_code: item.account_code || '',
      classification: item.classification || 'Fixed Amount',
      type: item.type,
    });
    setEditItem(item);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editItem) {
        const { data } = await api.put(`/accounting/discounts/${editItem.public_id}`, values);
        return data;
      }
      const { data } = await api.post('/accounting/discounts', values);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acct-discounts'] });
      toast.success(editItem ? 'Discount updated.' : 'Discount created.');
      setDialogOpen(false);
    },
    onError: () => toast.error('Failed to save discount.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/accounting/discounts/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acct-discounts'] });
      toast.success('Discount deleted.');
    },
    onError: () => toast.error('Failed to delete discount.'),
  });

  const items = data?.data ?? [];
  const filtered = search ? items.filter((d) => d.description.toLowerCase().includes(search.toLowerCase())) : items;

  const typeLabel = (t: string) => t === 'Receivable' ? 'External Subsidy' : t === 'Payable' ? 'Internal Subsidy' : t;

  const columns: ColumnDef<Discount>[] = [
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span className="font-medium">{row.original.description}</span>,
    },
    {
      accessorKey: 'dept',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Department" />,
      cell: ({ row }) => <Badge variant="secondary">{row.original.dept}</Badge>,
    },
    {
      accessorKey: 'classification',
      header: 'Mode',
      cell: ({ row }) => row.original.classification || '—',
    },
    {
      id: 'value',
      header: () => <span className="flex justify-end">Value</span>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {row.original.classification === 'Percentage'
            ? `${row.original.percentage}%`
            : formatPeso(row.original.amount)}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <Badge variant={row.original.type === 'Discount' ? 'default' : 'secondary'}>{typeLabel(row.original.type)}</Badge>,
    },
    { accessorKey: 'schoolYear', header: 'SY' },
    {
      id: 'actions',
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(d)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Delete this discount?')) deleteMutation.mutate(d.public_id); }}>
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
          <h1 className="text-2xl font-bold tracking-tight">Discounts / Subsidies / Scholarships</h1>
          <p className="text-muted-foreground">Manage discount and subsidy types for student billing</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Discount</Button>
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
        noResultsMessage="No discounts found."
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <DataTableFilterButton onClick={() => setFilterOpen(true)} activeCount={[filterDept, filterType, filterClass].filter(Boolean).length} />
          </div>
        }
      />

      {/* ── Advanced Filters Sheet ─────────────────────────── */}
      <DataTableFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeCount={[filterDept, filterType, filterClass].filter(Boolean).length}
        onReset={() => { setFilterDept(''); setFilterType(''); setFilterClass(''); setPage(1); }}
      >
        <div className="space-y-2">
          <Label>Department</Label>
          <Select value={filterDept || 'all'} onValueChange={(v) => { setFilterDept((v ?? '') === 'all' ? '' : (v ?? '')); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={filterType || 'all'} onValueChange={(v) => { setFilterType((v ?? '') === 'all' ? '' : (v ?? '')); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Discount">Discount</SelectItem>
              <SelectItem value="Receivable">External Subsidy</SelectItem>
              <SelectItem value="Payable">Internal Subsidy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Classification</Label>
          <Select value={filterClass || 'all'} onValueChange={(v) => { setFilterClass((v ?? '') === 'all' ? '' : (v ?? '')); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Fixed Amount">Fixed Amount</SelectItem>
              <SelectItem value="Percentage">Percentage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Discount' : 'Add Discount / Subsidy / Scholarship'}</DialogTitle>
            <DialogDescription>Configure a discount or subsidy for fee billing.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v as FormValues))} className="space-y-4">
            {/* Classification toggle */}
            <div className="space-y-2">
              <Label>Classification</Label>
              <div className="flex gap-1 rounded-md border p-1">
                {['Fixed Amount', 'Percentage'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      'flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
                      form.watch('classification') === c ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                    )}
                    onClick={() => { form.setValue('classification', c); if (c === 'Fixed Amount') form.setValue('percentage', 0); else form.setValue('amount', 0); }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input {...form.register('description')} />
              {form.formState.errors.description && <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={form.watch('dept')} onValueChange={(v) => form.setValue('dept', v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.watch('type')} onValueChange={(v) => form.setValue('type', v ?? '')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Discount">Discount</SelectItem>
                    <SelectItem value="Receivable">External Subsidy</SelectItem>
                    <SelectItem value="Payable">Internal Subsidy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {form.watch('classification') === 'Fixed Amount' ? (
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" min="0" {...form.register('amount')} />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Percentage</Label>
                  <Input type="number" step="0.01" min="0" max="1" {...form.register('percentage')} />
                  <p className="text-xs text-muted-foreground">Decimal format: 1% = 0.01, 100% = 1.0</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Account Code</Label>
                <Input {...form.register('account_code')} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>School Year</Label>
              <Input {...form.register('schoolYear')} />
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
