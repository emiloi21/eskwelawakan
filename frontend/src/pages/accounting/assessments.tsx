import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { AccountAssessment, AccountCategory, AssessmentPayable, PaginatedResponse } from '@/types';
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
import { DEPARTMENTS } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { useGradeLevelOptions } from '@/hooks/use-grade-level-options';
import { useLookups } from '@/hooks/use-lookups';

import { TooltipProvider } from '@/components/ui/tooltip';

const schema = z.object({
  gradeLevel: z.string(),
  major: z.string().optional(),
  description: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

export default function AssessmentsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: lookups } = useLookups();
  const sy = user?.selected_sy || lookups?.active_school_year || '';
  const gradeLevelsByDept = useGradeLevelOptions(sy);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterDept, setFilterDept] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [search, setSearch] = useState('');
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<AccountAssessment | null>(null);
  const [selectedGradeLevels, setSelectedGradeLevels] = useState<string[]>([]);
  
  // Manage Categories dialog state
  const [manageAssessment, setManageAssessment] = useState<AccountAssessment | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse<AccountAssessment>>({
    queryKey: ['assessments', page, pageSize, filterDept, filterGrade, sy],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: String(pageSize) });
      if (filterDept) params.set('dept', filterDept);
      if (filterGrade) params.set('gradeLevel', filterGrade);
      if (sy) params.set('schoolYear', sy);
      const { data } = await api.get(`/accounting/assessments?${params}`);
      return data;
    },
  });

  // Fetch linked categories for selected assessment
  const { data: linkedCategoriesData, isLoading: linkedCategoriesLoading } = useQuery({
    queryKey: ['assessment-categories', manageAssessment?.assessment_id],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/assessments/${manageAssessment!.public_id}/settings`);
      return data.data;
    },
    enabled: !!manageAssessment,
  });
  const linkedPayables: AssessmentPayable[] = linkedCategoriesData?.payables ?? [];

  // Total amount across all linked categories
  const linkedTotal = linkedPayables.reduce((sum, p) => sum + (p.category?.totalAmount ?? 0), 0);

  // Fetch available categories for linking
  const { data: availableCategoriesData } = useQuery({
    queryKey: ['available-categories', manageAssessment?.gradeLevel, manageAssessment?.schoolYear],
    queryFn: async () => {
      const params = new URLSearchParams({ per_page: '500' });
      if (manageAssessment?.gradeLevel) params.set('gradeLevel', manageAssessment.gradeLevel);
      if (manageAssessment?.schoolYear) params.set('schoolYear', manageAssessment.schoolYear);
      const { data } = await api.get(`/accounting/categories?${params}`);
      return data.data ?? data;
    },
    enabled: !!manageAssessment || categoryDialogOpen,
  });
  const availableCategories: AccountCategory[] = availableCategoriesData ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { description: '', gradeLevel: '', major: 'N/A' },
  });

  const openAdd = () => {
    form.reset({ description: '', gradeLevel: '', major: 'N/A' });
    setSelectedGradeLevels([]);
    setEditItem(null);
    setDialogOpen(true);
  };

  const openEdit = (item: AccountAssessment) => {
    form.reset({
      gradeLevel: item.gradeLevel, major: item.major, description: item.description,
    });
    setEditItem(item);
    setDialogOpen(true);
  };

  // Helper: map grade level → dept using gradeLevelsByDept
  const getDeptForGrade = (grade: string): string =>
    Object.entries(gradeLevelsByDept).find(([, grades]) => grades.includes(grade))?.[0] ?? '';

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editItem) {
        const { data } = await api.put(`/accounting/assessments/${editItem.public_id}`, {
          ...values, dept: editItem.dept, schoolYear: sy, strand: editItem.strand, coverage: editItem.coverage,
        });
        return data;
      }
      // Group selected grades by dept, create one batch per dept
      const gradesByDept: Record<string, string[]> = {};
      for (const grade of selectedGradeLevels) {
        const dept = getDeptForGrade(grade);
        if (!gradesByDept[dept]) gradesByDept[dept] = [];
        gradesByDept[dept].push(grade);
      }
      const results = await Promise.all(
        Object.entries(gradesByDept).map(([dept, grades]) =>
          api.post('/accounting/assessments', { ...values, dept, gradeLevels: grades, schoolYear: sy, strand: 'N/A', coverage: '-' })
        )
      );
      return results[0].data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast.success(editItem ? 'Assessment updated.' : 'Assessment created.');
      setDialogOpen(false);
    },
    onError: () => toast.error('Failed to save assessment.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/accounting/assessments/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast.success('Assessment deleted.');
    },
    onError: () => toast.error('Failed to delete. May have existing student payments.'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(`/accounting/assessments/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast.success('Selected assessments deleted.');
      setRowSelection({});
    },
    onError: () => toast.error('Failed to delete some assessments.'),
  });

  // Manage Categories mutations
  const openManageCategories = (assessment: AccountAssessment) => {
    setManageAssessment(assessment);
    setSelectedCategories([]);
    setCategorySearch('');
  };

  const openAddCategories = () => {
    if (!manageAssessment) return;
    setSelectedCategories([]);
    setCategorySearch('');
    setCategoryDialogOpen(true);
  };

  const saveCategoriesMutation = useMutation({
    mutationFn: async (categoryIds: number[]) => {
      const { data } = await api.post(`/accounting/assessments/${manageAssessment!.public_id}/settings`, {
        category_ids: categoryIds,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-categories', manageAssessment?.assessment_id] });
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast.success('Categories updated.');
      setCategoryDialogOpen(false);
    },
    onError: () => toast.error('Failed to save categories.'),
  });

  const removeCategoryMutation = useMutation({
    mutationFn: async (payablePublicId: string) => {
      await api.delete(`/accounting/assessments/${manageAssessment!.public_id}/payables/${payablePublicId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-categories', manageAssessment?.assessment_id] });
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast.success('Category removed.');
    },
    onError: () => toast.error('Failed to remove category.'),
  });

  const items = data?.data ?? [];
  const filtered = search ? items.filter((a) => a.description.toLowerCase().includes(search.toLowerCase())) : items;

  const columns: ColumnDef<AccountAssessment>[] = [
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
      cell: ({ row }) => (
        <div className="text-right tabular-nums font-medium">{formatPeso(row.original.totalAmount ?? 0)}</div>
      ),
    },
    {
      id: 'categories_count',
      header: () => <span className="flex justify-end">Categories</span>,
      cell: ({ row }) => (
        <div className="text-right">{row.original.payables?.length ?? 0}</div>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openManageCategories(a)}>
                  <List className="mr-2 h-4 w-4" /> Manage Categories
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openEdit(a)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Delete this assessment?')) deleteMutation.mutate(a.public_id); }}>
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
          <h1 className="text-2xl font-bold tracking-tight">Assessments</h1>
          <p className="text-muted-foreground">Manage assessments and their linked categories</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Assessment</Button>
      </div>

      {Object.keys(rowSelection).length > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
          <span className="text-sm text-muted-foreground flex-1">{Object.keys(rowSelection).length} selected</span>
          <Button
            variant="destructive"
            size="sm"
            disabled={bulkDeleteMutation.isPending}
            onClick={() => {
              if (!confirm(`Delete ${Object.keys(rowSelection).length} selected assessment(s)?`)) return;
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
        noResultsMessage="No assessments found."
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search description..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterDept || 'all'} onValueChange={(v) => { setFilterDept((v ?? '') === 'all' ? '' : (v ?? '')); setFilterGrade(''); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterGrade || 'all'} onValueChange={(v) => { setFilterGrade((v ?? '') === 'all' ? '' : (v ?? '')); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Grade Levels" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grade Levels</SelectItem>
                {(filterDept ? (gradeLevelsByDept[filterDept] ?? []) : Object.values(gradeLevelsByDept).flat()).map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />



      {/* ── Add/Edit Assessment Dialog ─────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={editItem ? 'max-w-lg' : 'max-w-2xl'}>
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Assessment' : 'Add Assessment'}</DialogTitle>
            <DialogDescription>Fill in the assessment details.</DialogDescription>
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
                <Input value={`${editItem.dept} · ${form.watch('gradeLevel')}`} readOnly className="bg-muted" />
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
              <Input {...form.register('description')} placeholder="Assessment name (e.g., Regular, ESC, Scholarship)" />
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

      {/* ── Manage Categories Dialog ─────────────────────────── */}
      <Dialog open={!!manageAssessment} onOpenChange={(open) => { if (!open) setManageAssessment(null); }}>
        <TooltipProvider>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Categories — {manageAssessment?.description}</DialogTitle>
            <DialogDescription>
              {manageAssessment?.gradeLevel} · {manageAssessment?.schoolYear} · Total: {formatPeso(linkedTotal)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="mb-3 flex justify-end">
              <Button size="sm" onClick={openAddCategories}><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
            </div>
            {linkedCategoriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : linkedPayables.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No categories linked yet.</p>
            ) : (
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">Category</th>
                      <th className="px-4 py-2 text-right font-medium">Total Amount</th>
                      <th className="px-4 py-2 text-center font-medium">Items</th>
                      <th className="px-4 py-2 w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkedPayables.map((payable) => (
                      <tr key={payable.public_id} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium">{payable.category?.description}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatPeso(payable.category?.totalAmount ?? 0)}</td>
                        <td className="px-4 py-2 text-center">{payable.category?.cat_particulars?.length ?? payable.category?.cat_particulars_count ?? 0}</td>
                        <td className="px-4 py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Remove this category from assessment?')) removeCategoryMutation.mutate(payable.public_id); }}>
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

      {/* ── Add Categories Dialog ─────────────────────────── */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Categories to Assessment</DialogTitle>
            <DialogDescription>
              Select categories to add to {manageAssessment?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                className="pl-9"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
              />
            </div>
            <div className="rounded-md border max-h-[40vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b bg-primary text-primary-foreground">
                    <th className="px-4 py-2 text-left font-medium w-[50px]">
                      <Checkbox
                        checked={(() => {
                          const available = availableCategories.filter((c) =>
                            !linkedPayables.some((lp) => lp.category?.category_id === c.category_id) &&
                            (!categorySearch || c.description.toLowerCase().includes(categorySearch.toLowerCase()))
                          );
                          return available.length > 0 && available.every((c) => selectedCategories.includes(String(c.category_id)));
                        })()}
                        onCheckedChange={(checked) => {
                          const available = availableCategories
                            .filter((c) =>
                              !linkedPayables.some((lp) => lp.category?.category_id === c.category_id) &&
                              (!categorySearch || c.description.toLowerCase().includes(categorySearch.toLowerCase()))
                            )
                            .map((c) => String(c.category_id));
                          setSelectedCategories(checked ? [...new Set([...selectedCategories, ...available])] : selectedCategories.filter((id) => !available.includes(id)));
                        }}
                      />
                    </th>
                    <th className="px-4 py-2 text-left font-medium">Category Name</th>
                    <th className="px-4 py-2 text-right font-medium">Total Amount</th>
                    <th className="px-4 py-2 text-center font-medium">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {availableCategories
                    .filter((c) =>
                      !linkedPayables.some((lp) => lp.category?.category_id === c.category_id) &&
                      (!categorySearch || c.description.toLowerCase().includes(categorySearch.toLowerCase()))
                    )
                    .map((c) => (
                      <tr
                        key={c.public_id}
                        className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedCategories((prev) => prev.includes(String(c.category_id)) ? prev.filter((id) => id !== String(c.category_id)) : [...prev, String(c.category_id)])}
                      >
                        <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedCategories.includes(String(c.category_id))}
                            onCheckedChange={(checked) => setSelectedCategories((prev) => checked ? [...prev, String(c.category_id)] : prev.filter((id) => id !== String(c.category_id)))}
                          />
                        </td>
                        <td className="px-4 py-2">{c.description}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatPeso(c.totalAmount)}</td>
                        <td className="px-4 py-2 text-center">{c.cat_particulars_count ?? 0}</td>
                      </tr>
                    ))}
                  {availableCategories.filter((c) =>
                    !linkedPayables.some((lp) => lp.category?.category_id === c.category_id) &&
                    (!categorySearch || c.description.toLowerCase().includes(categorySearch.toLowerCase()))
                  ).length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No available categories.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">{selectedCategories.length} selected</span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
                <Button
                  disabled={selectedCategories.length === 0 || saveCategoriesMutation.isPending}
                  onClick={() => {
                    if (!manageAssessment) return;
                    // Combine existing linked categories with newly selected ones
                    const existingIds = linkedPayables.map((lp) => lp.category_id);
                    const newIds = selectedCategories.map((id) => parseInt(id));
                    const allIds = [...existingIds, ...newIds];
                    saveCategoriesMutation.mutate(allIds);
                  }}
                >
                  {saveCategoriesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
