import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Pencil, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

type User = { id: number; public_id: string; fname: string; lname: string; access: string };
type CheckItem = { id: number; item_name: string; property_no: string | null; expected_quantity: number };
type InventoryCheck = {
  id: number; public_id: string; title: string; school_year: string; location: string;
  status: string; due_date: string | null; submitted_at: string | null; created_at: string;
  check_items_count?: number;
  assignee: { fname: string; lname: string } | null;
  reviewer: { fname: string; lname: string } | null;
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending: 'secondary', 'In Progress': 'default', Submitted: 'outline', Reviewed: 'default',
};

// ── Create / Edit dialog ──────────────────────────────────────────
function CheckDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '', school_year: '2025-2026', location: '', assigned_to_id: '',
    due_date: '', auto_populate: true,
  });
  const set = (k: keyof typeof form, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const { data: usersData } = useQuery<User[]>({
    queryKey: ['users-list'],
    queryFn: () => api.get('/admin/users').then(r => r.data?.data ?? []),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () => api.post('/custodian/inventory', {
      title: form.title, school_year: form.school_year,
      location: form.location, assigned_to_id: parseInt(form.assigned_to_id),
      due_date: form.due_date || null, auto_populate: form.auto_populate,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-checks'] });
      toast.success(form.auto_populate ? 'Inventory check created and auto-populated.' : 'Inventory check created.');
      onClose();
      setForm({ title: '', school_year: '2025-2026', location: '', assigned_to_id: '', due_date: '', auto_populate: true });
    },
    onError: () => toast.error('Failed to create.'),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Inventory Check</DialogTitle>
          <DialogDescription>Assign a year-end inventory task to a personnel or room adviser.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Room 101 Annual Inventory 2025-2026" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>School Year *</Label><Input value={form.school_year} onChange={e => set('school_year', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Location / Room *</Label><Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Room 101, Library…" /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Assign To *</Label>
            <Select value={form.assigned_to_id} onValueChange={v => set('assigned_to_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select personnel…" /></SelectTrigger>
              <SelectContent>
                {(usersData ?? [])
                  .filter(u => !['Student', 'Parent', 'Applicant'].includes(u.access))
                  .map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.fname} {u.lname} ({u.access})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="rounded" checked={form.auto_populate} onChange={e => set('auto_populate', e.target.checked)} />
            Auto-populate items from property records matching location
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={mutation.isPending || !form.title || !form.location || !form.assigned_to_id} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add item to existing check ────────────────────────────────────
function AddItemDialog({ open, checkId, onClose }: { open: boolean; checkId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ item_name: '', property_no: '', expected_quantity: '1' });

  const mutation = useMutation({
    mutationFn: () => api.post(`/custodian/inventory/${checkId}/items`, {
      item_name: form.item_name, property_no: form.property_no || null,
      expected_quantity: parseInt(form.expected_quantity) || 1,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-check', checkId] }); toast.success('Item added.'); onClose(); setForm({ item_name: '', property_no: '', expected_quantity: '1' }); },
    onError: () => toast.error('Failed.'),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Item</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Item Name *</Label><Input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Property No.</Label><Input value={form.property_no} onChange={e => setForm(f => ({ ...f, property_no: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Expected Quantity</Label><Input type="number" min={1} value={form.expected_quantity} onChange={e => setForm(f => ({ ...f, expected_quantity: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={mutation.isPending || !form.item_name} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Check detail sheet ────────────────────────────────────────────
function CheckSheet({ check, open, onClose }: { check: InventoryCheck | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState('');

  const { data, isLoading } = useQuery<{ data: InventoryCheck & { check_items: CheckItem[] } }>({
    queryKey: ['inventory-check', check?.public_id],
    queryFn: () => api.get(`/custodian/inventory/${check!.public_id}`).then(r => r.data),
    enabled: !!check,
  });

  const review = useMutation({
    mutationFn: () => api.post(`/custodian/inventory/${check!.public_id}/review`, { remarks: reviewRemarks }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-checks'] }); qc.invalidateQueries({ queryKey: ['inventory-check', check?.public_id] }); toast.success('Reviewed.'); },
    onError: () => toast.error('Failed.'),
  });

  const removeItem = useMutation({
    mutationFn: (itemId: number) => api.delete(`/custodian/inventory/${check!.public_id}/items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-check', check?.public_id] }),
    onError: () => toast.error('Failed.'),
  });

  const detail = data?.data;

  return (
    <>
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{check?.title}</SheetTitle>
            <p className="text-sm text-muted-foreground">{check?.location} · {check?.school_year} · Assigned to: {check?.assignee?.fname} {check?.assignee?.lname}</p>
          </SheetHeader>

          {isLoading
            ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Badge variant={statusVariant[detail?.status ?? ''] ?? 'outline'}>{detail?.status}</Badge>
                  {detail?.status === 'Pending' || detail?.status === 'In Progress' ? (
                    <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add Item</Button>
                  ) : null}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Property No.</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Counted</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detail?.check_items ?? []).map(it => (
                      <TableRow key={it.id}>
                        <TableCell className="text-sm">{it.item_name}</TableCell>
                        <TableCell className="text-xs font-mono">{it.property_no ?? '—'}</TableCell>
                        <TableCell className="text-sm">{it.expected_quantity}</TableCell>
                        <TableCell className="text-sm">
                          {(it as CheckItem & { counted_quantity?: number; condition_found?: string }).counted_quantity ?? <span className="text-muted-foreground italic">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {(it as CheckItem & { condition_found?: string }).condition_found ?? <span className="text-muted-foreground italic">—</span>}
                        </TableCell>
                        <TableCell>
                          {(detail?.status === 'Pending' || detail?.status === 'In Progress') && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                              onClick={() => removeItem.mutate(it.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {detail?.assignee_remarks && (
                  <div className="text-sm bg-muted p-3 rounded-md">
                    <p className="font-medium">Assignee Remarks:</p>
                    <p className="text-muted-foreground italic">{detail.assignee_remarks}</p>
                  </div>
                )}

                {detail?.status === 'Submitted' && (
                  <div className="space-y-2 border-t pt-3">
                    <Label>Custodian Review Remarks</Label>
                    <Textarea rows={2} value={reviewRemarks} onChange={e => setReviewRemarks(e.target.value)} />
                    <Button className="w-full bg-green-700 hover:bg-green-800" disabled={review.isPending} onClick={() => review.mutate()}>
                      {review.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Mark as Reviewed
                    </Button>
                  </div>
                )}
              </div>
            )
          }
        </SheetContent>
      </Sheet>
      {addOpen && check && (
        <AddItemDialog open={addOpen} checkId={check.public_id} onClose={() => setAddOpen(false)} />
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function CustodianInventoryPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<InventoryCheck | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: InventoryCheck[]; meta: { current_page: number; last_page: number; total: number } }>({
    queryKey: ['inventory-checks', statusFilter, page],
    queryFn: () => api.get('/custodian/inventory', { params: { status: statusFilter || undefined, page } }).then(r => r.data),
  });

  const del = useMutation({
    mutationFn: (pid: string) => api.delete(`/custodian/inventory/${pid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-checks'] }); toast.success('Deleted.'); },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Delete failed.'),
  });

  const checks = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Year-End Inventory</h1>
          <p className="text-muted-foreground">Assign and manage property inventory checks per office/room</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Inventory Check</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Select value={statusFilter || '__all__'} onValueChange={v => { setStatusFilter(v === '__all__' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Status</SelectItem>
              {['Pending', 'In Progress', 'Submitted', 'Reviewed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                : checks.length === 0
                  ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">No inventory checks found.</TableCell></TableRow>
                  : checks.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">{c.title}</TableCell>
                      <TableCell className="text-sm">{c.location}</TableCell>
                      <TableCell className="text-sm">{c.assignee ? `${c.assignee.fname} ${c.assignee.lname}` : '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.due_date ? format(new Date(c.due_date), 'MMM d, yyyy') : '—'}</TableCell>
                      <TableCell><Badge variant={statusVariant[c.status] ?? 'outline'} className="text-xs">{c.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSelectedCheck(c)}>
                            <ClipboardList className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                          {c.status === 'Pending' && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                              onClick={() => { if (confirm('Delete this check?')) del.mutate(c.public_id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Page {meta.current_page} of {meta.last_page} · {meta.total} checks</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={meta.current_page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" disabled={meta.current_page === meta.last_page} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <CheckDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <CheckSheet check={selectedCheck} open={!!selectedCheck} onClose={() => setSelectedCheck(null)} />
    </div>
  );
}
