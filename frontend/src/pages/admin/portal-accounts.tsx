import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  KeyRound,
  MoreHorizontal,
  Search,
  UserCheck,
  UserX,
  GraduationCap,
  Users,
  BookOpen,
} from 'lucide-react';
import type { PaginatedResponse } from '@/types';

// ── Types ──────────────────────────────────────────────────────────
const PORTAL_ROLES = ['Student', 'Teacher', 'Parent'] as const;
type PortalRole = (typeof PORTAL_ROLES)[number];

interface StudentLookup {
  reg_id: number;
  student_id: string;
  lrn: string;
  fname: string;
  mname: string;
  lname: string;
  suffix: string;
  gradeLevel: string;
  section: string;
  strand: string;
  dept: string;
  schoolYear: string;
}

interface FacultyLookup {
  personnel_id: number;
  fullname: string;
  classification: string;
}

interface PortalUser {
  id: number;
  public_id: string;
  username: string;
  fname: string;
  mname: string | null;
  lname: string;
  suffix: string | null;
  full_name: string;
  email: string | null;
  contact_number: string | null;
  access: PortalRole;
  status: 'Active' | 'Inactive';
  reg_id: number | null;
  personnel_id: number | null;
  student: { reg_id: number; student_id: string; fname: string; lname: string; gradeLevel: string; section: string } | null;
  faculty_staff: { personnel_id: number; fullname: string; classification: string } | null;
  children: { reg_id: number; student_id: string; fname: string; lname: string }[];
}

// ── Zod schema ─────────────────────────────────────────────────────
const portalSchema = z.object({
  access: z.enum(PORTAL_ROLES),
  username: z.string().min(3, 'At least 3 characters'),
  password: z.string().min(6, 'At least 6 characters').optional().or(z.literal('')),
  fname: z.string().min(1, 'Required'),
  mname: z.string().optional(),
  lname: z.string().min(1, 'Required'),
  suffix: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_number: z.string().optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
  reg_id: z.number().nullable().optional(),
  personnel_id: z.number().nullable().optional(),
  child_reg_ids: z.array(z.number()).optional(),
});

type PortalFormValues = z.infer<typeof portalSchema>;

// ── Role badge ─────────────────────────────────────────────────────
const roleBadge: Record<PortalRole, { label: string; class: string; icon: React.ElementType }> = {
  Student:  { label: 'Student',  class: 'bg-blue-100 text-blue-700 border-blue-200',  icon: GraduationCap },
  Teacher:  { label: 'Teacher',  class: 'bg-green-100 text-green-700 border-green-200', icon: BookOpen },
  Parent:   { label: 'Parent',   class: 'bg-purple-100 text-purple-700 border-purple-200', icon: Users },
};

// ── Student / Faculty combobox ─────────────────────────────────────
type InitialStudent = { reg_id: number; student_id: string; fname: string; lname: string; gradeLevel: string; section: string } | null;
type InitialFaculty = { personnel_id: number; fullname: string; classification: string } | null;

