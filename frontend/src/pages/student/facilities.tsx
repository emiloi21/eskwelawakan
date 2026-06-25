import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
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
import { Loader2, Plus, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface Facility {
  id: number;
  public_id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  amenities: string | null;
  status: string;
}

interface BookedSlot {
  public_id: string;
  title: string;
  start_time: string;
  end_time: string;
}

const emptyForm = {
  facility_id: '',
  title: '',
  purpose: '',
  event_date: '',
  start_time: '',
  end_time: '',
  attendee_count: '',
  notes: '',
};

export default function StudentFacilitiesPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: facilityData, isLoading: facLoading } = useQuery({
    queryKey: ['facilities-public'],
    queryFn: () => api.get('/facilities/public').then(r => r.data),
  });

  const { data: slotsData } = useQuery({
    queryKey: ['facility-booked-slots', form.facility_id, form.event_date],
    queryFn: () => api.get(`/facilities/${form.facility_id}/booked-slots`, { params: { date: form.event_date } }).then(r => r.data),
    enabled: !!form.facility_id && !!form.event_date,
  });

  const bookMutation = useMutation({
    mutationFn: (payload: any) => api.post('/facilities/bookings', payload),
    onSuccess: () => {
      toast.success('Booking request submitted. Awaiting approval.');
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to submit booking'),
  });

  const handleSubmit = () => {
    if (!form.facility_id) { toast.error('Please select a facility'); return; }
    if (!form.title.trim()) { toast.error('Event title is required'); return; }
    if (!form.event_date) { toast.error('Event date is required'); return; }
    if (!form.start_time) { toast.error('Start time is required'); return; }
    if (!form.end_time) { toast.error('End time is required'); return; }
    bookMutation.mutate({
      facility_id: Number(form.facility_id),
      title: form.title,
      purpose: form.purpose || null,
      event_date: form.event_date,
      start_time: form.start_time,
      end_time: form.end_time,
      attendee_count: form.attendee_count ? Number(form.attendee_count) : null,
      notes: form.notes || null,
    });
  };

  const facilities: Facility[] = facilityData?.data ?? [];
  const bookedSlots: BookedSlot[] = slotsData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facility Booking</h1>
          <p className="text-muted-foreground">Request use of school facilities</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />Book a Facility
        </Button>
      </div>

      {/* Available Facilities */}
      <div>
        <h2 className="text-base font-semibold mb-3">Available Facilities</h2>
        {facLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.map(f => (
              <Card key={f.public_id} className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{f.name}</p>
                      {f.location && <p className="text-xs text-muted-foreground">{f.location}</p>}
                      {f.capacity && <p className="text-xs text-muted-foreground">Capacity: {f.capacity}</p>}
                      {f.description && <p className="text-xs text-muted-foreground mt-1">{f.description}</p>}
                    </div>
                  </div>
                  <Button
                    size="sm" variant="outline" className="mt-3 w-full"
                    onClick={() => { setForm(prev => ({ ...prev, facility_id: String(f.id) })); setShowForm(true); }}
                  >
                    Request Booking
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Booking Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Request Facility Booking</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Facility *</Label>
              <Select value={form.facility_id} onValueChange={v => setForm(f => ({ ...f, facility_id: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="Select facility…" /></SelectTrigger>
                <SelectContent>
                  {facilities.map(f => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name}{f.location ? ` — ${f.location}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Event / Activity Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Purpose</Label>
              <Input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-1">
                <Label>Date *</Label>
                <Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} min={format(new Date(), 'yyyy-MM-dd')} />
              </div>
              <div className="space-y-1">
                <Label>Start Time *</Label>
                <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>End Time *</Label>
                <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>

            {/* Show booked slots if available */}
            {bookedSlots.length > 0 && (
              <div className="rounded-md bg-orange-50 border border-orange-200 p-3">
                <p className="text-xs font-medium text-orange-700 mb-2">Already booked on this date:</p>
                {bookedSlots.map(s => (
                  <p key={s.public_id} className="text-xs text-orange-600">{s.start_time}–{s.end_time}: {s.title}</p>
                ))}
              </div>
            )}

            <div className="space-y-1">
              <Label>Expected Attendees</Label>
              <Input type="number" value={form.attendee_count} onChange={e => setForm(f => ({ ...f, attendee_count: e.target.value }))} min="1" />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={bookMutation.isPending}>
              {bookMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
