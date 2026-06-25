import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { CatParticular, AccountCategory, AccountParticular, PaginatedResponse } from '@/types';
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

const schema = z.object({
  category_id: z.string().min(1, 'Select a category'),
  particular_id: z.string().min(1, 'Select a particular'),
  cat_par_amount: z.coerce.number().min(0, 'Must be >= 0') as unknown as z.ZodNumber,
  schoolYear: z.string().min(1, 'Required'),
  gradeLevel: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

export default function CatParticularsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatParticular | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<CatParticular>>({
    queryKey: ['cat-particulars', page, filterCategory],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: '50' });
      if (filterCategory) params.set('category_id', filterCategory);
      const { data } = await api.get(`/accounting/cat-particulars?${params}`);
      return data;
    },
  });

  const { data: categories } = useQuery<AccountCategory[]>({
    queryKey: ['categories-list'],
    queryFn: async () => { const { data } = await api.get('/accounting/categories?per_page=200'); return data.data ?? data; },
  });

  const { data: particulars } = useQuery<AccountParticular[]>({
    queryKey: ['particulars-list'],
    queryFn: async () => { const { data } = await api.get('/accounting/particulars?per_page=200'); return data.data ?? data; },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category_id: '', particular_id: '', cat_par_amount: 0, schoolYear: '' },
  });

  const openAdd = () => {
    form.reset({ category_id: '', particular_id: '', cat_par_amount: 0, schoolYear: '', gradeLevel: '' });
    setEditItem(null);
    setDialogOpen(true);
  };

  const openEdit = (item: CatParticular) => {
    form.reset({
      category_id: item.category?.public_id ?? '',
      particular_id: item.particular?.public_id ?? '',
      cat_par_amount: item.amount,
      schoolYear: item.schoolYear || '',
      gradeLevel: '',
    });
    setEditItem(item);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editItem) {
        const { data } = await api.put(`/accounting/cat-particulars/${editItem.public_id}`, values);
        return data;
      }
      const { data } = await api.post('/accounting/cat-particulars', values);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cat-particulars'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(editItem ? 'Updated.' : 'Created.');
      setDialogOpen(false);
    },
    onError: () => toast.error('Failed to save.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/accounting/cat-particulars/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cat-particulars'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Deleted.');
    },
    onError: () => toast.error('Failed to delete.'),
  });

  const items = data?.data ?? [];
  const filtered = search
    ? items.filter((cp) =>
        (cp.category?.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (cp.particular?.description ?? '').toLowerCase().includes(search.toLowerCase()))
    : items;

  const columns: ColumnDef<CatParticular>[] = [
    {
      accessorKey: 'category',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: ({ row }) => <span className="font-medium">{row.original.category?.description ?? `#${row.original.category_id}`}</span>,
    },
    {
      accessorKey: 'particular',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Particular" />,
      cell: ({ row }) => row.original.particular?.description ?? `#${row.original.particular_id}`,
    },
    {
      accessorKey: 'amount',
      header: () => <span className="flex justify-end">Amount</span>,
      cell: ({ row }) => <div className="text-right tabular-nums font-medium">{formatPeso(row.original.amount)}</div>,
    },
    { accessorKey: 'schoolYear', header: 'SY' },
    {
      id: 'actions',
      cell: ({ row }) => {
        const cp = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(cp)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(cp.public_id); }}>
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
          <h1 className="text-2xl font-bold tracking-tight">Category–Particulars</h1>
          <p className="text-muted-foreground">Link fee particulars to categories</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Link Particular</Button>
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
        getRowId={(row) => row.public_id}
        noResultsMessage="No category-particulars found."
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterCategory} onValueChange={(v) => { setFilterCategory((v ?? '') === 'all' ? '' : (v ?? '')); setPage(1); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(categories ?? []).map((c) => <SelectItem key={c.category_id} value={String(c.category_id)}>{c.description}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Link' : 'Link Particular to Category'}</DialogTitle>
            <DialogDescription>Assign a particular to a category with an amount.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v as FormValues))} className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.watch('category_id') || ''} onValueChange={(v) => form.setValue('category_id', v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map((c) => <SelectItem key={c.public_id} value={c.public_id}>{c.description}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.formState.errors.category_id && <p className="text-sm text-destructive">{form.formState.errors.category_id.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Particular</Label>
              <Select value={form.watch('particular_id') || ''} onValueChange={(v) => form.setValue('particular_id', v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Select particular" /></SelectTrigger>
                <SelectContent>
                  {(particulars ?? []).map((p) => <SelectItem key={p.public_id} value={p.public_id}>{p.description} ({p.account_code})</SelectItem>)}
                </SelectContent>
              </Select>
              {form.formState.errors.particular_id && <p className="text-sm text-destructive">{form.formState.errors.particular_id.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" {...form.register('cat_par_amount')} />
              </div>
              <div className="space-y-2">
                <Label>School Year</Label>
                <Input {...form.register('schoolYear')} />
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
