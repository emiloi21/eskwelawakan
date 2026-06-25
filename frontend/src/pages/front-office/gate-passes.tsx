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
import { Loader2, Plus, CheckCircle, Trash2, DoorOpen } from 'lucide-react';
import { format } from 'date-fns';

interface GatePass {
  public_id: string;
  purpose: string;
  destination: string;
  expected_return: string | null;
  notes: string | null;
  issued_at: string;
  returned_at: string | null;
  status: 'Active' | 'Returned';
  authorized_by: number | null;
  student: { id: number; school_id: string; full_name: string } | null;
}

interface Student {
  id: number;
  school_id: string;
  fname: string;
  lname: string;
  full_name: string;
}

const statusColor: Record<string, string> = {
  Active: 'bg-orange-100 text-orange-700',
  Returned: 'bg-gray-100 text-gray-500',
};

const emptyForm = {
  student_id: 0,
  purpose: '',
  destination: '',
  expected_return: '',
  notes: '',
};

export default function FrontOfficeGatePassesPage() {
  const qc = useQueryClient();
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('Active');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['front-office-passes', dateFilter, statusFilter],
    queryFn: () => api.get('/front-office/gate-passes', {
      params: {
        date: dateFilter || undefined,
        status: statusFilter || undefined,
      },
    }).then(r => r.data),
  });

  const { data: studentsData } = useQuery({
    queryKey: ['student-search', studentSearch],
    queryFn: () => api.get('/registrar/students', { params: { search: studentSearch, per_page: 10 } }).then(r => r.data),
    enabled: studentSearch.length >= 2,
  });

  const issueMutation = useMutation({
    mutationFn: (payload: any) => api.post('/front-office/gate-passes', payload),
    onSuccess: () => {
      toast.success('Gate pass issued');
      qc.invalidateQueries({ queryKey: ['front-office-passes'] });
      setShowForm(false);
      setForm(emptyForm);
      setSelectedStudent(null);
      setStudentSearch('');
    },
    onError: () => toast.error('Failed to issue gate pass'),
  });

  const returnMutation = useMutation({
    mutationFn: (publicId: string) => api.post(`/front-office/gate-passes/${publicId}/return`),
    onSuccess: () => {
      toast.success('Gate pass marked as returned');
      qc.invalidateQueries({ queryKey: ['front-office-passes'] });
    },
    onError: () => toast.error('Failed to update gate pass'),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => api.delete(`/front-office/gate-passes/${publicId}`),
    onSuccess: () => {
      toast.success('Gate pass deleted');
      qc.invalidateQueries({ queryKey: ['front-office-passes'] });
    },
    onError: () => toast.error('Failed to delete gate pass'),
  });

  const handleIssue = () => {
    if (!selectedStudent) { toast.error('Please select a student'); return; }
    if (!form.purpose.trim()) { toast.error('Purpose is required'); return; }
    if (!form.destination.trim()) { toast.error('Destination is required'); return; }
    issueMutation.mutate({
      student_id: selectedStudent.id,
      purpose: form.purpose,
      destination: form.destination,
      expected_return: form.expected_return || null,
      notes: form.notes || null,
    });
  };

  const passes: GatePass[] = data?.data ?? [];
  const students: Student[] = studentsData?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gate Passes</h1>
          <p className="text-muted-foreground">Manage student exit permissions</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setSelectedStudent(null); setStudentSearch(''); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />Issue Gate Pass
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
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Returned">Returned</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setDateFilter('')}>All Dates</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : passes.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No gate passes found</p>
          ) : (
            <div className="divide-y">
              {passes.map((p) => (
                <div key={p.public_id} className="flex items-start justify-between px-4 py-3 hover:bg-muted/30">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{p.student?.full_name ?? '—'}</span>
                      {p.student?.school_id && <span className="text-xs text-muted-foreground">({p.student.school_id})</span>}
                      <Badge className={`text-xs ${statusColor[p.status]}`} variant="outline">{p.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="text-foreground">{p.purpose}</span> → <span className="text-foreground">{p.destination}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Issued: {format(new Date(p.issued_at), 'MMM d, yyyy h:mm a')}
                      {p.expected_return && ` · Expected back: ${format(new Date(p.expected_return), "h:mm a")}`}
                      {p.returned_at && ` · Returned: ${format(new Date(p.returned_at), 'h:mm a')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {p.status === 'Active' && (
                      <Button size="sm" variant="outline" onClick={() => returnMutation.mutate(p.public_id)}>
                        <CheckCircle className="mr-1 h-4 w-4" />Mark Returned
                      </Button>
                    )}
                    <Button
                      size="sm" variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm('Delete this gate pass?')) deleteMutation.mutate(p.public_id); }}
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

      {/* Issue Gate Pass Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><DoorOpen className="h-5 w-5" />Issue Gate Pass</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Student search */}
            <div className="space-y-1">
              <Label>Student *</Label>
              {selectedStudent ? (
                <div className="flex items-center justify-between bg-muted rounded px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{selectedStudent.full_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedStudent.school_id}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setSelectedStudent(null); setStudentSearch(''); }}>Change</Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Search student name or ID..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                  />
                  {students.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-md shadow-md mt-1 max-h-40 overflow-y-auto">
                      {students.map((s) => (
                        <button
                          key={s.id}
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                          onClick={() => { setSelectedStudent(s); setStudentSearch(''); }}
                        >
                          {s.full_name} <span className="text-muted-foreground">({s.school_id})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Purpose *</Label>
              <Input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Medical appointment" />
            </div>
            <div className="space-y-1">
              <Label>Destination *</Label>
              <Input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="e.g. Hospital, Home" />
            </div>
            <div className="space-y-1">
              <Label>Expected Return Time</Label>
              <Input type="datetime-local" value={form.expected_return} onChange={e => setForm(f => ({ ...f, expected_return: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleIssue} disabled={issueMutation.isPending}>
              {issueMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Issue Pass
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
