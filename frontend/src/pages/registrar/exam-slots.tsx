import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Loader2, Plus, Pencil, Trash2, Users, MapPin, Calendar, Clock,
  CheckCircle2, XCircle, Minus,
} from 'lucide-react';
import { DEPARTMENTS } from '@/lib/constants';

type ExamSlot = {
  id: number;
  public_id: string;
  school_year: string;
  dept: string | null;
  grade_level: string | null;
  exam_date: string;
  exam_time: string;
  location: string;
  capacity: number;
  bookings_count: number;
  notes: string | null;
  is_active: boolean;
};

type Booking = {
  booking_id: number;
  reg_id: string;
  public_id: string;
  student_id: string;
  name: string;
  grade_level: string;
  dept: string;
  result: string | null;
  remarks: string | null;
  booked_at: string;
};

const GRADE_LEVELS = [
  'Pre-Kinder', 'Kinder',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade 11', 'Grade 12',
];

function formatTime(t: string) {
  try {
    const [h, m] = t.split(':');
    const d = new Date();
    d.setHours(Number(h), Number(m));
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return t;
  }
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ── Slot form (create / edit) ─────────────────────────────────────────────
type SlotFormData = {
  school_year: string;
  dept: string;
  grade_level: string;
  exam_date: string;
  exam_time: string;
  location: string;
  capacity: string;
  notes: string;
  is_active: boolean;
};

function SlotDialog({
  open, slot, defaultSy, onClose,
}: {
  open: boolean;
  slot: ExamSlot | null;
  defaultSy: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!slot;

  const [form, setForm] = useState<SlotFormData>(() => ({
    school_year: slot?.school_year ?? defaultSy,
    dept: slot?.dept ?? '',
    grade_level: slot?.grade_level ?? '',
    exam_date: slot?.exam_date ?? '',
    exam_time: slot?.exam_time?.slice(0, 5) ?? '',
    location: slot?.location ?? '',
    capacity: String(slot?.capacity ?? 30),
    notes: slot?.notes ?? '',
    is_active: slot?.is_active ?? true,
  }));

  const set = (k: keyof SlotFormData, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        school_year: form.school_year,
        dept: form.dept || null,
        grade_level: form.grade_level || null,
        exam_date: form.exam_date,
        exam_time: form.exam_time,
        location: form.location,
        capacity: Number(form.capacity),
        notes: form.notes || null,
        is_active: form.is_active,
      };
      return isEdit
        ? api.put(`/registrar/exam-slots/${slot!.public_id}`, payload)
        : api.post('/registrar/exam-slots', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-slots'] });
      toast.success(isEdit ? 'Exam slot updated.' : 'Exam slot created.');
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Save failed.'),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Exam Slot' : 'New Exam Slot'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update this exam time slot.' : 'Create a new entrance exam time slot.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>School Year <span className="text-destructive">*</span></Label>
              <Input value={form.school_year} onChange={e => set('school_year', e.target.value)} placeholder="2025-2026" />
            </div>
            <div className="space-y-1.5">
              <Label>Capacity <span className="text-destructive">*</span></Label>
              <Input type="number" min={1} value={form.capacity} onChange={e => set('capacity', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.exam_date} onChange={e => set('exam_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Time <span className="text-destructive">*</span></Label>
              <Input type="time" value={form.exam_time} onChange={e => set('exam_time', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Location <span className="text-destructive">*</span></Label>
            <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Room 101, Main Building" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Department Filter</Label>
              <Select value={form.dept} onValueChange={v => set('dept', v === '__all__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All departments</SelectItem>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Grade Level Filter</Label>
              <Select value={form.grade_level} onValueChange={v => set('grade_level', v === '__all__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All grades" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All grades</SelectItem>
                  {GRADE_LEVELS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Instructions or special information for applicants…"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={form.is_active}
              onCheckedChange={v => set('is_active', v)}
            />
            <Label htmlFor="is_active">Active (visible to registrars)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={mutation.isPending || !form.exam_date || !form.exam_time || !form.location || !form.school_year}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Slot'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bookings management sheet ─────────────────────────────────────────────
function BookingsSheet({
  slot, open, onClose,
}: { slot: ExamSlot | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [assignSearch, setAssignSearch] = useState('');
  const [resultTarget, setResultTarget] = useState<Booking | null>(null);
  const [resultValue, setResultValue] = useState<'Pass' | 'Fail'>('Pass');
  const [resultRemarks, setResultRemarks] = useState('');
  const [resultDialogOpen, setResultDialogOpen] = useState(false);

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery<{ data: Booking[] }>({
    queryKey: ['exam-bookings', slot?.public_id],
    queryFn: () => api.get(`/registrar/exam-slots/${slot!.public_id}/bookings`).then(r => r.data),
    enabled: open && !!slot,
  });

  // Search applicants to assign
  const { data: searchData, isLoading: searchLoading } = useQuery<{ data: { public_id: string; student_id: string; name: string; status: string }[] }>({
    queryKey: ['exam-assign-search', assignSearch],
    queryFn: async () => {
      const { data } = await api.get('/registrar/students', {
        params: { search: assignSearch, status: 'Pending', per_page: 8, schoolYear: slot?.school_year },
      });
      return {
        data: (data.data ?? []).map((s: { public_id: string; student_id: string; fname: string; lname: string; status: string }) => ({
          public_id: s.public_id,
          student_id: s.student_id,
          name: `${s.lname}, ${s.fname}`,
          status: s.status,
        })),
      };
    },
    enabled: open && !!slot && assignSearch.length >= 2,
  });

  const bookMutation = useMutation({
    mutationFn: (applicantPublicId: string) =>
      api.post(`/registrar/exam-slots/${slot!.public_id}/book`, { applicant_public_id: applicantPublicId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-bookings', slot?.public_id] });
      qc.invalidateQueries({ queryKey: ['exam-slots'] });
      setAssignSearch('');
      toast.success('Applicant assigned to exam slot.');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Assignment failed.'),
  });

  const unbookMutation = useMutation({
    mutationFn: (booking: Booking) =>
      api.delete(`/registrar/exam-slots/${slot!.public_id}/book/${booking.public_id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-bookings', slot?.public_id] });
      qc.invalidateQueries({ queryKey: ['exam-slots'] });
      toast.success('Booking removed.');
    },
    onError: () => toast.error('Failed to remove booking.'),
  });

  const resultMutation = useMutation({
    mutationFn: () =>
      api.put(`/registrar/exam-slots/${slot!.public_id}/result/${resultTarget!.public_id}`, {
        result: resultValue,
        remarks: resultRemarks || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-bookings', slot?.public_id] });
      toast.success('Exam result recorded.');
      setResultDialogOpen(false);
    },
    onError: () => toast.error('Failed to record result.'),
  });

  const bookings = bookingsData?.data ?? [];
  const spotsLeft = slot ? slot.capacity - bookings.length : 0;

  return (
    <>
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Exam Slot — {slot ? formatDate(slot.exam_date) : ''}</SheetTitle>
            <SheetDescription>
              {slot && `${formatTime(slot.exam_time)} · ${slot.location} · ${bookings.length}/${slot.capacity} booked`}
            </SheetDescription>
          </SheetHeader>

          {/* Assign applicant */}
          <div className="mb-5">
            <Label className="mb-1.5 block text-sm font-semibold">Assign Applicant</Label>
            <div className="space-y-2">
              <Input
                placeholder="Search by name or ID (min. 2 chars)…"
                value={assignSearch}
                onChange={e => setAssignSearch(e.target.value)}
                disabled={spotsLeft <= 0}
              />
              {spotsLeft <= 0 && (
                <p className="text-xs text-destructive">This slot is at full capacity.</p>
              )}
              {searchLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {searchData && searchData.data.length > 0 && (
                <div className="rounded-md border divide-y">
                  {searchData.data.map(s => (
                    <div key={s.public_id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{s.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground font-mono">{s.student_id}</span>
                        <Badge variant="outline" className="ml-2 text-[10px]">{s.status}</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={bookMutation.isPending || spotsLeft <= 0}
                        onClick={() => bookMutation.mutate(s.public_id)}
                      >
                        {bookMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Assign'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {searchData && searchData.data.length === 0 && assignSearch.length >= 2 && (
                <p className="text-xs text-muted-foreground">No applicants found.</p>
              )}
            </div>
          </div>

          {/* Booked applicants */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Booked Applicants ({bookings.length})</h3>
            {bookingsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No applicants assigned yet.</p>
            ) : (
              <div className="rounded-md border divide-y">
                {bookings.map(b => (
                  <div key={b.booking_id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.grade_level} · {b.dept}</p>
                    </div>
                    {b.result && (
                      <Badge variant={b.result === 'Pass' ? 'default' : 'destructive'} className="flex-shrink-0">
                        {b.result === 'Pass' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        {b.result}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setResultTarget(b);
                          setResultValue((b.result as 'Pass' | 'Fail') ?? 'Pass');
                          setResultRemarks(b.remarks ?? '');
                          setResultDialogOpen(true);
                        }}
                      >
                        Result
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        disabled={unbookMutation.isPending}
                        onClick={() => {
                          if (confirm(`Remove ${b.name} from this slot?`)) unbookMutation.mutate(b);
                        }}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Result dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={v => !v && setResultDialogOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Exam Result</DialogTitle>
            <DialogDescription>{resultTarget?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Result</Label>
              <Select value={resultValue} onValueChange={v => setResultValue(v as 'Pass' | 'Fail')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pass">Pass</SelectItem>
                  <SelectItem value="Fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea rows={2} value={resultRemarks} onChange={e => setResultRemarks(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultDialogOpen(false)}>Cancel</Button>
            <Button disabled={resultMutation.isPending} onClick={() => resultMutation.mutate()}>
              {resultMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function ExamSlotsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const sy = user?.selected_sy ?? '';

  const [createOpen, setCreateOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<ExamSlot | null>(null);
  const [bookingSlot, setBookingSlot] = useState<ExamSlot | null>(null);

  const { data, isLoading } = useQuery<{ data: ExamSlot[] }>({
    queryKey: ['exam-slots', sy],
    queryFn: () => api.get('/registrar/exam-slots', { params: { schoolYear: sy } }).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => api.delete(`/registrar/exam-slots/${publicId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-slots'] });
      toast.success('Exam slot deleted.');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Delete failed.'),
  });

  const slots = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entrance Exam Slots</h1>
          <p className="text-muted-foreground">
            Schedule exam time slots and manage applicant bookings{sy && ` — ${sy}`}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Slot
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : slots.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">No exam slots for {sy || 'this school year'}</p>
            <p className="text-sm text-muted-foreground mt-1">Click "New Slot" to create the first entrance exam schedule.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map(slot => {
            const booked = slot.bookings_count;
            const spotsLeft = slot.capacity - booked;
            const isFull = spotsLeft <= 0;
            return (
              <Card key={slot.id} className={`transition-opacity ${!slot.is_active ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{formatDate(slot.exam_date)}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" /> {formatTime(slot.exam_time)}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {!slot.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                      {isFull
                        ? <Badge variant="destructive" className="text-xs">Full</Badge>
                        : <Badge variant="secondary" className="text-xs">{spotsLeft} left</Badge>
                      }
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{slot.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{booked} / {slot.capacity} booked</span>
                  </div>
                  {(slot.dept || slot.grade_level) && (
                    <div className="flex flex-wrap gap-1">
                      {slot.dept && <Badge variant="outline" className="text-xs">{slot.dept}</Badge>}
                      {slot.grade_level && <Badge variant="outline" className="text-xs">{slot.grade_level}</Badge>}
                    </div>
                  )}
                  {slot.notes && (
                    <p className="text-xs text-muted-foreground italic line-clamp-2">{slot.notes}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setBookingSlot(slot)}
                    >
                      <Users className="mr-1 h-3.5 w-3.5" /> Manage ({booked})
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditSlot(slot)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (booked > 0) {
                          toast.error('Remove all bookings before deleting this slot.');
                          return;
                        }
                        if (confirm('Delete this exam slot?')) deleteMutation.mutate(slot.public_id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SlotDialog
        open={createOpen || !!editSlot}
        slot={editSlot}
        defaultSy={sy}
        onClose={() => { setCreateOpen(false); setEditSlot(null); }}
      />

      <BookingsSheet
        slot={bookingSlot}
        open={!!bookingSlot}
        onClose={() => setBookingSlot(null)}
      />
    </div>
  );
}
