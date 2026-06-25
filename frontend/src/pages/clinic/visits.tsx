import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface ClinicVisit {
  public_id: string;
  student_id: number;
  visit_date: string;
  visit_time: string | null;
  complaint: string;
  diagnosis: string | null;
  treatment_given: string | null;
  medicine_given: string | null;
  vital_signs: Record<string, any> | null;
  referred_to: string | null;
  disposition: string;
  notes: string | null;
  handled_by: number;
  student: { reg_id: number; public_id: string; fname: string; lname: string; gradeLevel: string; section: string } | null;
  handledBy: { id: number; fname: string; lname: string } | null;
}

interface StudentSearchResult {
  reg_id: number;
  lname: string;
  fname: string;
  mname: string;
  gradeLevel: string;
  section: string;
}

const dispositionOptions = ['Released', 'Sent Home', 'Referred to Hospital', 'Admitted'];

const dispositionColor: Record<string, string> = {
  Released: 'bg-green-100 text-green-700',
  'Sent Home': 'bg-yellow-100 text-yellow-700',
  'Referred to Hospital': 'bg-red-100 text-red-700',
  Admitted: 'bg-red-100 text-red-700',
};

const emptyForm = {
  student_id: '' as string | number,
  visit_date: format(new Date(), 'yyyy-MM-dd'),
  visit_time: '',
  complaint: '',
  diagnosis: '',
  treatment_given: '',
  medicine_given: '',
  referred_to: '',
  disposition: 'Released',
  notes: '',
};

