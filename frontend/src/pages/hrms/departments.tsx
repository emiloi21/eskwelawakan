import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Loader2, Plus, Pencil, Trash2, Users, Briefcase, Building2, UserRound, ChevronRight, Search,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Department = {
  id: number; public_id: string; name: string;
  description: string | null; personnel_count: number;
};

type Position = {
  id: number; public_id: string; name: string;
  description: string | null; department: Department | null;
};

type StaffMember = {
  id: number; public_id: string; employee_id: string;
  fname: string; mname: string | null; lname: string;
  department: Department | null; position: Position | null; employment_type: string;
  status: string; photo: string | null;
};

// ── Staff sheet (personnel in a department) ───────────────────────────────────

function DepartmentStaffSheet({
  dept,
  open,
  onClose,
}: {
  dept: Department | null;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [assignSearch, setAssignSearch] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);

  // Staff currently in this department
  const { data, isLoading } = useQuery<{ data: StaffMember[] }>({
    queryKey: ['hrms-personnel-by-dept', dept?.id],
    queryFn: () =>
      api.get('/hrms/personnel', { params: { department_id: dept!.id, per_page: 100 } }).then(r => r.data),
    enabled: !!dept && open,
  });

  // All personnel (for the assign picker)
  const { data: allData, isLoading: allLoading } = useQuery<{ data: StaffMember[] }>({
    queryKey: ['hrms-personnel-all-for-assign'],
    queryFn: () => api.get('/hrms/personnel', { params: { per_page: 200 } }).then(r => r.data),
    enabled: assignOpen,
  });

  const assignMutation = useMutation({
    mutationFn: ({ publicId, departmentId }: { publicId: string; departmentId: number | null }) =>
      api.patch(`/hrms/personnel/${publicId}/department`, { department_id: departmentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hrms-personnel-by-dept', dept?.id] });
      qc.invalidateQueries({ queryKey: ['hrms-personnel-all-for-assign'] });
      qc.invalidateQueries({ queryKey: ['hrms-departments'] });
      qc.invalidateQueries({ queryKey: ['hrms-personnel'] });
    },
    onError: () => toast.error('Failed to update department.'),
  });

  const staff = data?.data ?? [];
  const allStaff = allData?.data ?? [];

  // Personnel NOT in this dept (candidates to assign)
  const candidates = allStaff.filter(
    p => p.department?.id !== dept?.id,
  );
  const filteredCandidates = candidates.filter(p => {
    if (!assignSearch) return true;
    const q = assignSearch.toLowerCase();
    return (
      p.fname.toLowerCase().includes(q) ||
      p.lname.toLowerCase().includes(q) ||
      p.employee_id.toLowerCase().includes(q)
    );
  });

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {dept?.name ?? ''}
          </SheetTitle>
          <SheetDescription>
            {staff.length} personnel in this department
          </SheetDescription>
        </SheetHeader>

        {/* Current staff list */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-0.5 min-h-0">
          {isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && staff.length === 0 && (
            <p className="text-sm text-muted-foreground italic text-center py-8">
              No personnel assigned. Use "Assign Staff" below.
            </p>
          )}
          {staff.map(p => (
            <div key={p.id} className="flex items-center gap-3 py-2.5 px-1 rounded-md hover:bg-muted/40 group">
              <div className="flex-shrink-0">
                {p.photo
                  ? <img src={p.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
                  : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.lname}, {p.fname}</p>
                <p className="text-xs text-muted-foreground truncate">{p.position?.name ?? '—'}</p>
              </div>
              <Badge
                variant={p.status === 'Active' ? 'default' : 'secondary'}
                className="text-xs flex-shrink-0"
              >
                {p.status}
              </Badge>
              {/* Remove from dept */}
              <Button
                size="sm" variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                title="Remove from department"
                onClick={() => assignMutation.mutate({ publicId: p.public_id, departmentId: null })}
                disabled={assignMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="mt-4 space-y-2 border-t pt-4">
          <Button
            variant="outline" className="w-full" size="sm"
            onClick={() => setAssignOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Assign Existing Staff
          </Button>
          <Button
            variant="ghost" className="w-full" size="sm"
            onClick={() => { onClose(); navigate('/hrms/personnel'); }}
          >
            <Users className="mr-2 h-4 w-4" />
            Open Staff Directory
            <ChevronRight className="ml-auto h-4 w-4" />
          </Button>
        </div>
      </SheetContent>

      {/* Assign picker dialog */}
      <Dialog open={assignOpen} onOpenChange={v => { if (!v) { setAssignOpen(false); setAssignSearch(''); } }}>
        <DialogContent className="max-w-sm max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Staff to {dept?.name}</DialogTitle>
            <DialogDescription>Select personnel to move into this department.</DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name or ID…"
              value={assignSearch}
              onChange={e => setAssignSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
            {allLoading && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!allLoading && filteredCandidates.length === 0 && (
              <p className="text-sm text-muted-foreground italic text-center py-6">
                {candidates.length === 0
                  ? 'All personnel are already in this department.'
                  : 'No matches found.'}
              </p>
            )}
            {filteredCandidates.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/40"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.lname}, {p.fname}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.department ? p.department.name : <span className="italic">No department</span>}
                    {p.position ? ` · ${p.position.name}` : ''}
                  </p>
                </div>
                <Button
                  size="sm" variant="outline" className="h-7 px-3 text-xs flex-shrink-0"
                  disabled={assignMutation.isPending}
                  onClick={() => {
                    assignMutation.mutate(
                      { publicId: p.public_id, departmentId: dept!.id },
                      { onSuccess: () => toast.success(`${p.fname} moved to ${dept!.name}.`) },
                    );
                  }}
                >
                  Assign
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => { setAssignOpen(false); setAssignSearch(''); }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}

// ── Department dialog (add / edit) ────────────────────────────────────────────

function DepartmentDialog({
  open,
  dept,
  onClose,
}: {
  open: boolean;
  dept: Department | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!dept;
  const [form, setForm] = useState({ name: dept?.name ?? '', description: dept?.description ?? '' });

  const set = (k: 'name' | 'description', v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm({ name: dept?.name ?? '', description: dept?.description ?? '' });
  }, [dept?.id]);

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? api.put(`/hrms/departments/${dept!.public_id}`, form)
        : api.post('/hrms/departments', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hrms-departments'] });
      toast.success(isEdit ? 'Department updated.' : 'Department created.');
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Save failed.'),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Department' : 'Add Department'}</DialogTitle>
          <DialogDescription>Enter department details below.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Department Name</Label>
            <Input
              placeholder="e.g. Academic - Grade School"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              rows={2}
              placeholder="Short description of this department…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={mutation.isPending || !form.name.trim()}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Position dialog (add / edit) ──────────────────────────────────────────────

function PositionDialog({
  open,
  pos,
  departments,
  defaultDeptId,
  onClose,
}: {
  open: boolean;
  pos: Position | null;
  departments: Department[];
  defaultDeptId?: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!pos;
  const [form, setForm] = useState({
    name: pos?.name ?? '',
    description: pos?.description ?? '',
    department_id: String(pos?.department?.id ?? defaultDeptId ?? ''),
  });

  const set = (k: 'name' | 'description' | 'department_id', v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, department_id: form.department_id || null };
      return isEdit
        ? api.put(`/hrms/positions/${pos!.public_id}`, payload)
        : api.post('/hrms/positions', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hrms-positions'] });
      toast.success(isEdit ? 'Position updated.' : 'Position created.');
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Save failed.'),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Position' : 'Add Position'}</DialogTitle>
          <DialogDescription>Enter position details below.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Position Title</Label>
            <Input
              placeholder="e.g. Subject Teacher"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select
              value={form.department_id || '__none__'}
              onValueChange={v => { const val = v ?? ''; set('department_id', val === '__none__' ? '' : val); }}
            >
              <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={mutation.isPending || !form.name.trim()}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Department card ───────────────────────────────────────────────────────────

function DepartmentCard({
  dept,
  positions,
  onEdit,
  onDelete,
  onViewStaff,
  onAddPosition,
  onEditPosition,
  onDeletePosition,
}: {
  dept: Department;
  positions: Position[];
  onEdit: () => void;
  onDelete: () => void;
  onViewStaff: () => void;
  onAddPosition: () => void;
  onEditPosition: (p: Position) => void;
  onDeletePosition: (p: Position) => void;
}) {
  const deptPositions = positions.filter(p => p.department?.id === dept.id);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base leading-snug">{dept.name}</CardTitle>
            {dept.description && (
              <CardDescription className="text-xs mt-0.5 line-clamp-2">{dept.description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit department" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm" variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              title="Delete department"
              onClick={() => {
                if (dept.personnel_count > 0) {
                  toast.error(`Cannot delete — ${dept.personnel_count} personnel assigned.`);
                  return;
                }
                if (confirm(`Delete department "${dept.name}"?`)) onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-1.5">
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={onViewStaff}
            title="View staff in this department"
          >
            <Users className="h-3.5 w-3.5" />
            <span>{dept.personnel_count} staff</span>
          </button>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" />
            <span>{deptPositions.length} position{deptPositions.length !== 1 ? 's' : ''}</span>
          </span>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-3 pb-3 flex-1">
        {/* Positions list */}
        <div className="space-y-1">
          {deptPositions.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No positions defined.</p>
          )}
          {deptPositions.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-2 group">
              <span className="text-sm truncate">{p.name}</span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm" variant="ghost" className="h-6 w-6 p-0"
                  onClick={() => onEditPosition(p)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => { if (confirm(`Delete position "${p.name}"?`)) onDeletePosition(p); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="ghost" size="sm"
          className="mt-3 h-7 w-full text-xs text-muted-foreground border border-dashed"
          onClick={onAddPosition}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Position
        </Button>
      </CardContent>

      <Separator />

      <div className="px-4 py-3">
        <Button
          variant="outline" size="sm" className="w-full h-9 text-sm font-medium"
          onClick={onViewStaff}
        >
          <Users className="h-4 w-4 mr-2" />
          View Staff
          <ChevronRight className="ml-auto h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HrmsDepartmentsPage() {
  const qc = useQueryClient();

  // Dialog state
  const [deptDialog, setDeptDialog] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [posDialog, setPosDialog] = useState(false);
  const [editPos, setEditPos] = useState<Position | null>(null);
  const [posDefaultDept, setPosDefaultDept] = useState<number | undefined>(undefined);

  // Staff sheet
  const [viewDept, setViewDept] = useState<Department | null>(null);

  // Queries
  const { data: deptsData, isLoading: deptsLoading } = useQuery<{ data: Department[] }>({
    queryKey: ['hrms-departments'],
    queryFn: () => api.get('/hrms/departments').then(r => r.data),
  });

  const { data: posData, isLoading: posLoading } = useQuery<{ data: Position[] }>({
    queryKey: ['hrms-positions'],
    queryFn: () => api.get('/hrms/positions').then(r => r.data),
  });

  const deleteDept = useMutation({
    mutationFn: (pid: string) => api.delete(`/hrms/departments/${pid}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hrms-departments'] });
      toast.success('Department deleted.');
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Delete failed.'),
  });

  const deletePos = useMutation({
    mutationFn: (pid: string) => api.delete(`/hrms/positions/${pid}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hrms-positions'] });
      toast.success('Position deleted.');
    },
    onError: () => toast.error('Delete failed.'),
  });

  const departments = deptsData?.data ?? [];
  const positions = posData?.data ?? [];
  const isLoading = deptsLoading || posLoading;

  const totalPositions = positions.length;
  const totalStaff = departments.reduce((sum, d) => sum + d.personnel_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">
            Manage organizational departments and the positions within them
          </p>
        </div>
        <Button onClick={() => { setEditDept(null); setDeptDialog(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Department
        </Button>
      </div>

      {/* Summary stats */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Departments</p>
            <p className="text-2xl font-bold mt-0.5">{departments.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Positions</p>
            <p className="text-2xl font-bold mt-0.5">{totalPositions}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total Personnel</p>
            <p className="text-2xl font-bold mt-0.5">{totalStaff}</p>
          </Card>
        </div>
      )}

      {/* Department cards */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : departments.length === 0 ? (
        <Card className="py-16">
          <p className="text-sm text-muted-foreground italic text-center">
            No departments yet. Click "Add Department" to get started.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map(dept => (
            <DepartmentCard
              key={dept.id}
              dept={dept}
              positions={positions}
              onEdit={() => { setEditDept(dept); setDeptDialog(true); }}
              onDelete={() => deleteDept.mutate(dept.public_id)}
              onViewStaff={() => setViewDept(dept)}
              onAddPosition={() => {
                setEditPos(null);
                setPosDefaultDept(dept.id);
                setPosDialog(true);
              }}
              onEditPosition={p => { setEditPos(p); setPosDefaultDept(undefined); setPosDialog(true); }}
              onDeletePosition={p => deletePos.mutate(p.public_id)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <DepartmentDialog
        open={deptDialog}
        dept={editDept}
        onClose={() => { setDeptDialog(false); setEditDept(null); }}
      />

      <PositionDialog
        open={posDialog}
        pos={editPos}
        departments={departments}
        defaultDeptId={posDefaultDept}
        onClose={() => { setPosDialog(false); setEditPos(null); setPosDefaultDept(undefined); }}
      />

      {/* Staff drill-through sheet */}
      <DepartmentStaffSheet
        dept={viewDept}
        open={!!viewDept}
        onClose={() => setViewDept(null)}
      />
    </div>
  );
}
