import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Printer, Download, CreditCard, Tag, Building2, Wallet, Upload, X as XIcon, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ChargeItem {
  description: string;
  payable: number;
  discount: number;
  paid: number;
  balance: number;
}

interface ChargeCategory {
  category: string;
  payable: number;
  discount: number;
  paid: number;
  balance: number;
  items: ChargeItem[];
}

interface Transaction {
  receipt_num: string;
  date: string;
  type: string;
  amount: number;
  remarks: string | null;
}

interface LedgerData {
  summary: {
    total_assessed: number;
    total_discount: number;
    total_paid: number;
    total_balance: number;
  };
  charges: ChargeCategory[];
  transactions: Transaction[];
}

const SCHOOL_YEARS = ['2024-2025', '2025-2026', '2026-2027'];

interface PaymentChannel {
  id: number;
  public_id: string;
  account_type: 'bank' | 'ewallet';
  provider_name: string;
  account_name: string;
  account_number: string;
  branch: string | null;
  instructions: string | null;
  qr_code_url: string | null;
}

interface TransferRequest {
  public_id: string;
  amount: number;
  reference_number: string;
  transfer_date: string;
  status: 'pending' | 'approved' | 'rejected';
  channel: { provider_name: string; account_type: string } | null;
  rejection_reason: string | null;
  receipt_num: string | null;
  submitted_at: string;
}

