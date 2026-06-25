import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { ClassSection, PaginatedResponse, Personnel } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DataTableFilterButton, DataTableFilterSheet } from '@/components/ui/data-table-filter-sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Loader2, Plus, Search, Pencil, Trash2, Users, Copy, MoreVertical, Printer, Download } from 'lucide-react';
import { DEPARTMENTS, SEMESTERS } from '@/lib/constants';
import { useLookups } from '@/hooks/use-lookups';

const classSchema = z.object({
  gradeLevel: z.string().min(1, 'Required'),
  strand: z.string().optional(),
  major: z.string().optional(),
  section: z.string().min(1, 'Required'),
  dept: z.string().min(1, 'Required'),
  adviser_id: z.coerce.number().optional() as unknown as z.ZodOptional<z.ZodNumber>,
  adviser: z.string().optional(),
  schoolYear: z.string().min(1, 'Required'),
  semester: z.string().optional(),
});

type ClassFormValues = z.infer<typeof classSchema>;

export default function ClassListPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: lookups } = useLookups();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterDept, setFilterDept] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClass, setEditClass] = useState<ClassSection | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [sourceSy, setSourceSy] = useState('');

  const sy = user?.selected_sy || '';

  const { data, isLoading } = useQuery<PaginatedResponse<ClassSection>>({
    queryKey: ['classes', page, pageSize, filterDept, sy],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: String(pageSize) });
      if (filterDept) params.set('dept', filterDept);
      if (sy) params.set('schoolYear', sy);
      const { data } = await api.get(`/registrar/classes?${params}`);
      return data;
    },
  });

  const { data: advisers } = useQuery<Personnel[]>({
    queryKey: ['advisers'],
    queryFn: async () => {
      const { data } = await api.get('/registrar/classes/advisers');
      return data.data;
    },
  });

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: { schoolYear: sy || '', dept: '' },
  });

  const openAdd = () => {
    form.reset({ schoolYear: sy || '', dept: '', section: '', gradeLevel: '' });
    setEditClass(null);
    setDialogOpen(true);
  };

  const openEdit = (c: ClassSection) => {
    form.reset({
      gradeLevel: c.gradeLevel,
      strand: c.strand === '-' ? '' : c.strand,
      major: c.major === 'N/A' ? '' : c.major,
      section: c.section,
      dept: c.dept,
      adviser_id: c.adviser_id || undefined,
      adviser: c.adviser === '-' ? '' : c.adviser,
      schoolYear: c.schoolYear,
      semester: c.semester === '-' ? '' : c.semester,
    });
    setEditClass(c);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: ClassFormValues) => {
      if (editClass) {
        const { data } = await api.put(`/registrar/classes/${editClass.public_id}`, values);
        return data;
      } else {
        const { data } = await api.post('/registrar/classes', values);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success(editClass ? 'Class updated.' : 'Class created.');
      setDialogOpen(false);
    },
    onError: (err: { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      const errors = err.response?.data?.errors;
      if (errors) {
        Object.values(errors).flat().forEach((m) => toast.error(m));
      } else {
        toast.error(err.response?.data?.message || 'Failed to save class.');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (publicId: string) => {
      await api.delete(`/registrar/classes/${publicId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Class deleted.');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to delete class.');
    },
  });

  const copyMutation = useMutation({
    mutationFn: async ({ source_sy, destination_sy }: { source_sy: string; destination_sy: string }) => {
      const { data } = await api.post('/registrar/classes/copy-from-year', { source_sy, destination_sy });
      return data;
    },
    onSuccess: (data: { message: string }) => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success(data.message);
      setCopyOpen(false);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to copy classes.');
    },
  });

  const classes = data?.data ?? [];

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = filtered;
    printWindow.document.write(`
      <html><head><title>Class Sections${sy ? ' — ' + sy : ''}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        h2 { margin-bottom: 4px; } p { margin-top: 0; color: #666; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h2>Class Sections</h2>
      <p>${sy ? 'School Year: ' + sy : ''}${filterDept ? ' · Dept: ' + filterDept : ''}</p>
      <table>
        <thead><tr><th>Grade Level</th><th>Section</th><th>Strand</th><th>Dept</th><th>Adviser</th><th>Students</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${r.gradeLevel}</td><td>${r.section}</td><td>${r.strand !== '-' ? r.strand : '—'}</td><td>${r.dept}</td><td>${r.adviser !== '-' ? r.adviser : '—'}</td><td>${r.students_count ?? 0}</td></tr>`).join('')}</tbody>
      </table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filterDept) params.set('dept', filterDept);
    if (sy) params.set('schoolYear', sy);
    const url = `${import.meta.env.VITE_API_URL || '/api'}/registrar/classes/export?${params}`;
    window.open(url, '_blank');
  };

  // Filter locally by search for section/grade
  const filtered = search
    ? classes.filter((c) =>
        c.section.toLowerCase().includes(search.toLowerCase()) ||
        c.gradeLevel.toLowerCase().includes(search.toLowerCase()) ||
        c.adviser.toLowerCase().includes(search.toLowerCase())
      )
    : classes;

  const columns: ColumnDef<ClassSection>[] = [
    {
      accessorKey: 'gradeLevel',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grade Level" />,
      cell: ({ row }) => <span className="font-medium">{row.original.gradeLevel}</span>,
    },
    {
      accessorKey: 'section',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Section" />,
    },
    {
      accessorKey: 'strand',
      header: 'Strand',
      cell: ({ row }) => row.original.strand !== '-' ? row.original.strand : '—',
      enableSorting: false,
    },
    {
      accessorKey: 'dept',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dept" />,
    },
    {
      accessorKey: 'adviser',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Adviser" />,
      cell: ({ row }) => row.original.adviser !== '-' ? row.original.adviser : '—',
    },
    {
      accessorKey: 'students_count',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Students" />,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="secondary" className="tabular-nums">
            <Users className="mr-1 h-3 w-3" />
            {row.original.students_count ?? 0}
          </Badge>
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(c)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => { if (confirm('Delete this class section?')) deleteMutation.mutate(c.public_id); }}>
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
          <h1 className="text-2xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground">Manage class sections{sy && ` — ${sy}`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => { setSourceSy(''); setCopyOpen(true); }}>
            <Copy className="mr-2 h-4 w-4" /> Copy from SY
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Class
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
        noResultsMessage="No classes found."
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search section, grade, or adviser..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editClass ? 'Edit Class' : 'Add Class'}</DialogTitle>
            <DialogDescription>
              {editClass ? 'Update class section details' : 'Create a new class section'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v as ClassFormValues))} className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Grade Level *</Label>
                <Input {...form.register('gradeLevel')} />
                {form.formState.errors.gradeLevel && <p className="text-xs text-destructive">{form.formState.errors.gradeLevel.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Section *</Label>
                <Input {...form.register('section')} />
                {form.formState.errors.section && <p className="text-xs text-destructive">{form.formState.errors.section.message}</p>}
              </div>
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
                <Label>Strand</Label>
                <Input placeholder="STEM, ABM, etc." {...form.register('strand')} />
              </div>
              <div className="space-y-1">
                <Label>Major</Label>
                <Input {...form.register('major')} />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Adviser</Label>
                {advisers && advisers.length > 0 ? (
                  <Select
                    value={String(form.watch('adviser_id') || '')}
                    onValueChange={(v) => {
                      const adv = advisers.find((a) => a.personnel_id === Number(v));
                      form.setValue('adviser_id', Number(v));
                      form.setValue('adviser', adv ? `${adv.lname}, ${adv.fname}` : '');
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select adviser" /></SelectTrigger>
                    <SelectContent>
                      {advisers.map((a) => (
                        <SelectItem key={a.personnel_id} value={String(a.personnel_id)}>
                          {a.lname}, {a.fname} {a.mname !== '-' ? a.mname.charAt(0) + '.' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input placeholder="Adviser name" {...form.register('adviser')} />
                )}
              </div>
              <div className="space-y-1">
                <Label>Semester</Label>
                <Select value={form.watch('semester') || ''} onValueChange={(v) => form.setValue('semester', v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editClass ? 'Save Changes' : 'Create Class'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Copy from SY Dialog */}
      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Copy Classes from School Year</DialogTitle>
            <DialogDescription>
              Copy all class sections from a previous school year to {sy || 'the active SY'}. Duplicates will be skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Source School Year</Label>
              <Select value={sourceSy} onValueChange={(v) => setSourceSy(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Select source SY" /></SelectTrigger>
                <SelectContent>
                  {(lookups?.school_years ?? [])
                    .filter((s: string) => s !== sy)
                    .map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyOpen(false)}>Cancel</Button>
            <Button
              disabled={!sourceSy || copyMutation.isPending}
              onClick={() => copyMutation.mutate({ source_sy: sourceSy, destination_sy: sy })}
            >
              {copyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Copy className="mr-2 h-4 w-4" /> Copy Classes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
