import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { DiscountCode, Discount, PaginatedResponse } from '@/types';
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
import { Loader2, Plus, Search, Pencil, Trash2, MoreVertical, Tag, Eye } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DEPARTMENTS, GRADE_LEVELS } from '@/lib/constants';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';

const schema = z.object({
  code:                       z.string().min(1, 'Required').max(50).transform(v => v.toUpperCase()),
  description:                z.string().min(1, 'Required').max(255),
  acct_discount_id:           z.string().min(1, 'Required'),
  deduct_category_id:         z.string().min(1, 'Required'),
  max_uses:                   z.string().optional(),
  valid_from:                 z.string().optional(),
  valid_until:                z.string().optional(),
  dept_restriction:           z.string().optional(),
  grade_level_restriction:    z.string().optional(),
  classification_restriction: z.string().optional(),
  is_active:                  z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface AccountCategory { category_id: number; public_id: string; description: string; }

export default function DiscountCodesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<DiscountCode | null>(null);
  const [redemptionsSheet, setRedemptionsSheet] = useState<DiscountCode | null>(null);

  // Load discount code list
  const { data, isLoading } = useQuery<PaginatedResponse<DiscountCode>>({
    queryKey: ['discount-codes', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const { data } = await api.get(`/accounting/discount-codes?${params}`);
      return data;
    },
  });

  // Load discount templates for the select dropdown
  const { data: discountsData } = useQuery<PaginatedResponse<Discount>>({
    queryKey: ['acct-discounts-lookup'],
    queryFn: async () => {
      const { data } = await api.get('/accounting/discounts?per_page=200');
      return data;
    },
  });

  // Load categories for the select dropdown
  const { data: categoriesData } = useQuery<{ data: AccountCategory[] }>({
    queryKey: ['acct-categories-lookup'],
    queryFn: async () => {
      const { data } = await api.get('/accounting/categories?per_page=200');
      return data;
    },
  });

  // Load redemptions for a specific code
  const { data: redemptionsData, isLoading: redemptionsLoading } = useQuery<{ data: { id: number; reg_id: number; school_year: string; created_at: string; student?: { lname: string; fname: string; student_id: string } }[] }>({
    queryKey: ['discount-code-redemptions', redemptionsSheet?.public_id],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/discount-codes/${redemptionsSheet!.public_id}/redemptions`);
      return data;
    },
    enabled: !!redemptionsSheet,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: '', description: '', acct_discount_id: '', deduct_category_id: '',
      max_uses: '', valid_from: '', valid_until: '',
      dept_restriction: '', grade_level_restriction: '', classification_restriction: '',
      is_active: true,
    } as FormValues,
  });

  const openAdd = () => {
    form.reset({
      code: '', description: '', acct_discount_id: '', deduct_category_id: '',
      max_uses: '', valid_from: '', valid_until: '',
      dept_restriction: '', grade_level_restriction: '', classification_restriction: '',
      is_active: true,
    });
    setEditItem(null);
    setDialogOpen(true);
  };

  const openEdit = (item: DiscountCode) => {
    form.reset({
      code:                       item.code,
      description:                item.description,
      acct_discount_id:           item.account_discount ? String(item.acct_discount_id) : '',
      deduct_category_id:         item.category ? String(item.deduct_category_id) : '',
      max_uses:                   item.max_uses != null ? String(item.max_uses) : '',
      valid_from:                 item.valid_from ?? '',
      valid_until:                item.valid_until ?? '',
      dept_restriction:           item.dept_restriction ?? '',
      grade_level_restriction:    item.grade_level_restriction ?? '',
      classification_restriction: item.classification_restriction ?? '',
      is_active:                  item.is_active,
    });
    setEditItem(item);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Look up public_ids for the select fields
      const discount = discountsData?.data.find(d => String(d.acct_discount_id) === values.acct_discount_id);
      const category = categoriesData?.data.find(c => String(c.category_id) === values.deduct_category_id);

      const payload = {
        ...values,
        acct_discount_id:   discount?.public_id ?? values.acct_discount_id,
        deduct_category_id: category?.public_id ?? values.deduct_category_id,
        max_uses:           values.max_uses ? Number(values.max_uses) : null,
        valid_from:         values.valid_from || null,
        valid_until:        values.valid_until || null,
        dept_restriction:           values.dept_restriction || null,
        grade_level_restriction:    values.grade_level_restriction || null,
        classification_restriction: values.classification_restriction || null,
      };
      if (editItem) {
        const { data } = await api.put(`/accounting/discount-codes/${editItem.public_id}`, payload);
        return data;
      }
      const { data } = await api.post('/accounting/discount-codes', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
      toast.success(editItem ? 'Code updated.' : 'Code created.');
      setDialogOpen(false);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to save code.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/accounting/discount-codes/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
      toast.success('Code deleted.');
    },
    onError: () => toast.error('Failed to delete code.'),
  });

  const items = data?.data ?? [];

  const columns: ColumnDef<DiscountCode>[] = [
    {
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => (
        <span className="font-mono font-semibold tracking-widest text-sm">{row.original.code}</span>
      ),
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span className="text-sm">{row.original.description}</span>,
    },
    {
      id: 'discount_template',
      header: 'Discount Template',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.account_discount?.description ?? '—'}</span>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.category?.description ?? '—'}</span>
      ),
    },
    {
      id: 'usage',
      header: () => <span className="flex justify-center">Usage</span>,
      cell: ({ row }) => {
        const { uses_count, max_uses } = row.original;
        return (
          <div className="text-center text-sm tabular-nums">
            {uses_count}{max_uses != null ? ` / ${max_uses}` : ''}
          </div>
        );
      },
    },
    {
      id: 'validity',
      header: 'Validity',
      cell: ({ row }) => {
        const { valid_from, valid_until } = row.original;
        if (!valid_from && !valid_until) return <span className="text-muted-foreground text-xs">No limit</span>;
        return (
          <span className="text-xs tabular-nums">
            {valid_from ?? '—'} → {valid_until ?? '∞'}
          </span>
        );
      },
    },
    {
      id: 'restrictions',
      header: 'Restrictions',
      cell: ({ row }) => {
        const { dept_restriction, grade_level_restriction, classification_restriction } = row.original;
        const tags = [dept_restriction, grade_level_restriction, classification_restriction].filter(Boolean);
        if (!tags.length) return <span className="text-muted-foreground text-xs">None</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
          </div>
        );
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Active',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const dc = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setRedemptionsSheet(dc); }}>
                  <Eye className="mr-2 h-4 w-4" /> View Redemptions
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openEdit(dc)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => { if (confirm(`Delete code "${dc.code}"?`)) deleteMutation.mutate(dc.public_id); }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const discounts = discountsData?.data ?? [];
  const categories = categoriesData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discount Codes</h1>
          <p className="text-muted-foreground">Create redeemable codes students can enter on their portal</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> New Code</Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        getRowId={(row) => row.public_id}
        noResultsMessage="No discount codes found."
        toolbar={
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search code or description..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        }
      />

      {/* ── Create / Edit Dialog ───────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              {editItem ? 'Edit Discount Code' : 'New Discount Code'}
            </DialogTitle>
            <DialogDescription>
              Configure the code students will enter to receive a discount.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit((v) => saveMutation.mutate(v as FormValues))}
            className="space-y-5 pt-2"
          >
            {/* Code + Description */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code <span className="text-destructive">*</span></Label>
                <Input
                  {...form.register('code')}
                  className="font-mono uppercase tracking-widest"
                  placeholder="e.g. SCHOLAR2025"
                />
                {form.formState.errors.code && (
                  <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Description <span className="text-destructive">*</span></Label>
                <Input {...form.register('description')} placeholder="e.g. Early Bird Scholarship" />
                {form.formState.errors.description && (
                  <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
                )}
              </div>
            </div>

            {/* Discount Template + Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Template <span className="text-destructive">*</span></Label>
                <Select
                  value={form.watch('acct_discount_id')}
                  onValueChange={(v) => form.setValue('acct_discount_id', v ?? '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select discount…" />
                  </SelectTrigger>
                  <SelectContent>
                    {discounts.map(d => (
                      <SelectItem key={d.acct_discount_id} value={String(d.acct_discount_id)}>
                        {d.description}
                        {d.classification === 'Percentage' ? ` (${d.percentage}%)` : ` (₱${d.amount})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.acct_discount_id && (
                  <p className="text-xs text-destructive">{form.formState.errors.acct_discount_id.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Apply to Category <span className="text-destructive">*</span></Label>
                <Select
                  value={form.watch('deduct_category_id')}
                  onValueChange={(v) => form.setValue('deduct_category_id', v ?? '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.category_id} value={String(c.category_id)}>
                        {c.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.deduct_category_id && (
                  <p className="text-xs text-destructive">{form.formState.errors.deduct_category_id.message}</p>
                )}
              </div>
            </div>

            {/* Max Uses + Validity */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Max Uses</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  {...form.register('max_uses')}
                />
                <p className="text-xs text-muted-foreground">Leave blank for unlimited</p>
              </div>
              <div className="space-y-2">
                <Label>Valid From</Label>
                <Input type="date" {...form.register('valid_from')} />
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Input type="date" {...form.register('valid_until')} />
              </div>
            </div>

            {/* Restrictions */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Restrictions (leave blank to allow all)</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Department</Label>
                  <Select
                    value={form.watch('dept_restriction') || 'none'}
                    onValueChange={(v) => form.setValue('dept_restriction', v === 'none' ? '' : (v ?? ''))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any</SelectItem>
                      {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Grade Level</Label>
                  <Select
                    value={form.watch('grade_level_restriction') || 'none'}
                    onValueChange={(v) => form.setValue('grade_level_restriction', v === 'none' ? '' : (v ?? ''))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any</SelectItem>
                      {GRADE_LEVELS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Classification</Label>
                  <Select
                    value={form.watch('classification_restriction') || 'none'}
                    onValueChange={(v) => form.setValue('classification_restriction', v === 'none' ? '' : (v ?? ''))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any</SelectItem>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Irregular">Irregular</SelectItem>
                      <SelectItem value="Transferee">Transferee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.watch('is_active')}
                onCheckedChange={(v) => form.setValue('is_active', v)}
                id="is_active"
              />
              <Label htmlFor="is_active">Code is active</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editItem ? 'Save Changes' : 'Create Code'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Redemptions Sheet ──────────────────────────────── */}
      <Sheet open={!!redemptionsSheet} onOpenChange={(o) => { if (!o) setRedemptionsSheet(null); }}>
        <SheetContent className="w-[480px] sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle className="font-mono tracking-widest">{redemptionsSheet?.code}</SheetTitle>
            <p className="text-sm text-muted-foreground">
              {redemptionsSheet?.uses_count ?? 0} use(s)
              {redemptionsSheet?.max_uses ? ` of ${redemptionsSheet.max_uses}` : ''}
            </p>
          </SheetHeader>
          <div className="mt-6">
            {redemptionsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : !redemptionsData?.data.length ? (
              <p className="text-sm text-muted-foreground italic py-8">No redemptions yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 text-left">Student</th>
                    <th className="py-2 text-left">SY</th>
                    <th className="py-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptionsData.data.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2">
                        {r.student
                          ? `${r.student.lname}, ${r.student.fname}`
                          : `#${r.reg_id}`}
                        {r.student && (
                          <span className="ml-1 text-xs text-muted-foreground">({r.student.student_id})</span>
                        )}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{r.school_year ?? '—'}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