function StudentPicker({
  value, onChange, initialStudent,
}: { value: number | null | undefined; onChange: (v: number | null) => void; initialStudent?: InitialStudent }) {
  const [q, setQ] = useState('');
  const { data, isFetching } = useQuery<{ data: StudentLookup[] }>({
    queryKey: ['student-lookup', q],
    queryFn: async () => {
      const { data } = await api.get('/admin/portal-accounts/search-students', { params: { q } });
      return data;
    },
    enabled: q.length >= 1,
    staleTime: 10_000,
  });
  const students = data?.data ?? [];
  const selected = students.find((s) => s.reg_id === value)
    ?? (value && initialStudent?.reg_id === value ? initialStudent as unknown as StudentLookup : undefined);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input
          placeholder="Search by name or Student ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1"
        />
        {value && (
          <Button variant="ghost" size="sm" type="button" onClick={() => onChange(null)}>
            Clear
          </Button>
        )}
      </div>
      {isFetching && <p className="text-xs text-muted-foreground">Searching…</p>}
      {students.length > 0 && (
        <div className="rounded-md border divide-y max-h-44 overflow-y-auto text-sm">
          {students.map((s) => (
            <button
              key={s.reg_id}
              type="button"
              className={`w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors ${
                value === s.reg_id ? 'bg-primary/10 font-medium' : ''
              }`}
              onClick={() => { onChange(s.reg_id); setQ(''); }}
            >
              <span className="font-medium">{s.lname}, {s.fname} {s.mname ?? ''}</span>
              <span className="ml-2 text-muted-foreground text-xs">
                {s.student_id} · {s.gradeLevel} {s.section} · {s.schoolYear}
              </span>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <p className="text-xs text-green-700">
          ✓ {selected.lname}, {selected.fname} ({selected.student_id}) — {selected.gradeLevel} {selected.section}
        </p>
      )}
    </div>
  );
}

function FacultyPicker({
  value, onChange, initialFaculty,
}: { value: number | null | undefined; onChange: (v: number | null) => void; initialFaculty?: InitialFaculty }) {
  const [q, setQ] = useState('');
  const { data, isFetching } = useQuery<{ data: FacultyLookup[] }>({
    queryKey: ['faculty-lookup', q],
    queryFn: async () => {
      const { data } = await api.get('/admin/portal-accounts/search-faculty', { params: { q } });
      return data;
    },
    enabled: q.length >= 1,
    staleTime: 10_000,
  });
  const faculty = data?.data ?? [];
  const selected = faculty.find((f) => f.personnel_id === value)
    ?? (value && initialFaculty?.personnel_id === value ? initialFaculty as unknown as FacultyLookup : undefined);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input
          placeholder="Search faculty/staff by name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1"
        />
        {value && (
          <Button variant="ghost" size="sm" type="button" onClick={() => onChange(null)}>
            Clear
          </Button>
        )}
      </div>
      {isFetching && <p className="text-xs text-muted-foreground">Searching…</p>}
      {faculty.length > 0 && (
        <div className="rounded-md border divide-y max-h-44 overflow-y-auto text-sm">
          {faculty.map((f) => (
            <button
              key={f.personnel_id}
              type="button"
              className={`w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors ${
                value === f.personnel_id ? 'bg-primary/10 font-medium' : ''
              }`}
              onClick={() => { onChange(f.personnel_id); setQ(''); }}
            >
              <span className="font-medium">{f.fullname}</span>
              <span className="ml-2 text-muted-foreground text-xs">{f.classification}</span>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <p className="text-xs text-green-700">
          ✓ {selected.fullname} ({selected.classification})
        </p>
      )}
    </div>
  );
}

// Multi-student picker for Parent's children
function ChildrenPicker({
  value, onChange,
}: { value: number[]; onChange: (v: number[]) => void }) {
  const [q, setQ] = useState('');
  const { data, isFetching } = useQuery<{ data: StudentLookup[] }>({
    queryKey: ['student-lookup-children', q],
    queryFn: async () => {
      const { data } = await api.get('/admin/portal-accounts/search-students', { params: { q } });
      return data;
    },
    enabled: q.length >= 1,
    staleTime: 10_000,
  });
  const students = data?.data ?? [];

  const toggle = useCallback((rid: number) => {
    if (value.includes(rid)) {
      onChange(value.filter((x) => x !== rid));
    } else {
      onChange([...value, rid]);
    }
  }, [value, onChange]);

  // Fetch names for selected IDs (when loaded)
  const selectedStudents = students.filter((s) => value.includes(s.reg_id));

  return (
    <div className="space-y-1.5">
      <Input
        placeholder="Search students to add as children…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {isFetching && <p className="text-xs text-muted-foreground">Searching…</p>}
      {students.length > 0 && (
        <div className="rounded-md border divide-y max-h-44 overflow-y-auto text-sm">
          {students.map((s) => (
            <button
              key={s.reg_id}
              type="button"
              className={`w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors flex items-center gap-2 ${
                value.includes(s.reg_id) ? 'bg-primary/10' : ''
              }`}
              onClick={() => toggle(s.reg_id)}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                value.includes(s.reg_id) ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
              }`}>
                {value.includes(s.reg_id) ? '✓' : ''}
              </span>
              <span>
                <span className="font-medium">{s.lname}, {s.fname}</span>
                <span className="ml-2 text-muted-foreground text-xs">{s.student_id} · {s.gradeLevel} {s.section}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedStudents.map((s) => (
            <Badge key={s.reg_id} variant="secondary" className="gap-1 text-xs">
              {s.fname} {s.lname}
              <button type="button" className="ml-0.5 hover:text-destructive" onClick={() => toggle(s.reg_id)}>×</button>
            </Badge>
          ))}
          {value.filter((id) => !selectedStudents.find((s) => s.reg_id === id)).map((id) => (
            <Badge key={id} variant="secondary" className="gap-1 text-xs">
              reg_id:{id}
              <button type="button" className="ml-0.5 hover:text-destructive" onClick={() => toggle(id)}>×</button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function PortalAccountsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<PortalRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'Active' | 'Inactive' | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<PortalUser | null>(null);
  const [newPassInfo, setNewPassInfo] = useState<{ username: string; password: string } | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<PortalUser>>({
    queryKey: ['portal-accounts', page, search, filterRole, filterStatus],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        per_page: String(pageSize),
      };
      if (search) params.search = search;
      if (filterRole !== 'all') params.access = filterRole;
      if (filterStatus !== 'all') params.status = filterStatus;
      const { data } = await api.get('/admin/portal-accounts', { params });
      return data;
    },
  });

  const form = useForm<PortalFormValues>({
    resolver: zodResolver(portalSchema),
    defaultValues: {
      access: 'Student', username: '', password: '',
      fname: '', mname: '', lname: '', suffix: '',
      email: '', contact_number: '',
      status: 'Active',
      reg_id: null, personnel_id: null, child_reg_ids: [],
    },
  });

  const watchedRole = form.watch('access');

  const openAdd = () => {
    form.reset({
      access: 'Student', username: '', password: '',
      fname: '', mname: '', lname: '', suffix: '',
      email: '', contact_number: '',
      status: 'Active',
      reg_id: null, personnel_id: null, child_reg_ids: [],
    });
    setEditUser(null);
    setDialogOpen(true);
  };

  const openEdit = (u: PortalUser) => {
    form.reset({
      access: u.access,
      username: u.username,
      password: '',
      fname: u.fname,
      mname: u.mname ?? '',
      lname: u.lname,
      suffix: u.suffix ?? '',
      email: u.email ?? '',
      contact_number: u.contact_number ?? '',
      status: u.status,
      reg_id: u.reg_id,
      personnel_id: u.personnel_id,
      child_reg_ids: u.children?.map((c) => c.reg_id) ?? [],
    });
    setEditUser(u);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: PortalFormValues) => {
      const payload = { ...values };
      if (!payload.password) delete payload.password;
      if (editUser) {
        const { data } = await api.put(`/admin/portal-accounts/${editUser.id}`, payload);
        return data;
      }
      const { data } = await api.post('/admin/portal-accounts', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-accounts'] });
      toast.success(editUser ? 'Account updated.' : 'Account created.');
      setDialogOpen(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to save account.');
    },
  });

  const [pendingResetUser, setPendingResetUser] = useState<{ id: number; username: string } | null>(null);

  const resetPassMutation = useMutation({
    mutationFn: async (userId: number) => {
      const { data } = await api.post(`/admin/portal-accounts/${userId}/reset-password`);
      return data;
    },
    onSuccess: (data) => {
      setNewPassInfo({
        username: pendingResetUser?.username ?? '',
        password: data.data?.new_password ?? '',
      });
      setPendingResetUser(null);
      toast.success('Password reset.');
    },
    onError: () => toast.error('Failed to reset password.'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (userId: number) => api.post(`/admin/portal-accounts/${userId}/toggle-status`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-accounts'] });
      toast.success('Status updated.');
    },
    onError: () => toast.error('Failed to update status.'),
  });

  const columns: ColumnDef<PortalUser>[] = [
    {
      accessorKey: 'full_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => {
        const u = row.original;
        const cfg = roleBadge[u.access];
        const Icon = cfg.icon;
        return (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs ${cfg.class}`}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="font-medium leading-none">{u.full_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">@{u.username}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'access',
      header: 'Role',
      cell: ({ row }) => {
        const cfg = roleBadge[row.original.access];
        return <Badge className={`text-xs border font-normal ${cfg.class}`}>{cfg.label}</Badge>;
      },
    },
    {
      id: 'linked_profile',
      header: 'Linked Profile',
      cell: ({ row }) => {
        const u = row.original;
        if (u.access === 'Student' && u.student) {
          return (
            <span className="text-xs text-muted-foreground">
              {u.student.student_id} · {u.student.gradeLevel} {u.student.section}
            </span>
          );
        }
        if (u.access === 'Teacher' && u.faculty_staff) {
          return <span className="text-xs text-muted-foreground">{u.faculty_staff.fullname}</span>;
        }
        if (u.access === 'Parent' && u.children?.length) {
          return (
            <span className="text-xs text-muted-foreground">
              {u.children.length} child{u.children.length !== 1 ? 'ren' : ''}
            </span>
          );
        }
        return <span className="text-xs text-muted-foreground/50">—</span>;
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <span className="text-xs">{row.original.email ?? '—'}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'Active' ? 'default' : 'secondary'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" />}>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(u)}>Edit</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setPendingResetUser({ id: u.id, username: u.username });
                  resetPassMutation.mutate(u.id);
                }}
              >
                <KeyRound className="mr-2 h-4 w-4" /> Reset Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toggleStatusMutation.mutate(u.id)}>
                {u.status === 'Active'
                  ? <><UserX className="mr-2 h-4 w-4" /> Deactivate</>
                  : <><UserCheck className="mr-2 h-4 w-4" /> Activate</>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const onSubmit = (values: PortalFormValues) => saveMutation.mutate(values);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portal Accounts</h1>
          <p className="text-muted-foreground">
            Manage student, teacher, and parent login access.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Account
        </Button>
      </div>

      {/* Toolbar */}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        pageCount={data?.last_page ?? 1}
        onPageChange={setPage}
        total={data?.total}
        from={data?.from}
        to={data?.to}
        pageSize={pageSize}
        toolbar={
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or username…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 w-64"
              />
            </div>
            <Select value={filterRole} onValueChange={(v) => { setFilterRole(v as PortalRole | 'all'); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {PORTAL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v as 'Active' | 'Inactive' | 'all'); setPage(1); }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Edit Portal Account' : 'New Portal Account'}</DialogTitle>
            <DialogDescription>
              {editUser
                ? 'Update the portal account details.'
                : 'Create a login account for a student, teacher, or parent.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-1">
            {/* Role (only on create) */}
            {!editUser && (
              <div className="space-y-1.5">
                <Label>Role <span className="text-destructive">*</span></Label>
                <Controller
                  control={form.control}
                  name="access"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PORTAL_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input {...form.register('fname')} />
                {form.formState.errors.fname && (
                  <p className="text-xs text-destructive">{form.formState.errors.fname.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Last Name <span className="text-destructive">*</span></Label>
                <Input {...form.register('lname')} />
                {form.formState.errors.lname && (
                  <p className="text-xs text-destructive">{form.formState.errors.lname.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Middle Name</Label>
                <Input {...form.register('mname')} />
              </div>
              <div className="space-y-1.5">
                <Label>Suffix</Label>
                <Input {...form.register('suffix')} placeholder="Jr., Sr., III…" />
              </div>
            </div>

            {/* Credentials */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Username <span className="text-destructive">*</span></Label>
                <Input {...form.register('username')} autoComplete="off" />
                {form.formState.errors.username && (
                  <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{editUser ? 'New Password' : 'Password'} {!editUser && <span className="text-destructive">*</span>}</Label>
                <Input {...form.register('password')} type="password" autoComplete="new-password"
                  placeholder={editUser ? 'Leave blank to keep current' : ''} />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input {...form.register('email')} type="email" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Number</Label>
                <Input {...form.register('contact_number')} />
              </div>
            </div>

            {/* Role-specific link */}
            {(watchedRole === 'Student') && (
              <div className="space-y-1.5">
                <Label>
                  Link to Student Record <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={form.control}
                  name="reg_id"
                  render={({ field }) => (
                    <StudentPicker value={field.value} onChange={field.onChange} initialStudent={editUser?.student ?? null} />
                  )}
                />
              </div>
            )}

            {(watchedRole === 'Teacher') && (
              <div className="space-y-1.5">
                <Label>
                  Link to Faculty/Staff Record <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={form.control}
                  name="personnel_id"
                  render={({ field }) => (
                    <FacultyPicker value={field.value} onChange={field.onChange} initialFaculty={editUser?.faculty_staff ?? null} />
                  )}
                />
              </div>
            )}

            {(watchedRole === 'Parent') && (
              <div className="space-y-1.5">
                <Label>Link Children (Students)</Label>
                <Controller
                  control={form.control}
                  name="child_reg_ids"
                  render={({ field }) => (
                    <ChildrenPicker value={field.value ?? []} onChange={field.onChange} />
                  )}
                />
              </div>
            )}

            {/* Status (edit only) */}
            {editUser && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editUser ? 'Save Changes' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New password reveal dialog */}
      <Dialog open={!!newPassInfo} onOpenChange={() => setNewPassInfo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Password Reset</DialogTitle>
            <DialogDescription>
              Copy this password — it won't be shown again.
            </DialogDescription>
          </DialogHeader>
          {newPassInfo && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted px-4 py-3 font-mono text-sm">
                <p className="text-muted-foreground text-xs mb-1">Username</p>
                <p className="font-semibold">{newPassInfo.username}</p>
              </div>
              <div className="rounded-md bg-muted px-4 py-3 font-mono text-sm">
                <p className="text-muted-foreground text-xs mb-1">New Password</p>
                <p className="font-semibold tracking-widest select-all">{newPassInfo.password}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setNewPassInfo(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
