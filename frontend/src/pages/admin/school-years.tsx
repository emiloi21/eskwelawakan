import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { SchoolYear, FiscalYearPreview, SchoolPreference } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Loader2, Plus, Power, Lock, Trash2, Pencil, RefreshCw, CalendarClock, MoreVertical, Printer, Download } from 'lucide-react';

const SEMESTERS = [
  '1st Semester', '2nd Semester', 'Summer',
  '1st Trimester', '2nd Trimester', '3rd Trimester',
] as const;

const formatDate = (date: string | null) => {
  if (!date) return '—';
  const datePart = date.split('T')[0]; // ensure plain YYYY-MM-DD
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
};

const sySchema = z.object({
  school_year: z.string().regex(/^\d{4}-\d{4}$/, 'Format: YYYY-YYYY'),
  fy_start_date: z.string().optional(),
  fy_end_date: z.string().optional(),
});

type SYFormValues = z.infer<typeof sySchema>;

export default function SchoolYearsPage() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSY, setEditSY] = useState<SchoolYear | null>(null);
  const [closingOpen, setClosingOpen] = useState(false);
  const [selectedSY, setSelectedSY] = useState<SchoolYear | null>(null);
  const [preview, setPreview] = useState<FiscalYearPreview | null>(null);
  const [activateOpen, setActivateOpen] = useState(false);
  const [activatingSY, setActivatingSY] = useState<SchoolYear | null>(null);
  const [activateSemester, setActivateSemester] = useState('1st Semester');
  const [semesterOpen, setSemesterOpen] = useState(false);
  const [changeSemester, setChangeSemester] = useState('1st Semester');

  const { data: schoolYears, isLoading } = useQuery<SchoolYear[]>({
    queryKey: ['school-years'],
    queryFn: async () => {
      const { data } = await api.get('/admin/school-years');
      return data.data;
    },
  });

  const { data: preferences } = useQuery<SchoolPreference>({
    queryKey: ['school-preferences'],
    queryFn: async () => {
      const { data } = await api.get('/admin/school-preferences');
      return data.data;
    },
  });

  const addForm = useForm<SYFormValues>({
    resolver: zodResolver(sySchema),
  });

  const editForm = useForm<SYFormValues>({
    resolver: zodResolver(sySchema),
  });

  const createMutation = useMutation({
    mutationFn: async (values: SYFormValues) => {
      const { data } = await api.post('/admin/school-years', values);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-years'] });
      toast.success('School year created.');
      setAddOpen(false);
      addForm.reset();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to create school year.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: SYFormValues) => {
      const { data } = await api.put(`/admin/school-years/${editSY!.public_id}`, values);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-years'] });
      toast.success('School year updated.');
      setEditOpen(false);
      setEditSY(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to update school year.');
    },
  });

  const activateMutation = useMutation({
    mutationFn: async ({ id, semester }: { id: string; semester: string }) => {
      await api.post(`/admin/school-years/${id}/activate`, { semester });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-years'] });
      queryClient.invalidateQueries({ queryKey: ['school-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['lookups'] });
      toast.success('School year activated.');
      setActivateOpen(false);
      setActivatingSY(null);
      setActivateSemester('1st Semester');
    },
    onError: () => {
      toast.error('Failed to activate school year.');
    },
  });

  const setActiveSemesterMutation = useMutation({
    mutationFn: async (semester: string) => {
      await api.post('/admin/school-years/set-active-semester', { semester });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['lookups'] });
      toast.success('Active semester updated.');
      setSemesterOpen(false);
    },
    onError: () => {
      toast.error('Failed to update active semester.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/school-years/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-years'] });
      toast.success('School year deleted.');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to delete school year.');
    },
  });

  const closingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/admin/school-years/${id}/fiscal-year-closing`);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['school-years'] });
      toast.success(`Fiscal year closed. ${data.data.students_processed} students processed.`);
      setClosingOpen(false);
      setSelectedSY(null);
      setPreview(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Fiscal year closing failed.');
    },
  });

  const handleFiscalYearPreview = async (sy: SchoolYear) => {
    try {
      const { data } = await api.get(`/admin/school-years/${sy.public_id}/fiscal-year-preview`);
      setPreview(data.data);
      setSelectedSY(sy);
      setClosingOpen(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to load preview.');
    }
  };

  const openActivate = (sy: SchoolYear) => {
    setActivatingSY(sy);
    setActivateSemester('1st Semester');
    setActivateOpen(true);
  };

  const openChangeSemester = () => {
    setChangeSemester(preferences?.activeSemester || '1st Semester');
    setSemesterOpen(true);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = schoolYears ?? [];
    printWindow.document.write(`
      <html><head><title>School Years</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        h2 { margin-bottom: 4px; } p { margin-top: 0; color: #666; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h2>School Years</h2>
      <table>
        <thead><tr><th>School Year</th><th>Status</th><th>FY Start</th><th>FY End</th><th>FY Closed</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${r.school_year}</td><td>${r.status}</td><td>${formatDate(r.fy_start_date)}</td><td>${formatDate(r.fy_end_date)}</td><td>${r.fy_closed ? 'Closed' : 'Open'}</td></tr>`).join('')}</tbody>
      </table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExport = () => {
    const rows = schoolYears ?? [];
    const header = 'School Year,Status,FY Start,FY End,FY Closed';
    const csv = [header, ...rows.map(r => `${r.school_year},${r.status},${formatDate(r.fy_start_date)},${formatDate(r.fy_end_date)},${r.fy_closed ? 'Closed' : 'Open'}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'school-years.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const openEdit = (sy: SchoolYear) => {
    editForm.reset({
      school_year: sy.school_year,
      fy_start_date: sy.fy_start_date ? sy.fy_start_date.split('T')[0] : '',
      fy_end_date: sy.fy_end_date ? sy.fy_end_date.split('T')[0] : '',
    });
    setEditSY(sy);
    setEditOpen(true);
  };

  const columns: ColumnDef<SchoolYear>[] = [
    {
      accessorKey: 'school_year',
      header: ({ column }) => <DataTableColumnHeader column={column} title="School Year" />,
      cell: ({ row }) => <span className="font-medium">{row.original.school_year}</span>,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <Badge variant={row.original.status === 'Active' ? 'default' : 'secondary'}>
            {row.original.status}
          </Badge>
          {row.original.status === 'Active' && preferences?.activeSemester && (
            <span className="text-xs text-muted-foreground">{preferences.activeSemester}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'fy_start_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="FY Start" />,
      cell: ({ row }) => formatDate(row.original.fy_start_date),
    },
    {
      accessorKey: 'fy_end_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="FY End" />,
      cell: ({ row }) => formatDate(row.original.fy_end_date),
    },
    {
      accessorKey: 'fy_closed',
      header: ({ column }) => <DataTableColumnHeader column={column} title="FY Closed" />,
      cell: ({ row }) => (
        <Badge variant={row.original.fy_closed ? 'destructive' : 'outline'}>
          {row.original.fy_closed ? 'Closed' : 'Open'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const sy = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(sy)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                {sy.status === 'Active' && (
                  <DropdownMenuItem onClick={openChangeSemester}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Change Semester
                  </DropdownMenuItem>
                )}
                {sy.status !== 'Active' && (
                  <DropdownMenuItem onClick={() => openActivate(sy)}>
                    <Power className="mr-2 h-4 w-4" /> Activate
                  </DropdownMenuItem>
                )}
                {!sy.fy_closed && (
                  <DropdownMenuItem onClick={() => handleFiscalYearPreview(sy)}>
                    <Lock className="mr-2 h-4 w-4" /> Close Fiscal Year
                  </DropdownMenuItem>
                )}
                {sy.status !== 'Active' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(sy.public_id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      enableSorting: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">School Years</h1>
          <p className="text-muted-foreground">Manage academic years and fiscal year closing</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => { addForm.reset({ school_year: '', fy_start_date: '', fy_end_date: '' }); setAddOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add School Year
          </Button>
        </div>
      </div>

      {/* Active SY + Semester Banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Currently Active</p>
              <p className="font-semibold">
                {preferences?.activeSchoolYear ?? '—'}
                {preferences?.activeSemester && (
                  <span className="ml-2 font-normal text-muted-foreground">· {preferences.activeSemester}</span>
                )}
              </p>
            </div>
          </div>
          {preferences?.activeSchoolYear && (
            <Button variant="outline" size="sm" onClick={openChangeSemester}>
              <RefreshCw className="mr-2 h-3 w-3" /> Change Semester
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={schoolYears ?? []}
            isLoading={isLoading}
            noResultsMessage="No school years found. Add one to get started."
          />
        </CardContent>
      </Card>

      {/* Activate School Year Dialog */}
      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate School Year</DialogTitle>
            <DialogDescription>
              Set <strong>{activatingSY?.school_year}</strong> as the active school year and choose the starting semester.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select value={activateSemester} onValueChange={(v) => v && setActivateSemester(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              This will deactivate the current school year and set <strong>{activatingSY?.school_year}</strong> as active for the <strong>{activateSemester}</strong>.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => activatingSY && activateMutation.mutate({ id: activatingSY.public_id, semester: activateSemester })}
              disabled={activateMutation.isPending}
            >
              {activateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Active Semester Dialog */}
      <Dialog open={semesterOpen} onOpenChange={setSemesterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Active Semester</DialogTitle>
            <DialogDescription>
              Update the active semester for <strong>{preferences?.activeSchoolYear}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select value={changeSemester} onValueChange={(v) => v && setChangeSemester(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSemesterOpen(false)}>Cancel</Button>
            <Button
              onClick={() => setActiveSemesterMutation.mutate(changeSemester)}
              disabled={setActiveSemesterMutation.isPending}
            >
              {setActiveSemesterMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add School Year Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add School Year</DialogTitle>
            <DialogDescription>Create a new academic year</DialogDescription>
          </DialogHeader>
          <form onSubmit={addForm.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add_school_year">School Year</Label>
              <Input id="add_school_year" placeholder="2025-2026" {...addForm.register('school_year')} />
              {addForm.formState.errors.school_year && (
                <p className="text-sm text-destructive">{addForm.formState.errors.school_year.message}</p>
              )}
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="add_fy_start_date">FY Start Date</Label>
                <Input id="add_fy_start_date" type="date" {...addForm.register('fy_start_date')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add_fy_end_date">FY End Date</Label>
                <Input id="add_fy_end_date" type="date" {...addForm.register('fy_end_date')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit School Year Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit School Year</DialogTitle>
            <DialogDescription>Update school year details and fiscal year dates</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_school_year">School Year</Label>
              <Input id="edit_school_year" placeholder="2025-2026" {...editForm.register('school_year')} />
              {editForm.formState.errors.school_year && (
                <p className="text-sm text-destructive">{editForm.formState.errors.school_year.message}</p>
              )}
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit_fy_start_date">FY Start Date</Label>
                <Input id="edit_fy_start_date" type="date" {...editForm.register('fy_start_date')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_fy_end_date">FY End Date</Label>
                <Input id="edit_fy_end_date" type="date" {...editForm.register('fy_end_date')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fiscal Year Closing Dialog */}
      <Dialog open={closingOpen} onOpenChange={setClosingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fiscal Year Closing</DialogTitle>
            <DialogDescription>
              Close fiscal year for {selectedSY?.school_year}
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Impact Preview</CardTitle>
                  <CardDescription>The following records will be affected</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Students with balance</span>
                    <span className="font-semibold">{preview.students_with_balance}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total outstanding balance</span>
                    <span className="font-semibold">
                      ₱{preview.total_outstanding_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Records to convert</span>
                    <span className="font-semibold">{preview.records_to_convert}</span>
                  </div>
                </CardContent>
              </Card>
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                This action cannot be undone. Outstanding balances will be converted to "OLD ACCOUNT" entries.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosingOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedSY && closingMutation.mutate(selectedSY.public_id)}
              disabled={closingMutation.isPending}
            >
              {closingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process Closing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
