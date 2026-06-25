import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { Book, PaginatedResponse } from '@/types';
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
import { GRADE_LEVELS } from '@/lib/constants';

const schema = z.object({
  book_title: z.string().min(1, 'Required'),
  book_amt: z.coerce.number().min(0, 'Must be >= 0') as unknown as z.ZodNumber,
  gradeLevel: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

export default function BooksPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Book | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<Book>>({
    queryKey: ['books', page, pageSize],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/books?page=${page}&per_page=${pageSize}`);
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { book_title: '', book_amt: 0, gradeLevel: '' },
  });

  const openAdd = () => {
    form.reset({ book_title: '', book_amt: 0, gradeLevel: '' });
    setEditItem(null);
    setDialogOpen(true);
  };

  const openEdit = (item: Book) => {
    form.reset({ book_title: item.book_title, book_amt: item.book_amt, gradeLevel: item.gradeLevel });
    setEditItem(item);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editItem) {
        const { data } = await api.put(`/accounting/books/${editItem.public_id}`, values);
        return data;
      }
      const { data } = await api.post('/accounting/books', values);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast.success(editItem ? 'Updated.' : 'Created.');
      setDialogOpen(false);
    },
    onError: () => toast.error('Failed to save.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/accounting/books/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast.success('Deleted.');
    },
    onError: () => toast.error('Failed to delete.'),
  });

  const items = data?.data ?? [];
  const filtered = search ? items.filter((b) => b.book_title.toLowerCase().includes(search.toLowerCase())) : items;

  const columns: ColumnDef<Book>[] = [
    {
      accessorKey: 'book_title',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Book Title" />,
      cell: ({ row }) => <span className="font-medium">{row.original.book_title}</span>,
    },
    {
      accessorKey: 'book_amt',
      header: () => <span className="flex justify-end">Price</span>,
      cell: ({ row }) => <div className="text-right tabular-nums font-medium">{formatPeso(row.original.book_amt)}</div>,
    },
    { accessorKey: 'gradeLevel', header: ({ column }) => <DataTableColumnHeader column={column} title="Grade Level" /> },
    {
      id: 'actions',
      cell: ({ row }) => {
        const b = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(b)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Delete this book?')) deleteMutation.mutate(b.public_id); }}>
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
          <h1 className="text-2xl font-bold tracking-tight">Books</h1>
          <p className="text-muted-foreground">Manage textbook inventory and pricing</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Book</Button>
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
        noResultsMessage="No books found."
        toolbar={
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search books..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Book' : 'Add Book'}</DialogTitle>
            <DialogDescription>Manage textbook details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v as FormValues))} className="space-y-4">
            <div className="space-y-2">
              <Label>Book Title</Label>
              <Input {...form.register('book_title')} />
              {form.formState.errors.book_title && <p className="text-sm text-destructive">{form.formState.errors.book_title.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input type="number" step="0.01" {...form.register('book_amt')} />
              </div>
              <div className="space-y-2">
                <Label>Grade Level</Label>
                <Select value={form.watch('gradeLevel')} onValueChange={(v) => form.setValue('gradeLevel', v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{GRADE_LEVELS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
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
