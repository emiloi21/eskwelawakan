import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { PaymentTerm, PaginatedResponse } from '@/types';
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
import { DEPARTMENTS, PAYMENT_TERM_CATEGORIES } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';
import { useLookups } from '@/hooks/use-lookups';

const MONTH_NAMES: Record<string, string> = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December',
  '13': 'Upon Enrollment',
};

const schema = z.object({
  payment_term: z.string().min(1, 'Required'),
  category: z.string().min(1, 'Required'),
  month_set_up: z.string().optional(),
  dept: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

export default function PaymentTermsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { data: lookups } = useLookups();
  const sy = user?.selected_sy || lookups?.active_school_year || '';
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<PaymentTerm | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<PaymentTerm>>({
    queryKey: ['payment-terms', page, pageSize],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/payment-terms?page=${page}&per_page=${pageSize}`);
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { payment_term: '', category: '', month_set_up: '', dept: '' },
  });

  const openAdd = () => {
    form.reset({ payment_term: '', category: '', month_set_up: '', dept: '' });
    setEditItem(null);
    setDialogOpen(true);
  };

  const openEdit = (item: PaymentTerm) => {
    form.reset({
      payment_term: item.payment_term,
      category: item.category ?? '',
      month_set_up: item.month_set_up || '',
      dept: item.dept,
    });
    setEditItem(item);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = { ...values, schoolYear: sy };
      if (editItem) {
        const { data } = await api.put(`/accounting/payment-terms/${editItem.public_id}`, payload);
        return data;
      }
      const { data } = await api.post('/accounting/payment-terms', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-terms'] });
      toast.success(editItem ? 'Updated.' : 'Created.');
      setDialogOpen(false);
    },
    onError: () => toast.error('Failed to save.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/accounting/payment-terms/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-terms'] });
      toast.success('Deleted.');
    },
    onError: () => toast.error('Failed to delete.'),
  });

  const items = data?.data ?? [];
  const filtered = search ? items.filter((t) => t.payment_term.toLowerCase().includes(search.toLowerCase())) : items;

  const columns: ColumnDef<PaymentTerm>[] = [
    {
      accessorKey: 'payment_term',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Payment Term" />,
      cell: ({ row }) => <span className="font-medium">{row.original.payment_term}</span>,
    },
    { accessorKey: 'category', header: ({ column }) => <DataTableColumnHeader column={column} title="Mode of Payment" /> },
    {
      accessorKey: 'month_set_up',
      header: 'Month Payable',
      cell: ({ row }) => {
        const t = row.original;
        if (
          t.category === 'Monthly' ||
          (t.payment_term && t.payment_term.toLowerCase().includes('monthly'))
        ) {
          return `${t.month_set_up} months payable`;
        }
        if (t.category === 'Full' || (t.payment_term && t.payment_term.toLowerCase().includes('full'))) {
          return MONTH_NAMES[t.month_set_up ?? ''] ?? t.month_set_up;
        }
        const mm = MONTH_NAMES[t.month_set_up ?? ''] ?? t.month_set_up;
        return t.year_set_up && t.year_set_up !== '-' ? `${mm} ${t.year_set_up}` : mm;
      },
    },
    { accessorKey: 'dept', header: 'Department' },
    {
      id: 'actions',
      cell: ({ row }) => {
        const t = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(t)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(t.public_id); }}>
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
          <h1 className="text-2xl font-bold tracking-tight">Payment Terms</h1>
          <p className="text-muted-foreground">Manage payment term schedules</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Term</Button>
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
        noResultsMessage="No payment terms found."
        toolbar={
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search terms..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Payment Term' : 'Add Payment Term'}</DialogTitle>
            <DialogDescription>Configure a payment schedule.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => {
            const payload = { ...v };
            if (v.category === 'Full') payload.month_set_up = '13';
            saveMutation.mutate(payload);
          })} className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Term</Label>
              <Input {...form.register('payment_term')} placeholder="e.g., Tuition Fee" />
              {form.formState.errors.payment_term && <p className="text-sm text-destructive">{form.formState.errors.payment_term.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.watch('category')} onValueChange={(v) => {
                  form.setValue('category', v ?? '');
                  if (v === 'Full') form.setValue('month_set_up', '13');
                  else form.setValue('month_set_up', '');
                }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{PAYMENT_TERM_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={form.watch('dept')} onValueChange={(v) => form.setValue('dept', v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.watch('category') === 'Monthly' && (
              <div className="space-y-2">
                <Label>No. of Months Payable</Label>
                <Select value={form.watch('month_set_up') || ''} onValueChange={(v) => form.setValue('month_set_up', v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Select months" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((m) => (
                      <SelectItem key={m} value={m}>{m} {Number(m) === 1 ? 'month' : 'months'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
