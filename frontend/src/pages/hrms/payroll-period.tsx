import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Loader2, ArrowLeft, RefreshCw, Send, CheckCircle2, BookOpenCheck,
  Download, Pencil,
} from 'lucide-react';
import { format } from 'date-fns';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
type Period = {
  id: number; public_id: string;
  period_label: string;
  period_start: string; period_end: string; payout_date: string;
  school_year: string;
  status: 'draft' | 'for_approval' | 'approved' | 'posted';
  template: { name: string; type: string } | null;
  total_basic_pay: number; total_allowances: number; total_gross_pay: number;
  total_sss_employee: number; total_philhealth_employee: number; total_pagibig_employee: number;
  total_withholding_tax: number; total_other_deductions: number; total_net_pay: number;
  items_count: number; notes: string | null;
};

type Item = {
  id: number; public_id: string;
  personnel: { id: number; public_id: string; employee_id: string; fname: string; lname: string } | null;
  basic_pay: number; overtime_pay: number; transportation_allowance: number;
  rice_allowance: number; clothing_allowance: number; communication_allowance: number;
  medical_allowance: number; other_allowance: number; custom_earning: number;
  gross_pay: number;
  sss_employee: number; philhealth_employee: number; pagibig_employee: number;
  withholding_tax: number; sss_loan: number; pagibig_loan: number;
  salary_advance: number; other_deductions: number; total_employee_deductions: number;
  net_pay: number;
  is_manually_edited: boolean; remarks: string | null;
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined) {
  if (n == null || n === 0) return '—';
  return new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtPHP(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(n);
}

const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'secondary', for_approval: 'outline', approved: 'default', posted: 'default',
};
const statusLabel: Record<string, string> = {
  draft: 'Draft', for_approval: 'For Approval', approved: 'Approved', posted: 'Posted',
};

