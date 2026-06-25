import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { Requirement, PaginatedResponse } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, Plus, Search, Pencil, Trash2, FileCheck, MoreVertical, Printer, Download } from 'lucide-react';
import { DEPARTMENTS, CLASSIFICATIONS } from '@/lib/constants';
import { useLookups } from '@/hooks/use-lookups';

const schema = z.object({
  dept: z.string().min(1, 'Required'),
  gradeLevel: z.string().min(1, 'Required'),
  classification: z.string().min(1, 'Required'),
  requirement_name: z.string().min(1, 'Required'),
  description: z.string().optional(),
  schoolYear: z.string().min(1, 'Required'),
  type: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function RequirementsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: lookups } = useLookups();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterDept, setFilterDept] = useState('');
  const [filterClassification, setFilterClassification] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Requirement | null>(null);

  const sy = user?.selected_sy || '';

  const { data, isLoading } = useQuery<PaginatedResponse<Requirement>>({
    queryKey: ['requirements', page, pageSize, filterDept, filterClassification, sy],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: String(pageSize) });
      if (filterDept) params.set('dept', filterDept);
      if (filterClassification) params.set('classification', filterClassification);
      if (sy) params.set('schoolYear', sy);
      const { data } = await api.get(`/registrar/requirements?${params}`);
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { schoolYear: sy || '', dept: '', classification: '' },
  });

  const openAdd = () => {
    form.reset({ schoolYear: sy || '', dept: '', classification: '', requirement_name: '', description: '', gradeLevel: '' });
    setEditItem(null);
    setDialogOpen(true);
  };

  const openEdit = (r: Requirement) => {
    form.reset({
      dept: r.dept,
      gradeLevel: r.gradeLevel,
      classification: r.classification,
      requirement_name: r.requirement_name,
      description: r.description ?? '',
      schoolYear: r.schoolYear,
      type: r.type ?? '',
    });
    setEditItem(r);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editItem) {
        const { data } = await api.put(`/registrar/requirements/${editItem.public_id}`, values);
        return data;
      }
      const { data } = await api.post('/registrar/requirements', values);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      toast.success(editItem ? 'Requirement updated.' : 'Requirement created.');
      setDialogOpen(false);
    },
    onError: () => toast.error('Failed to save requirement.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/registrar/requirements/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      toast.success('Requirement deleted.');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || 'Cannot delete requirement.'),
  });

  const items = data?.data ?? [];

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = filtered;
    printWindow.document.write(`
      <html><head><title>Requirements</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        h2 { margin-bottom: 4px; } p { margin-top: 0; color: #666; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h2>Requirements</h2>
      <p>${filterDept ? 'Dept: ' + filterDept : ''}${filterClassification ? ' · Classification: ' + filterClassification : ''}</p>
      <table>
        <thead><tr><th>Requirement</th><th>Grade Level</th><th>Dept</th><th>Classification</th><th>Type</th><th>Submitted</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${r.requirement_name}</td><td>${r.gradeLevel}</td><td>${r.dept}</td><td>${r.classification}</td><td>${r.type || '—'}</td><td>${r.student_requirements_count ?? 0}</td></tr>`).join('')}</tbody>
      </table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filterDept) params.set('dept', filterDept);
    if (filterClassification) params.set('classification', filterClassification);
    const url = `${import.meta.env.VITE_API_URL || '/api'}/registrar/requirements/export?${params}`;
    window.open(url, '_blank');
  };

  const filtered = search
    ? items.filter((r) =>
        r.requirement_name.toLowerCase().includes(search.toLowerCase()) ||
        r.gradeLevel.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const columns: ColumnDef<Requirement>[] = [
    {
      accessorKey: 'requirement_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Requirement" />,
      cell: ({ row }) => <span className="font-medium">{row.original.requirement_name}</span>,
    },
    {
      accessorKey: 'gradeLevel',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grade Level" />,
    },
    {
      accessorKey: 'dept',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Department" />,
    },
    {
      accessorKey: 'classification',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Classification" />,
    },
    {
      accessorKey: 'type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => row.original.type || '—',
      enableSorting: false,
    },
    {
      accessorKey: 'student_requirements_count',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Submitted" />,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="secondary" className="tabular-nums">
            <FileCheck className="mr-1 h-3 w-3" />
            {row.original.student_requirements_count ?? 0}
          </Badge>
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(r)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => { if (confirm('Delete this requirement?')) deleteMutation.mutate(r.public_id); }}>
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
          <h1 className="text-2xl font-bold tracking-tight">Requirements</h1>
          <p className="text-muted-foreground">Manage document requirements for enrollment</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Requirement
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
        noResultsMessage="No requirements found."
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search requirement name..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <DataTableFilterButton activeCount={[filterDept, filterClassification].filter(Boolean).length} onClick={() => setFilterOpen(true)} />
          </div>
        }
      />

      <DataTableFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeCount={[filterDept, filterClassification].filter(Boolean).length}
        onReset={() => { setFilterDept(''); setFilterClassification(''); setPage(1); }}
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
        <div className="space-y-1">
          <Label className="text-sm font-medium">Classification</Label>
          <Select value={filterClassification || 'all'} onValueChange={(v) => { setFilterClassification(v === 'all' ? '' : (v ?? '')); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All Classifications" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classifications</SelectItem>
              {CLASSIFICATIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Requirement' : 'Add Requirement'}</DialogTitle>
            <DialogDescription>
              {editItem ? 'Update requirement details' : 'Define a new document requirement'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <div className="space-y-1">
              <Label>Requirement Name *</Label>
              <Input {...form.register('requirement_name')} />
              {form.formState.errors.requirement_name && <p className="text-xs text-destructive">{form.formState.errors.requirement_name.message}</p>}
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
                <Label>Grade Level *</Label>
                <Input placeholder="Grade 7, Grade 11, etc." {...form.register('gradeLevel')} />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Classification *</Label>
                <Select value={form.watch('classification')} onValueChange={(v) => form.setValue('classification', v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CLASSIFICATIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>School Year *</Label>
                <Select value={form.watch('schoolYear')} onValueChange={(v) => form.setValue('schoolYear', v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(lookups?.school_years ?? []).map((sy) => <SelectItem key={sy} value={sy}>{sy}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Description</Label>
                <Input {...form.register('description')} />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Input placeholder="Original, Photocopy" {...form.register('type')} />
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
