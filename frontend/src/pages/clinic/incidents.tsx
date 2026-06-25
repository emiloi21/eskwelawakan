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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface HealthIncident {
  public_id: string;
  student_id: number;
  incident_type: string;
  incident_datetime: string;
  location: string | null;
  description: string;
  first_aid_given: string | null;
  referred_to_hospital: boolean;
  hospital_name: string | null;
  witnesses: string | null;
  status: string;
  notes: string | null;
  reported_by: number;
  student: { reg_id: number; public_id: string; fname: string; lname: string; gradeLevel: string; section: string } | null;
  reportedBy: { id: number; fname: string; lname: string } | null;
}

interface StudentSearchResult {
  reg_id: number;
  lname: string;
  fname: string;
  mname: string;
  gradeLevel: string;
  section: string;
}

const incidentTypes = ['Accident', 'Illness', 'Injury', 'Allergy', 'Other'];
const statusOptions = ['Open', 'Under Follow-up', 'Closed'];

const statusColor: Record<string, string> = {
  Open: 'bg-red-100 text-red-700',
  'Under Follow-up': 'bg-yellow-100 text-yellow-700',
  Closed: 'bg-gray-100 text-gray-600',
};

const typeColor: Record<string, string> = {
  Accident: 'bg-orange-100 text-orange-700',
  Illness: 'bg-blue-100 text-blue-700',
  Injury: 'bg-red-100 text-red-700',
  Allergy: 'bg-purple-100 text-purple-700',
  Other: 'bg-gray-100 text-gray-600',
};

const emptyForm = {
  student_id: '' as string | number,
  incident_type: 'Accident',
  incident_datetime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  location: '',
  description: '',
  first_aid_given: '',
  referred_to_hospital: false,
  hospital_name: '',
  witnesses: '',
  status: 'Open',
  notes: '',
};

