import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import { Loader2, CheckCircle, XCircle, PackageCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

type RequestItem = {
  id: number; item_name: string; unit: string;
  quantity_requested: number; quantity_fulfilled: number;
};
type SupplyRequest = {
  id: number; public_id: string; status: string; purpose: string | null;
  created_at: string; reviewer_remarks: string | null;
  requester: { fname: string; lname: string } | null;
  reviewer: { fname: string; lname: string } | null;
  items: RequestItem[];
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pending: 'secondary', Approved: 'default', Rejected: 'destructive',
  Fulfilled: 'default', Cancelled: 'outline',
};

// ── Approve / Reject dialog ───────────────────────────────────────
function ReviewDialog({
  open, request, type, onClose,
}: { open: boolean; request: SupplyRequest | null; type: 'approve' | 'reject'; onClose: () => void }) {
  const qc = useQueryClient();
  const [remarks, setRemarks] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post(`/custodian/supply-requests/${request!.public_id}/${type}`, { remarks }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custodian-supply-requests'] });
      toast.success(type === 'approve' ? 'Request approved.' : 'Request rejected.');
      onClose(); setRemarks('');
    },
    onError: () => toast.error('Action failed.'),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className={type === 'approve' ? 'text-green-700' : 'text-destructive'}>
            {type === 'approve' ? '✓ Approve Request' : '✗ Reject Request'}
          </DialogTitle>
          <DialogDescription>{request?.requester?.fname} {request?.requester?.lname} — {request?.purpose ?? 'No purpose specified'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Remarks {type === 'reject' ? <span className="text-destructive">*</span> : '(optional)'}</Label>
          <Textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant={type === 'reject' ? 'destructive' : 'default'}
            className={type === 'approve' ? 'bg-green-700 hover:bg-green-800' : ''}
            disabled={mutation.isPending || (type === 'reject' && !remarks.trim())}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {type === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Fulfill dialog ────────────────────────────────────────────────
function FulfillDialog({ open, request, onClose }: { open: boolean; request: SupplyRequest | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [qty, setQty] = useState<Record<number, number>>({});

  const mutation = useMutation({
    mutationFn: () => api.post(`/custodian/supply-requests/${request!.public_id}/fulfill`, {
      items: (request?.items ?? []).map(it => ({
        id: it.id,
        quantity_fulfilled: qty[it.id] ?? it.quantity_requested,
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custodian-supply-requests'] });
      toast.success('Request fulfilled.');
      onClose(); setQty({});
    },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Fulfill failed.'),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-green-700" /> Fulfill Request</DialogTitle>
          <DialogDescription>Enter the actual quantity issued per item.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {(request?.items ?? []).map(it => (
            <div key={it.id} className="flex items-center gap-3 text-sm">
              <span className="flex-1 font-medium">{it.item_name} <span className="text-muted-foreground font-normal">({it.unit})</span></span>
              <span className="text-xs text-muted-foreground">Req: {it.quantity_requested}</span>
              <Input
                type="number" min={0} max={it.quantity_requested} className="w-20 h-8 text-sm"
                value={qty[it.id] ?? it.quantity_requested}
                onChange={e => setQty(prev => ({ ...prev, [it.id]: parseInt(e.target.value) || 0 }))}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-green-700 hover:bg-green-800" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Mark Fulfilled
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page (Custodian view) ────────────────────────────────────
export default function CustodianSupplyRequestsPage() {
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [page, setPage] = useState(1);
  const [approveReq, setApproveReq] = useState<SupplyRequest | null>(null);
  const [rejectReq, setRejectReq] = useState<SupplyRequest | null>(null);
  const [fulfillReq, setFulfillReq] = useState<SupplyRequest | null>(null);

  const { data, isLoading } = useQuery<{ data: SupplyRequest[]; meta: { current_page: number; last_page: number; total: number } }>({
    queryKey: ['custodian-supply-requests', statusFilter, page],
    queryFn: () => api.get('/custodian/supply-requests', { params: { status: statusFilter || undefined, page } }).then(r => r.data),
  });

  const requests = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Supply Requests</h1>
        <p className="text-muted-foreground">Review and fulfill staff supply requests</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Select value={statusFilter || '__all__'} onValueChange={v => { setStatusFilter(v === '__all__' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Status</SelectItem>
              {['Pending', 'Approved', 'Rejected', 'Fulfilled', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requester</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                : requests.length === 0
                  ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">No requests found.</TableCell></TableRow>
                  : requests.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium">{r.requester ? `${r.requester.fname} ${r.requester.lname}` : '—'}</TableCell>
                      <TableCell className="text-sm">{r.purpose ?? '—'}</TableCell>
                      <TableCell>
                        <ul className="text-xs space-y-0.5">
                          {r.items.map((it, i) => <li key={i}>{it.item_name} × {it.quantity_requested} {it.unit}</li>)}
                        </ul>
                      </TableCell>
                      <TableCell><Badge variant={statusVariant[r.status] ?? 'outline'} className="text-xs">{r.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {r.status === 'Pending' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-green-700" onClick={() => setApproveReq(r)}>
                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => setRejectReq(r)}>
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                          {r.status === 'Approved' && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-700" onClick={() => setFulfillReq(r)}>
                              <PackageCheck className="h-3.5 w-3.5 mr-1" /> Fulfill
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
          <p className="text-muted-foreground">Page {meta.current_page} of {meta.last_page} · {meta.total} requests</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={meta.current_page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" disabled={meta.current_page === meta.last_page} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <ReviewDialog open={!!approveReq} request={approveReq} type="approve" onClose={() => setApproveReq(null)} />
      <ReviewDialog open={!!rejectReq} request={rejectReq} type="reject" onClose={() => setRejectReq(null)} />
      <FulfillDialog open={!!fulfillReq} request={fulfillReq} onClose={() => setFulfillReq(null)} />
    </div>
  );
}
