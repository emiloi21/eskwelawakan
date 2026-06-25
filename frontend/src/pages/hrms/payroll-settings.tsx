import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Settings2 } from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
type Template = {
  id: number; public_id: string; name: string; type: string;
  description: string | null;
  include_basic: boolean; include_transportation: boolean; include_rice: boolean;
  include_clothing: boolean; include_communication: boolean; include_medical: boolean;
  include_other_allowance: boolean; custom_earning_label: string | null;
  custom_earning_taxable: boolean;
  deduct_sss: boolean; deduct_philhealth: boolean; deduct_pagibig: boolean;
  deduct_tax: boolean; deduct_loans: boolean;
  auto_compute_thirteenth: boolean; allow_individual_override: boolean;
  is_active: boolean;
};

type PositionRate = {
  id: number | null; position_id: number; position: { id: number; public_id: string; name: string } | null;
  basic_monthly_pay: number; transportation_allowance: number; rice_allowance: number;
};

type Position = { id: number; public_id: string; name: string };

type CoaEntry = { id: number; public_id: string; account_key: string; label: string; coa_id: number | null; coa: { account_code: string; account_name: string } | null };
type CoaAccount = { id: number; public_id: string; account_code: string; account_name: string };

const TEMPLATE_TYPES = ['regular', '13th_month', 'mid_year_bonus', 'year_end_bonus', 'custom'] as const;

// ────────────────────────────────────────────────────────────────────────────
// Template dialog
// ────────────────────────────────────────────────────────────────────────────
const defaultTpl: Partial<Template> = {
  name: '', type: 'regular', description: '',
  include_basic: true, include_transportation: true, include_rice: true,
  include_clothing: false, include_communication: false, include_medical: false,
  include_other_allowance: false, custom_earning_label: '',
  custom_earning_taxable: false,
  deduct_sss: true, deduct_philhealth: true, deduct_pagibig: true,
  deduct_tax: true, deduct_loans: true,
  auto_compute_thirteenth: false, allow_individual_override: true, is_active: true,
};