export default function ClinicIncidentsPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editIncident, setEditIncident] = useState<HealthIncident | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['clinic-incidents', typeFilter, statusFilter],
    queryFn: () => api.get('/clinic/incidents', {
      params: {
        incident_type: typeFilter || undefined,
        status: statusFilter || undefined,
      },
    }).then(r => r.data),
  });

  const { data: studentsData } = useQuery({
    queryKey: ['registrar-students-search', studentSearch],
    queryFn: () => api.get('/registrar/students', { params: { search: studentSearch, per_page: 10 } }).then(r => r.data),
    enabled: studentSearch.length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/clinic/incidents', payload),
    onSuccess: () => {
      toast.success('Incident reported');
      qc.invalidateQueries({ queryKey: ['clinic-incidents'] });
      setShowForm(false);
      resetForm();
    },
    onError: () => toast.error('Failed to report incident'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ publicId, data }: { publicId: string; data: any }) =>
      api.put(`/clinic/incidents/${publicId}`, data),
    onSuccess: () => {
      toast.success('Incident updated');
      qc.invalidateQueries({ queryKey: ['clinic-incidents'] });
      setEditIncident(null);
    },
    onError: () => toast.error('Failed to update incident'),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => api.delete(`/clinic/incidents/${publicId}`),
    onSuccess: () => {
      toast.success('Incident deleted');
      qc.invalidateQueries({ queryKey: ['clinic-incidents'] });
    },
    onError: () => toast.error('Failed to delete incident'),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedStudent(null);
    setStudentSearch('');
  };

  const handleCreate = () => {
    if (!selectedStudent) { toast.error('Please select a student'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    createMutation.mutate({
      student_id: selectedStudent.reg_id,
      incident_type: form.incident_type,
      incident_datetime: form.incident_datetime,
      location: form.location || null,
      description: form.description,
      first_aid_given: form.first_aid_given || null,
      referred_to_hospital: form.referred_to_hospital,
      hospital_name: form.referred_to_hospital ? (form.hospital_name || null) : null,
      witnesses: form.witnesses || null,
      status: form.status,
      notes: form.notes || null,
    });
  };

  const handleUpdate = () => {
    if (!editIncident) return;
    updateMutation.mutate({
      publicId: editIncident.public_id,
      data: {
        status: editIncident.status,
        first_aid_given: editIncident.first_aid_given,
        referred_to_hospital: editIncident.referred_to_hospital,
        hospital_name: editIncident.hospital_name,
        notes: editIncident.notes,
      },
    });
  };

  const incidents: HealthIncident[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Health Incidents</h1>
          <p className="text-muted-foreground">Health accident and illness incident reports</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />Report Incident
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            {incidentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : incidents.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No incidents found</p>
          ) : (
            <div className="divide-y">
              {incidents.map((inc) => (
                <div key={inc.public_id} className="flex items-start justify-between px-4 py-3 hover:bg-muted/30">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">
                        {inc.student ? `${inc.student.lname}, ${inc.student.fname}` : 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {inc.student?.gradeLevel} – {inc.student?.section}
                      </span>
                      <Badge className={`text-xs ${typeColor[inc.incident_type] ?? 'bg-gray-100 text-gray-600'}`} variant="outline">
                        {inc.incident_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6 line-clamp-2">{inc.description}</p>
                    <p className="text-xs text-muted-foreground pl-6">
                      {format(new Date(inc.incident_datetime), 'MMM d, yyyy h:mm a')}
                      {inc.location ? ` · ${inc.location}` : ''}
                      {inc.referred_to_hospital ? ' · Referred to hospital' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Badge className={`text-xs ${statusColor[inc.status] ?? 'bg-gray-100 text-gray-600'}`} variant="outline">
                      {inc.status}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => setEditIncident(inc)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm('Delete this incident report?')) deleteMutation.mutate(inc.public_id); }}
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

      {/* New Incident Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Report Health Incident</DialogTitle></DialogHeader>
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
                      {s.lname}, {s.fname} — {s.gradeLevel} {s.section}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Incident Type *</Label>
                <Select value={form.incident_type} onValueChange={v => setForm(f => ({ ...f, incident_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{incidentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Date & Time *</Label>
              <Input type="datetime-local" value={form.incident_datetime} onChange={e => setForm(f => ({ ...f, incident_datetime: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Gymnasium, Classroom 101..." />
            </div>
            <div className="space-y-1">
              <Label>Description *</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What happened?" />
            </div>
            <div className="space-y-1">
              <Label>First Aid Given</Label>
              <Textarea rows={2} value={form.first_aid_given} onChange={e => setForm(f => ({ ...f, first_aid_given: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.referred_to_hospital}
                onCheckedChange={v => setForm(f => ({ ...f, referred_to_hospital: v }))}
              />
              <Label>Referred to Hospital</Label>
            </div>
            {form.referred_to_hospital && (
              <div className="space-y-1">
                <Label>Hospital Name</Label>
                <Input value={form.hospital_name} onChange={e => setForm(f => ({ ...f, hospital_name: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Witnesses</Label>
              <Input value={form.witnesses} onChange={e => setForm(f => ({ ...f, witnesses: e.target.value }))} placeholder="Names of witnesses..." />
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
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Incident Dialog */}
      <Dialog open={!!editIncident} onOpenChange={(o) => !o && setEditIncident(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Incident — {editIncident?.student ? `${editIncident.student.lname}, ${editIncident.student.fname}` : ''}</DialogTitle>
          </DialogHeader>
          {editIncident && (
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-muted/50 text-sm">
                <p className="font-medium">{editIncident.incident_type} · {format(new Date(editIncident.incident_datetime), 'MMM d, yyyy h:mm a')}</p>
                <p className="text-muted-foreground mt-1">{editIncident.description}</p>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={editIncident.status} onValueChange={v => setEditIncident(i => i ? { ...i, status: v } : i)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>First Aid Given</Label>
                <Textarea rows={2} value={editIncident.first_aid_given ?? ''} onChange={e => setEditIncident(i => i ? { ...i, first_aid_given: e.target.value } : i)} />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={editIncident.referred_to_hospital}
                  onCheckedChange={v => setEditIncident(i => i ? { ...i, referred_to_hospital: v } : i)}
                />
                <Label>Referred to Hospital</Label>
              </div>
              {editIncident.referred_to_hospital && (
                <div className="space-y-1">
                  <Label>Hospital Name</Label>
                  <Input value={editIncident.hospital_name ?? ''} onChange={e => setEditIncident(i => i ? { ...i, hospital_name: e.target.value } : i)} />
                </div>
              )}
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea rows={2} value={editIncident.notes ?? ''} onChange={e => setEditIncident(i => i ? { ...i, notes: e.target.value } : i)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditIncident(null)}>Cancel</Button>
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
