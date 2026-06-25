import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Search, Plus, Eye, Pencil } from 'lucide-react';
import { format } from 'date-fns';

interface HealthRecord {
  public_id: string;
  student_id: number;
  blood_type: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  vision_left: string | null;
  vision_right: string | null;
  hearing_left: string | null;
  hearing_right: string | null;
  medical_conditions: string | null;
  allergies: string | null;
  current_medications: string | null;
  vaccination_records: any[] | null;
  last_physical_exam: string | null;
  philhealth_no: string | null;
  notes: string | null;
  student: {
    reg_id: number;
    public_id: string;
    fname: string;
    lname: string;
    gradeLevel: string;
    section: string;
  } | null;
}

interface StudentSearchResult {
  reg_id: number;
  lname: string;
  fname: string;
  mname: string;
  gradeLevel: string;
  section: string;
}

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const hearingOptions = ['Normal', 'Mild Loss', 'Moderate Loss', 'Severe Loss'];

const emptyForm = {
  student_id: '' as string | number,
  blood_type: '',
  height_cm: '',
  weight_kg: '',
  vision_left: '',
  vision_right: '',
  hearing_left: '',
  hearing_right: '',
  medical_conditions: '',
  allergies: '',
  current_medications: '',
  last_physical_exam: '',
  philhealth_no: '',
  notes: '',
};