// ────────────────────────────────────────────────────────────────────────────
// Override Item Dialog
// ────────────────────────────────────────────────────────────────────────────
function OverrideDialog({
  item, periodId, onClose,
}: { item: Item | null; periodId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Item> & { remarks: string }>({
    remarks: '',
  });

  const isOpen = !!item;

  useEffect(() => {
    if (item) {
      setForm({
        basic_pay: item.basic_pay,
        overtime_pay: item.overtime_pay,
        transportation_allowance: item.transportation_allowance,
        rice_allowance: item.rice_allowance,
        clothing_allowance: item.clothing_allowance,
        other_allowance: item.other_allowance,
        custom_earning: item.custom_earning,
        sss_loan: item.sss_loan,
        pagibig_loan: item.pagibig_loan,
        salary_advance: item.salary_advance,
        other_deductions: item.other_deductions,
        remarks: item.remarks ?? '',
      });
    }
  }, [item?.id]);

  const save = useMutation({
    mutationFn: () => api.put(`/hrms/payroll/periods/${periodId}/items/${item!.public_id}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-period', periodId] });
      qc.invalidateQueries({ queryKey: ['payroll-items', periodId] });
      toast.success('Payroll item updated.');
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? 'Failed to update.'),
  });

  const num = (k: string) => (v: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: parseFloat(v.target.value) || 0 }));

  return (
    <Dialog open={isOpen} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Override Pay Item</DialogTitle>
          <DialogDescription>
            {item?.personnel ? `${item.personnel.fname} ${item.personnel.lname} — ${item.personnel.employee_id}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Basic Pay</Label>
            <Input type="number" step="0.01" value={form.basic_pay ?? ''} onChange={num('basic_pay')} />
          </div>
          <div className="grid gap-1.5">
            <Label>Overtime Pay</Label>
            <Input type="number" step="0.01" value={form.overtime_pay ?? ''} onChange={num('overtime_pay')} />
          </div>
          <div className="grid gap-1.5">
            <Label>Transportation</Label>
            <Input type="number" step="0.01" value={form.transportation_allowance ?? ''} onChange={num('transportation_allowance')} />
          </div>
          <div className="grid gap-1.5">
            <Label>Rice Allowance</Label>
            <Input type="number" step="0.01" value={form.rice_allowance ?? ''} onChange={num('rice_allowance')} />
          </div>
          <div className="grid gap-1.5">
            <Label>Clothing Allowance</Label>
            <Input type="number" step="0.01" value={form.clothing_allowance ?? ''} onChange={num('clothing_allowance')} />
          </div>
          <div className="grid gap-1.5">
            <Label>Other Allowance</Label>
            <Input type="number" step="0.01" value={form.other_allowance ?? ''} onChange={num('other_allowance')} />
          </div>
          <div className="grid gap-1.5">
            <Label>Custom Earning</Label>
            <Input type="number" step="0.01" value={form.custom_earning ?? ''} onChange={num('custom_earning')} />
          </div>
          <div className="grid gap-1.5">
            <Label>SSS Loan</Label>
            <Input type="number" step="0.01" value={form.sss_loan ?? ''} onChange={num('sss_loan')} />
          </div>
          <div className="grid gap-1.5">
            <Label>Pag-IBIG Loan</Label>
            <Input type="number" step="0.01" value={form.pagibig_loan ?? ''} onChange={num('pagibig_loan')} />
          </div>
          <div className="grid gap-1.5">
            <Label>Salary Advance</Label>
            <Input type="number" step="0.01" value={form.salary_advance ?? ''} onChange={num('salary_advance')} />
          </div>
          <div className="col-span-2 grid gap-1.5">
            <Label>Other Deduction</Label>
            <Input type="number" step="0.01" value={form.other_deductions ?? ''} onChange={num('other_deductions')} />
          </div>
          <div className="col-span-2 grid gap-1.5">
            <Label>Remarks</Label>
            <Input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────────────────
export default function PayrollPeriodPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [overrideItem, setOverrideItem] = useState<Item | null>(null);

  const { data: periodData, isLoading: loadingPeriod } = useQuery<{ data: Period }>({
    queryKey: ['payroll-period', periodId],
    queryFn: () => api.get(`/hrms/payroll/periods/${periodId}`).then(r => r.data),
    enabled: !!periodId,
  });
  const period = periodData?.data;

  const { data: itemsData, isLoading: loadingItems } = useQuery<{ data: Item[] }>({
    queryKey: ['payroll-items', periodId],
    queryFn: () => api.get(`/hrms/payroll/periods/${periodId}/items`).then(r => r.data),
    enabled: !!periodId,
  });
  const items = itemsData?.data ?? [];

  const regenerate = useMutation({
    mutationFn: () => api.post(`/hrms/payroll/periods/${periodId}/regenerate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-period', periodId] });
      qc.invalidateQueries({ queryKey: ['payroll-items', periodId] });
      toast.success('Payroll items regenerated.');
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? 'Failed to regenerate.'),
  });

  const submitApproval = useMutation({
    mutationFn: () => api.post(`/hrms/payroll/periods/${periodId}/submit`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-period', periodId] });
      toast.success('Submitted for approval.');
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? 'Failed to submit.'),
  });

  const approve = useMutation({
    mutationFn: () => api.post(`/hrms/payroll/periods/${periodId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-period', periodId] });
      toast.success('Payroll approved.');
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? 'Failed to approve.'),
  });

  const post = useMutation({
    mutationFn: () => api.post(`/hrms/payroll/periods/${periodId}/post`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-period', periodId] });
      toast.success('Payroll posted to GL.');
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? 'Failed to post.'),
  });

  const downloadPayslip = (item: Item) => {
    if (!item.personnel) return;
    window.open(
      `${api.defaults.baseURL}/hrms/payroll/periods/${periodId}/payslip/${item.personnel.public_id}`,
      '_blank',
    );
  };

  if (loadingPeriod) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!period) {
    return <div className="p-6 text-muted-foreground">Payroll period not found.</div>;
  }

  const isDraft = period.status === 'draft';
  const isForApproval = period.status === 'for_approval';
  const isApproved = period.status === 'approved';
  const isPosted = period.status === 'posted';

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/hrms/payroll')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{period.period_label}</h1>
              <Badge variant={statusVariant[period.status] ?? 'secondary'}>
                {statusLabel[period.status] ?? period.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {period.template?.name ?? 'No template'} ·{' '}
              {period.period_start ? format(new Date(period.period_start), 'MMM d') : '—'} –{' '}
              {period.period_end ? format(new Date(period.period_end), 'MMM d, yyyy') : '—'} ·{' '}
              Pay date: {period.payout_date ? format(new Date(period.payout_date), 'MMM d, yyyy') : '—'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <>
              <Button variant="outline" onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
                {regenerate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Regenerate
              </Button>
              <Button onClick={() => submitApproval.mutate()} disabled={submitApproval.isPending || items.length === 0}>
                {submitApproval.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit for Approval
              </Button>
            </>
          )}
          {isForApproval && (
            <Button onClick={() => approve.mutate()} disabled={approve.isPending}>
              {approve.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Approve
            </Button>
          )}
          {isApproved && (
            <Button onClick={() => {
              if (confirm('Post this payroll to GL? This action cannot be undone.')) post.mutate();
            }} disabled={post.isPending}>
              {post.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpenCheck className="mr-2 h-4 w-4" />}
              Post to GL
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Headcount', value: period.items_count ?? 0, currency: false },
          { label: 'Gross Pay', value: period.total_gross_pay, currency: true },
          { label: 'Total Deductions', value:
              (period.total_sss_employee ?? 0) + (period.total_philhealth_employee ?? 0) +
              (period.total_pagibig_employee ?? 0) + (period.total_withholding_tax ?? 0) +
              (period.total_other_deductions ?? 0),
            currency: true },
          { label: 'Net Pay', value: period.total_net_pay, currency: true },
        ].map(({ label, value, currency }) => (
          <Card key={label}>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-xl font-bold">
                {currency ? fmtPHP(value as number) : value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail tabs */}
      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Pay Items ({items.length})</TabsTrigger>
          <TabsTrigger value="summary">Deduction Summary</TabsTrigger>
        </TabsList>

        {/* Items tab */}
        <TabsContent value="items">
          <Card>
            <CardContent className="p-0">
              {loadingItems ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-right">Basic Pay</TableHead>
                        <TableHead className="text-right">Allowances</TableHead>
                        <TableHead className="text-right">Custom</TableHead>
                        <TableHead className="text-right">Gross</TableHead>
                        <TableHead className="text-right">Deductions</TableHead>
                        <TableHead className="text-right">Net Pay</TableHead>
                        <TableHead className="text-center">OVR</TableHead>
                        <TableHead className="w-[80px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(item => (
                        <TableRow key={item.public_id}>
                          <TableCell>
                            <div className="font-medium">
                              {item.personnel ? `${item.personnel.fname} ${item.personnel.lname}` : '—'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.personnel?.employee_id ?? ''}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmt(item.basic_pay)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {fmt((item.transportation_allowance ?? 0) + (item.rice_allowance ?? 0) + (item.clothing_allowance ?? 0) + (item.communication_allowance ?? 0) + (item.medical_allowance ?? 0) + (item.other_allowance ?? 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmt(item.custom_earning)}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">{fmt(item.gross_pay)}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-destructive">{fmt(item.total_employee_deductions)}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-bold">{fmt(item.net_pay)}</TableCell>
                          <TableCell className="text-center">
                            {item.is_manually_edited && (
                              <Badge variant="outline" className="text-xs">OVR</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {true && (
                                <Button variant="ghost" size="icon" onClick={() => setOverrideItem(item)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {(isApproved || isPosted) && item.personnel && (
                                <Button variant="ghost" size="icon" onClick={() => downloadPayslip(item)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deduction summary tab */}
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Government Deduction Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
                {[
                  { label: 'SSS (Employee)', value: period.total_sss_employee },
                  { label: 'PhilHealth (Employee)', value: period.total_philhealth_employee },
                  { label: 'Pag-IBIG (Employee)', value: period.total_pagibig_employee },
                  { label: 'Withholding Tax', value: period.total_withholding_tax },
                  { label: 'Other Deductions', value: period.total_other_deductions },
                  { label: 'Net Payroll', value: period.total_net_pay },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-semibold">{fmtPHP(value)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <OverrideDialog item={overrideItem} periodId={periodId!} onClose={() => setOverrideItem(null)} />
    </div>
  );
}