export default function ClinicVisitsPage() {
  const qc = useQueryClient();
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showForm, setShowForm] = useState(false);
  const [editVisit, setEditVisit] = useState<ClinicVisit | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['clinic-visits', dateFilter],
    queryFn: () => api.get('/clinic/visits', { params: { date: dateFilter || undefined } }).then(r => r.data),
  });

  const { data: studentsData } = useQuery({
    queryKey: ['registrar-students-search', studentSearch],
    queryFn: () => api.get('/registrar/students', { params: { search: studentSearch, per_page: 10 } }).then(r => r.data),
    enabled: studentSearch.length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/clinic/visits', payload),
    onSuccess: () => {
      toast.success('Visit logged');
      qc.invalidateQueries({ queryKey: ['clinic-visits'] });
      setShowForm(false);
      resetForm();
    },
    onError: () => toast.error('Failed to log visit'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ publicId, data }: { publicId: string; data: any }) =>
      api.put(`/clinic/visits/${publicId}`, data),
    onSuccess: () => {
      toast.success('Visit updated');
      qc.invalidateQueries({ queryKey: ['clinic-visits'] });
      setEditVisit(null);
    },
    onError: () => toast.error('Failed to update visit'),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => api.delete(`/clinic/visits/${publicId}`),
    onSuccess: () => {
      toast.success('Visit deleted');
      qc.invalidateQueries({ queryKey: ['clinic-visits'] });
    },
    onError: () => toast.error('Failed to delete visit'),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedStudent(null);
    setStudentSearch('');
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (v: ClinicVisit) => {
    setEditVisit(v);
  };

  const handleCreate = () => {
    if (!selectedStudent) { toast.error('Please select a student'); return; }
    if (!form.complaint.trim()) { toast.error('Complaint is required'); return; }
    createMutation.mutate({
      student_id: selectedStudent.reg_id,
      visit_date: form.visit_date,
      visit_time: form.visit_time || null,
      complaint: form.complaint,
      diagnosis: form.diagnosis || null,
      treatment_given: form.treatment_given || null,
      medicine_given: form.medicine_given || null,
      referred_to: form.referred_to || null,
      disposition: form.disposition,
      notes: form.notes || null,
    });
  };

  const handleUpdate = () => {
    if (!editVisit) return;
    updateMutation.mutate({
      publicId: editVisit.public_id,
      data: {
        diagnosis: editVisit.diagnosis,
        treatment_given: editVisit.treatment_given,
        medicine_given: editVisit.medicine_given,
        disposition: editVisit.disposition,
        notes: editVisit.notes,
      },
    });
  };

  const visits: ClinicVisit[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clinic Visits</h1>
          <p className="text-muted-foreground">Daily student visit log</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Log Visit</Button>
      </div>

      <div className="flex items-center gap-3">
        <Label className="shrink-0">Date</Label>
        <Input
          type="date"
          className="w-40"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
        />
        <Button variant="outline" size="sm" onClick={() => setDateFilter('')}>All Dates</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : visits.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No visits found</p>
          ) : (
            <div className="divide-y">
              {visits.map((v) => (
                <div key={v.public_id} className="flex items-start justify-between px-4 py-3 hover:bg-muted/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {v.student ? `${v.student.lname}, ${v.student.fname}` : 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {v.student?.gradeLevel} – {v.student?.section}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      <span className="font-medium text-foreground">Complaint:</span> {v.complaint}
                    </p>
                    {v.diagnosis && (
                      <p className="text-sm text-muted-foreground pl-6">
                        <span className="font-medium text-foreground">Diagnosis:</span> {v.diagnosis}
                      </p>
                    )}
                    {v.treatment_given && (
                      <p className="text-sm text-muted-foreground pl-6">
                        <span className="font-medium text-foreground">Treatment:</span> {v.treatment_given}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground pl-6">
                      {format(new Date(v.visit_date), 'MMM d, yyyy')}{v.visit_time ? ` at ${v.visit_time}` : ''}
                      {v.handledBy ? ` · Handled by: ${v.handledBy.fname} ${v.handledBy.lname}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Badge className={`text-xs ${dispositionColor[v.disposition] ?? 'bg-gray-100 text-gray-600'}`} variant="outline">
                      {v.disposition}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(v)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm('Delete this visit record?')) deleteMutation.mutate(v.public_id); }}
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

      {/* New Visit Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Clinic Visit</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Student *</Label>
              <Input
                placeholder="Search student name..."
                value={selectedStudent ? `${selectedStudent.lname}, ${selectedStudent.fname}` : studentSearch}
                onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); }}
              />
              {studentsData?.data?.length > 0 && !selectedStudent && (
                <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                  {studentsData.data.map((s: StudentSearchResult) => (
                    <button
                      key={s.reg_id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => { setSelectedStudent(s); setStudentSearch(''); }}
                    >
                      {s.lname}, {s.fname} {s.mname} — {s.gradeLevel} {s.section}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" value={form.visit_date} onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Time</Label>
                <Input type="time" value={form.visit_time} onChange={e => setForm(f => ({ ...f, visit_time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Chief Complaint *</Label>
              <Textarea rows={2} value={form.complaint} onChange={e => setForm(f => ({ ...f, complaint: e.target.value }))} placeholder="Symptom or reason for visit" />
            </div>
            <div className="space-y-1">
              <Label>Diagnosis</Label>
              <Textarea rows={2} value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Treatment Given</Label>
              <Textarea rows={2} value={form.treatment_given} onChange={e => setForm(f => ({ ...f, treatment_given: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Medicine Given</Label>
              <Input value={form.medicine_given} onChange={e => setForm(f => ({ ...f, medicine_given: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Referred To</Label>
              <Input value={form.referred_to} onChange={e => setForm(f => ({ ...f, referred_to: e.target.value }))} placeholder="Doctor, hospital..." />
            </div>
            <div className="space-y-1">
              <Label>Disposition *</Label>
              <Select value={form.disposition} onValueChange={v => setForm(f => ({ ...f, disposition: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{dispositionOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Visit Dialog */}
      <Dialog open={!!editVisit} onOpenChange={(o) => !o && setEditVisit(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Visit — {editVisit?.student ? `${editVisit.student.lname}, ${editVisit.student.fname}` : ''}</DialogTitle>
          </DialogHeader>
          {editVisit && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Diagnosis</Label>
                <Textarea rows={2} value={editVisit.diagnosis ?? ''} onChange={e => setEditVisit(v => v ? { ...v, diagnosis: e.target.value } : v)} />
              </div>
              <div className="space-y-1">
                <Label>Treatment Given</Label>
                <Textarea rows={2} value={editVisit.treatment_given ?? ''} onChange={e => setEditVisit(v => v ? { ...v, treatment_given: e.target.value } : v)} />
              </div>
              <div className="space-y-1">
                <Label>Medicine Given</Label>
                <Input value={editVisit.medicine_given ?? ''} onChange={e => setEditVisit(v => v ? { ...v, medicine_given: e.target.value } : v)} />
              </div>
              <div className="space-y-1">
                <Label>Disposition</Label>
                <Select value={editVisit.disposition} onValueChange={val => setEditVisit(v => v ? { ...v, disposition: val } : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{dispositionOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea rows={2} value={editVisit.notes ?? ''} onChange={e => setEditVisit(v => v ? { ...v, notes: e.target.value } : v)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVisit(null)}>Cancel</Button>
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