export default function ClinicHealthRecordsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [viewRecord, setViewRecord] = useState<HealthRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['clinic-health-records', search],
    queryFn: () => api.get('/clinic/health-records', { params: { search: search || undefined } }).then(r => r.data),
  });

  const { data: studentsData } = useQuery({
    queryKey: ['registrar-students-search', studentSearch],
    queryFn: () => api.get('/registrar/students', { params: { search: studentSearch, per_page: 10 } }).then(r => r.data),
    enabled: studentSearch.length >= 2,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => api.post('/clinic/health-records', payload),
    onSuccess: () => {
      toast.success('Health record saved');
      qc.invalidateQueries({ queryKey: ['clinic-health-records'] });
      setShowForm(false);
      resetForm();
    },
    onError: () => toast.error('Failed to save health record'),
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

  const openEdit = (record: HealthRecord) => {
    setSelectedStudent(record.student as any);
    setForm({
      student_id: record.student_id,
      blood_type: record.blood_type ?? '',
      height_cm: record.height_cm?.toString() ?? '',
      weight_kg: record.weight_kg?.toString() ?? '',
      vision_left: record.vision_left ?? '',
      vision_right: record.vision_right ?? '',
      hearing_left: record.hearing_left ?? '',
      hearing_right: record.hearing_right ?? '',
      medical_conditions: record.medical_conditions ?? '',
      allergies: record.allergies ?? '',
      current_medications: record.current_medications ?? '',
      last_physical_exam: record.last_physical_exam ?? '',
      philhealth_no: record.philhealth_no ?? '',
      notes: record.notes ?? '',
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!selectedStudent && !form.student_id) {
      toast.error('Please select a student');
      return;
    }
    const payload: any = {
      student_id: selectedStudent?.reg_id ?? form.student_id,
      blood_type: form.blood_type || null,
      height_cm: form.height_cm ? parseFloat(form.height_cm as string) : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg as string) : null,
      vision_left: form.vision_left || null,
      vision_right: form.vision_right || null,
      hearing_left: form.hearing_left || null,
      hearing_right: form.hearing_right || null,
      medical_conditions: form.medical_conditions || null,
      allergies: form.allergies || null,
      current_medications: form.current_medications || null,
      last_physical_exam: form.last_physical_exam || null,
      philhealth_no: form.philhealth_no || null,
      notes: form.notes || null,
    };
    saveMutation.mutate(payload);
  };

  const records: HealthRecord[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Health Records</h1>
          <p className="text-muted-foreground">Student medical information and physical examination records</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />New Record</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by student name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : records.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No health records found</p>
          ) : (
            <div className="divide-y">
              {records.map((rec) => (
                <div key={rec.public_id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{rec.student ? `${rec.student.lname}, ${rec.student.fname}` : 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      {rec.student?.gradeLevel} – {rec.student?.section}
                      {rec.blood_type ? ` · Blood Type: ${rec.blood_type}` : ''}
                      {rec.last_physical_exam ? ` · Last exam: ${format(new Date(rec.last_physical_exam), 'MMM d, yyyy')}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setViewRecord(rec)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(rec)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedStudent ? 'Edit Health Record' : 'New Health Record'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Student selector (only when creating new) */}
            {!form.student_id && (
              <div className="space-y-2">
                <Label>Student *</Label>
                <Input
                  placeholder="Search student name..."
                  value={selectedStudent ? `${selectedStudent.lname}, ${selectedStudent.fname}` : studentSearch}
                  onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); }}
                />
                {studentsData?.data?.length > 0 && !selectedStudent && (
                  <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
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
                {selectedStudent && (
                  <Badge variant="secondary">{selectedStudent.lname}, {selectedStudent.fname} — {selectedStudent.gradeLevel} {selectedStudent.section}</Badge>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Blood Type</Label>
                <Select value={form.blood_type} onValueChange={v => setForm(f => ({ ...f, blood_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{bloodTypes.map(bt => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>PhilHealth No.</Label>
                <Input value={form.philhealth_no} onChange={e => setForm(f => ({ ...f, philhealth_no: e.target.value }))} placeholder="xx-xxxxxxxxx-x" />
              </div>
              <div className="space-y-1">
                <Label>Height (cm)</Label>
                <Input type="number" value={form.height_cm} onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))} placeholder="150" />
              </div>
              <div className="space-y-1">
                <Label>Weight (kg)</Label>
                <Input type="number" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} placeholder="45" />
              </div>
              <div className="space-y-1">
                <Label>Vision – Left</Label>
                <Input value={form.vision_left} onChange={e => setForm(f => ({ ...f, vision_left: e.target.value }))} placeholder="20/20" />
              </div>
              <div className="space-y-1">
                <Label>Vision – Right</Label>
                <Input value={form.vision_right} onChange={e => setForm(f => ({ ...f, vision_right: e.target.value }))} placeholder="20/20" />
              </div>
              <div className="space-y-1">
                <Label>Hearing – Left</Label>
                <Select value={form.hearing_left} onValueChange={v => setForm(f => ({ ...f, hearing_left: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{hearingOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Hearing – Right</Label>
                <Select value={form.hearing_right} onValueChange={v => setForm(f => ({ ...f, hearing_right: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{hearingOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Last Physical Exam</Label>
              <Input type="date" value={form.last_physical_exam} onChange={e => setForm(f => ({ ...f, last_physical_exam: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Medical Conditions</Label>
              <Textarea rows={2} value={form.medical_conditions} onChange={e => setForm(f => ({ ...f, medical_conditions: e.target.value }))} placeholder="e.g. asthma, diabetes..." />
            </div>
            <div className="space-y-1">
              <Label>Allergies</Label>
              <Textarea rows={2} value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder="Food, drug, environmental allergies..." />
            </div>
            <div className="space-y-1">
              <Label>Current Medications</Label>
              <Textarea rows={2} value={form.current_medications} onChange={e => setForm(f => ({ ...f, current_medications: e.target.value }))} placeholder="Maintenance medications..." />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewRecord} onOpenChange={(o) => !o && setViewRecord(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewRecord?.student ? `${viewRecord.student.lname}, ${viewRecord.student.fname}` : 'Health Record'}
            </DialogTitle>
          </DialogHeader>
          {viewRecord && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Grade / Section', `${viewRecord.student?.gradeLevel ?? '—'} – ${viewRecord.student?.section ?? '—'}`],
                ['Blood Type', viewRecord.blood_type ?? '—'],
                ['Height', viewRecord.height_cm ? `${viewRecord.height_cm} cm` : '—'],
                ['Weight', viewRecord.weight_kg ? `${viewRecord.weight_kg} kg` : '—'],
                ['Vision Left', viewRecord.vision_left ?? '—'],
                ['Vision Right', viewRecord.vision_right ?? '—'],
                ['Hearing Left', viewRecord.hearing_left ?? '—'],
                ['Hearing Right', viewRecord.hearing_right ?? '—'],
                ['PhilHealth No.', viewRecord.philhealth_no ?? '—'],
                ['Last Physical Exam', viewRecord.last_physical_exam ? format(new Date(viewRecord.last_physical_exam), 'MMMM d, yyyy') : '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium">{val}</p>
                </div>
              ))}
              {viewRecord.medical_conditions && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Medical Conditions</p>
                  <p>{viewRecord.medical_conditions}</p>
                </div>
              )}
              {viewRecord.allergies && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Allergies</p>
                  <p>{viewRecord.allergies}</p>
                </div>
              )}
              {viewRecord.current_medications && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Current Medications</p>
                  <p>{viewRecord.current_medications}</p>
                </div>
              )}
              {viewRecord.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p>{viewRecord.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRecord(null)}>Close</Button>
            <Button onClick={() => { openEdit(viewRecord!); setViewRecord(null); }}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
