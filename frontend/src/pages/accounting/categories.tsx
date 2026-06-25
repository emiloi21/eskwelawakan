import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { AccountCategory, AccountParticular, CatParticular, PaginatedResponse, PaymentTerm } from '@/types';
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
import { Loader2, Plus, Search, Pencil, Trash2, MoreVertical, List } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { useGradeLevelOptions } from '@/hooks/use-grade-level-options';
import { useLookups } from '@/hooks/use-lookups';

import { TooltipProvider } from '@/components/ui/tooltip';

const schema = z.object({
  paymentTerm: z.string().optional(),
  gradeLevel: z.string().optional(),
  strand: z.string().optional(),
  major: z.string().optional(),
  schoolYear: z.string().optional(),
  description: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

const itemSchema = z.object({
  amount: z.coerce.number().min(0, 'Must be >= 0') as unknown as z.ZodNumber,
  paymentTerm: z.string().optional(),
});
type ItemFormValues = z.infer<typeof itemSchema>;

function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: lookups } = useLookups();
  const sy = user?.selected_sy || lookups?.active_school_year || '';
  const sem = user?.selected_sem || lookups?.active_semester || '';
  const gradeLevelsByDept = useGradeLevelOptions(sy);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterGrade, setFilterGrade] = useState('');
  const [search, setSearch] = useState('');
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<AccountCategory | null>(null);
  const [selectedGradeLevels, setSelectedGradeLevels] = useState<string[]>([]);
  const [manageCategory, setManageCategory] = useState<AccountCategory | null>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editCatPar, setEditCatPar] = useState<CatParticular | null>(null);
  const [selectedParticulars, setSelectedParticulars] = useState<string[]>([]);
  const [bulkPaymentTerm, setBulkPaymentTerm] = useState('');
  const [particularSearch, setParticularSearch] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse<AccountCategory>>({
    queryKey: ['categories', page, pageSize, filterGrade, sy],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: String(pageSize) });
      if (filterGrade) params.set('gradeLevel', filterGrade);
      if (sy) params.set('schoolYear', sy);
      const { data } = await api.get(`/accounting/categories?${params}`);
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { schoolYear: sy, gradeLevel: '', description: '' },
  });

  const openAdd = () => {
    form.reset({ schoolYear: sy, gradeLevel: '', description: '', strand: 'N/A', major: 'N/A' });
    setSelectedGradeLevels([]);
    setEditItem(null);
    setDialogOpen(true);
  };

  const openEdit = (item: AccountCategory) => {
    form.reset({
      gradeLevel: item.gradeLevel, strand: item.strand, major: item.major,
      schoolYear: item.schoolYear, description: item.description,
    });
    setEditItem(item);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editItem) {
        const { data } = await api.put(`/accounting/categories/${editItem.public_id}`, { ...values, schoolYear: sy, semester: sem });
        return data;
      }
      const { gradeLevel: _gl, ...rest } = values;
      const payload = { ...rest, schoolYear: sy, semester: sem, gradeLevels: selectedGradeLevels };
      const { data } = await api.post('/accounting/categories', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(editItem ? 'Category updated.' : 'Category created.');
      setDialogOpen(false);
    },
    onError: () => toast.error('Failed to save category.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/accounting/categories/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted.');
    },
    onError: () => toast.error('Failed to delete. May have existing payments.'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(`/accounting/categories/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Selected categories deleted.');
      setRowSelection({});
    },
    onError: () => toast.error('Failed to delete some categories.'),
  });

  // ── Cat-particulars for selected category ──────────────────────
  const { data: catParsData, isLoading: catParsLoading } = useQuery<PaginatedResponse<CatParticular>>({
    queryKey: ['cat-particulars', manageCategory?.category_id],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/cat-particulars?category_id=${manageCategory!.category_id}&per_page=200`);
      return data;
    },
    enabled: !!manageCategory,
  });
  const catPars = catParsData?.data ?? [];

  const { data: particularsList } = useQuery<AccountParticular[]>({
    queryKey: ['particulars-list', manageCategory?.gradeLevel, manageCategory?.schoolYear],
    queryFn: async () => {
      const params = new URLSearchParams({ per_page: '500' });
      if (manageCategory?.gradeLevel) params.set('gradeLevel', manageCategory.gradeLevel);
      if (manageCategory?.schoolYear) params.set('schoolYear', manageCategory.schoolYear);
      const { data } = await api.get(`/accounting/particulars?${params}`);
      return data.data ?? data;
    },
    enabled: !!manageCategory || itemDialogOpen,
  });

  const { data: paymentTermsData } = useQuery<PaginatedResponse<PaymentTerm>>({
    queryKey: ['payment-terms', sy],
    queryFn: async () => {
      const params = new URLSearchParams({ per_page: '100' });
      if (sy) params.set('schoolYear', sy);
      const { data } = await api.get(`/accounting/payment-terms?${params}`);
      return data;
    },
    enabled: !!manageCategory || itemDialogOpen,
  });
  const paymentTerms = paymentTermsData?.data ?? [];

  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { amount: 0, paymentTerm: '' },
  });

  const openAddItem = () => {
    if (!manageCategory) return;
    setSelectedParticulars([]);
    setBulkPaymentTerm('');
    setParticularSearch('');
    setEditCatPar(null);
    setItemDialogOpen(true);
  };

  const openEditItem = (cp: CatParticular) => {
    itemForm.reset({ amount: cp.amount, paymentTerm: cp.paymentTerm ? String(cp.paymentTerm) : '' });
    setEditCatPar(cp);
    setItemDialogOpen(true);
  };

  const saveItemMutation = useMutation({
    mutationFn: async (values: ItemFormValues) => {
      const { data } = await api.put(`/accounting/cat-particulars/${editCatPar!.public_id}`, values);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cat-particulars', manageCategory?.category_id] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Item updated.');
      setItemDialogOpen(false);
    },
    onError: () => toast.error('Failed to save item.'),
  });

  const bulkAddMutation = useMutation({
    mutationFn: async (payload: { category_id: string; particular_ids: string[]; paymentTerm: string }) => {
      const { data } = await api.post('/accounting/cat-particulars/bulk', payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cat-particulars', manageCategory?.category_id] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(data.message || 'Particulars linked.');
      setItemDialogOpen(false);
    },
    onError: () => toast.error('Failed to add particulars.'),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/accounting/cat-particulars/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cat-particulars', manageCategory?.category_id] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Item removed.');
    },
    onError: () => toast.error('Failed to remove item.'),
  });

  const items = data?.data ?? [];
  const filtered = search ? items.filter((c) => c.description.toLowerCase().includes(search.toLowerCase())) : items;

  const columns: ColumnDef<AccountCategory>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(!!checked)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(!!checked)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span className="font-medium">{row.original.description}</span>,
    },
    {
      accessorKey: 'gradeLevel',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grade Level" />,
      cell: ({ row }) => {
        const { gradeLevel, strand } = row.original;
        return strand && strand !== 'N/A' ? `${gradeLevel} · ${strand}` : gradeLevel;
      },
    },
    {
      accessorKey: 'totalAmount',
      header: () => <span className="flex justify-end">Total Amount</span>,
      cell: ({ row }) => <div className="text-right tabular-nums font-medium">{formatPeso(row.original.totalAmount)}</div>,
    },
    {
      accessorKey: 'cat_particulars_count',
      header: () => <span className="flex justify-end">Items</span>,
      cell: ({ row }) => <div className="text-right">{row.original.cat_particulars_count ?? 0}</div>,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setManageCategory(c)}>
                  <List className="mr-2 h-4 w-4" /> Manage Items
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openEdit(c)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Delete this category?')) deleteMutation.mutate(c.public_id); }}>
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
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage fee category groupings</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
      </div>

      {Object.keys(rowSelection).length > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
          <span className="text-sm text-muted-foreground flex-1">{Object.keys(rowSelection).length} selected</span>
          <Button
            variant="destructive"
            size="sm"
            disabled={bulkDeleteMutation.isPending}
            onClick={() => {
              if (!confirm(`Delete ${Object.keys(rowSelection).length} selected category(s)?`)) return;
              bulkDeleteMutation.mutate(Object.keys(rowSelection));
            }}
          >
            {bulkDeleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>Clear</Button>
        </div>
      )}

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
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        noResultsMessage="No categories found."
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search description..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterGrade || 'all'} onValueChange={(v) => { setFilterGrade((v ?? '') === 'all' ? '' : (v ?? '')); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Grade Levels" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grade Levels</SelectItem>
                {Object.values(gradeLevelsByDept).flat().map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />



      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={editItem ? 'max-w-lg' : 'max-w-2xl'}>
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>Define a fee category grouping.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => {
            if (!editItem && selectedGradeLevels.length === 0) {
              toast.error('Select at least one grade level'); return;
            }
            saveMutation.mutate(v);
          })} className="space-y-4">
            <div className="space-y-2">
              <Label>Grade Level{!editItem && 's'}</Label>
              {editItem ? (
                <Input value={form.watch('gradeLevel')} readOnly className="bg-muted" />
              ) : (
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-3">
                  {Object.entries(gradeLevelsByDept).map(([dept, grades]) => (
                    <div key={dept}>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{dept}</p>
                      <div className="grid grid-cols-2 gap-1">
                        {grades.map((g) => (
                          <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={selectedGradeLevels.includes(g)}
                              onCheckedChange={(checked) =>
                                setSelectedGradeLevels((prev) =>
                                  checked ? [...prev, g] : prev.filter((v) => v !== g)
                                )
                              }
                            />
                            {g}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input {...form.register('description')} placeholder="e.g., Tuition Fee, Misc Fees" />
              {form.formState.errors.description && <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>}
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

      {/* ── Manage Items Dialog ───────────────────────────────── */}
      <Dialog open={!!manageCategory} onOpenChange={(open) => { if (!open) setManageCategory(null); }}>
        <TooltipProvider>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Items — {manageCategory?.description}</DialogTitle>
            <DialogDescription>
              {manageCategory?.gradeLevel} · {manageCategory?.schoolYear} · Total: {formatPeso(manageCategory?.totalAmount ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="mb-3 flex justify-end">
              <Button size="sm" onClick={openAddItem}><Plus className="mr-2 h-4 w-4" /> Add Particular</Button>
            </div>
            {catParsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : catPars.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No particulars linked yet.</p>
            ) : (
              <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2 text-left font-medium">Particular</th>
                          <th className="px-4 py-2 text-left font-medium">Payment Term</th>
                          <th className="px-4 py-2 text-right font-medium">Amount</th>
                          <th className="px-4 py-2 w-[50px]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {catPars.map((cp) => (
                          <tr key={cp.public_id} className="border-b last:border-0">
                            <td className="px-4 py-2 font-medium">{cp.particular?.description ?? cp.description}</td>
                              <td className="px-4 py-2 text-muted-foreground">
                                {(() => {
                                  const ptValue = cp.paymentTerm ? String(cp.paymentTerm) : '';
                                  if (!ptValue) return '—';
                                  const pt = paymentTerms.find((pt) => String(pt.pterm_id) === ptValue);
                                  return pt ? pt.payment_term : '—';
                                })()}
                              </td>
                           <td className="px-4 py-2 text-right tabular-nums">{formatPeso(cp.amount)}</td>
                           <td className="px-4 py-2">
                             <DropdownMenu>
                               <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                                 <MoreVertical className="h-4 w-4" />
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={() => openEditItem(cp)}>
                                   <Pencil className="mr-2 h-4 w-4" /> Edit
                                 </DropdownMenuItem>
                                 <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Remove this particular?')) deleteItemMutation.mutate(cp.public_id); }}>
                                   <Trash2 className="mr-2 h-4 w-4" /> Remove
                                 </DropdownMenuItem>
                               </DropdownMenuContent>
                             </DropdownMenu>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
              </div>
            )}
           </div>
         </DialogContent>
        </TooltipProvider>
       </Dialog>
 
       {/* ── Add/Edit Cat-Particular Dialog ────────────────────── */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className={editCatPar ? 'max-w-md' : 'max-w-2xl max-h-[85vh] flex flex-col'}>
          <DialogHeader>
            <DialogTitle>{editCatPar ? 'Edit Item' : 'New Category Particulars'}</DialogTitle>
            <DialogDescription>
              {editCatPar
                ? `Edit ${editCatPar.particular?.description ?? editCatPar.description}`
                : `Select particulars to add to ${manageCategory?.description}.`}
            </DialogDescription>
          </DialogHeader>
          {editCatPar ? (
            <form onSubmit={itemForm.handleSubmit((v) => saveItemMutation.mutate(v))} className="space-y-4">
              <div className="space-y-2">
                <Label>Particular</Label>
                <Input value={editCatPar.particular?.description ?? editCatPar.description} readOnly className="bg-muted" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" {...itemForm.register('amount')} />
                </div>
<div className="space-y-2">
  <Label>Payment Term</Label>
  <Select value={itemForm.watch('paymentTerm')} onValueChange={(v) => itemForm.setValue('paymentTerm', v ?? '')}>
    <SelectTrigger>
      <SelectValue placeholder="Select payment term">
        {itemForm.watch('paymentTerm') ? (() => {
          const ptValue = itemForm.watch('paymentTerm');
          const pt = paymentTerms.find((pt) => String(pt.pterm_id) === ptValue);
          return pt ? (pt.payment_term === 'Full' || pt.payment_term === 'Monthly' ? pt.payment_term : `${pt.payment_term} | ${pt.category}`) : '';
        })() : null}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      {paymentTerms.map((pt) => (
        <SelectItem key={pt.pterm_id} value={String(pt.pterm_id)}>
          {pt.payment_term === 'Full' || pt.payment_term === 'Monthly' ? pt.payment_term : `${pt.payment_term} | ${pt.category}`}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setItemDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saveItemMutation.isPending}>
                  {saveItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <>
              <div className="flex-1 overflow-auto space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search particulars..." className="pl-9" value={particularSearch} onChange={(e) => setParticularSearch(e.target.value)} />
                </div>
                <div className="rounded-md border max-h-[40vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b bg-primary text-primary-foreground">
                        <th className="px-4 py-2 text-left font-medium w-[50px]">
                          <Checkbox
                            checked={(() => {
                              const available = (particularsList ?? []).filter((p) =>
                                !catPars.some((cp) => cp.particular_id === p.particular_id) &&
                                (!particularSearch || p.description.toLowerCase().includes(particularSearch.toLowerCase()))
                              );
                              return available.length > 0 && available.every((p) => selectedParticulars.includes(p.public_id));
                            })()}
                            onCheckedChange={(checked) => {
                              const available = (particularsList ?? []).filter((p) =>
                                !catPars.some((cp) => cp.particular_id === p.particular_id) &&
                                (!particularSearch || p.description.toLowerCase().includes(particularSearch.toLowerCase()))
                              ).map((p) => p.public_id);
                              setSelectedParticulars(checked ? [...new Set([...selectedParticulars, ...available])] : selectedParticulars.filter((id) => !available.includes(id)));
                            }}
                          />
                        </th>
                        <th className="px-4 py-2 text-left font-medium">Name</th>
                        <th className="px-4 py-2 text-left font-medium">Account Group</th>
                        <th className="px-4 py-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(particularsList ?? []).filter((p) =>
                        !catPars.some((cp) => cp.particular_id === p.particular_id) &&
                        (!particularSearch || p.description.toLowerCase().includes(particularSearch.toLowerCase()))
                      ).map((p) => (
                        <tr key={p.public_id} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedParticulars((prev) => prev.includes(p.public_id) ? prev.filter((id) => id !== p.public_id) : [...prev, p.public_id])}>
                          <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={selectedParticulars.includes(p.public_id)} onCheckedChange={(checked) => setSelectedParticulars((prev) => checked ? [...prev, p.public_id] : prev.filter((id) => id !== p.public_id))} />
                          </td>
                          <td className="px-4 py-2">{p.description}</td>
                          <td className="px-4 py-2 text-muted-foreground">{p.account_group || '—'}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{formatPeso(p.amount)}</td>
                        </tr>
                      ))}
                      {(particularsList ?? []).filter((p) =>
                        !catPars.some((cp) => cp.particular_id === p.particular_id) &&
                        (!particularSearch || p.description.toLowerCase().includes(particularSearch.toLowerCase()))
                      ).length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No available particulars.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
<div className="space-y-2">
  <Label>Payment Term</Label>
  <Select value={bulkPaymentTerm} onValueChange={(v) => setBulkPaymentTerm(v ?? '')}>
    <SelectTrigger>
      <SelectValue placeholder="Select payment term">
        {bulkPaymentTerm ? (() => {
          const pt = paymentTerms.find((pt) => String(pt.pterm_id) === bulkPaymentTerm);
          return pt ? (pt.payment_term === 'Full' || pt.payment_term === 'Monthly' ? pt.payment_term : `${pt.payment_term} | ${pt.category}`) : '';
        })() : null}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      {paymentTerms.map((pt) => (
        <SelectItem key={pt.pterm_id} value={String(pt.pterm_id)}>
          {pt.payment_term === 'Full' || pt.payment_term === 'Monthly' ? pt.payment_term : `${pt.payment_term} | ${pt.category}`}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
              </div>
              <DialogFooter>
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-muted-foreground">{selectedParticulars.length} selected</span>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setItemDialogOpen(false)}>Cancel</Button>
                                          
                    <Button
                      disabled={selectedParticulars.length === 0 || bulkAddMutation.isPending}
                      onClick={() => {
                        if (!manageCategory) return;
                        bulkAddMutation.mutate({
                          category_id: manageCategory.public_id,
                          particular_ids: selectedParticulars,
                          paymentTerm: bulkPaymentTerm,
                        });
                      }}
                    >
                      {bulkAddMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirm
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
