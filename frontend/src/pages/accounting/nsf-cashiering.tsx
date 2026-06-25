import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Receipt, Printer, Undo2 } from 'lucide-react';
import ReceiptTemplate, { type ReceiptData } from '@/components/receipt-template';

function formatPeso(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

interface NsfParticular {
  particular_id: number;
  public_id: string;
  description: string;
  account_code: string;
  account_group: string;
  amount: number;
}

interface LineItem {
  particular_id: string;
  description: string;
  amt_paid: number;
}

interface NsfResult {
  receipt_num: string;
  payee: string;
  net_payable: number;
  amt_tendered: number;
  change: number;
}

export default function NsfCashieringPage() {
  const [lname, setLname] = useState('');
  const [fname, setFname] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [selectedParticular, setSelectedParticular] = useState('');
  const [amtTend, setAmtTend] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [lastResult, setLastResult] = useState<NsfResult | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const { data: particulars } = useQuery<NsfParticular[]>({
    queryKey: ['nsf-particulars'],
    queryFn: async () => {
      const { data } = await api.get('/accounting/nsf/particulars');
      return data.data;
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/accounting/nsf', {
        lname,
        fname,
        items: items.map(i => ({ particular_id: i.particular_id, amt_paid: i.amt_paid })),
        amt_tend: Number(amtTend),
        trans_payment_type: paymentMode,
      });
      return data.data as NsfResult;
    },
    onSuccess: (data) => {
      setLastResult(data);
      toast.success(`NSF Payment complete! Receipt: ${data.receipt_num}`);
    },
    onError: () => toast.error('Payment failed.'),
  });

  const handleAddItem = () => {
    const p = particulars?.find(x => x.public_id === selectedParticular);
    if (!p) return;
    if (items.some(i => i.particular_id === p.public_id)) {
      toast.error('Item already added.');
      return;
    }
    setItems(prev => [...prev, { particular_id: p.public_id, description: p.description, amt_paid: p.amount || 0 }]);
    setSelectedParticular('');
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateAmount = (idx: number, val: number) => setItems(prev => prev.map((item, i) => i === idx ? { ...item, amt_paid: val } : item));

  const netPayable = items.reduce((s, i) => s + i.amt_paid, 0);
  const tenderedNum = Number(amtTend) || 0;
  const change = tenderedNum - netPayable;

  const handlePrintReceipt = async () => {
    if (!lastResult) return;
    try {
      const { data } = await api.get(`/accounting/nsf/${lastResult.receipt_num}/receipt`);
      setReceiptData(data.data);
      setReceiptOpen(true);
      setTimeout(() => window.print(), 400);
    } catch {
      toast.error('Failed to load receipt.');
    }
  };

  const handleReset = () => {
    setLname('');
    setFname('');
    setItems([]);
    setAmtTend('');
    setPaymentMode('Cash');
    setLastResult(null);
    setReceiptOpen(false);
    setReceiptData(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Non-Student Fee</h1>
        <p className="text-muted-foreground">Process payments for non-student payees</p>
      </div>

      {/* Payee Info */}
      <Card>
        <CardHeader><CardTitle>Payee Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={lname} onChange={e => setLname(e.target.value)} placeholder="Last name" disabled={!!lastResult} />
            </div>
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={fname} onChange={e => setFname(e.target.value)} placeholder="First name" disabled={!!lastResult} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      {!lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Fee Items</span>
              <div className="flex items-center gap-2">
                <Select value={selectedParticular} onValueChange={(v) => setSelectedParticular(v ?? '')}>
                  <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select particular..." /></SelectTrigger>
                  <SelectContent>
                    {(particulars ?? []).map(p => (
                      <SelectItem key={p.public_id} value={p.public_id}>{p.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleAddItem} disabled={!selectedParticular}>
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No items added yet.</p>
            ) : (
              <div className="border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-right p-3 font-medium w-36">Amount</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.particular_id} className="border-t">
                        <td className="p-3">{item.description}</td>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.01"
                            min={0.01}
                            value={item.amt_paid || ''}
                            onChange={e => updateAmount(idx, Number(e.target.value) || 0)}
                            className="text-right w-full"
                          />
                        </td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 font-medium">
                    <tr className="border-t">
                      <td className="p-3">Total</td>
                      <td className="p-3 text-right tabular-nums">{formatPeso(netPayable)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Entry */}
      {items.length > 0 && !lastResult && (
        <Card>
          <CardHeader><CardTitle>Enter Payment</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Net Payable</Label>
                <div className="text-2xl font-bold tabular-nums">{formatPeso(netPayable)}</div>
              </div>
              <div className="space-y-2">
                <Label>Amount Tendered</Label>
                <Input type="number" step="0.01" value={amtTend} onChange={e => setAmtTend(e.target.value)} className="text-lg" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Change</Label>
                <div className={`text-2xl font-bold tabular-nums ${change < 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {formatPeso(Math.max(change, 0))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="space-y-2">
                <Label>Mode</Label>
                <select className="flex h-9 rounded-md border bg-transparent px-3 py-1 text-sm" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                  <option value="Online">Online</option>
                </select>
              </div>
              <Button
                className="mt-auto"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending || !lname.trim() || !fname.trim() || tenderedNum < netPayable || netPayable <= 0}
              >
                {completeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                Complete Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success */}
      {lastResult && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <Receipt className="h-5 w-5" /> NSF Payment Successful
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Receipt No.</span>
                <p className="font-mono font-bold text-lg">{lastResult.receipt_num}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Payee</span>
                <p className="font-medium">{lastResult.payee}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Change</span>
                <p className="font-medium">{formatPeso(lastResult.change)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrintReceipt}>
                <Printer className="mr-2 h-4 w-4" /> Print Receipt
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
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
          {receiptData && <ReceiptTemplate ref={receiptRef} data={receiptData} variant="nsf" />}
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
