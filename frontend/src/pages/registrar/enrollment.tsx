import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table';
import api from '@/lib/api';
import type { Student, PaginatedResponse, EnrollmentPipeline, AccountAssessment } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DataTableFilterButton, DataTableFilterSheet } from '@/components/ui/data-table-filter-sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Loader2, Search, X,
  ClipboardList, CreditCard, UserCheck, UserX, Eye, Zap, MoreVertical, Printer, Download,
} from 'lucide-react';
import { DEPARTMENTS } from '@/lib/constants';

const STATUS_OPTIONS = [
  'For Accounts Assessment',
  'For Payment',
  'Enrolled',
  'Withdrawn',
  'Transferred Out',
  'Dropped',
] as const;

type StatusKey = (typeof STATUS_OPTIONS)[number];

const STATUS_ICONS: Record<string, typeof ClipboardList> = {
  'For Accounts Assessment': ClipboardList,
  'For Payment': CreditCard,
  'Enrolled': UserCheck,
  'Withdrawn': UserX,
  'Transferred Out': UserX,
  'Dropped': UserX,
};

const STATUS_COLORS: Record<string, string> = {
  'For Accounts Assessment': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'For Payment': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Enrolled': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Withdrawn': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'Transferred Out': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  'Dropped': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'Enrolled') return 'default';
  if (status === 'For Payment') return 'secondary';
  if (['Withdrawn', 'Dropped', 'Transferred Out'].includes(status)) return 'destructive';
  return 'outline';
}