function TemplateDialog({
  template, onClose,
}: { template: Template | 'new' | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isNew = template === 'new';
  const [form, setForm] = useState<Partial<Template>>(defaultTpl);

  useEffect(() => {
    if (template && template !== 'new') setForm(template);
    else setForm(defaultTpl);
  }, [template]);

  const save = useMutation({
    mutationFn: () => isNew
      ? api.post('/hrms/payroll/templates', form)
      : api.put(`/hrms/payroll/templates/${(template as Template).public_id}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-templates'] });
      toast.success(isNew ? 'Template created.' : 'Template updated.');
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? 'Failed to save.'),
  });

  const set = (k: keyof Template, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  if (!template) return null;

  return (
    <Dialog open={!!template} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isNew ? 'New Template' : 'Edit Template'}</DialogTitle>
          <DialogDescription>Configure which earnings and deductions to include in this payroll template.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5 col-span-2">
              <Label>Template Name</Label>
              <Input value={form.name ?? ''} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={form.type ?? 'regular'} onValueChange={v => set('type', v as string)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Active</Label>
              <div className="flex items-center h-9">
                <Switch checked={!!form.is_active} onCheckedChange={v => set('is_active', v)} />
              </div>
            </div>
            <div className="col-span-2 grid gap-1.5">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description ?? ''} onChange={e => set('description', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Earnings */}
            <div>
              <p className="text-sm font-medium mb-2">Earnings</p>
              <div className="space-y-2">
                {([
                  ['include_basic', 'Basic Pay'],
                  ['include_transportation', 'Transportation Allowance'],
                  ['include_rice', 'Rice Allowance'],
                  ['include_clothing', 'Clothing Allowance'],
                  ['include_communication', 'Communication Allowance'],
                  ['include_medical', 'Medical Allowance'],
                  ['include_other_allowance', 'Other Allowance'],
                  ['auto_compute_thirteenth', 'Auto-compute 13th Month'],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="text-sm font-normal">{label}</Label>
                    <Switch checked={!!(form as Record<string, unknown>)[key]} onCheckedChange={v => set(key as keyof Template, v)} />
                  </div>
                ))}
                <div className="grid gap-1.5 pt-1">
                  <Label className="text-sm">Custom Earning Label</Label>
                  <Input
                    placeholder="e.g. Mid-Year Bonus"
                    value={form.custom_earning_label ?? ''}
                    onChange={e => set('custom_earning_label', e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Custom Earning is Taxable</Label>
                  <Switch checked={!!form.custom_earning_taxable} onCheckedChange={v => set('custom_earning_taxable', v)} />
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <p className="text-sm font-medium mb-2">Deductions</p>
              <div className="space-y-2">
                {([
                  ['deduct_sss', 'SSS'],
                  ['deduct_philhealth', 'PhilHealth'],
                  ['deduct_pagibig', 'Pag-IBIG'],
                  ['deduct_tax', 'Withholding Tax'],
                  ['deduct_loans', 'Loans (SSS/Pag-IBIG/Advance)'],
                  ['allow_individual_override', 'Allow Individual Overrides'],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="text-sm font-normal">{label}</Label>
                    <Switch checked={!!(form as Record<string, unknown>)[key]} onCheckedChange={v => set(key as keyof Template, v)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isNew ? 'Create Template' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Position Rates tab
// ────────────────────────────────────────────────────────────────────────────
function PositionRatesTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Record<number, Partial<PositionRate>>>({});

  const { data: positionsData } = useQuery<{ data: Position[] }>({
    queryKey: ['hrms-positions-all'],
    queryFn: () => api.get('/hrms/positions', { params: { per_page: 200 } }).then(r => r.data),
  });

  const { data: ratesData } = useQuery<{ data: PositionRate[] }>({
    queryKey: ['payroll-position-rates'],
    queryFn: () => api.get('/hrms/payroll/settings/positions').then(r => r.data),
  });

  const positions = positionsData?.data ?? [];
  const rates = ratesData?.data ?? [];
  const rateMap = Object.fromEntries(rates.map(r => [r.position_id, r]));

  const save = useMutation({
    mutationFn: ({ positionId, data }: { positionId: number; data: Partial<PositionRate> }) =>
      api.post(`/hrms/payroll/settings/positions/${positionId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-position-rates'] });
      setEditing({});
      toast.success('Position rate saved.');
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? 'Failed to save.'),
  });

  const setEditing_ = (posId: number, rate: PositionRate | undefined) => {
    setEditing(e => ({
      ...e,
      [posId]: {
        basic_monthly_pay: rate?.basic_monthly_pay ?? 0,
        transportation_allowance: rate?.transportation_allowance ?? 0,
        rice_allowance: rate?.rice_allowance ?? 0,
      },
    }));
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Position</TableHead>
          <TableHead className="text-right">Basic Monthly Pay</TableHead>
          <TableHead className="text-right">Transportation</TableHead>
          <TableHead className="text-right">Rice Allowance</TableHead>
          <TableHead className="w-[100px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {positions.map(pos => {
          const rate = rateMap[pos.id];
          const isEditing = !!editing[pos.id];
          const ed = editing[pos.id] ?? {};
          return (
            <TableRow key={pos.id}>
              <TableCell className="font-medium">{pos.name}</TableCell>
              {isEditing ? (
                <>
                  <TableCell>
                    <Input type="number" min="0" step="0.01" className="w-32 ml-auto"
                      value={ed.basic_monthly_pay ?? ''}
                      onChange={e => setEditing(prev => ({ ...prev, [pos.id]: { ...prev[pos.id], basic_monthly_pay: parseFloat(e.target.value) || 0 } }))} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min="0" step="0.01" className="w-24 ml-auto"
                      value={ed.transportation_allowance ?? ''}
                      onChange={e => setEditing(prev => ({ ...prev, [pos.id]: { ...prev[pos.id], transportation_allowance: parseFloat(e.target.value) || 0 } }))} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min="0" step="0.01" className="w-24 ml-auto"
                      value={ed.rice_allowance ?? ''}
                      onChange={e => setEditing(prev => ({ ...prev, [pos.id]: { ...prev[pos.id], rice_allowance: parseFloat(e.target.value) || 0 } }))} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => save.mutate({ positionId: pos.id, data: ed })} disabled={save.isPending}>
                        Save
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditing(e => { const n = { ...e }; delete n[pos.id]; return n; })}>
                        Cancel
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="text-right font-mono text-sm">{rate?.basic_monthly_pay ? rate.basic_monthly_pay.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '—'}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{rate?.transportation_allowance ? rate.transportation_allowance.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '—'}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{rate?.rice_allowance ? rate.rice_allowance.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setEditing_(pos.id, rate)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// COA Map tab
// ────────────────────────────────────────────────────────────────────────────
function CoaMapTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, number | null>>({});

  const { data: coaData } = useQuery<{ data: CoaEntry[] }>({
    queryKey: ['payroll-coa-map'],
    queryFn: () => api.get('/hrms/payroll/settings/coa-map').then(r => r.data),
  });

  const { data: accountsData } = useQuery<{ data: CoaAccount[] }>({
    queryKey: ['coa-accounts'],
    queryFn: () => api.get('/accounting/coa').then(r => r.data),
  });

  const entries = coaData?.data ?? [];
  const accounts = accountsData?.data ?? [];

  useEffect(() => {
    const init: Record<string, number | null> = {};
    for (const e of entries) init[e.account_key] = e.coa_id;
    setForm(init);
  }, [entries]);

  const save = useMutation({
    mutationFn: () => api.post('/hrms/payroll/settings/coa-map', { mappings: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-coa-map'] });
      toast.success('COA mapping saved.');
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? 'Failed to save.'),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-muted-foreground">
        Map each payroll GL account key to an account in the Chart of Accounts. These mappings are used when posting payroll to the General Ledger.
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account Key</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Chart of Account</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(e => (
            <TableRow key={e.account_key}>
              <TableCell className="font-mono text-xs">{e.account_key}</TableCell>
              <TableCell className="text-sm">{e.label}</TableCell>
              <TableCell>
                <Select
                  value={form[e.account_key] ? String(form[e.account_key]) : ''}
                  onValueChange={v => setForm(f => ({ ...f, [e.account_key]: v ? parseInt(v) : null }))}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select account…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Not mapped —</SelectItem>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.account_code} — {a.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save COA Mappings
        </Button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────────────────
export default function PayrollSettingsPage() {
  const [templateDialog, setTemplateDialog] = useState<Template | 'new' | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: Template[] }>({
    queryKey: ['payroll-templates'],
    queryFn: () => api.get('/hrms/payroll/templates').then(r => r.data),
  });
  const templates = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-2">
        <Settings2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">Payroll Settings</h1>
          <p className="text-sm text-muted-foreground">Configure default rates, templates, and GL account mappings</p>
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="position-rates">Position Rates</TabsTrigger>
          <TabsTrigger value="coa-map">GL Account Map</TabsTrigger>
        </TabsList>

        {/* Templates tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-base">Payroll Templates</CardTitle>
              <Button size="sm" onClick={() => setTemplateDialog('new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map(t => (
                      <TableRow key={t.public_id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell><Badge variant="outline">{t.type}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground space-x-1">
                          {t.include_basic && <span>Basic</span>}
                          {t.include_transportation && <span>Trans</span>}
                          {t.include_rice && <span>Rice</span>}
                          {t.auto_compute_thirteenth && <span>13th</span>}
                          {t.custom_earning_label && <span>{t.custom_earning_label}</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground space-x-1">
                          {t.deduct_sss && <span>SSS</span>}
                          {t.deduct_philhealth && <span>PhilHealth</span>}
                          {t.deduct_pagibig && <span>Pag-IBIG</span>}
                          {t.deduct_tax && <span>Tax</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.is_active ? 'default' : 'secondary'}>
                            {t.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setTemplateDialog(t)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Position Rates tab */}
        <TabsContent value="position-rates">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Default Salary Rates by Position</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <PositionRatesTab />
            </CardContent>
          </Card>
        </TabsContent>

        {/* COA Map tab */}
        <TabsContent value="coa-map">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">General Ledger Account Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <CoaMapTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TemplateDialog template={templateDialog} onClose={() => setTemplateDialog(null)} />
    </div>
  );
}
