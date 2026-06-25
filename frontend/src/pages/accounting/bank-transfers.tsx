import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Loader2, Search, CheckCircle2, XCircle, Eye, Banknote, Wallet,
  Receipt, RefreshCw,
} from 'lucide-react';

interface Channel {
  id: number;
  provider_name: string;
  account_type: 'bank' | 'ewallet';
  account_name: string;
  account_number: string;
}

interface TransferRequest {
  id: number;
  public_id: string;
  reg_id: string;
  student_name: string | null;
  student_id: string | null;
  school_year: string;
  amount: number;
  reference_number: string;
  transfer_date: string;
  notes: string | null;
  receipt_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  receipt_num: string | null;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  submitted_at: string;
  channel: Channel | null;
}

interface Paginated<T> {
  data: T[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
}

const peso = (v: number) =>
  `₱${v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};

const SCHOOL_YEARS = ['2024-2025', '2025-2026', '2026-2027'];

export default function BankTransfersPage() {
  const qc = useQueryClient();

  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [schoolYear, setSchoolYear] = useState('2025-2026');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<TransferRequest | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const queryKey = ['accounting-bank-transfers', status, search, schoolYear, page];

  const { data, isLoading, isFetching } = useQuery<Paginated<TransferRequest>>({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get('/accounting/bank-transfers', {
        params: { status: status || undefined, search: search || undefined, school_year: schoolYear, page, per_page: 15 },
      });
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (publicId: string) => {
      const { data } = await api.post(`/accounting/bank-transfers/${publicId}/approve`);
      return data;
    },
    onSuccess: (updated: TransferRequest) => {
      toast.success(`Payment approved. Receipt #${updated.receipt_num} issued.`);
      qc.invalidateQueries({ queryKey: ['accounting-bank-transfers'] });
      setSelected(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Approval failed.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ publicId, reason }: { publicId: string; reason: string }) => {
      await api.post(`/accounting/bank-transfers/${publicId}/reject`, { reason });
    },
    onSuccess: () => {
      toast.success('Transfer request rejected. Student will be notified.');
      qc.invalidateQueries({ queryKey: ['accounting-bank-transfers'] });
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelected(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Rejection failed.');
    },
  });

  const requests = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank Transfer Requests</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Validate payment receipts uploaded by students and parents.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['accounting-bank-transfers'] })}>
          <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={schoolYear} onValueChange={(v) => { setSchoolYear(v ?? schoolYear); setPage(1); }}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCHOOL_YEARS.map(sy => <SelectItem key={sy} value={sy}>{sy}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Student name or reference #…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 h-8 text-sm w-64"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : requests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Banknote className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No transfer requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Student</th>
                <th className="text-left px-4 py-2.5 font-medium">Channel</th>
                <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Reference #</th>
                <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Transfer Date</th>
                <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Submitted</th>
                <th className="text-center px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium leading-tight">{r.student_name ?? r.reg_id}</p>
                    <p className="text-xs text-muted-foreground">{r.student_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {r.channel?.account_type === 'bank' ? (
                        <Banknote className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <Wallet className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span>{r.channel?.provider_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{peso(r.amount)}</td>
                  <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-muted-foreground">{r.reference_number}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{r.transfer_date}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                    {new Date(r.submitted_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLOR[r.status]}`}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {(data?.last_page ?? 1) > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/20 text-sm text-muted-foreground">
              <span>Page {data?.current_page} of {data?.last_page} — {data?.total} requests</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= (data?.last_page ?? 1)} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {isFetching && !isLoading && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Refreshing…
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Transfer Request Review</SheetTitle>
                <SheetDescription>
                  Review the uploaded receipt and approve or reject this payment.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Status banner */}
                {selected.status === 'approved' && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <div>
                      Approved — Receipt <strong>#{selected.receipt_num}</strong> issued on {selected.reviewed_at ? new Date(selected.reviewed_at).toLocaleString() : '—'}
                      {selected.reviewed_by_name && <span> by {selected.reviewed_by_name}</span>}
                    </div>
                  </div>
                )}
                {selected.status === 'rejected' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                    <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Rejected{selected.reviewed_by_name ? ` by ${selected.reviewed_by_name}` : ''}</p>
                      <p className="mt-0.5">{selected.rejection_reason}</p>
                    </div>
                  </div>
                )}

                {/* Student info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Student</p>
                    <p className="font-medium">{selected.student_name ?? selected.reg_id}</p>
                    <p className="text-muted-foreground">{selected.student_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">School Year</p>
                    <p className="font-medium">{selected.school_year}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Payment Channel</p>
                    <p className="font-medium">{selected.channel?.provider_name ?? '—'}</p>
                    <p className="text-muted-foreground text-xs">{selected.channel?.account_name} — {selected.channel?.account_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Amount Transferred</p>
                    <p className="font-mono font-bold text-lg text-primary">{peso(selected.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Reference / Transaction #</p>
                    <p className="font-mono font-medium">{selected.reference_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Transfer Date</p>
                    <p className="font-medium">{selected.transfer_date}</p>
                  </div>
                  {selected.notes && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground mb-0.5">Student Notes</p>
                      <p className="text-sm italic">{selected.notes}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Submitted At</p>
                    <p className="text-sm">{new Date(selected.submitted_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* Receipt image / PDF link */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Proof of Transfer</p>
                  {selected.receipt_url ? (
                    selected.receipt_url.toLowerCase().endsWith('.pdf') ? (
                      <a
                        href={selected.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/30 text-sm font-medium text-primary"
                      >
                        <Receipt className="h-4 w-4" />
                        View PDF Receipt
                      </a>
                    ) : (
                      <a href={selected.receipt_url} target="_blank" rel="noopener noreferrer" title="Click to open full size">
                        <img
                          src={selected.receipt_url}
                          alt="Payment receipt"
                          className="w-full max-h-96 object-contain rounded-lg border cursor-zoom-in"
                        />
                      </a>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No receipt uploaded</p>
                  )}
                </div>

                {/* Action buttons (only for pending) */}
                {selected.status === 'pending' && (
                  <div className="flex gap-3 pt-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => approveMutation.mutate(selected.public_id)}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending
                        ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                      Approve & Post to Ledger
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => { setRejectDialogOpen(true); setRejectReason(''); }}
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      Reject
                    </Button>
                  </div>
                )}

                {selected.status === 'approved' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Payment has been posted to the student ledger. Receipt #{selected.receipt_num}.
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={(o) => { if (!o) { setRejectDialogOpen(false); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transfer Request</DialogTitle>
            <DialogDescription>
              Provide a reason. The student will be able to view this reason and resubmit a corrected receipt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Rejection Reason *</Label>
            <Textarea
              placeholder="e.g. Receipt image is blurry. Amount does not match. Wrong reference number…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectReason(''); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => {
                if (selected) {
                  rejectMutation.mutate({ publicId: selected.public_id, reason: rejectReason.trim() });
                }
              }}
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
