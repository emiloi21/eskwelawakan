import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { LedgerStudent } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Search, Receipt, Printer, Undo2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReceiptTemplate, { type ReceiptData } from '@/components/receipt-template';

const PAYMENT_TYPES = ['Cash', 'Bank Transfer', 'Check', 'E-Wallet', 'Voucher'];

function isTuitionItem(item: BillingItem): boolean {
  return (
    item.category?.description?.toLowerCase().includes('tuition') === true ||
    item.particular?.description?.toLowerCase().includes('tuition fee') === true
  );
}

function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

interface BillingItem {
  payment_id: number;
  particular_id: number;
  category_id: number;
  amt_payable: number;
  amt_paid: number;
  particular: { description: string } | null;
  category: { description: string } | null;
}

interface LoadedData {
  student: { reg_id: number; lname: string; fname: string; gradeLevel: string; dept: string; status: string; schoolYear: string; sem: string };
  receipt_num: string;
  items: BillingItem[];
  pay_data_id: number;
}

interface CompleteResponse {
  receipt_num: string;
  student_name: string;
  net_payable: number;
  amt_tendered: number;
  change: number;
  pay_data_id: number;
}

export default function CashieringPage() {
  const queryClient = useQueryClient();

  // Student search (autocomplete)
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [loaded, setLoaded] = useState<LoadedData | null>(null);
  const [amtTend, setAmtTend] = useState('');
  const [lastReceipt, setLastReceipt] = useState<CompleteResponse | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const autoPrint = useRef(false);

  // Per-item payment amounts and transaction fields
  const [itemAmounts, setItemAmounts] = useState<Record<number, string>>({});
  const [transType, setTransType] = useState('Cash');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cvPayee, setCvPayee] = useState('');
  const [cvBankOffice, setCvBankOffice] = useState('');
  const [cvNumber, setCvNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  // Debounce search term
  useEffect(() => {
    if (searchTerm.length < 2) { setDebouncedTerm(''); return; }
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Derived calculations
  const displayItems = (loaded?.items ?? []).filter(
    item => Number(item.amt_payable) > 0 || isTuitionItem(item)
  );
  const totalDue = displayItems.reduce(
    (sum, item) => sum + (parseFloat(itemAmounts[item.payment_id] ?? '0') || 0), 0
  );
  const tenderedNum = parseFloat(amtTend) || 0;
  const change = tenderedNum - totalDue;
  const canComplete = totalDue > 0 && tenderedNum >= totalDue;
  const showCvFields = transType !== 'Cash';
  const totalOutstanding = displayItems.reduce(
    (sum, item) => sum + Math.max(0, Number(item.amt_payable)), 0
  );

  const searchQuery = useQuery<LedgerStudent[]>({
    queryKey: ['cashiering-search', debouncedTerm],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/ledger/search?q=${encodeURIComponent(debouncedTerm)}`);
      return data.data;
    },
    enabled: debouncedTerm.length >= 2,
  });

  const { data: receiptData } = useQuery<ReceiptData>({
    queryKey: ['receipt-print', lastReceipt?.receipt_num],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/cashiering/receipt/${lastReceipt!.receipt_num}`);
      return data.data;
    },
    enabled: !!lastReceipt?.receipt_num,
  });

  // Auto-open print preview after a fresh complete
  useEffect(() => {
    if (receiptData && autoPrint.current) {
      autoPrint.current = false;
      setReceiptOpen(true);
      setTimeout(() => window.print(), 450);
    }
  }, [receiptData]);

  const handlePrintReceipt = () => {
    setReceiptOpen(true);
    setTimeout(() => window.print(), 400);
  };

  const loadMutation = useMutation({
    mutationFn: async (publicId: string) => {
      const { data } = await api.post('/accounting/cashiering/load-particulars', { public_id: publicId });
      return data.data as LoadedData;
    },
    onSuccess: (data) => {
      setLoaded(data);
      setLastReceipt(null);
      setShowSuggestions(false);
      // Initialize per-item amounts to full outstanding balance
      const amounts: Record<number, string> = {};
      data.items.forEach(item => {
        amounts[item.payment_id] = '';
      });
      setItemAmounts(amounts);
      setAmtTend('');
      setEntryDate(new Date().toISOString().slice(0, 10));
      setTransType('Cash');
      setCvPayee('');
      setCvBankOffice('');
      setCvNumber('');
      setRemarks('');
    },
    onError: () => toast.error('Failed to load student billing.'),
  });

  const selectStudent = useCallback((student: LedgerStudent) => {
    setSearchTerm(`${student.lname}, ${student.fname}`);
    setShowSuggestions(false);
    loadMutation.mutate(student.public_id);
  }, [loadMutation]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!loaded) throw new Error('No data loaded');
      const items = loaded.items
        .filter(i => (parseFloat(itemAmounts[i.payment_id] ?? '0') || 0) > 0)
        .map(i => ({ payment_id: i.payment_id, amt_paid: parseFloat(itemAmounts[i.payment_id]) }));
      const { data } = await api.post('/accounting/cashiering/complete', {
        receipt_num: loaded.receipt_num,
        amt_tend: tenderedNum,
        trans_payment_type: transType,
        entry_date: entryDate,
        cv_payee: cvPayee,
        cv_bank_office: cvBankOffice,
        cv_number: cvNumber,
        remarks,
        items,
      });
      return data.data as CompleteResponse;
    },
    onSuccess: (data) => {
      autoPrint.current = true;
      setLastReceipt(data);
      setLoaded(null);
      setItemAmounts({});
      queryClient.invalidateQueries({ queryKey: ['accounting-dashboard'] });
      toast.success(`Payment complete! Receipt: ${data.receipt_num}`);
    },
    onError: () => toast.error('Payment failed. Please check amount.'),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!loaded) return;
      await api.post('/accounting/cashiering/reset', { receipt_num: loaded.receipt_num });
    },
    onSuccess: () => {
      setLoaded(null);
      setItemAmounts({});
      setAmtTend('');
      setSearchTerm('');
      setDebouncedTerm('');
      toast.success('Transaction discarded. Start a new search.');
    },
    onError: () => toast.error('Failed to reset transaction.'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cashiering</h1>
        <p className="text-muted-foreground">Process student payments</p>
      </div>

      {/* Student Search */}
      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle>Student Lookup</CardTitle>
        </CardHeader>
        <CardContent className="overflow-visible">
          <div ref={searchRef} className="relative max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Type student ID or name..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); setLoaded(null); }}
                onFocus={() => { if (debouncedTerm.length >= 2) setShowSuggestions(true); }}
                onKeyDown={(e) => { if (e.key === 'Escape') setShowSuggestions(false); }}
              />
              {(searchQuery.isFetching || loadMutation.isPending) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Suggestion Dropdown */}
            {showSuggestions && debouncedTerm.length >= 2 && searchQuery.data && (
              <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-md shadow-lg max-h-80 overflow-y-auto">
                {searchQuery.data.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">No students found.</div>
                ) : (
                  searchQuery.data.map((s) => (
                    <button
                      key={s.public_id ?? s.reg_id}
                      className="flex w-full items-center justify-between py-3 px-4 hover:bg-accent text-left border-b last:border-b-0"
                      onClick={() => selectStudent(s)}
                    >
                      <div>
                        <p className="font-medium">{s.lname}, {s.fname} {s.mname ? s.mname.charAt(0) + '.' : ''}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.student_id} &middot; {s.gradeLevel} &middot; {s.dept}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          'text-sm tabular-nums font-medium',
                          (s.total_balance ?? 0) > 0 ? 'text-destructive' : 'text-green-600',
                        )}>
                          {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(s.total_balance ?? 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Balance</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Two-column transaction area */}
      {loaded && (
        <>
          {/* Student Info strip */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">Name</span>
                  <p className="font-medium">{loaded.student.lname}, {loaded.student.fname}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block">Grade / Dept</span>
                  <p className="font-medium">{loaded.student.gradeLevel} &mdash; {loaded.student.dept}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block">School Year / Sem</span>
                  <p className="font-medium">{loaded.student.schoolYear} {loaded.student.sem}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block">Status</span>
                  <Badge variant={loaded.student.status === 'Enrolled' ? 'default' : 'secondary'}>{loaded.student.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* LEFT: Billing Items Table */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Billing Items</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium">Category / Particular</th>
                          <th className="text-right px-4 py-3 font-medium w-36">Outstanding</th>
                          <th className="text-right px-4 py-3 font-medium w-36">Pay Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayItems.length === 0 && (
                          <tr>
                            <td colSpan={3} className="text-center py-8 text-muted-foreground">No outstanding balances.</td>
                          </tr>
                        )}
                        {displayItems.map((item) => {
                          const isTuition = isTuitionItem(item);
                          const outstanding = Math.max(0, Number(item.amt_payable));
                          return (
                          <tr key={item.payment_id} className="border-t hover:bg-muted/20">
                            <td className="px-4 py-3">
                              {item.category && (
                                <Badge variant="outline" className="text-xs mr-2 mb-0.5 font-normal">{item.category.description}</Badge>
                              )}
                              <span className="font-medium">
                                {item.particular?.description ?? `Particular #${item.particular_id}`}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                              {formatPeso(outstanding)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...(!isTuition && { max: outstanding })}
                                className="h-8 w-32 text-right tabular-nums ml-auto"
                                value={itemAmounts[item.payment_id] ?? ''}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  if (!isTuition && val !== '') {
                                    const num = parseFloat(val) || 0;
                                    if (num > outstanding) val = String(outstanding);
                                  }
                                  setItemAmounts(prev => ({ ...prev, [item.payment_id]: val }));
                                }}
                              />
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-muted/30 border-t font-medium">
                        <tr>
                          <td className="px-4 py-3">Total</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatPeso(totalOutstanding)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatPeso(totalDue)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: Transaction Details */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Amount summary */}
                  <div className="rounded-md bg-muted/40 p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Outstanding</span>
                      <span className="tabular-nums">{formatPeso(totalOutstanding)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base border-t pt-2 mt-1">
                      <span>Total to Pay</span>
                      <span className="tabular-nums">{formatPeso(totalDue)}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="amt-tend">Amount Tendered</Label>
                    <Input
                      id="amt-tend"
                      type="number"
                      step="0.01"
                      min="0"
                      className="text-lg font-semibold"
                      placeholder="0.00"
                      value={amtTend}
                      onChange={(e) => setAmtTend(e.target.value)}
                    />
                  </div>

                  {tenderedNum > 0 && (
                    <div className={cn(
                      'flex justify-between items-center rounded-md px-3 py-2 text-sm font-medium',
                      change >= 0 ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
                    )}>
                      <span>Change</span>
                      <span className="tabular-nums">{formatPeso(Math.max(change, 0))}</span>
                    </div>
                  )}

                  <div className="border-t pt-4 space-y-3">
                    <div className="space-y-1">
                      <Label>Transaction Type</Label>
                      <select
                        className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm"
                        value={transType}
                        onChange={(e) => setTransType(e.target.value)}
                      >
                        {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label>Posting Date</Label>
                      <Input
                        type="date"
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                      />
                    </div>

                    {showCvFields && (
                      <>
                        <div className="space-y-1">
                          <Label>CV Payee</Label>
                          <Input
                            placeholder="Payee name"
                            value={cvPayee}
                            onChange={(e) => setCvPayee(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Bank / Office</Label>
                          <Input
                            placeholder="Bank or office"
                            value={cvBankOffice}
                            onChange={(e) => setCvBankOffice(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Check / CV Number</Label>
                          <Input
                            placeholder="Reference number"
                            value={cvNumber}
                            onChange={(e) => setCvNumber(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <Label>Remarks</Label>
                      <Input
                        placeholder="Optional remarks"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <Button
                      className="w-full"
                      disabled={!canComplete || completeMutation.isPending}
                      onClick={() => completeMutation.mutate()}
                    >
                      {completeMutation.isPending
                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        : <Receipt className="mr-2 h-4 w-4" />
                      }
                      Complete Payment
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full text-destructive hover:text-destructive"
                      disabled={resetMutation.isPending}
                      onClick={() => resetMutation.mutate()}
                    >
                      {resetMutation.isPending
                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        : <RotateCcw className="mr-2 h-4 w-4" />
                      }
                      Discard Transaction
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Success Receipt Display */}
      {lastReceipt && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Payment Successful
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Receipt No.</span>
                <p className="font-mono font-bold text-lg">{lastReceipt.receipt_num}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Amount Paid</span>
                <p className="font-medium">{formatPeso(lastReceipt.amt_tendered)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Change</span>
                <p className="font-medium">{formatPeso(lastReceipt.change)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrintReceipt} disabled={!receiptData}>
                <Printer className="mr-2 h-4 w-4" /> Print Receipt
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setLastReceipt(null); setReceiptOpen(false); }}>
                <Undo2 className="mr-2 h-4 w-4" /> New Transaction
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receipt Print Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-lg print:max-w-full print:shadow-none print:border-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Receipt Preview</DialogTitle>
          </DialogHeader>
          {receiptData && <ReceiptTemplate ref={receiptRef} data={receiptData} categoryMap={receiptData.categoryMap} particularMap={receiptData.particularMap} />}
          <div className="flex justify-end gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={() => setReceiptOpen(false)}>Close</Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