const peso = (v: number) =>
  `₱${v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function StudentLedgerPage() {
  const [schoolYear, setSchoolYear] = useState(SCHOOL_YEARS[1]);
  const [downloading, setDownloading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Discount code redemption state
  const [codeInput, setCodeInput] = useState('');
  const [codeOpen, setCodeOpen] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  // Bank transfer state
  const [transferOpen, setTransferOpen] = useState(false);
  const [txChannelId, setTxChannelId] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txRef, setTxRef] = useState('');
  const [txDate, setTxDate] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txReceipt, setTxReceipt] = useState<File | null>(null);
  const [resubmitTarget, setResubmitTarget] = useState<TransferRequest | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Handle redirect back from PayMongo
  useEffect(() => {
    const status = searchParams.get('payment');
    if (status === 'success') {
      toast.success('Payment successful! Your ledger will refresh shortly.');
      setSearchParams({}, { replace: true });
    } else if (status === 'cancelled') {
      toast.info('Payment cancelled.');
      setSearchParams({}, { replace: true });
    }
  }, []);

  const { data, isLoading } = useQuery<LedgerData>({
    queryKey: ['student-ledger', schoolYear],
    queryFn: async () => {
      const { data } = await api.get('/student/ledger', { params: { schoolYear } });
      return data;
    },
  });

  const { data: channels = [] } = useQuery<PaymentChannel[]>({
    queryKey: ['payment-channels'],
    queryFn: async () => {
      const { data } = await api.get('/payment/channels');
      return data;
    },
  });

  const { data: myTransfers = [], refetch: refetchTransfers } = useQuery<TransferRequest[]>({
    queryKey: ['student-bank-transfers'],
    queryFn: async () => {
      const { data } = await api.get('/student/bank-transfers');
      return data;
    },
  });

  const openTransferDialog = (prefill?: TransferRequest) => {
    if (prefill) {
      setResubmitTarget(prefill);
      setTxChannelId(String(channels.find(c => c.provider_name === prefill.channel?.provider_name)?.id ?? ''));
      setTxAmount(String(prefill.amount));
    } else {
      setResubmitTarget(null);
      setTxChannelId('');
      setTxAmount(String(summary?.total_balance ?? ''));
    }
    setTxRef('');
    setTxDate('');
    setTxNotes('');
    setTxReceipt(null);
    setTransferOpen(true);
  };

  const submitTransferMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (resubmitTarget) {
        const { data } = await api.post(`/student/bank-transfers/${resubmitTarget.public_id}/resubmit`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
      }
      const { data } = await api.post('/student/bank-transfers', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      toast.success(resubmitTarget ? 'Transfer request resubmitted.' : 'Transfer request submitted. Awaiting validation.');
      setTransferOpen(false);
      refetchTransfers();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to submit transfer request.');
    },
  });

  const handleTransferSubmit = () => {
    if (!txChannelId || !txAmount || !txRef || !txDate || !txReceipt) {
      toast.error('Please fill in all required fields and attach the receipt.');
      return;
    }
    const fd = new FormData();
    fd.append('payment_channel_id', txChannelId);
    fd.append('amount', txAmount);
    fd.append('reference_number', txRef);
    fd.append('transfer_date', txDate);
    if (txNotes) fd.append('notes', txNotes);
    fd.append('receipt', txReceipt);
    fd.append('school_year', schoolYear);
    submitTransferMutation.mutate(fd);
  };

  const cancelTransferMutation = useMutation({
    mutationFn: async (publicId: string) => {
      await api.delete(`/student/bank-transfers/${publicId}`);
    },
    onSuccess: () => {
      toast.success('Transfer request cancelled.');
      refetchTransfers();
    },
  });

  const selectedChannel = channels.find(c => String(c.id) === txChannelId) ?? null;

  const handlePayOnline = async () => {
    setPaying(true);
    try {
      const { data } = await api.post('/student/payment/checkout');
      window.location.href = data.checkout_url;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to initiate payment. Please try again.');
      setPaying(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const response = await api.get('/student/ledger/pdf', {
        params: { schoolYear },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `SOA_${schoolYear}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleRedeemCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setRedeeming(true);
    try {
      const { data } = await api.post('/student/discount-code/redeem', { code });
      toast.success(data.message ?? 'Discount code applied!');
      setCodeInput('');
      setCodeOpen(false);
      queryClient.invalidateQueries({ queryKey: ['student-ledger'] });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Invalid or expired discount code.');
    } finally {
      setRedeeming(false);
    }
  };

  const summary = data?.summary;
  const charges = data?.charges ?? [];
  const transactions = data?.transactions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statement of Account</h1>
          <p className="text-muted-foreground">Full financial ledger for {schoolYear}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
          >
            {SCHOOL_YEARS.map(sy => (
              <option key={sy} value={sy}>{sy}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
            <Printer className="h-4 w-4 mr-1.5" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={downloading || isLoading} className="print:hidden">
            {downloading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
            Download PDF
          </Button>
          {(summary?.total_balance ?? 0) > 0 && (
            <Button size="sm" onClick={handlePayOnline} disabled={paying || isLoading} className="print:hidden">
              {paying ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CreditCard className="h-4 w-4 mr-1.5" />}
              Pay Online
            </Button>
          )}
          {(summary?.total_balance ?? 0) > 0 && channels.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => openTransferDialog()} disabled={isLoading} className="print:hidden">
              <Building2 className="h-4 w-4 mr-1.5" />
              Pay via Bank / E-Wallet
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="print:hidden"
            onClick={() => { setCodeOpen(v => !v); setTimeout(() => codeRef.current?.focus(), 50); }}
          >
            <Tag className="h-4 w-4 mr-1.5" />
            Redeem Code
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : (
        <>
      {/* Discount Code Redemption */}
          {codeOpen && (
            <Card className="border-dashed print:hidden">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm font-medium mb-3">Have a discount code?</p>
                <div className="flex gap-2 max-w-sm">
                  <Input
                    ref={codeRef}
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter code…"
                    className="font-mono uppercase tracking-widest"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRedeemCode(); }}
                    disabled={redeeming}
                  />
                  <Button size="sm" onClick={handleRedeemCode} disabled={redeeming || !codeInput.trim()}>
                    {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setCodeOpen(false); setCodeInput(''); }}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: 'Total Assessed', value: summary?.total_assessed ?? 0 },
              { label: 'Total Discount', value: summary?.total_discount ?? 0 },
              { label: 'Total Paid', value: summary?.total_paid ?? 0, green: true },
              { label: 'Outstanding Balance', value: summary?.total_balance ?? 0, red: (summary?.total_balance ?? 0) > 0 },
            ].map(({ label, value, green, red }) => (
              <Card key={label}>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-xl font-bold font-mono mt-1 ${red ? 'text-destructive' : green ? 'text-green-600' : ''}`}>
                    {peso(value)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Assessment / Charges */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Assessment Breakdown (Charges)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {charges.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground italic">No assessment records.</p>
              ) : (
                <div className="divide-y">
                  {charges.map((cat) => (
                    <div key={cat.category}>
                      {/* Category header row */}
                      <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="col-span-2">{cat.category}</span>
                        <span className="text-right">{peso(cat.payable)}</span>
                        <span className="text-right text-green-700">{cat.discount > 0 ? `-${peso(cat.discount)}` : '—'}</span>
                        <span className={`text-right font-bold ${cat.balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {peso(cat.balance)}
                        </span>
                      </div>
                      {/* Item rows */}
                      <table className="w-full text-sm">
                        <tbody>
                          {cat.items.map((item, i) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                              <td className="px-6 py-1.5 text-muted-foreground w-1/2">{item.description}</td>
                              <td className="px-4 py-1.5 text-right font-mono">{peso(item.payable)}</td>
                              <td className="px-4 py-1.5 text-right font-mono text-green-700">
                                {item.discount > 0 ? `-${peso(item.discount)}` : '—'}
                              </td>
                              <td className="px-4 py-1.5 text-right font-mono text-muted-foreground">{peso(item.paid)}</td>
                              <td className={`px-4 py-1.5 text-right font-mono font-semibold ${item.balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                {peso(item.balance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                  {/* Column headers (footer) */}
                  <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-muted/60 text-xs text-muted-foreground font-medium">
                    <span className="col-span-2">Total</span>
                    <span className="text-right">{peso(charges.reduce((s, c) => s + c.payable, 0))}</span>
                    <span className="text-right text-green-700">
                      {charges.reduce((s, c) => s + c.discount, 0) > 0
                        ? `-${peso(charges.reduce((s, c) => s + c.discount, 0))}`
                        : '—'}
                    </span>
                    <span className={`text-right font-bold ${(summary?.total_balance ?? 0) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {peso(summary?.total_balance ?? 0)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Transactions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground italic">No payment transactions recorded.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left">Receipt #</th>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Remarks</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2 font-mono text-xs">{t.receipt_num}</td>
                        <td className="px-4 py-2">{t.date}</td>
                        <td className="px-4 py-2 text-xs">{t.type}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{t.remarks ?? '—'}</td>
                        <td className="px-4 py-2 text-right font-mono font-semibold text-green-600">
                          {peso(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/40 font-semibold text-sm">
                      <td colSpan={4} className="px-4 py-2 text-right">Total Paid</td>
                      <td className="px-4 py-2 text-right font-mono text-green-600">
                        {peso(transactions.reduce((s, t) => s + t.amount, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </CardContent>
          </Card>
          {/* Transfer Requests */}
          {myTransfers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bank / E-Wallet Transfer Requests</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left">Channel</th>
                      <th className="px-4 py-2 text-left">Reference #</th>
                      <th className="px-4 py-2 text-left">Transfer Date</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {myTransfers.map((req) => (
                      <tr key={req.public_id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1.5">
                            {req.channel?.account_type === 'bank'
                              ? <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              : <Wallet className="h-3.5 w-3.5 text-muted-foreground" />}
                            {req.channel?.provider_name ?? '—'}
                          </div>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{req.reference_number}</td>
                        <td className="px-4 py-2 text-xs">{req.transfer_date}</td>
                        <td className="px-4 py-2 text-right font-mono font-semibold">{peso(req.amount)}</td>
                        <td className="px-4 py-2">
                          {req.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" /> Approved
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <div>
                              <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                <XCircle className="h-3 w-3" /> Rejected
                              </span>
                              {req.rejection_reason && (
                                <p className="text-xs text-muted-foreground mt-0.5">{req.rejection_reason}</p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {req.status === 'rejected' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openTransferDialog(req)}>
                              Resubmit
                            </Button>
                          )}
                          {req.status === 'pending' && (
                            <Button
                              size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => cancelTransferMutation.mutate(req.public_id)}
                              disabled={cancelTransferMutation.isPending}
                            >
                              Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Bank Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{resubmitTarget ? 'Resubmit Transfer Request' : 'Pay via Bank Transfer / E-Wallet'}</DialogTitle>
            <DialogDescription>
              Transfer to the school account, then upload your deposit slip or transaction receipt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Channel select */}
            <div className="space-y-1.5">
              <Label>Payment Channel <span className="text-destructive">*</span></Label>
              <Select value={txChannelId} onValueChange={(v) => setTxChannelId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank or e-wallet…" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map(ch => (
                    <SelectItem key={ch.id} value={String(ch.id)}>
                      <span className="flex items-center gap-1.5">
                        {ch.account_type === 'bank'
                          ? <Building2 className="h-3.5 w-3.5" />
                          : <Wallet className="h-3.5 w-3.5" />}
                        {ch.provider_name} — {ch.account_name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Channel details */}
            {selectedChannel && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Name</span>
                  <span className="font-medium">{selectedChannel.account_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Number</span>
                  <span className="font-mono font-semibold">{selectedChannel.account_number}</span>
                </div>
                {selectedChannel.branch && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Branch</span>
                    <span>{selectedChannel.branch}</span>
                  </div>
                )}
                {selectedChannel.instructions && (
                  <p className="text-xs text-muted-foreground pt-1 border-t mt-1">{selectedChannel.instructions}</p>
                )}
                {selectedChannel.qr_code_url && (
                  <div className="flex justify-center pt-2">
                    <img src={selectedChannel.qr_code_url} alt="QR Code" className="h-32 w-32 object-contain rounded border" />
                  </div>
                )}
              </div>
            )}

            {/* Amount + Reference + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (₱) <span className="text-destructive">*</span></Label>
                <Input type="number" min="1" step="0.01" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Transfer Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reference / Transaction Number <span className="text-destructive">*</span></Label>
              <Input value={txRef} onChange={e => setTxRef(e.target.value)} placeholder="e.g. 12345678" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea value={txNotes} onChange={e => setTxNotes(e.target.value)} rows={2} placeholder="Any additional info…" />
            </div>

            {/* Receipt upload */}
            <div className="space-y-1.5">
              <Label>Deposit Slip / Receipt <span className="text-destructive">*</span></Label>
              <input
                ref={receiptInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={e => setTxReceipt(e.target.files?.[0] ?? null)}
              />
              {txReceipt ? (
                <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <span className="flex-1 truncate">{txReceipt.name}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setTxReceipt(null)}>
                    <XIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => receiptInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Choose File
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Accepted: images (JPG, PNG) or PDF. Max 5 MB.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button
              onClick={handleTransferSubmit}
              disabled={submitTransferMutation.isPending || !txChannelId || !txAmount || !txRef || !txDate || !txReceipt}
            >
              {submitTransferMutation.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              {resubmitTarget ? 'Resubmit Request' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
