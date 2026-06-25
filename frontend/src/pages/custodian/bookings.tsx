import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle, XCircle, Ban, CalendarDays } from 'lucide-react';
import { format, parseISO } from 'date-fns';

type Facility = { id: number; public_id: string; name: string };
type Booking = {
  id: number; public_id: string; title: string; purpose: string | null;
  event_date: string; start_time: string; end_time: string;
  attendee_count: number | null;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  facility: Facility | null;
  requester: { fname: string; lname: string } | null;
  approver: { fname: string; lname: string } | null;
  approver_remarks: string | null;
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending:   'secondary',
  Approved:  'default',
  Rejected:  'destructive',
  Cancelled: 'outline',
};

// ── Approve dialog ────────────────────────────────────────────────
function ApproveDialog({
  open, booking, onClose,
}: { open: boolean; booking: Booking | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [remarks, setRemarks] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post(`/custodian/bookings/${booking!.public_id}/approve`, { remarks: remarks || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-bookings'] });
      toast.success('Booking approved.');
      onClose(); setRemarks('');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Failed.'),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" /> Approve Booking
          </DialogTitle>
          <DialogDescription>{booking?.title} — {booking?.event_date ? format(parseISO(booking.event_date), 'MMM d, yyyy') : ''} {booking?.start_time} – {booking?.end_time}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Remarks (optional)</Label>
          <Textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any notes for the requester…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-green-700 hover:bg-green-800" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Reject dialog ─────────────────────────────────────────────────
function RejectDialog({
  open, booking, onClose,
}: { open: boolean; booking: Booking | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [remarks, setRemarks] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post(`/custodian/bookings/${booking!.public_id}/reject`, { approver_remarks: remarks }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-bookings'] });
      toast.success('Booking rejected.');
      onClose(); setRemarks('');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Failed.'),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" /> Reject Booking
          </DialogTitle>
          <DialogDescription>{booking?.title} — {booking?.requester ? `${booking.requester.fname} ${booking.requester.lname}` : ''}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Reason for rejection <span className="text-destructive">*</span></Label>
          <Textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Provide a reason…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" disabled={mutation.isPending || !remarks.trim()} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function CustodianBookingsPage() {
  const qc = useQueryClient();
  const [status, setStatus]       = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [page, setPage]           = useState(1);
  const [approveBooking, setApproveBooking] = useState<Booking | null>(null);
  const [rejectBooking, setRejectBooking]   = useState<Booking | null>(null);

  const { data: facilityData } = useQuery<{ data: Facility[] }>({
    queryKey: ['facilities-list'],
    queryFn: () => api.get('/custodian/facilities').then(r => r.data),
  });

  const { data, isLoading } = useQuery<{
    data: Booking[];
    meta: { current_page: number; last_page: number; total: number };
  }>({
    queryKey: ['facility-bookings', status, facilityId, dateFrom, dateTo, page],
    queryFn: () => api.get('/custodian/bookings', {
      params: {
        status: status || undefined,
        facility: facilityId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page, per_page: 25,
      },
    }).then(r => r.data),
  });

  const cancel = useMutation({
    mutationFn: (pid: string) => api.delete(`/facilities/bookings/${pid}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facility-bookings'] }); toast.success('Booking cancelled.'); },
    onError: () => toast.error('Cancel failed.'),
  });

  const bookings  = data?.data ?? [];
  const meta      = data?.meta;
  const facilities = facilityData?.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Booking Requests</h1>
        <p className="text-muted-foreground">Review and manage facility booking requests</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-2">
            {/* Status filter */}
            <Select value={status || '__all__'} onValueChange={v => { setStatus(v === '__all__' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Facility filter */}
            <Select value={facilityId || '__all__'} onValueChange={v => { setFacilityId(v === '__all__' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="All Facilities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Facilities</SelectItem>
                {facilities.map(f => <SelectItem key={f.id} value={f.public_id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Date range */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <Input type="date" className="h-8 text-sm w-36" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
              <span>–</span>
              <Input type="date" className="h-8 text-sm w-36" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title / Purpose</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Pax</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? <TableRow><TableCell colSpan={7} className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                : bookings.length === 0
                  ? <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">No bookings found.</TableCell></TableRow>
                  : bookings.map(b => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{b.title}</p>
                        {b.purpose && <p className="text-xs text-muted-foreground line-clamp-1">{b.purpose}</p>}
                      </TableCell>
                      <TableCell className="text-sm">{b.facility?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm">{b.requester ? `${b.requester.fname} ${b.requester.lname}` : '—'}</TableCell>
                      <TableCell className="text-sm">
                        <p>{b.event_date ? format(parseISO(b.event_date), 'MMM d, yyyy') : '—'}</p>
                        <p className="text-xs text-muted-foreground">{b.start_time} – {b.end_time}</p>
                      </TableCell>
                      <TableCell className="text-sm">{b.attendee_count ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[b.status] ?? 'outline'} className="text-xs">{b.status}</Badge>
                        {b.approver_remarks && (
                          <p className="text-xs text-muted-foreground italic mt-0.5 line-clamp-1">{b.approver_remarks}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {b.status === 'Pending' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-green-700 hover:text-green-800"
                                onClick={() => setApproveBooking(b)}>
                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive"
                                onClick={() => setRejectBooking(b)}>
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                          {(b.status === 'Pending' || b.status === 'Approved') && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground"
                              onClick={() => { if (confirm('Cancel this booking?')) cancel.mutate(b.public_id); }}>
                              <Ban className="h-3.5 w-3.5 mr-1" /> Cancel
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
          <p className="text-muted-foreground">Page {meta.current_page} of {meta.last_page} · {meta.total} bookings</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={meta.current_page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" disabled={meta.current_page === meta.last_page} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <ApproveDialog open={!!approveBooking} booking={approveBooking} onClose={() => setApproveBooking(null)} />
      <RejectDialog  open={!!rejectBooking}  booking={rejectBooking}  onClose={() => setRejectBooking(null)} />
    </div>
  );
}
