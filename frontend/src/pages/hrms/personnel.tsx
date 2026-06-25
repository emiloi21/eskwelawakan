import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Loader2, Plus, Pencil, Trash2, Search, UserRound, ShieldCheck, MoreVertical, Printer, Download,
} from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DataTableFilterButton, DataTableFilterSheet } from '@/components/ui/data-table-filter-sheet';
import type { ColumnDef } from '@tanstack/react-table';

type Department = { id: number; public_id: string; name: string; description: string | null; personnel_count: number };
type Position = { id: number; public_id: string; name: string; description: string | null; department: Department | null };
type StaffMember = {
  id: number; public_id: string; employee_id: string;
  fname: string; mname: string | null; lname: string;
  department: Department | null; position: Position | null;
  employment_type: string; status: string; gender: string | null;
  date_hired: string | null; email: string | null; contact: string | null;
  photo: string | null;
  user: { id: number; username: string; access: string; status: string } | null;
};

const EMPLOYMENT_TYPES = ['Regular', 'Contractual', 'Part-time'] as const;
const STATUSES = ['Active', 'Inactive', 'On Leave'] as const;
const statusColor: Record<string, string> = {
  Active: 'default', Inactive: 'secondary', 'On Leave': 'outline',
};

// ── Grant System Access dialog ───────────────────────────────────
const SYSTEM_ROLES = ['Administrator', 'Encoder', 'Registrar', 'Cashier', 'Accounting Staff', 'HR', 'Custodian'] as const;

