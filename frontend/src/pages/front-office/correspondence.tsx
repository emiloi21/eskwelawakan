import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { format } from 'date-fns';

interface Correspondence {
  public_id: string;
  direction: 'Incoming' | 'Outgoing';
  reference_no: string | null;
  from_to: string;
  subject: string;
  category: string | null;
  document_date: string;
  follow_up_date: string | null;
  status: string;
  notes: string | null;
  handledBy: { id: number; fname: string; lname: string } | null;
  created_at: string;
}

const statusOptions = ['Pending', 'Noted', 'Action Taken', 'Archived'];

const statusColor: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Noted: 'bg-blue-100 text-blue-700',
  'Action Taken': 'bg-green-100 text-green-700',
  Archived: 'bg-gray-100 text-gray-500',
};

const emptyForm = {
  direction: 'Incoming' as 'Incoming' | 'Outgoing',
  reference_no: '',
  from_to: '',
  subject: '',
  category: '',
  document_date: format(new Date(), 'yyyy-MM-dd'),
  follow_up_date: '',
  status: 'Pending',
  notes: '',
};

export default function FrontOfficeCorrespondencePage() {
  const qc = useQueryClient();
  const [directionFilter, setDirectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editItem, setEditItem] = useState<Correspondence | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ subject: '', from_to: '', status: '', follow_up_date: '', notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['front-office-correspondence', directionFilter, statusFilter, searchFilter],
    queryFn: () => api.get('/front-office/correspondence', {
      params: {
        direction: directionFilter || undefined,
        status: statusFilter || undefined,
        search: searchFilter || undefined,
      },
    }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/front-office/correspondence', payload),
    onSuccess: () => {
      toast.success('Correspondence logged');
      qc.invalidateQueries({ queryKey: ['front-office-correspondence'] });
      setShowCreateDialog(false);
      setForm(emptyForm);
    },
    onError: () => toast.error('Failed to log correspondence'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ publicId, payload }: { publicId: string; payload: any }) =>
      api.put(`/front-office/correspondence/${publicId}`, payload),
    onSuccess: () => {
      toast.success('Correspondence updated');
      qc.invalidateQueries({ queryKey: ['front-office-correspondence'] });
      setEditItem(null);
    },
    onError: () => toast.error('Failed to update correspondence'),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => api.delete(`/front-office/correspondence/${publicId}`),
    onSuccess: () => {
      toast.success('Correspondence deleted');
      qc.invalidateQueries({ queryKey: ['front-office-correspondence'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  const handleCreate = () => {
    if (!form.from_to.trim()) { toast.error('From / To is required'); return; }
    if (!form.subject.trim()) { toast.error('Subject is required'); return; }
    createMutation.mutate({
      direction: form.direction,
      reference_no: form.reference_no || null,
      from_to: form.from_to,
      subject: form.subject,
      category: form.category || null,
      document_date: form.document_date,
      follow_up_date: form.follow_up_date || null,
      status: form.status,
      notes: form.notes || null,
    });
  };

  const openEdit = (item: Correspondence) => {
    setEditItem(item);
    setEditForm({
      subject: item.subject,
      from_to: item.from_to,
      status: item.status,
      follow_up_date: item.follow_up_date ? item.follow_up_date.split('T')[0] : '',
      notes: item.notes ?? '',
    });
  };

  const handleUpdate = () => {
    if (!editItem) return;
    updateMutation.mutate({
      publicId: editItem.public_id,
      payload: {
        subject: editForm.subject,
        from_to: editForm.from_to,
        status: editForm.status || undefined,
        follow_up_date: editForm.follow_up_date || null,
        notes: editForm.notes || null,
      },
    });
  };

  const logs: Correspondence[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Correspondence Log</h1>
          <p className="text-muted-foreground">Track incoming and outgoing letters, memos, and documents</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setShowCreateDialog(true); }}>
          <Plus className="mr-2 h-4 w-4" />Log Correspondence
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Direction" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Direction</SelectItem>
            <SelectItem value="Incoming">Incoming</SelectItem>
            <SelectItem value="Outgoing">Outgoing</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          className="flex-1 min-w-36 max-w-xs"
          placeholder="Search subject, from/to, ref..."
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No correspondence records found</p>
          ) : (
            <div className="divide-y">
              {logs.map((item) => (
                <div key={item.public_id} className="flex items-start justify-between px-4 py-3 hover:bg-muted/30">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.direction === 'Incoming'
                        ? <ArrowDownToLine className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        : <ArrowUpFromLine className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      }
                      <span className="font-medium text-sm">{item.subject}</span>
                      <Badge className={`text-xs ${statusColor[item.status] ?? 'bg-gray-100 text-gray-600'}`} variant="outline">
                        {item.status}
                      </Badge>
                      {item.reference_no && (
                        <span className="text-xs text-muted-foreground">Ref: {item.reference_no}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.direction === 'Incoming' ? 'From' : 'To'}: <span className="text-foreground">{item.from_to}</span>
                      {item.category && ` · ${item.category}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Date: {format(new Date(item.document_date), 'MMM d, yyyy')}
                      {item.follow_up_date && ` · Follow-up: ${format(new Date(item.follow_up_date), 'MMM d, yyyy')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm('Delete this record?')) deleteMutation.mutate(item.public_id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(o) => !o && setShowCreateDialog(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Correspondence</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Direction *</Label>
                <Select value={form.direction} onValueChange={v => setForm(f => ({ ...f, direction: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Incoming">Incoming</SelectItem>
                    <SelectItem value="Outgoing">Outgoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Reference No.</Label>
                <Input value={form.reference_no} onChange={e => setForm(f => ({ ...f, reference_no: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{form.direction === 'Incoming' ? 'From' : 'To'} *</Label>
              <Input value={form.from_to} onChange={e => setForm(f => ({ ...f, from_to: e.target.value }))} placeholder="Organization / Person name" />
            </div>
            <div className="space-y-1">
              <Label>Subject *</Label>
              <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Category</Label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Memo, Letter" />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Document Date *</Label>
                <Input type="date" value={form.document_date} onChange={e => setForm(f => ({ ...f, document_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Follow-up Date</Label>
                <Input type="date" value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Update Correspondence</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Subject</Label>
              <Input value={editForm.subject} onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>From / To</Label>
              <Input value={editForm.from_to} onChange={e => setEditForm(f => ({ ...f, from_to: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Follow-up Date</Label>
                <Input type="date" value={editForm.follow_up_date} onChange={e => setEditForm(f => ({ ...f, follow_up_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
