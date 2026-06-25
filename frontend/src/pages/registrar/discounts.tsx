import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { Discount, PaginatedResponse } from '@/types';
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
import { DataTableFilterButton, DataTableFilterSheet } from '@/components/ui/data-table-filter-sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Loader2, Plus, Search, Pencil, Trash2, MoreVertical, Printer, Download } from 'lucide-react';
import { DEPARTMENTS, DISCOUNT_TYPES } from '@/lib/constants';

const schema = z.object({
  dept: z.string().min(1, 'Required'),
  schoolYear: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  amount: z.coerce.number().min(0) as unknown as z.ZodNumber,
  percentage: z.coerce.number().min(0).max(100).optional() as unknown as z.ZodOptional<z.ZodNumber>,
  account_code: z.string().optional(),
  classification: z.string().optional(),
  type: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

export default function DiscountsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const sy = user?.selected_sy || '';
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterDept, setFilterDept] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Discount | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<Discount>>({
    queryKey: ['discounts', page, pageSize, filterDept, sy],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: String(pageSize) });
      if (filterDept) params.set('dept', filterDept);
      if (sy) params.set('schoolYear', sy);
      const { data } = await api.get(`/registrar/discounts?${params}`);
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { schoolYear: sy || '', dept: '', type: 'Fixed', amount: 0 },
  });

  const openAdd = () => {
    form.reset({ schoolYear: sy || '', dept: '', type: 'Fixed', amount: 0, description: '' });
    setEditItem(null);
    setDialogOpen(true);
  };

  const openEdit = (d: Discount) => {
    form.reset({
      dept: d.dept,
      schoolYear: d.schoolYear,
      description: d.description,
      amount: d.amount,
      percentage: d.percentage,
      account_code: d.account_code ?? '',
      classification: d.classification ?? '',
      type: d.type,
    });
    setEditItem(d);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editItem) {
        const { data } = await api.put(`/registrar/discounts/${editItem.public_id}`, values);
        return data;
      }
      const { data } = await api.post('/registrar/discounts', values);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      toast.success(editItem ? 'Discount updated.' : 'Discount created.');
      setDialogOpen(false);
    },
    onError: () => toast.error('Failed to save discount.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/registrar/discounts/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      toast.success('Discount deleted.');
    },
    onError: () => toast.error('Failed to delete discount.'),
  });

  const items = data?.data ?? [];

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = filtered;
    printWindow.document.write(`
      <html><head><title>Discounts</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        h2 { margin-bottom: 4px; } p { margin-top: 0; color: #666; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .right { text-align: right; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h2>Discounts</h2>
      <p>${filterDept ? 'Dept: ' + filterDept : 'All Departments'}</p>
      <table>
        <thead><tr><th>Description</th><th>Dept</th><th>Type</th><th class="right">Amount</th><th class="right">Percentage</th><th>Classification</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${r.description}</td><td>${r.dept}</td><td>${r.type}</td><td class="right">${formatPeso(r.amount)}</td><td class="right">${r.percentage > 0 ? r.percentage + '%' : '—'}</td><td>${r.classification || '—'}</td></tr>`).join('')}</tbody>
      </table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filterDept) params.set('dept', filterDept);
    if (sy) params.set('schoolYear', sy);
    const url = `${import.meta.env.VITE_API_URL || '/api'}/registrar/discounts/export?${params}`;
    window.open(url, '_blank');
  };

  const filtered = search
    ? items.filter((d) => d.description.toLowerCase().includes(search.toLowerCase()))
    : items;

  const columns: ColumnDef<Discount>[] = [
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span className="font-medium">{row.original.description}</span>,
    },
    {
      accessorKey: 'dept',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Department" />,
    },
    {
      accessorKey: 'type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => <div className="text-right tabular-nums">{formatPeso(row.original.amount)}</div>,
    },
    {
      accessorKey: 'percentage',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Percentage" />,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.original.percentage > 0 ? `${row.original.percentage}%` : '—'}</div>,
    },
    {
      accessorKey: 'classification',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Classification" />,
      cell: ({ row }) => row.original.classification || '—',
      enableSorting: false,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
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
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => { if (confirm('Delete this discount?')) deleteMutation.mutate(d.public_id); }}>
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
          <h1 className="text-2xl font-bold tracking-tight">Discounts</h1>
          <p className="text-muted-foreground">Manage scholarship and discount rules</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Discount
          </Button>
        </div>
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
        noResultsMessage="No discounts found."
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search description..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <DataTableFilterButton activeCount={filterDept ? 1 : 0} onClick={() => setFilterOpen(true)} />
          </div>
        }
      />

      <DataTableFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeCount={filterDept ? 1 : 0}
        onReset={() => { setFilterDept(''); setPage(1); }}
      >
        <div className="space-y-1">
          <Label className="text-sm font-medium">Department</Label>
          <Select value={filterDept || 'all'} onValueChange={(v) => { setFilterDept(v === 'all' ? '' : (v ?? '')); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Discount' : 'Add Discount'}</DialogTitle>
            <DialogDescription>{editItem ? 'Update discount details' : 'Create a new discount rule'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v as FormValues))} className="space-y-4">
            <div className="space-y-1">
              <Label>Description *</Label>
              <Input {...form.register('description')} />
              {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Department *</Label>
                <Select value={form.watch('dept')} onValueChange={(v) => form.setValue('dept', v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Type *</Label>
                <Select value={form.watch('type')} onValueChange={(v) => form.setValue('type', v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Amount *</Label>
                <Input type="number" step="0.01" {...form.register('amount')} />
              </div>
              <div className="space-y-1">
                <Label>Percentage</Label>
                <Input type="number" step="0.01" {...form.register('percentage')} />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>School Year *</Label>
                <Input placeholder="2025-2026" {...form.register('schoolYear')} />
              </div>
              <div className="space-y-1">
                <Label>Classification</Label>
                <Input placeholder="New, Old, etc." {...form.register('classification')} />
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
