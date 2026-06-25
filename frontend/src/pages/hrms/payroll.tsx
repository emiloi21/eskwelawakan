import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Loader2, Plus, Banknote, CalendarRange, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';

type Template = { id: number; public_id: string; name: string; type: string; is_active: boolean };
type Period = {
  id: number; public_id: string;
  period_label: string; template: Template | null;
  period_start: string; period_end: string; payout_date: string;
  school_year: string;
  status: 'draft' | 'for_approval' | 'approved' | 'posted';
  total_gross_pay: number; total_net_pay: number; items_count: number;
};

const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'secondary',
  for_approval: 'outline',
  approved: 'default',
  posted: 'default',
};

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  for_approval: 'For Approval',
  approved: 'Approved',
  posted: 'Posted',
};

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(n);
}

// ── Create Payroll Period Dialog ──────────────────────────────────────────────
function CreatePeriodDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    period_label: '',
    school_year: '2025-2026',
    template_id: '',
    period_start: '',
    period_end: '',
    payout_date: '',
    notes: '',
  });

  const { data: templatesData } = useQuery<{ data: Template[] }>({
    queryKey: ['payroll-templates'],
    queryFn: () => api.get('/hrms/payroll/templates').then(r => r.data),
  });
  const templates = templatesData?.data ?? [];

  const save = useMutation({
    mutationFn: () => api.post('/hrms/payroll/periods', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      toast.success('Payroll period created.');
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? 'Failed to create period.'),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Payroll Period</DialogTitle>
          <DialogDescription>Set the date range and template for this payroll run.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Period Label</Label>
            <Input placeholder="e.g. Jan 2025 – 1st Cutoff" value={form.period_label} onChange={e => set('period_label', e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>School Year</Label>
            <Input placeholder="e.g. 2025-2026" value={form.school_year} onChange={e => set('school_year', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.period_start} onChange={e => set('period_start', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>End Date</Label>
              <Input type="date" value={form.period_end} onChange={e => set('period_end', e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Pay Date</Label>
            <Input type="date" value={form.payout_date} onChange={e => set('payout_date', e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Payroll Template</Label>
            <Select value={form.template_id} onValueChange={v => set('template_id', v as string)}>
              <SelectTrigger><SelectValue placeholder="Select template…" /></SelectTrigger>
              <SelectContent>
                {templates.filter(t => t.is_active).map(t => (
                  <SelectItem key={t.public_id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.period_label || !form.period_start || !form.period_end || !form.template_id}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Period
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PayrollPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery<{ data: Period[] }>({
    queryKey: ['payroll-periods'],
    queryFn: () => api.get('/hrms/payroll/periods').then(r => r.data),
  });
  const periods = data?.data ?? [];

  const deletePeriod = useMutation({
    mutationFn: (publicId: string) => api.delete(`/hrms/payroll/periods/${publicId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      toast.success('Period deleted.');
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? 'Failed to delete period.'),
  });

  const grouped = periods.reduce<Record<string, Period[]>>((acc, p) => {
    const yr = p.period_start?.slice(0, 4) ?? 'Unknown';
    acc[yr] = [...(acc[yr] ?? []), p];
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Payroll Periods</h1>
            <p className="text-sm text-muted-foreground">Manage payroll runs and salary disbursements</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/hrms/payroll-settings')}>
            Settings
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Payroll Period
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
        { label: 'Total Periods', value: periods.length, Icon: CalendarRange },
          { label: 'Draft', value: periods.filter(p => p.status === 'draft').length, Icon: Banknote },
          { label: 'For Approval', value: periods.filter(p => p.status === 'for_approval').length, Icon: Banknote },
          { label: 'Posted', value: periods.filter(p => p.status === 'posted').length, Icon: Banknote },
        ].map(({ label, value, Icon }) => (
          <Card key={label}>
            <CardContent className="py-4 flex items-center gap-3">
              <Icon className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Periods table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Periods</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : periods.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No payroll periods yet. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead className="text-right">Headcount</TableHead>
                  <TableHead className="text-right">Gross Pay</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).flatMap(([yr, items]) => [
                  <TableRow key={`yr-${yr}`} className="bg-muted/30">
                    <TableCell colSpan={9} className="py-1.5 font-semibold text-xs text-muted-foreground">{yr}</TableCell>
                  </TableRow>,
                  ...items.map(p => (
                    <TableRow key={p.public_id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/hrms/payroll/${p.public_id}`)}>
                      <TableCell className="font-medium">{p.period_label}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.template?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {p.period_start ? format(new Date(p.period_start), 'MMM d') : '—'} – {p.period_end ? format(new Date(p.period_end), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{p.payout_date ? format(new Date(p.payout_date), 'MMM d, yyyy') : '—'}</TableCell>
                      <TableCell className="text-right">{p.items_count ?? 0}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(p.total_gross_pay)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmt(p.total_net_pay)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[p.status] ?? 'secondary'}>
                          {statusLabel[p.status] ?? p.status}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/hrms/payroll/${p.public_id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {p.status === 'draft' && (
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => {
                                if (confirm('Delete this draft payroll period?')) deletePeriod.mutate(p.public_id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )),
                ])}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreatePeriodDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
