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
import { Loader2, Plus, LogIn, LogOut, Trash2, Users } from 'lucide-react';
import { format } from 'date-fns';

interface VisitorLog {
  public_id: string;
  visitor_name: string;
  company_org: string | null;
  purpose: string;
  host_name: string | null;
  id_type: string | null;
  id_number: string | null;
  badge_no: string | null;
  check_in_at: string;
  check_out_at: string | null;
  status: 'In' | 'Out';
  notes: string | null;
  processedBy: { id: number; fname: string; lname: string } | null;
}

const idTypes = ['PhilSys ID', 'Passport', 'Drivers License', 'UMID', 'Voters ID', 'Other'];

const statusColor: Record<string, string> = {
  In: 'bg-green-100 text-green-700',
  Out: 'bg-gray-100 text-gray-500',
};

const emptyForm = {
  visitor_name: '',
  company_org: '',
  purpose: '',
  host_name: '',
  id_type: '',
  id_number: '',
  badge_no: '',
  notes: '',
};

export default function FrontOfficeVisitorsPage() {
  const qc = useQueryClient();
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['front-office-visitors', dateFilter, statusFilter, searchFilter],
    queryFn: () => api.get('/front-office/visitors', {
      params: {
        date: dateFilter || undefined,
        status: statusFilter || undefined,
        search: searchFilter || undefined,
      },
    }).then(r => r.data),
  });

  const checkInMutation = useMutation({
    mutationFn: (payload: any) => api.post('/front-office/visitors/check-in', payload),
    onSuccess: () => {
      toast.success('Visitor checked in');
      qc.invalidateQueries({ queryKey: ['front-office-visitors'] });
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: () => toast.error('Failed to check in visitor'),
  });

  const checkOutMutation = useMutation({
    mutationFn: (publicId: string) => api.post(`/front-office/visitors/${publicId}/check-out`),
    onSuccess: () => {
      toast.success('Visitor checked out');
      qc.invalidateQueries({ queryKey: ['front-office-visitors'] });
    },
    onError: () => toast.error('Failed to check out visitor'),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => api.delete(`/front-office/visitors/${publicId}`),
    onSuccess: () => {
      toast.success('Visitor record deleted');
      qc.invalidateQueries({ queryKey: ['front-office-visitors'] });
    },
    onError: () => toast.error('Failed to delete record'),
  });

  const handleCheckIn = () => {
    if (!form.visitor_name.trim()) { toast.error('Visitor name is required'); return; }
    if (!form.purpose.trim()) { toast.error('Purpose is required'); return; }
    checkInMutation.mutate({
      visitor_name: form.visitor_name,
      company_org: form.company_org || null,
      purpose: form.purpose,
      host_name: form.host_name || null,
      id_type: form.id_type || null,
      id_number: form.id_number || null,
      badge_no: form.badge_no || null,
      notes: form.notes || null,
    });
  };

  const visitors: VisitorLog[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visitor Log</h1>
          <p className="text-muted-foreground">Track all school visitors</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />Check In Visitor
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Input
          className="w-48"
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="In">In</SelectItem>
            <SelectItem value="Out">Out</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="flex-1 min-w-36 max-w-xs"
          placeholder="Search visitor name..."
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
        />
        <Button variant="outline" size="sm" onClick={() => setDateFilter('')}>All Dates</Button>
      </div>

      {/* Active visitors today */}
      {statusFilter !== 'Out' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            {visitors.filter(v => v.status === 'In').length} visitor{visitors.filter(v => v.status === 'In').length !== 1 ? 's' : ''} currently on premises
          </span>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : visitors.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No visitor records found</p>
          ) : (
            <div className="divide-y">
              {visitors.map((v) => (
                <div key={v.public_id} className="flex items-start justify-between px-4 py-3 hover:bg-muted/30">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{v.visitor_name}</span>
                      {v.company_org && <span className="text-xs text-muted-foreground">({v.company_org})</span>}
                      <Badge className={`text-xs ${statusColor[v.status]}`} variant="outline">{v.status}</Badge>
                      {v.badge_no && <span className="text-xs text-muted-foreground">Badge #{v.badge_no}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Purpose: <span className="text-foreground">{v.purpose}</span>
                      {v.host_name ? ` · Host: ${v.host_name}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <LogIn className="inline h-3 w-3 mr-1" />
                      {format(new Date(v.check_in_at), 'MMM d, yyyy h:mm a')}
                      {v.check_out_at && (
                        <span> · <LogOut className="inline h-3 w-3 mr-1" />{format(new Date(v.check_out_at), 'h:mm a')}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {v.status === 'In' && (
                      <Button size="sm" variant="outline" onClick={() => checkOutMutation.mutate(v.public_id)}>
                        <LogOut className="mr-1 h-4 w-4" />Check Out
                      </Button>
                    )}
                    <Button
                      size="sm" variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm('Delete this visitor record?')) deleteMutation.mutate(v.public_id); }}
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

      {/* Check In Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Visitor Check-In</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Visitor Name *</Label>
              <Input value={form.visitor_name} onChange={e => setForm(f => ({ ...f, visitor_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Company / Organization</Label>
                <Input value={form.company_org} onChange={e => setForm(f => ({ ...f, company_org: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Host / Person to Visit</Label>
                <Input value={form.host_name} onChange={e => setForm(f => ({ ...f, host_name: e.target.value }))} placeholder="Teacher / Staff name" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Purpose of Visit *</Label>
              <Input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Student consultation, delivery..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ID Type</Label>
                <Select value={form.id_type} onValueChange={v => setForm(f => ({ ...f, id_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{idTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>ID Number</Label>
                <Input value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Badge No.</Label>
                <Input value={form.badge_no} onChange={e => setForm(f => ({ ...f, badge_no: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCheckIn} disabled={checkInMutation.isPending}>
              {checkInMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <LogIn className="mr-2 h-4 w-4" />Check In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
