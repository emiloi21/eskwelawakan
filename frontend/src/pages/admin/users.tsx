import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { User, UserDesignation, PaginatedResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Plus, KeyRound, UserX, Search, Tags, Trash2, UserCheck, Link2Off, MoreVertical, Printer, Download } from 'lucide-react';
import { USER_ROLES, DEPARTMENTS } from '@/lib/constants';

const userSchema = z.object({
  username: z.string().min(3, 'At least 3 characters'),
  password: z.string().min(6, 'At least 6 characters').optional().or(z.literal('')),
  fname: z.string().min(1, 'Required'),
  mname: z.string().optional(),
  lname: z.string().min(1, 'Required'),
  suffix: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_number: z.string().optional(),
  access: z.enum(USER_ROLES),
  department: z.string().optional(),
  sub_department: z.string().optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [designUser, setDesignUser] = useState<User | null>(null);
  const [newDesignation, setNewDesignation] = useState('');

  // HRMS personnel picker
  const [personnelPick, setPersonnelPick] = useState<{
    id: number; employee_id: string; name: string; email: string | null; contact: string | null;
  } | null>(null);
  const [personnelQuery, setPersonnelQuery] = useState('');
  const [personnelPickerOpen, setPersonnelPickerOpen] = useState(false);

  const { data: personnelOptions } = useQuery<{ data: Array<{
    id: number; employee_id: string; user_id: number | null;
    fname: string; mname: string | null; lname: string;
    email: string | null; contact: string | null;
    department: { name: string } | null; position: { name: string } | null;
  }> }>({ 
    queryKey: ['personnel-search', personnelQuery, editUser?.id],
    queryFn: () => api.get('/admin/personnel-search', {
      params: { q: personnelQuery, ...(editUser?.id ? { exclude_user_id: editUser.id } : {}) },
    }).then(r => r.data),
    enabled: addOpen,
  });

  const { data, isLoading } = useQuery<PaginatedResponse<User>>({
    queryKey: ['users', page, pageSize, search, filterRole, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: String(pageSize) });
      if (search) params.set('search', search);
      if (filterRole) params.set('access', filterRole);
      if (filterStatus) params.set('status', filterStatus);
      const { data } = await api.get(`/admin/users?${params}`);
      return data;
    },
  });

  const form = useForm<UserFormValues>({ resolver: zodResolver(userSchema) });

  const openAdd = () => {
    form.reset({ username: '', password: '', fname: '', lname: '', access: 'Encoder' });
    setPersonnelPick(null);
    setPersonnelQuery('');
    setEditUser(null);
    setAddOpen(true);
  };

  const openEdit = (u: User) => {
    form.reset({
      username: u.username,
      password: '',
      fname: u.fname,
      mname: u.mname || '',
      lname: u.lname,
      suffix: u.suffix || '',
      email: u.email || '',
      contact_number: u.contact_number || '',
      access: u.access as typeof USER_ROLES[number],
      department: u.department || '',
      sub_department: u.sub_department || '',
      status: u.status,
    });
    // Pre-select linked personnel if any
    const hp = (u as User & { hrms_personnel?: { id: number; employee_id: string; fname: string; lname: string } | null }).hrms_personnel;
    setPersonnelPick(hp ? { id: hp.id, employee_id: hp.employee_id, name: `${hp.lname}, ${hp.fname}`, email: u.email, contact: u.contact_number } : null);
    setPersonnelQuery('');
    setEditUser(u);
    setAddOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      const payload: Record<string, unknown> = { ...values, hrms_personnel_id: personnelPick?.id ?? null };
      if (!payload.password) delete payload.password;
      if (editUser) {
        const { data } = await api.put(`/admin/users/${editUser.public_id}`, payload);
        return data;
      } else {
        const { data } = await api.post('/admin/users', payload);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(editUser ? 'User updated.' : 'User created.');
      setAddOpen(false);
    },
    onError: (err: { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      const errors = err.response?.data?.errors;
      if (errors) {
        Object.values(errors).flat().forEach((m) => toast.error(m));
      } else {
        toast.error(err.response?.data?.message || 'Failed to save user.');
      }
    },
  });

  const resetPwMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/admin/users/${id}/reset-password`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Password reset. New password: ${data.data.new_password}`);
    },
    onError: () => toast.error('Failed to reset password.'),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deactivated.');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to deactivate user.');
    },
  });

  // ── Designation management ───────────────────────────────────────────────
  const { data: designations, isLoading: designLoading } = useQuery<UserDesignation[]>({
    queryKey: ['user-designations', designUser?.public_id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/users/${designUser!.id}/designations`);
      return data.data;
    },
    enabled: !!designUser,
  });

  const addDesignationMutation = useMutation({
    mutationFn: async ({ userId, designation }: { userId: number; designation: string }) => {
      await api.post(`/admin/users/${userId}/designations`, { designation });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-designations', designUser?.public_id] });
      setNewDesignation('');
      toast.success('Designation added.');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to add designation.');
    },
  });

  const removeDesignationMutation = useMutation({
    mutationFn: async ({ userId, id }: { userId: number; id: number }) => {
      await api.delete(`/admin/users/${userId}/designations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-designations', designUser?.public_id] });
      toast.success('Designation removed.');
    },
    onError: () => toast.error('Failed to remove designation.'),
  });

  const users = data?.data ?? [];
  const lastPage = data?.last_page ?? 1;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = users;
    printWindow.document.write(`
      <html><head><title>User Management</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        h2 { margin-bottom: 4px; } p { margin-top: 0; color: #666; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h2>User Management</h2>
      <p>${filterRole ? 'Role: ' + filterRole : ''}${filterStatus ? (filterRole ? ' · ' : '') + 'Status: ' + filterStatus : ''}</p>
      <table>
        <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Department</th><th>Status</th></tr></thead>
        <tbody>${rows.map(u => `<tr><td>${u.full_name ?? (u.fname + ' ' + u.lname)}</td><td>${u.username}</td><td>${u.access}</td><td>${u.department || '—'}</td><td>${u.status}</td></tr>`).join('')}</tbody>
      </table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterRole) params.set('access', filterRole);
    if (filterStatus) params.set('status', filterStatus);
    const url = `${import.meta.env.VITE_API_URL || '/api'}/admin/users/export?${params}`;
    window.open(url, '_blank');
  };

  type UserRow = User & { hrms_personnel?: { employee_id: string; position?: { name: string } | null } | null };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'full_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => {
        const u = row.original as UserRow;
        return (
          <span className="font-medium cursor-pointer hover:underline" onClick={() => openEdit(row.original)}>
            {u.full_name ?? `${u.fname} ${u.lname}`}
          </span>
        );
      },
    },
    {
      id: 'personnel',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Personnel" />,
      accessorFn: (row) => (row as UserRow).hrms_personnel?.employee_id ?? '',
      cell: ({ row }) => {
        const p = (row.original as UserRow).hrms_personnel;
        if (!p) return <span className="text-xs text-muted-foreground italic">—</span>;
        return (
          <div className="flex flex-col gap-0.5">
            <Link
              to={`/hrms/personnel?search=${encodeURIComponent(p.employee_id)}`}
              className="inline-flex items-center gap-1 font-mono text-xs text-green-700 hover:underline"
            >
              <UserCheck className="h-3 w-3 flex-shrink-0" />{p.employee_id}
            </Link>
            {p.position?.name && <span className="text-xs text-muted-foreground">{p.position.name}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'username',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Username" />,
    },
    {
      accessorKey: 'access',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }) => (
        <Badge variant={row.original.access === 'Administrator' ? 'default' : 'secondary'}>
          {row.original.access}
        </Badge>
      ),
    },
    {
      accessorKey: 'department',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Department" />,
      cell: ({ row }) => row.original.department || '—',
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'Active' ? 'default' : 'destructive'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(u)}>
                  <Tags className="mr-2 h-4 w-4" /> Edit User
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => resetPwMutation.mutate(u.public_id)}
                  disabled={resetPwMutation.isPending}
                >
                  <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setDesignUser(u); setNewDesignation(''); }}>
                  <Tags className="mr-2 h-4 w-4" /> Manage Designations
                </DropdownMenuItem>
                {u.status === 'Active' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => deactivateMutation.mutate(u.public_id)}
                      disabled={deactivateMutation.isPending}
                    >
                      <UserX className="mr-2 h-4 w-4" /> Deactivate
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
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage system user accounts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={users}
            isLoading={isLoading}
            page={page}
            pageCount={lastPage}
            onPageChange={setPage}
            total={data?.total}
            from={data?.from}
            to={data?.to}
            pageSize={pageSize}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            noResultsMessage="No users found."
            toolbar={
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or username..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
                <DataTableFilterButton
                  activeCount={[filterRole, filterStatus].filter(Boolean).length}
                  onClick={() => setFilterOpen(true)}
                />
              </div>
            }
          />
        </CardContent>
      </Card>

      <DataTableFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeCount={[filterRole, filterStatus].filter(Boolean).length}
        onReset={() => { setFilterRole(''); setFilterStatus(''); setPage(1); }}
      >
        <div className="space-y-1">
          <Label className="text-sm font-medium">Role</Label>
          <Select value={filterRole || 'all'} onValueChange={(v) => { setFilterRole(v === 'all' ? '' : (v ?? '')); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {USER_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Status</Label>
          <Select value={filterStatus || 'all'} onValueChange={(v) => { setFilterStatus(v === 'all' ? '' : (v ?? '')); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      {/* Add / Edit User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogDescription>
              {editUser ? 'Update user account details' : 'Create a new system user account'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">

            {/* ── HRMS Personnel Picker ── */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">
                  Link HRMS Personnel <span className="font-normal">(optional — pre-fills name &amp; contact)</span>
                </Label>
                {personnelPick && (
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1 text-destructive"
                    onClick={() => setPersonnelPick(null)}>
                    <Link2Off className="h-3 w-3" /> Unlink
                  </Button>
                )}
              </div>
              {personnelPick ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                    <UserCheck className="mr-1 h-3 w-3" />
                    {personnelPick.employee_id} — {personnelPick.name}
                  </Badge>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 h-8 text-sm"
                    placeholder="Search by name or employee ID…"
                    value={personnelQuery}
                    onChange={e => setPersonnelQuery(e.target.value)}
                    onFocus={() => setPersonnelPickerOpen(true)}
                    onBlur={() => setTimeout(() => setPersonnelPickerOpen(false), 150)}
                  />
                  {personnelPickerOpen && (personnelOptions?.data ?? []).length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {(personnelOptions?.data ?? []).map(p => (
                        <button
                          type="button" key={p.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between gap-2"
                          onMouseDown={() => {
                            setPersonnelPick({ id: p.id, employee_id: p.employee_id, name: `${p.lname}, ${p.fname}`, email: p.email, contact: p.contact });
                            form.setValue('fname', p.fname);
                            form.setValue('lname', p.lname);
                            if (p.mname) form.setValue('mname', p.mname);
                            if (p.email) form.setValue('email', p.email);
                            if (p.contact) form.setValue('contact_number', p.contact);
                            setPersonnelQuery('');
                            setPersonnelPickerOpen(false);
                          }}
                        >
                          <span className="font-medium">{p.lname}, {p.fname}{p.mname ? ` ${p.mname[0]}.` : ''}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {p.employee_id}{(p.position?.name ?? p.department?.name) ? ` · ${p.position?.name ?? p.department?.name}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input {...form.register('fname')} />
                {form.formState.errors.fname && (
                  <p className="text-xs text-destructive">{form.formState.errors.fname.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input {...form.register('lname')} />
                {form.formState.errors.lname && (
                  <p className="text-xs text-destructive">{form.formState.errors.lname.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Middle Name</Label>
                <Input {...form.register('mname')} />
              </div>
              <div className="space-y-2">
                <Label>Suffix</Label>
                <Input placeholder="Jr., III, etc." {...form.register('suffix')} />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input {...form.register('username')} />
                {form.formState.errors.username && (
                  <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{editUser ? 'New Password (leave blank to keep)' : 'Password'}</Label>
                <Input type="password" {...form.register('password')} />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" {...form.register('email')} />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input {...form.register('contact_number')} />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.watch('access')}
                  onValueChange={(v) => form.setValue('access', (v ?? '') as typeof USER_ROLES[number])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={form.watch('department') || ''}
                  onValueChange={(v) => form.setValue('department', v ?? '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editUser && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.watch('status') || 'Active'}
                    onValueChange={(v) => form.setValue('status', (v ?? 'Active') as 'Active' | 'Inactive')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editUser ? 'Save Changes' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Designations Dialog */}
      <Dialog open={!!designUser} onOpenChange={(o) => { if (!o) setDesignUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Designations &mdash; {designUser?.full_name ?? `${designUser?.fname} ${designUser?.lname}`}</DialogTitle>
            <DialogDescription>
              Additional roles/designations for this user. Their primary role is <strong>{designUser?.access}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {designLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
              <div className="space-y-2">
                {(designations ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No additional designations.</p>
                )}
                {(designations ?? []).map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <span className="text-sm font-medium">{d.designation}</span>
                      {d.position_title && <span className="ml-2 text-xs text-muted-foreground">{d.position_title}</span>}
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => removeDesignationMutation.mutate({ userId: designUser!.id, id: d.id })}
                      disabled={removeDesignationMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Select value={newDesignation} onValueChange={(v) => setNewDesignation(v ?? '')}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select role to add" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES
                    .filter((r) => r !== designUser?.access && !(designations ?? []).some((d) => d.designation === r))
                    .map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!newDesignation || addDesignationMutation.isPending}
                onClick={() => addDesignationMutation.mutate({ userId: designUser!.id, designation: newDesignation })}
              >
                {addDesignationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDesignUser(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
