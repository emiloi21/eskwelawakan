import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Users, ChevronRight, CheckCircle2, Printer } from 'lucide-react';
import ReceiptTemplate, { type ReceiptData } from '@/components/receipt-template';

function formatPeso(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

interface ReviewStudent {
  discount_id: number;
  reg_id: number;
  student: { reg_id: number; lname: string; fname: string; mname: string; student_id: string; gradeLevel: string; dept: string } | null;
  description: string;
  amount: number;
  amt_rcv_paid: number;
  balance: number;
  payment_amt: number;
  payment_term: string;
}

interface ReceiptResult {
  receipt_num: string;
  student_name: string;
  amount: number;
}

type Step = 'select' | 'review' | 'results';

export default function MassTransactionsPage() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('select');
  const [selected, setSelected] = useState<number[]>([]);
  const [batchCode, setBatchCode] = useState('');
  const [students, setStudents] = useState<ReviewStudent[]>([]);
  const [results, setResults] = useState<ReceiptResult[]>([]);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Load receivables for selection
  const { data: receivables, isLoading } = useQuery<ReviewStudent[]>({
    queryKey: ['mass-trans-receivables'],
    queryFn: async () => {
      const { data } = await api.get('/accounting/receivables?per_page=500');
      return data.data ?? [];
    },
  });

  const selectMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/accounting/mass-transactions/select', { discount_ids: selected });
      return data.data as { code: string };
    },
    onSuccess: async (data) => {
      setBatchCode(data.code);
      const review = await api.get(`/accounting/mass-transactions/${data.code}/review`);
      setStudents(review.data.data.students);
      setStep('review');
    },
    onError: () => toast.error('Failed to create batch.'),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      // Update settings first
      const items = students.filter(s => s.payment_amt > 0).map(s => ({
        discount_id: s.discount_id,
        payment_amt: s.payment_amt,
        payment_term: s.payment_term,
      }));
      await api.put(`/accounting/mass-transactions/${batchCode}/settings`, { items });

      const total = items.reduce((s, i) => s + i.payment_amt, 0);
      const { data } = await api.post(`/accounting/mass-transactions/${batchCode}/complete`, {
        amt_tend: total,
        trans_payment_type: 'Cash',
      });
      return data.data as { count: number; receipts: ReceiptResult[] };
    },
    onSuccess: (data) => {
      setResults(data.receipts);
      setStep('results');
      queryClient.invalidateQueries({ queryKey: ['mass-trans-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-dashboard'] });
      toast.success(`Processed ${data.count} transactions.`);
    },
    onError: () => toast.error('Failed to process mass transaction.'),
  });

  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const totalPayment = students.reduce((s, r) => s + (r.payment_amt || 0), 0);

  const handleReset = () => {
    setStep('select');
    setSelected([]);
    setBatchCode('');
    setStudents([]);
    setResults([]);
  };

  const handleViewReceipt = async (receiptNum: string) => {
    try {
      const { data } = await api.get(`/accounting/cashiering/receipt/${receiptNum}`);
      setReceiptData(data.data);
      setReceiptOpen(true);
    } catch {
      toast.error('Failed to load receipt.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mass Transactions</h1>
        <p className="text-muted-foreground">Process batch payments for multiple students</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={step === 'select' ? 'default' : 'secondary'}>1. Select</Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant={step === 'review' ? 'default' : 'secondary'}>2. Review</Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant={step === 'results' ? 'default' : 'secondary'}>3. Results</Badge>
      </div>

      {/* Step 1: Select from A/R */}
      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Select Students from Receivables</span>
              <Badge>{selected.length} selected</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <>
                <div className="border rounded-md overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-3 w-10"></th>
                        <th className="text-left p-3 font-medium">Student</th>
                        <th className="text-left p-3 font-medium">Description</th>
                        <th className="text-right p-3 font-medium">Amount</th>
                        <th className="text-right p-3 font-medium">Paid</th>
                        <th className="text-right p-3 font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(receivables ?? []).filter(r => r.balance > 0).map(r => (
                        <tr key={r.discount_id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => toggleSelect(r.discount_id)}>
                          <td className="p-3">
                            <Checkbox checked={selected.includes(r.discount_id)} />
                          </td>
                          <td className="p-3 font-medium">{r.student ? `${r.student.lname}, ${r.student.fname}` : `Reg#${r.reg_id}`}</td>
                          <td className="p-3">{r.description}</td>
                          <td className="p-3 text-right tabular-nums">{formatPeso(r.amount)}</td>
                          <td className="p-3 text-right tabular-nums">{formatPeso(r.amt_rcv_paid)}</td>
                          <td className="p-3 text-right tabular-nums font-medium">{formatPeso(r.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => selectMutation.mutate()} disabled={selected.length === 0 || selectMutation.isPending}>
                    {selectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                    Proceed ({selected.length})
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review and set amounts */}
      {step === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle>Review &amp; Set Payment Amounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Student</th>
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-right p-3 font-medium">Balance</th>
                    <th className="text-right p-3 font-medium w-36">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => (
                    <tr key={s.discount_id} className="border-t">
                      <td className="p-3 font-medium">{s.student ? `${s.student.lname}, ${s.student.fname}` : `Reg#${s.reg_id}`}</td>
                      <td className="p-3">{s.description}</td>
                      <td className="p-3 text-right tabular-nums">{formatPeso(s.balance)}</td>
                      <td className="p-3">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          max={s.balance}
                          value={s.payment_amt || ''}
                          onChange={e => {
                            const val = Math.min(Number(e.target.value) || 0, s.balance);
                            setStudents(prev => prev.map((x, i) => i === idx ? { ...x, payment_amt: val } : x));
                          }}
                          className="text-right w-full"
                          placeholder="0.00"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 font-medium">
                  <tr className="border-t">
                    <td className="p-3" colSpan={2}>Total</td>
                    <td className="p-3 text-right tabular-nums">{formatPeso(students.reduce((s, r) => s + r.balance, 0))}</td>
                    <td className="p-3 text-right tabular-nums">{formatPeso(totalPayment)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep('select')}>Back</Button>
              <Button onClick={() => completeMutation.mutate()} disabled={totalPayment <= 0 || completeMutation.isPending}>
                {completeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Process {students.filter(s => s.payment_amt > 0).length} Payments ({formatPeso(totalPayment)})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Results */}
      {step === 'results' && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Mass Transaction Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {results.length} receipt(s) generated successfully.
            </p>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Receipt #</th>
                    <th className="text-left p-3 font-medium">Student</th>
                    <th className="text-right p-3 font-medium">Amount</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.receipt_num} className="border-t">
                      <td className="p-3 font-mono font-medium">{r.receipt_num}</td>
                      <td className="p-3">{r.student_name}</td>
                      <td className="p-3 text-right tabular-nums">{formatPeso(r.amount)}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => handleViewReceipt(r.receipt_num)}>
                          <Printer className="h-3.5 w-3.5 mr-1" /> Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Button onClick={handleReset}>New Mass Transaction</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receipt Preview Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-md print:max-w-none print:shadow-none">
          <DialogHeader>
            <DialogTitle>Receipt Preview</DialogTitle>
          </DialogHeader>
          {receiptData && <ReceiptTemplate ref={receiptRef} data={receiptData} variant="standard" />}
          <DialogFooter>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
