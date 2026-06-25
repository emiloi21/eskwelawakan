import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useLookups } from '@/hooks/use-lookups';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Save, CheckCircle2, XCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { AccountCategory } from '@/types';

// ── Types ────────────────────────────────────────────────────────────────────

interface COAccount {
  coa_id: number;
  public_id: string;
  account_code: string;
  account_name: string;
  account_type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  is_header: boolean;
  is_system: boolean;
}

interface SchoolPrefs {
  gl_ar_coa_id: number | null;
  gl_cash_coa_id: number | null;
  gl_bank_coa_id: number | null;
  gl_ewallet_coa_id: number | null;
  gl_voucher_coa_id: number | null;
  gl_income_summary_coa_id: number | null;
  gl_retained_coa_id: number | null;
}

const SYSTEM_ACCOUNT_FIELDS: {
  key: keyof SchoolPrefs;
  label: string;
  description: string;
  type: 'Asset' | 'Equity';
}[] = [
  {
    key: 'gl_ar_coa_id',
    label: 'Accounts Receivable — Students',
    description: 'Debited when an assessment is assigned. Credited when payment is received.',
    type: 'Asset',
  },
  {
    key: 'gl_cash_coa_id',
    label: 'Cash on Hand',
    description: 'Debited for Cash payments.',
    type: 'Asset',
  },
  {
    key: 'gl_bank_coa_id',
    label: 'Cash in Bank (Bank Transfer / Check)',
    description: 'Debited for Bank Transfer and Check payments.',
    type: 'Asset',
  },
  {
    key: 'gl_ewallet_coa_id',
    label: 'E-Wallet Clearing',
    description: 'Debited for E-Wallet payments.',
    type: 'Asset',
  },
  {
    key: 'gl_voucher_coa_id',
    label: 'Voucher Clearing',
    description: 'Debited for Voucher payments.',
    type: 'Asset',
  },
  {
    key: 'gl_income_summary_coa_id',
    label: 'Income Summary',
    description: 'Temporary account used during Fiscal Year closing.',
    type: 'Equity',
  },
  {
    key: 'gl_retained_coa_id',
    label: 'Retained Earnings / School Fund',
    description: 'Net income is transferred here at Fiscal Year closing.',
    type: 'Equity',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function toStr(v: number | null | undefined): string {
  return v == null ? '' : String(v);
}

function AccountSelect({
  value,
  onChange,
  options,
  placeholder = 'Select account…',
}: {
  value: string;
  onChange: (v: string) => void;
  options: COAccount[];
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? '')}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        <SelectItem value="__none__">
          <span className="text-muted-foreground">(Not set)</span>
        </SelectItem>
        {options.map((a) => (
          <SelectItem key={a.coa_id} value={String(a.coa_id)}>
            <span className="font-mono text-xs mr-2 text-muted-foreground">{a.account_code}</span>
            {a.account_name}
            {a.is_system && (
              <Badge variant="secondary" className="ml-2 text-[10px]">System</Badge>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GlSettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { data: lookups } = useLookups();
  const sy = user?.selected_sy || lookups?.active_school_year || '';

  const [glForm, setGlForm] = useState<Record<string, string>>({});
  const [glDirty, setGlDirty] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [savingCategoryId, setSavingCategoryId] = useState<number | null>(null);

  // ── Data fetches ────────────────────────────────────────────────────────────

  const { data: prefs, isLoading: prefsLoading } = useQuery<SchoolPrefs>({
    queryKey: ['school-prefs-gl'],
    queryFn: async () => {
      const { data } = await api.get('/admin/school-preferences');
      return data.data;
    },
  });

  useEffect(() => {
    if (!prefs) return;
    const initial: Record<string, string> = {};
    SYSTEM_ACCOUNT_FIELDS.forEach(({ key }) => {
      initial[key] = toStr(prefs[key]);
    });
    setGlForm(initial);
    setGlDirty(false);
  }, [prefs]);

  const { data: flatAccounts = [], isLoading: coaLoading } = useQuery<COAccount[]>({
    queryKey: ['coa-flat-gl'],
    queryFn: async () => {
      const { data } = await api.get('/accounting/chart-of-accounts?flat=1');
      return data.data;
    },
  });

  const { data: categoriesData, isLoading: catsLoading } = useQuery<{ data: AccountCategory[] }>({
    queryKey: ['categories-gl', sy],
    queryFn: async () => {
      const params = new URLSearchParams({ per_page: '200' });
      if (sy) params.set('schoolYear', sy);
      const { data } = await api.get(`/accounting/categories?${params}`);
      return data;
    },
  });

  const categories: AccountCategory[] = categoriesData?.data ?? [];

  // ── Account option subsets ──────────────────────────────────────────────────

  const assetAccounts = useMemo(
    () => flatAccounts.filter((a) => a.account_type === 'Asset' && !a.is_header),
    [flatAccounts],
  );
  const equityAccounts = useMemo(
    () => flatAccounts.filter((a) => a.account_type === 'Equity' && !a.is_header),
    [flatAccounts],
  );
  const revenueAccounts = useMemo(
    () => flatAccounts.filter((a) => a.account_type === 'Revenue' && !a.is_header),
    [flatAccounts],
  );

  function optionsFor(type: 'Asset' | 'Equity'): COAccount[] {
    return type === 'Asset' ? assetAccounts : equityAccounts;
  }

  // ── Mutations ───────────────────────────────────────────────────────────────

  const saveGlMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, number | null> = {};
      SYSTEM_ACCOUNT_FIELDS.forEach(({ key }) => {
        const v = glForm[key];
        payload[key] = v && v !== '__none__' ? Number(v) : null;
      });
      await api.put('/admin/school-preferences/gl-accounts', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['school-prefs-gl'] });
      toast.success('GL system accounts saved.');
      setGlDirty(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to save GL accounts.'),
  });

  const saveCategoryCoaMutation = useMutation({
    mutationFn: async ({ publicId, coaId }: { publicId: string; coaId: number | null }) => {
      await api.put(`/accounting/categories/${publicId}`, { coa_id: coaId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories-gl'] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Failed to save category mapping.'),
  });

  const handleGlChange = (key: string, value: string) => {
    setGlForm((prev) => ({ ...prev, [key]: value }));
    setGlDirty(true);
  };

  const handleCategoryCoaChange = async (cat: AccountCategory, coaIdStr: string) => {
    const coaId = coaIdStr && coaIdStr !== '__none__' ? Number(coaIdStr) : null;
    setSavingCategoryId(cat.category_id);
    try {
      await saveCategoryCoaMutation.mutateAsync({ publicId: cat.public_id, coaId });
      toast.success(`Revenue account set for "${cat.description}".`);
    } finally {
      setSavingCategoryId(null);
    }
  };

  // ── Filtered categories ─────────────────────────────────────────────────────

  const filteredCategories = useMemo(() => {
    if (!catSearch.trim()) return categories;
    const q = catSearch.toLowerCase();
    return categories.filter(
      (c) =>
        c.description.toLowerCase().includes(q) ||
        c.gradeLevel.toLowerCase().includes(q) ||
        c.strand.toLowerCase().includes(q),
    );
  }, [categories, catSearch]);

  const mappedCount = categories.filter((c) => c.coa_id != null).length;

  const isLoading = prefsLoading || coaLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">GL Settings</h1>
        <p className="text-muted-foreground">
          Configure which GL accounts are used for journal entries generated by cashiering,
          assessments, and fiscal year closing.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : (
        <>
          {/* ── Section 1: System Account Mapping ──────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>System Account Mapping</CardTitle>
              <CardDescription>
                Each entry below maps a system purpose (A/R, Cash, Bank, etc.) to a specific
                account in your Chart of Accounts. Journal entries are generated automatically once
                these are set.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {SYSTEM_ACCOUNT_FIELDS.map(({ key, label, description, type }) => (
                <div key={key} className="grid sm:grid-cols-2 gap-3 items-start">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <AccountSelect
                        value={glForm[key] ?? ''}
                        onChange={(v) => handleGlChange(key, v)}
                        options={optionsFor(type)}
                      />
                    </div>
                    {glForm[key] && glForm[key] !== '__none__' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </div>
              ))}

              <Separator />

              <div className="flex justify-end">
                <Button
                  onClick={() => saveGlMutation.mutate()}
                  disabled={!glDirty || saveGlMutation.isPending}
                >
                  {saveGlMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save System Accounts
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Section 2: Category → Revenue Account Mapping ─────────── */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Category → Revenue Account</CardTitle>
                <CardDescription>
                  Map each fee category to a Revenue account. The credit side of the assessment
                  journal entry will use this account.{' '}
                  <span className="font-medium text-foreground">
                    {mappedCount} / {categories.length} mapped
                  </span>
                </CardDescription>
              </div>
              <div className="relative w-56 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories…"
                  className="pl-9 h-8 text-sm"
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {catsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-8">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading categories…
                </div>
              ) : filteredCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No categories found for school year {sy || '—'}.
                </p>
              ) : (
                <div className="divide-y">
                  {filteredCategories.map((cat) => (
                    <div
                      key={cat.category_id}
                      className="grid sm:grid-cols-2 gap-3 items-start py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{cat.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {cat.gradeLevel}
                          {cat.strand !== 'N/A' && ` · ${cat.strand}`}
                          {cat.semester !== 'N/A' && ` · ${cat.semester}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <AccountSelect
                            value={toStr(cat.coa_id)}
                            onChange={(v) => handleCategoryCoaChange(cat, v)}
                            options={revenueAccounts}
                            placeholder="Select revenue account…"
                          />
                        </div>
                        {savingCategoryId === cat.category_id ? (
                          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        ) : cat.coa_id != null ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