export default function EnrollmentPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const sy = user?.selected_sy || '';

  const [filterStatus, setFilterStatus] = useState<StatusKey>('For Accounts Assessment');
  const [filterDept, setFilterDept] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Assessment picker dialog state
  const [assessDialogOpen, setAssessDialogOpen] = useState(false);
  const [assessDialogMode, setAssessDialogMode] = useState<'single' | 'bulk'>('single');
  const [assessDialogStudent, setAssessDialogStudent] = useState<Student | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);

  // Fetch matching assessments when dialog is open for a single student
  const { data: assessmentsForStudent, isLoading: assessmentsLoading } = useQuery<AccountAssessment[]>({
    queryKey: ['enrollment-assessments', assessDialogStudent?.public_id],
    queryFn: async () => {
      const { data } = await api.get(`/registrar/enrollment/${assessDialogStudent!.public_id}/assessments`);
      return data.data;
    },
    enabled: assessDialogOpen && assessDialogMode === 'single' && !!assessDialogStudent,
  });

  // Auto-assign assessment dialog state
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [autoAssignResult, setAutoAssignResult] = useState<{
    auto_assigned: number;
    needs_manual: number;
    details: Array<{ name: string; status: 'assigned' | 'skipped'; template?: string; reason?: string }>;
  } | null>(null);

  // Auto-select assessment: skip dialog when exactly 1 template matches
  const [autoAssessChecking, setAutoAssessChecking] = useState<string | null>(null);

  // Open assessment picker for single student
  const openAssessmentPicker = useCallback((student: Student) => {
    setAssessDialogStudent(student);
    setAssessDialogMode('single');
    setSelectedAssessmentId(null);
    setAssessDialogOpen(true);
  }, []);

  // Open assessment picker for bulk transition
  const openBulkAssessmentPicker = useCallback(() => {
    setAssessDialogStudent(null);
    setAssessDialogMode('bulk');
    setSelectedAssessmentId(null);
    setAssessDialogOpen(true);
  }, []);

  // Pipeline overview
  const { data: pipeline } = useQuery<EnrollmentPipeline>({
    queryKey: ['enrollment-pipeline', sy, filterDept],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sy) params.set('schoolYear', sy);
      if (filterDept) params.set('dept', filterDept);
      const { data } = await api.get(`/registrar/enrollment/pipeline?${params}`);
      return data.data;
    },
  });

  // Student list by status
  const { data: studentData, isLoading } = useQuery<PaginatedResponse<Student>>({
    queryKey: ['enrollment-students', page, pageSize, filterStatus, filterDept, sy, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: String(pageSize), status: filterStatus });
      if (sy) params.set('schoolYear', sy);
      if (filterDept) params.set('dept', filterDept);
      if (search) params.set('search', search);
      const { data } = await api.get(`/registrar/students?${params}`);
      return data;
    },
  });

  // Transition mutation
  const transitionMutation = useMutation({
    mutationFn: async ({ regId, status, assessment_id }: { regId: string; status: string; assessment_id?: number }) => {
      const { data } = await api.post(`/registrar/enrollment/${regId}/transition`, { status, assessment_id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-students'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-pipeline'] });
      toast.success('Status updated.');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || 'Transition failed.'),
  });

  const handleAdvanceToPayment = useCallback(async (student: Student) => {
    setAutoAssessChecking(student.public_id);
    try {
      const { data } = await api.get(`/registrar/enrollment/${student.public_id}/assessments`);
      const list: AccountAssessment[] = data.data;
      if (list.length === 0) {
        toast.error('No matching assessment template found. Create one in Accounting first.');
      } else if (list.length === 1) {
        transitionMutation.mutate({ regId: student.public_id, status: 'For Payment', assessment_id: list[0].assessment_id });
      } else {
        openAssessmentPicker(student);
      }
    } catch {
      toast.error('Failed to check available assessments.');
    } finally {
      setAutoAssessChecking(null);
    }
  }, [transitionMutation, openAssessmentPicker]);

  // Bulk transition
  const selectedRegIds = useMemo(
    () => Object.keys(rowSelection).filter((k) => rowSelection[k]),
    [rowSelection],
  );

  const bulkMutation = useMutation({
    mutationFn: async ({ status, assessment_id }: { status: string; assessment_id?: number }) => {
      const { data } = await api.post('/registrar/enrollment/bulk-transition', {
        reg_ids: selectedRegIds,
        status,
        assessment_id,
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-students'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-pipeline'] });
      toast.success(data.message);
      setRowSelection({});
    },
    onError: () => toast.error('Bulk transition failed.'),
  });

  const students = studentData?.data ?? [];
  const lastPage = studentData?.last_page ?? 1;

  // Auto-assign assessment billing mutation
  const autoAssignMutation = useMutation({
    mutationFn: async (params: { schoolYear: string; dept?: string }) => {
      const { data } = await api.post('/registrar/enrollment/auto-assign-assessments', params);
      return data as {
        message: string;
        auto_assigned: number;
        needs_manual: number;
        details: Array<{ name: string; status: 'assigned' | 'skipped'; template?: string; reason?: string }>;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-students'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-pipeline'] });
      setAutoAssignResult(data);
      setAutoAssignOpen(true);
      if (data.auto_assigned > 0) toast.success(data.message);
      else toast.info(data.message);
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || 'Auto-assign failed.'),
  });

  // For bulk mode, fetch assessments matching the first selected student's profile
  const firstSelectedStudent = useMemo(() => {
    if (assessDialogMode !== 'bulk' || selectedRegIds.length === 0) return null;
    return students.find(s => s.public_id === selectedRegIds[0]) ?? null;
  }, [assessDialogMode, selectedRegIds, students]);

  const { data: bulkAssessments, isLoading: bulkAssessmentsLoading } = useQuery<AccountAssessment[]>({
    queryKey: ['enrollment-assessments-bulk', firstSelectedStudent?.public_id],
    queryFn: async () => {
      const { data } = await api.get(`/registrar/enrollment/${firstSelectedStudent!.public_id}/assessments`);
      return data.data;
    },
    enabled: assessDialogOpen && assessDialogMode === 'bulk' && !!firstSelectedStudent,
  });

  const currentAssessments = assessDialogMode === 'single' ? assessmentsForStudent : bulkAssessments;
  const currentAssessmentsLoading = assessDialogMode === 'single' ? assessmentsLoading : bulkAssessmentsLoading;

  // Determine which statuses this batch can transition to
  const nextStatuses: string[] = (() => {
    if (filterStatus === 'For Accounts Assessment') return ['For Payment'];
    if (filterStatus === 'For Payment') return ['Enrolled'];
    return [];
  })();

  const columns: ColumnDef<Student>[] = useMemo(() => {
    const cols: ColumnDef<Student>[] = [];

    if (nextStatuses.length > 0) {
      cols.push({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        ),
        size: 40,
        enableSorting: false,
      });
    }

    cols.push(
      {
        accessorKey: 'student_id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Student ID" />,
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.student_id}</span>,
      },
      {
        id: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        accessorFn: (row) => `${row.lname}, ${row.fname}`,
        cell: ({ row }) => {
          const s = row.original;
          return <span className="font-medium">{s.lname}, {s.fname} {s.mname !== '-' && s.mname ? s.mname.charAt(0) + '.' : ''}</span>;
        },
      },
      {
        accessorKey: 'gradeLevel',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Grade Level" />,
      },
      {
        accessorKey: 'dept',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Dept" />,
      },
      {
        accessorKey: 'section',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Section" />,
        cell: ({ row }) => row.original.section !== '-' ? row.original.section : '—',
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <Badge variant={statusVariant(row.original.status)}>{row.original.status}</Badge>,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/registrar/students/${s.public_id}`)}>
                    <Eye className="mr-2 h-4 w-4" /> View Profile
                  </DropdownMenuItem>
                  {nextStatuses.length > 0 && <DropdownMenuSeparator />}
                  {nextStatuses.map((ns) => (
                    <DropdownMenuItem
                      key={ns}
                      disabled={transitionMutation.isPending || autoAssessChecking === s.public_id}
                      onClick={() => {
                        if (ns === 'For Payment' && s.status === 'For Accounts Assessment') {
                          handleAdvanceToPayment(s);
                        } else {
                          transitionMutation.mutate({ regId: s.public_id, status: ns });
                        }
                      }}
                    >
                      {autoAssessChecking === s.public_id
                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        : null}
                      Move to {ns}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    );

    return cols;
  }, [nextStatuses, transitionMutation, autoAssessChecking, handleAdvanceToPayment]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Enrollment Pipeline</h1>
          <p className="text-muted-foreground">Track and manage student enrollment status{sy && ` — ${sy}`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const printWindow = window.open('', '_blank');
            if (!printWindow) return;
            const rows = students;
            printWindow.document.write(`
              <html><head><title>Enrollment Pipeline — ${filterStatus}</title>
              <style>
                body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
                h2 { margin-bottom: 4px; } p { margin-top: 0; color: #666; font-size: 11px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
                th { background: #f5f5f5; font-weight: 600; }
                @media print { body { margin: 0; } }
              </style></head><body>
              <h2>Enrollment Pipeline</h2>
              <p>Status: ${filterStatus}${sy ? ' · SY ' + sy : ''}${filterDept ? ' · Dept: ' + filterDept : ''}</p>
              <table>
                <thead><tr><th>Student ID</th><th>Name</th><th>Grade Level</th><th>Dept</th><th>Section</th><th>Status</th></tr></thead>
                <tbody>${rows.map(s => `<tr><td>${s.student_id}</td><td>${s.lname}, ${s.fname}</td><td>${s.gradeLevel}</td><td>${s.dept}</td><td>${s.section !== '-' ? s.section : '—'}</td><td>${s.status}</td></tr>`).join('')}</tbody>
              </table></body></html>`);
            printWindow.document.close();
            printWindow.print();
          }}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const params = new URLSearchParams();
            if (filterStatus) params.set('status', filterStatus);
            if (filterDept) params.set('dept', filterDept);
            if (sy) params.set('schoolYear', sy);
            window.open(`${import.meta.env.VITE_API_URL || '/api'}/registrar/students/export?${params}`, '_blank');
          }}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Pipeline Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {STATUS_OPTIONS.map((status) => {
          const Icon = STATUS_ICONS[status] ?? ClipboardList;
          const count = pipeline?.[status]?.total ?? 0;
          const isActive = filterStatus === status;
          return (
            <Card
              key={status}
              className={`cursor-pointer transition-colors ${isActive ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
              onClick={() => { setFilterStatus(status); setPage(1); setRowSelection({}); }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className={`rounded-md p-2 ${STATUS_COLORS[status]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{count}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters & Bulk Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, ID, LRN..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <DataTableFilterButton activeCount={filterDept ? 1 : 0} onClick={() => setFilterOpen(true)} />

        {/* Auto-Assign Billing button — only shown on the For Accounts Assessment tab */}
        {filterStatus === 'For Accounts Assessment' && selectedRegIds.length === 0 && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={autoAssignMutation.isPending}
            onClick={() => autoAssignMutation.mutate({ schoolYear: sy, ...(filterDept ? { dept: filterDept } : {}) })}
          >
            {autoAssignMutation.isPending
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Zap className="mr-2 h-4 w-4" />
            }
            Auto-Assign Billing
          </Button>
        )}

        {/* Bulk action */}
        {selectedRegIds.length > 0 && nextStatuses.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selectedRegIds.length} selected</span>
            {nextStatuses.map((ns) => (
              <Button
                key={ns}
                size="sm"
                disabled={bulkMutation.isPending}
                onClick={() => {
                  // For "For Accounts Assessment → For Payment", open the assessment picker
                  if (ns === 'For Payment' && filterStatus === 'For Accounts Assessment') {
                    openBulkAssessmentPicker();
                  } else if (confirm(`Move ${selectedRegIds.length} student(s) to "${ns}"?`)) {
                    bulkMutation.mutate({ status: ns });
                  }
                }}
              >
                {bulkMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Move to {ns}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Student List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            <Badge variant={statusVariant(filterStatus)} className="mr-2">{filterStatus}</Badge>
            {studentData?.total ?? 0} student(s)
          </CardTitle>
          <CardDescription>Click a card above to filter by status</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={students}
            isLoading={isLoading}
            page={page}
            pageCount={lastPage}
            onPageChange={setPage}
            total={studentData?.total}
            from={studentData?.from}
            to={studentData?.to}
            pageSize={pageSize}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            getRowId={(row) => row.public_id}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            noResultsMessage={`No students with status "${filterStatus}".`}
          />
        </CardContent>
      </Card>

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

      {/* Assessment Selection Dialog */}
      <Dialog open={assessDialogOpen} onOpenChange={setAssessDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Assessment</DialogTitle>
            <DialogDescription>
              {assessDialogMode === 'single' && assessDialogStudent
                ? `Assign an assessment for ${assessDialogStudent.lname}, ${assessDialogStudent.fname} (${assessDialogStudent.gradeLevel})`
                : `Assign an assessment for ${selectedRegIds.length} selected student(s)`}
            </DialogDescription>
          </DialogHeader>

          {currentAssessmentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading assessments...</span>
            </div>
          ) : !currentAssessments || currentAssessments.length === 0 ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
              <p className="font-medium text-destructive">No assessments available</p>
              <p className="text-sm text-muted-foreground mt-1">
                No assessment templates match this student's grade level, strand, and school year.
                Please contact Accounting to create one.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {currentAssessments.map((assess) => {
                const isSelected = selectedAssessmentId === assess.assessment_id;
                const totalPayable = assess.payables?.reduce((sum, p) => sum + (p.category?.totalAmount ?? p.total_amt_payable ?? 0), 0) ?? 0;
                return (
                  <button
                    key={assess.assessment_id}
                    type="button"
                    className={`text-left rounded-lg border-2 p-0 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedAssessmentId(assess.assessment_id)}
                  >
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-t-md ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-primary-foreground' : 'border-muted-foreground'
                      }`}>
                        {isSelected && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                      </div>
                      <span className="font-semibold text-sm">{assess.description}</span>
                      {isSelected && <Badge variant="outline" className="ml-auto text-[10px] border-primary-foreground/50 text-primary-foreground">Selected</Badge>}
                    </div>
                    <div className="px-3 py-2">
                      <table className="w-full text-sm">
                        <tbody>
                          {assess.payables?.map((p) => (
                            <tr key={p.assess_payable_id} className="border-b border-border/50 last:border-0">
                              <td className="py-1 text-muted-foreground">{p.category?.description ?? '—'}</td>
                              <td className="py-1 text-right tabular-nums font-medium">
                                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(p.category?.totalAmount ?? p.total_amt_payable ?? 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border">
                            <td className="py-1 font-semibold">Total</td>
                            <td className="py-1 text-right tabular-nums font-bold">
                              {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(totalPayable)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssessDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!selectedAssessmentId || transitionMutation.isPending || bulkMutation.isPending}
              onClick={() => {
                if (!selectedAssessmentId) return;
                if (assessDialogMode === 'single' && assessDialogStudent) {
                  transitionMutation.mutate(
                    { regId: assessDialogStudent.public_id, status: 'For Payment', assessment_id: selectedAssessmentId },
                    { onSuccess: () => setAssessDialogOpen(false) },
                  );
                } else {
                  bulkMutation.mutate(
                    { status: 'For Payment', assessment_id: selectedAssessmentId },
                    { onSuccess: () => setAssessDialogOpen(false) },
                  );
                }
              }}
            >
              {(transitionMutation.isPending || bulkMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign & Move to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Auto-Assign Billing Results Dialog */}
      <Dialog open={autoAssignOpen} onOpenChange={setAutoAssignOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Auto-Assign Billing Results</DialogTitle>
            <DialogDescription>
              {autoAssignResult
                ? `${autoAssignResult.auto_assigned} assigned to For Payment · ${autoAssignResult.needs_manual} need manual selection`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {autoAssignResult && (
            <div className="space-y-4">
              {/* Summary chips */}
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg border bg-green-50 dark:bg-green-900/20 p-3 text-center">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{autoAssignResult.auto_assigned}</p>
                  <p className="text-xs text-muted-foreground">Auto-assigned</p>
                </div>
                <div className="flex-1 rounded-lg border bg-amber-50 dark:bg-amber-900/20 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{autoAssignResult.needs_manual}</p>
                  <p className="text-xs text-muted-foreground">Need manual selection</p>
                </div>
              </div>

              {/* Detail list */}
              {autoAssignResult.details.length > 0 && (
                <div className="rounded-lg border divide-y text-sm">
                  {autoAssignResult.details.map((d, i) => (
                    <div key={i} className="flex items-start gap-3 px-3 py-2">
                      <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        d.status === 'assigned'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                      }`}>
                        {d.status === 'assigned' ? '✓' : '!'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{d.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.status === 'assigned' ? d.template : d.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setAutoAssignOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