function GrantAccessDialog({ person, onClose }: { person: StaffMember | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ username: '', password: '', access: 'HR' as string });

  useEffect(() => {
    if (person) {
      setForm({
        username: `${person.fname.toLowerCase()}_${person.lname.toLowerCase()}`.replace(/\s+/g, ''),
        password: '',
        access: 'HR',
      });
    }
  }, [person?.id]);

  const mutation = useMutation({
    mutationFn: () => api.post(`/hrms/personnel/${person!.public_id}/grant-access`, {
      username: form.username,
      password: form.password,
      access: form.access,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hrms-personnel'] });
      toast.success(`System account created: ${form.username}`);
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? 'Failed to create account.'),
  });

  return (
    <Dialog open={!!person} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Grant System Access</DialogTitle>
          <DialogDescription>
            Create a system account for <strong>{person?.lname}, {person?.fname}</strong>.
            Their name and contact will be pre-filled.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>System Role</Label>
            <Select value={form.access} onValueChange={v => setForm(f => ({ ...f, access: v ?? 'HR' }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SYSTEM_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={mutation.isPending || !form.username || !form.password}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Personnel form dialog ─────────────────────────────────────────
function PersonnelDialog({
  open, person, departments, positions, onClose,
}: {
  open: boolean;
  person: StaffMember | null;
  departments: Department[];
  positions: Position[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!person;
  type FormState = {
    employee_id: string; fname: string; mname: string; lname: string;
    department_id: string; position_id: string;
    employment_type: string; status: string; gender: string;
    date_hired: string; contact: string; email: string; address: string;
    emergency_contact_name: string; emergency_contact_number: string;
  };
  const [form, setForm] = useState<FormState>({
    employee_id: person?.employee_id ?? '',
    fname: person?.fname ?? '',
    mname: person?.mname ?? '',
    lname: person?.lname ?? '',
    department_id: String(person?.department?.id ?? ''),
    position_id: String(person?.position?.id ?? ''),
    employment_type: person?.employment_type ?? 'Regular',
    status: person?.status ?? 'Active',
    gender: person?.gender ?? '',
    date_hired: person?.date_hired ?? '',
    contact: person?.contact ?? '',
    email: person?.email ?? '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
  });

  // Sync form whenever the dialog opens with (possibly different) person data
  useEffect(() => {
    if (open) {
      setForm({
        employee_id: person?.employee_id ?? '',
        fname: person?.fname ?? '',
        mname: person?.mname ?? '',
        lname: person?.lname ?? '',
        department_id: String(person?.department?.id ?? ''),
        position_id: String(person?.position?.id ?? ''),
        employment_type: person?.employment_type ?? 'Regular',
        status: person?.status ?? 'Active',
        gender: person?.gender ?? '',
        date_hired: person?.date_hired ?? '',
        contact: person?.contact ?? '',
        email: person?.email ?? '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_number: '',
      });
    }
  }, [open, person?.id]);

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        department_id: form.department_id || null,
        position_id: form.position_id || null,
        mname: form.mname || null,
        gender: form.gender || null,
        date_hired: form.date_hired || null,
        contact: form.contact || null,
        email: form.email || null,
        address: form.address || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_number: form.emergency_contact_number || null,
      };
      return isEdit
        ? api.put(`/hrms/personnel/${person!.public_id}`, payload)
        : api.post('/hrms/personnel', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hrms-personnel'] });
      toast.success(isEdit ? 'Personnel record updated.' : 'Personnel added.');
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Save failed.'),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Personnel' : 'Add Personnel'}</DialogTitle>
          <DialogDescription>Enter staff member information below.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label>Employee ID <span className="text-destructive">*</span></Label>
              <Input value={form.employee_id} onChange={e => set('employee_id', e.target.value)} placeholder="EMP-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Employment Type <span className="text-destructive">*</span></Label>
              <Select value={form.employment_type} onValueChange={v => set('employment_type', (v as string) ?? '')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status <span className="text-destructive">*</span></Label>
              <Select value={form.status} onValueChange={v => set('status', (v as string) ?? '')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Last Name <span className="text-destructive">*</span></Label>
              <Input value={form.lname} onChange={e => set('lname', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>First Name <span className="text-destructive">*</span></Label>
              <Input value={form.fname} onChange={e => set('fname', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Middle Name</Label>
              <Input value={form.mname} onChange={e => set('mname', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.department_id} onValueChange={v => set('department_id', v === '__none__' ? '' : ((v as string) ?? ''))}>
                <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Position</Label>
              <Select value={form.position_id} onValueChange={v => set('position_id', v === '__none__' ? '' : ((v as string) ?? ''))}>
                <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {positions.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}{p.department ? ` (${p.department.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => set('gender', v === '__none__' ? '' : ((v as string) ?? ''))}>
                <SelectTrigger><SelectValue placeholder="— —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— —</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date Hired</Label>
              <Input type="date" value={form.date_hired} onChange={e => set('date_hired', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact No.</Label>
              <Input value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="09XX XXX XXXX" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Address</Label>
            <Textarea rows={2} value={form.address} onChange={e => set('address', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Emergency Contact</Label>
              <Input value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} placeholder="Name" />
            </div>
            <div className="space-y-1.5">
              <Label>Emergency Contact No.</Label>
              <Input value={form.emergency_contact_number} onChange={e => set('emergency_contact_number', e.target.value)} placeholder="09XX XXX XXXX" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={mutation.isPending || !form.employee_id || !form.fname || !form.lname}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Personnel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Personnel detail sheet ────────────────────────────────────────
function PersonnelSheet({
  person, open, onClose, onEdit,
}: { person: StaffMember | null; open: boolean; onClose: () => void; onEdit: () => void }) {
  if (!person) return null;
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6">
        <SheetHeader className="mb-4">
          <SheetTitle>{person.lname}, {person.fname}</SheetTitle>
          <SheetDescription className="flex flex-wrap gap-2">
            <span className="font-mono text-xs">{person.employee_id}</span>
            <Badge variant={(statusColor[person.status] ?? 'outline') as 'default' | 'secondary' | 'outline'}>{person.status}</Badge>
            <Badge variant="outline">{person.employment_type}</Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {person.photo && (
            <img src={person.photo} alt="Photo" className="h-24 w-24 rounded-full object-cover border mx-auto" />
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div><p className="text-xs text-muted-foreground">Department</p><p>{person.department?.name ?? '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Position</p><p>{person.position?.name ?? '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Gender</p><p>{person.gender ?? '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Date Hired</p><p>{person.date_hired ?? '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Contact</p><p>{person.contact ?? '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Email</p><p className="truncate">{person.email ?? '—'}</p></div>
          </div>

          <div className="pt-2">
            <Button variant="outline" className="w-full" onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function HrmsPersonnelPage() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<StaffMember | null>(null);
  const [viewPerson, setViewPerson] = useState<StaffMember | null>(null);
  const [grantPerson, setGrantPerson] = useState<StaffMember | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: personnelData, isLoading } = useQuery<{ data: StaffMember[]; meta: { total: number } }>({
    queryKey: ['hrms-personnel', search, deptFilter],
    queryFn: () => api.get('/hrms/personnel', {
      params: {
        search,
        per_page: 200,
        ...(deptFilter !== 'all' ? { department_id: deptFilter } : {}),
      },
    }).then(r => r.data),
  });

  const { data: deptsData } = useQuery<{ data: Department[] }>({
    queryKey: ['hrms-departments'],
    queryFn: () => api.get('/hrms/departments').then(r => r.data),
  });

  const { data: posData } = useQuery<{ data: Position[] }>({
    queryKey: ['hrms-positions'],
    queryFn: () => api.get('/hrms/positions').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => api.delete(`/hrms/personnel/${publicId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hrms-personnel'] }); toast.success('Deleted.'); },
    onError: () => toast.error('Delete failed.'),
  });

  const staff = personnelData?.data ?? [];
  const departments = deptsData?.data ?? [];
  const positions = posData?.data ?? [];

  const activeFilterCount = [deptFilter !== 'all' ? deptFilter : ''].filter(Boolean).length;

  const columns: ColumnDef<StaffMember>[] = useMemo(() => [
    {
      id: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      accessorFn: (row) => `${row.lname} ${row.fname}`,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-2.5">
            {p.photo
              ? <img src={p.photo} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
              : <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0"><UserRound className="h-4 w-4 text-muted-foreground" /></div>
            }
            <div className="min-w-0">
              <p className="font-medium text-sm leading-tight">{p.lname}, {p.fname} {p.mname ? p.mname[0] + '.' : ''}</p>
              <p className="text-xs text-muted-foreground">{p.position?.name ?? '—'}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'employee_id',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Employee ID" />,
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{row.original.employee_id}</span>,
    },
    {
      id: 'department',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Department" />,
      accessorFn: (row) => row.department?.name ?? '',
      cell: ({ row }) => <span className="text-sm">{row.original.department?.name ?? <span className="text-muted-foreground italic">—</span>}</span>,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={(statusColor[row.original.status] ?? 'outline') as 'default' | 'secondary' | 'outline'} className="text-xs">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'account',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account" />,
      accessorFn: (row) => row.user?.username ?? '',
      cell: ({ row }) => {
        const p = row.original;
        if (!p.user) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <Link
            to={`/admin/users?search=${encodeURIComponent(p.user.username)}`}
            className="flex flex-col gap-0.5 group"
          >
            <Badge variant="outline" className="text-xs text-green-700 border-green-300 group-hover:bg-green-50 w-fit">
              @{p.user.username}
            </Badge>
            <span className="text-xs text-muted-foreground">{p.user.access}</span>
          </Link>
        );
      },
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewPerson(p)}>
                  <UserRound className="mr-2 h-4 w-4" /> View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setEditPerson(p); setDialogOpen(true); }}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                {!p.user && (
                  <DropdownMenuItem onClick={() => setGrantPerson(p)}>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Grant System Access
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => { if (confirm(`Delete ${p.fname}?`)) deleteMutation.mutate(p.public_id); }}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [deleteMutation]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const deptLabel = deptFilter !== 'all' ? (departments.find(d => String(d.id) === deptFilter)?.name ?? deptFilter) : 'All Departments';
    printWindow.document.write(`
      <html><head><title>Staff Directory</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        h2 { margin-bottom: 4px; } p { margin-top: 0; color: #666; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h2>Staff Directory</h2>
      <p>Department: ${deptLabel}</p>
      <table>
        <thead><tr><th>Name</th><th>Employee ID</th><th>Department</th><th>Position</th><th>Status</th><th>Account</th></tr></thead>
        <tbody>${staff.map(p => `<tr>
          <td>${p.lname}, ${p.fname}${p.mname ? ' ' + p.mname[0] + '.' : ''}</td>
          <td>${p.employee_id}</td>
          <td>${p.department?.name ?? '—'}</td>
          <td>${p.position?.name ?? '—'}</td>
          <td>${p.status}</td>
          <td>${p.user ? '@' + p.user.username : '—'}</td>
        </tr>`).join('')}</tbody>
      </table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (deptFilter !== 'all') params.set('department_id', deptFilter);
    window.open(`${import.meta.env.VITE_API_URL || '/api'}/hrms/personnel/export?${params}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Directory</h1>
          <p className="text-muted-foreground">Manage school personnel profiles, departments, and positions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => { setEditPerson(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Personnel
          </Button>
        </div>
      </div>

      {/* Personnel table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={staff}
            isLoading={isLoading}
            noResultsMessage="No personnel found."
            toolbar={
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search by name or Employee ID…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <DataTableFilterButton activeCount={activeFilterCount} onClick={() => setFilterOpen(true)} />
              </div>
            }
          />
        </CardContent>
      </Card>

      <DataTableFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeCount={activeFilterCount}
        onReset={() => setDeptFilter('all')}
      >
        <div className="space-y-1">
          <Label className="text-sm font-medium">Department</Label>
          <Select value={deptFilter} onValueChange={v => setDeptFilter(v ?? 'all')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="unassigned">— No Department —</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      <PersonnelDialog
        open={dialogOpen}
        person={editPerson}
        departments={departments}
        positions={positions}
        onClose={() => { setDialogOpen(false); setEditPerson(null); }}
      />

      <PersonnelSheet
        person={viewPerson}
        open={!!viewPerson}
        onClose={() => setViewPerson(null)}
        onEdit={() => { setEditPerson(viewPerson); setViewPerson(null); setDialogOpen(true); }}
      />

      {/* Grant System Access dialog */}
      <GrantAccessDialog person={grantPerson} onClose={() => setGrantPerson(null)} />
    </div>
  );
}
