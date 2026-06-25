import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { Student, PaginatedResponse } from '@/types';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Loader2, Plus, Search, Eye, Trash2, Printer, Download, MoreVertical,
} from 'lucide-react';
import { DEPARTMENTS, CLASSIFICATIONS, STUDENT_STATUSES, SEMESTERS, GRADE_LEVELS_BY_DEPT, STRANDS } from '@/lib/constants';
import { useLookups } from '@/hooks/use-lookups';

const studentSchema = z.object({
  lrn: z.string().min(1, 'Required').max(12),
  esc_id: z.string().max(8).optional(),
  student_id: z.string().max(25).optional(),
  lname: z.string().min(1, 'Required'),
  fname: z.string().min(1, 'Required'),
  mname: z.string().optional(),
  suffix: z.string().optional(),
  bdMM: z.string().min(1, 'Required').max(2),
  bdDD: z.string().min(1, 'Required').max(2),
  bdYYYY: z.string().min(1, 'Required').max(4),
  sex: z.enum(['Male', 'Female']),
  age: z.coerce.number().min(1).max(99).optional() as unknown as z.ZodOptional<z.ZodNumber>,
  address_street: z.string().optional(),
  address_brgy: z.string().optional(),
  address_city_mun: z.string().optional(),
  address_province: z.string().optional(),
  guardian_lname: z.string().optional(),
  guardian_fname: z.string().optional(),
  guardian_contact: z.string().min(1, 'Required'),
  guardian_relation: z.string().min(1, 'Required'),
  g_address_street: z.string().optional(),
  g_address_brgy: z.string().optional(),
  g_address_city_mun: z.string().optional(),
  g_address_province: z.string().optional(),
  same_address_as_student: z.boolean().optional(),
  last_school: z.string().min(1, 'Required'),
  last_school_sy: z.string().min(1, 'Required').max(9),
  last_school_type: z.string().min(1, 'Required'),
  gen_average: z.coerce.number().min(0).max(100).optional() as unknown as z.ZodOptional<z.ZodNumber>,
  dept: z.string().min(1, 'Required'),
  gradeLevel: z.string().min(1, 'Required'),
  strand: z.string().optional(),
  major: z.string().optional(),
  classification: z.string().min(1, 'Required'),
  schoolYear: z.string().min(1, 'Required'),
  sem: z.string().optional(),
  remarks: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

const statusVariant = (status: string) => {
  switch (status) {
    case 'Enrolled': return 'default';
    case 'For Payment': return 'secondary';
    case 'For Accounts Assessment': return 'outline';
    case 'Graduated': return 'default';
    default: return 'destructive';
  }
};

export default function StudentListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: lookups } = useLookups();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterGradeLevel, setFilterGradeLevel] = useState('');
  const [filterStrand, setFilterStrand] = useState('');
  const [filterSex, setFilterSex] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [sameAddress, setSameAddress] = useState(false);

  const sy = user?.selected_sy || lookups?.active_school_year || '';
  const sem = user?.selected_sem || lookups?.active_semester || '1st Semester';

  // Fetch classes for grade level and strand selection
  const { data: classesData } = useQuery({
    queryKey: ['classes', sy],
    queryFn: async () => {
      const params = new URLSearchParams({ per_page: '100' });
      if (sy) params.set('schoolYear', sy);
      const { data } = await api.get(`/registrar/classes?${params}`);
      return data.data || [];
    },
    enabled: !!sy,
  });

  const classes = classesData || [];

  // Complete grade levels organized by department
  // (GRADE_LEVELS_BY_DEPT imported from constants)

  // Get all grade levels as flat array for the dropdown
  const gradeLevels = useMemo(() => {
    return filterDept ? (GRADE_LEVELS_BY_DEPT[filterDept] ?? []) : Object.values(GRADE_LEVELS_BY_DEPT).flat();
  }, [filterDept]);

  const showStrand = filterDept === 'Senior High School' || ['Grade 11', 'Grade 12'].includes(filterGradeLevel);

  const { data, isLoading } = useQuery<PaginatedResponse<Student>>({
    queryKey: ['students', page, pageSize, search, filterDept, filterGradeLevel, filterStrand, filterSex, filterStatus, sy],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: String(pageSize) });
      if (search) params.set('search', search);
      if (filterDept) params.set('dept', filterDept);
      if (filterGradeLevel) params.set('gradeLevel', filterGradeLevel);
      if (filterStrand) params.set('strand', filterStrand);
      if (filterSex) params.set('sex', filterSex);
      if (filterStatus) params.set('status', filterStatus);
      if (sy) params.set('schoolYear', sy);
      const { data } = await api.get(`/registrar/students?${params}`);
      return data;
    },
  });

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      schoolYear: sy || '',
      sem: sem || '1st Semester',
      dept: '',
      classification: 'New',
      sex: 'Male',
    },
  });

  // Get strands for selected grade level
  const selectedGradeLevel = form.watch('gradeLevel');
  const isSHS = ['Grade 11', 'Grade 12'].includes(selectedGradeLevel ?? '');
  const strandsForGradeLevel = useMemo(() => {
    if (!selectedGradeLevel) return [];
    const strands = [...new Set(
      classes
        .filter((c: { gradeLevel: string }) => c.gradeLevel === selectedGradeLevel)
        .map((c: { strand: string }) => c.strand)
        .filter((s: string | null) => s && s !== '-')
    )];
    return strands.sort();
  }, [classes, selectedGradeLevel]);

  // Auto-compute age from birthdate
  const bdMM = form.watch('bdMM');
  const bdDD = form.watch('bdDD');
  const bdYYYY = form.watch('bdYYYY');
  useEffect(() => {
    if (bdMM && bdDD && bdYYYY) {
      const birthDate = new Date(`${bdYYYY}-${bdMM}-${bdDD}`);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age >= 0 && age <= 99) {
          form.setValue('age', age);
        }
      }
    }
  }, [bdMM, bdDD, bdYYYY, form]);

  // Auto-copy student address to guardian address when checkbox is checked
  const studentAddress = {
    street: form.watch('address_street'),
    brgy: form.watch('address_brgy'),
    city: form.watch('address_city_mun'),
    province: form.watch('address_province'),
  };
  useEffect(() => {
    if (sameAddress) {
      form.setValue('g_address_street', studentAddress.street || '');
      form.setValue('g_address_brgy', studentAddress.brgy || '');
      form.setValue('g_address_city_mun', studentAddress.city || '');
      form.setValue('g_address_province', studentAddress.province || '');
    }
  }, [sameAddress, studentAddress.street, studentAddress.brgy, studentAddress.city, studentAddress.province, form]);

  // Auto-set department based on grade level
  useEffect(() => {
    if (selectedGradeLevel) {
      for (const [dept, levels] of Object.entries(GRADE_LEVELS_BY_DEPT)) {
        if (levels.includes(selectedGradeLevel)) {
          form.setValue('dept', dept);
          break;
        }
      }
    }
  }, [selectedGradeLevel, form]);

  const createMutation = useMutation({
    mutationFn: async (values: StudentFormValues) => {
      // Convert names to uppercase before saving
      const payload = {
        ...values,
        lname: values.lname.toUpperCase(),
        fname: values.fname.toUpperCase(),
        mname: values.mname ? values.mname.toUpperCase() : values.mname,
        suffix: values.suffix ? values.suffix.toUpperCase() : values.suffix,
        guardian_lname: values.guardian_lname ? values.guardian_lname.toUpperCase() : values.guardian_lname,
        guardian_fname: values.guardian_fname ? values.guardian_fname.toUpperCase() : values.guardian_fname,
      };
      const { data } = await api.post('/registrar/students', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student created successfully.');
      setAddOpen(false);
      form.reset();
    },
    onError: (err: { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      const errors = err.response?.data?.errors;
      if (errors) {
        Object.values(errors).flat().forEach((m) => toast.error(m));
      } else {
        toast.error(err.response?.data?.message || 'Failed to create student.');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (publicId: string) => {
      await api.delete(`/registrar/students/${publicId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student deleted.');
    },
    onError: () => toast.error('Failed to delete student.'),
  });

  const students = data?.data ?? [];

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterDept) params.set('dept', filterDept);
    if (filterGradeLevel) params.set('gradeLevel', filterGradeLevel);
    if (filterStrand) params.set('strand', filterStrand);
    if (filterSex) params.set('sex', filterSex);
    if (filterStatus) params.set('status', filterStatus);
    if (sy) params.set('schoolYear', sy);
    const url = `${import.meta.env.VITE_API_URL || '/api'}/registrar/students/export?${params}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    const rows = students;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Student List</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        h2 { margin-bottom: 4px; }
        p { margin-top: 0; color: #666; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h2>Student List</h2>
      <p>${sy ? `School Year: ${sy}` : 'All School Years'}${filterDept ? ` | Dept: ${filterDept}` : ''}${filterStatus ? ` | Status: ${filterStatus}` : ''}</p>
      <table>
        <thead><tr><th>#</th><th>Student ID</th><th>Name</th><th>Grade Level</th><th>Department</th><th>Section</th><th>Status</th></tr></thead>
        <tbody>${rows.map((s, i) => `<tr><td>${i + 1}</td><td>${s.student_id}</td><td>${s.lname}, ${s.fname}${s.mname && s.mname !== '-' ? ' ' + s.mname.charAt(0) + '.' : ''}${s.suffix && s.suffix !== '-' ? ' ' + s.suffix : ''}</td><td>${s.gradeLevel}</td><td>${s.dept}</td><td>${s.section !== '-' ? s.section : ''}</td><td>${s.status}</td></tr>`).join('')}</tbody>
      </table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const columns: ColumnDef<Student>[] = [
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
        return (
          <Link to={`/registrar/students/${s.public_id}`} className="font-medium hover:underline">
            {s.lname}, {s.fname} {s.mname && s.mname !== '-' ? s.mname.charAt(0) + '.' : ''}
            {s.suffix && s.suffix !== '-' ? ` ${s.suffix}` : ''}
          </Link>
        );
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
      header: 'Section',
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
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => { if (confirm('Delete this student record?')) deleteMutation.mutate(s.public_id); }}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      meta: { className: 'text-right' },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">Manage student records{sy && ` — ${sy}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => { form.reset({ schoolYear: lookups?.active_school_year || sy || '', sem: lookups?.active_semester || sem || '1st Semester', dept: '', classification: 'New', sex: 'Male' }); setSameAddress(false); setAddOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Student
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={students}
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
        noResultsMessage="No students found."
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, ID, or LRN..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <DataTableFilterButton activeCount={[filterDept, filterGradeLevel, filterStrand, filterSex, filterStatus].filter(Boolean).length} onClick={() => setFilterOpen(true)} />
          </div>
        }
      />

      <DataTableFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeCount={[filterDept, filterGradeLevel, filterStrand, filterSex, filterStatus].filter(Boolean).length}
        onReset={() => { setFilterDept(''); setFilterGradeLevel(''); setFilterStrand(''); setFilterSex(''); setFilterStatus(''); setPage(1); }}
      >
        <div className="space-y-1">
          <Label className="text-sm font-medium">Department</Label>
          <Select value={filterDept || 'all'} onValueChange={(v) => { const d = v === 'all' ? '' : (v ?? ''); setFilterDept(d); setFilterGradeLevel(''); setFilterStrand(''); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Grade Level</Label>
          <Select value={filterGradeLevel || 'all'} onValueChange={(v) => { setFilterGradeLevel(v === 'all' ? '' : (v ?? '')); setFilterStrand(''); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All Grade Levels" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grade Levels</SelectItem>
              {gradeLevels.map((gl) => <SelectItem key={gl} value={gl}>{gl}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {showStrand && (
          <div className="space-y-1">
            <Label className="text-sm font-medium">Strand</Label>
            <Select value={filterStrand || 'all'} onValueChange={(v) => { setFilterStrand(v === 'all' ? '' : (v ?? '')); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="All Strands" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strands</SelectItem>
                {STRANDS.filter((s) => s !== 'N/A').map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-sm font-medium">Status</Label>
          <Select value={filterStatus || 'all'} onValueChange={(v) => { setFilterStatus(v === 'all' ? '' : (v ?? '')); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STUDENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Sex</Label>
          <Select value={filterSex || 'all'} onValueChange={(v) => { setFilterSex(v === 'all' ? '' : (v ?? '')); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      {/* Add Student Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>Register a new student applicant</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v as unknown as StudentFormValues))} className="space-y-6">
            {/* Personal Info */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-muted-foreground">Personal Information</legend>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-1">
                  <Label>Last Name *</Label>
                  <Input {...form.register('lname')} />
                  {form.formState.errors.lname && <p className="text-xs text-destructive">{form.formState.errors.lname.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>First Name *</Label>
                  <Input {...form.register('fname')} />
                  {form.formState.errors.fname && <p className="text-xs text-destructive">{form.formState.errors.fname.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Middle Name</Label>
                  <Input {...form.register('mname')} />
                </div>
                <div className="space-y-1">
                  <Label>Suffix</Label>
                  <Input placeholder="Jr., III" {...form.register('suffix')} />
                </div>
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
                <div className="space-y-1">
                  <Label>Birth Month *</Label>
                  <Input placeholder="MM" maxLength={2} {...form.register('bdMM')} />
                </div>
                <div className="space-y-1">
                  <Label>Birth Day *</Label>
                  <Input placeholder="DD" maxLength={2} {...form.register('bdDD')} />
                </div>
                <div className="space-y-1">
                  <Label>Birth Year *</Label>
                  <Input placeholder="YYYY" maxLength={4} {...form.register('bdYYYY')} />
                </div>
                <div className="space-y-1">
                  <Label>Sex *</Label>
                  <Select value={form.watch('sex')} onValueChange={(v) => form.setValue('sex', v as 'Male' | 'Female')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Age</Label>
                  <Input type="number" {...form.register('age')} />
                </div>
              </div>
            </fieldset>

            {/* IDs */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-muted-foreground">Identification</legend>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>LRN *</Label>
                  <Input maxLength={12} {...form.register('lrn')} />
                  {form.formState.errors.lrn && <p className="text-xs text-destructive">{form.formState.errors.lrn.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>ESC ID</Label>
                  <Input maxLength={8} {...form.register('esc_id')} />
                </div>
              </div>
            </fieldset>

            {/* Address */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-muted-foreground">Address</legend>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-1"><Label>Street</Label><Input {...form.register('address_street')} /></div>
                <div className="space-y-1"><Label>Barangay</Label><Input {...form.register('address_brgy')} /></div>
                <div className="space-y-1"><Label>City / Municipality</Label><Input {...form.register('address_city_mun')} /></div>
                <div className="space-y-1"><Label>Province</Label><Input {...form.register('address_province')} /></div>
              </div>
            </fieldset>

            {/* Guardian */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-muted-foreground">Guardian Information</legend>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-1"><Label>Last Name</Label><Input {...form.register('guardian_lname')} /></div>
                <div className="space-y-1"><Label>First Name</Label><Input {...form.register('guardian_fname')} /></div>
                <div className="space-y-1">
                  <Label>Contact # *</Label>
                  <Input {...form.register('guardian_contact')} />
                  {form.formState.errors.guardian_contact && <p className="text-xs text-destructive">{form.formState.errors.guardian_contact.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Relation *</Label>
                  <Input placeholder="Mother, Father, etc." {...form.register('guardian_relation')} />
                </div>
              </div>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-1"><Label>Street</Label><Input {...form.register('g_address_street')} disabled={sameAddress} /></div>
                <div className="space-y-1"><Label>Barangay</Label><Input {...form.register('g_address_brgy')} disabled={sameAddress} /></div>
                <div className="space-y-1"><Label>City / Municipality</Label><Input {...form.register('g_address_city_mun')} disabled={sameAddress} /></div>
                <div className="space-y-1"><Label>Province</Label><Input {...form.register('g_address_province')} disabled={sameAddress} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sameAddress"
                  checked={sameAddress}
                  onCheckedChange={(checked) => setSameAddress(checked as boolean)}
                />
                <Label htmlFor="sameAddress" className="text-sm font-normal cursor-pointer">Same address to student</Label>
              </div>
            </fieldset>

            {/* Academic */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-muted-foreground">Academic Information</legend>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-1">
                  <Label>Department *</Label>
                  <Input value={form.watch('dept') || ''} readOnly className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label>Grade Level *</Label>
                  <Select value={form.watch('gradeLevel') || ''} onValueChange={(v) => {
                    form.setValue('gradeLevel', v ?? '');
                    const shs = ['Grade 11', 'Grade 12'].includes(v ?? '');
                    form.setValue('strand', shs ? '' : 'N/A');
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" disabled>Grade School</SelectItem>
                      {GRADE_LEVELS_BY_DEPT['Grade School'].map((level: string) => (
                        <SelectItem key={level} value={level} className="pl-6">{level}</SelectItem>
                      ))}
                      <SelectItem value="" disabled>Junior High School</SelectItem>
                      {GRADE_LEVELS_BY_DEPT['Junior High School'].map((level: string) => (
                        <SelectItem key={level} value={level} className="pl-6">{level}</SelectItem>
                      ))}
                      <SelectItem value="" disabled>Senior High School</SelectItem>
                      {GRADE_LEVELS_BY_DEPT['Senior High School'].map((level: string) => (
                        <SelectItem key={level} value={level} className="pl-6">{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Strand</Label>
                  <Select
                    value={form.watch('strand') || ''}
                    onValueChange={(v) => form.setValue('strand', v ?? '')}
                    disabled={!isSHS}
                  >
                    <SelectTrigger><SelectValue placeholder={isSHS ? 'Select' : 'N/A'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N/A">N/A</SelectItem>
                      {strandsForGradeLevel.map((strand: string) => <SelectItem key={strand} value={strand}>{strand}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Classification *</Label>
                  <Select value={form.watch('classification')} onValueChange={(v) => form.setValue('classification', v ?? '')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLASSIFICATIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>School Year *</Label>
                  <Input value={form.watch('schoolYear') || ''} readOnly className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label>Semester</Label>
                  <Input value={form.watch('sem') || ''} readOnly className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label>Gen. Average</Label>
                  <Input type="number" {...form.register('gen_average')} />
                </div>
              </div>
            </fieldset>

            {/* Previous School */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-muted-foreground">Previous School</legend>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>School Name *</Label>
                  <Input {...form.register('last_school')} />
                </div>
                <div className="space-y-1">
                  <Label>School Year *</Label>
                  <Select value={form.watch('last_school_sy') || ''} onValueChange={(v) => form.setValue('last_school_sy', v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {(lookups?.school_years ?? []).map((sy) => <SelectItem key={sy} value={sy}>{sy}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Type *</Label>
                  <Input placeholder="Public / Private" {...form.register('last_school_type')} />
                </div>
              </div>
            </fieldset>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register Student
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
