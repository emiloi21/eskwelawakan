import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Download } from 'lucide-react';
import { DEPARTMENTS } from '@/lib/constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';

function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

type ReportType = 'collection' | 'category' | 'particular' | 'eosy' | 'exam-permits' | 'exam-assessment' | 'transaction-list' | 'ns-collection' | 'monthly-assessment' | 'students-by-assessment' | 'balance-aging' | 'collection-trend';

// ── CSV export helper ─────────────────────────────────────────────
function exportCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => {
        const val = String(r[h] ?? '');
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const sy = user?.selected_sy || '';
  const [reportType, setReportType] = useState<ReportType>('collection');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [schoolYear, setSchoolYear] = useState(sy);
  const [dept, setDept] = useState('');
  const [fetched, setFetched] = useState(false);

  const needsDates = ['collection', 'category', 'particular', 'transaction-list', 'ns-collection'].includes(reportType);

  const collectionQuery = useQuery({
    queryKey: ['report-collection', dateFrom, dateTo, schoolYear],
    queryFn: async () => {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      if (schoolYear) params.set('schoolYear', schoolYear);
      const { data } = await api.get(`/accounting/reports/collection-summary?${params}`);
      return data.data;
    },
    enabled: fetched && reportType === 'collection' && !!dateFrom && !!dateTo,
  });

  const categoryQuery = useQuery({
    queryKey: ['report-category', dateFrom, dateTo, schoolYear],
    queryFn: async () => {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      if (schoolYear) params.set('schoolYear', schoolYear);
      const { data } = await api.get(`/accounting/reports/category-summary?${params}`);
      return data.data;
    },
    enabled: fetched && reportType === 'category' && !!dateFrom && !!dateTo,
  });

  const particularQuery = useQuery({
    queryKey: ['report-particular', dateFrom, dateTo, schoolYear],
    queryFn: async () => {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      if (schoolYear) params.set('schoolYear', schoolYear);
      const { data } = await api.get(`/accounting/reports/particular-summary?${params}`);
      return data.data;
    },
    enabled: fetched && reportType === 'particular' && !!dateFrom && !!dateTo,
  });

  const eosyQuery = useQuery({
    queryKey: ['report-eosy', schoolYear],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/reports/eosy-summary?schoolYear=${encodeURIComponent(schoolYear)}`);
      return data.data;
    },
    enabled: fetched && reportType === 'eosy' && !!schoolYear,
  });

  const examQuery = useQuery({
    queryKey: ['report-exam', schoolYear, dept],
    queryFn: async () => {
      const params = new URLSearchParams({ schoolYear });
      if (dept) params.set('dept', dept);
      const { data } = await api.get(`/accounting/reports/exam-permits?${params}`);
      return data.data;
    },
    enabled: fetched && reportType === 'exam-permits' && !!schoolYear,
  });

  const examAssessQuery = useQuery({
    queryKey: ['report-exam-assess', schoolYear, dept],
    queryFn: async () => {
      const params = new URLSearchParams({ schoolYear });
      if (dept) params.set('dept', dept);
      const { data } = await api.get(`/accounting/reports/exam-assessment?${params}`);
      return data.data;
    },
    enabled: fetched && reportType === 'exam-assessment' && !!schoolYear,
  });

  const txListQuery = useQuery({
    queryKey: ['report-tx-list', dateFrom, dateTo, schoolYear],
    queryFn: async () => {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      if (schoolYear) params.set('schoolYear', schoolYear);
      const { data } = await api.get(`/accounting/reports/transaction-list?${params}`);
      return data.data;
    },
    enabled: fetched && reportType === 'transaction-list' && !!dateFrom && !!dateTo,
  });

  const nsCollQuery = useQuery({
    queryKey: ['report-ns-coll', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      const { data } = await api.get(`/accounting/reports/ns-collection-summary?${params}`);
      return data.data;
    },
    enabled: fetched && reportType === 'ns-collection' && !!dateFrom && !!dateTo,
  });

  const monthlyAssessQuery = useQuery({
    queryKey: ['report-monthly-assess', schoolYear, dept],
    queryFn: async () => {
      const params = new URLSearchParams({ schoolYear });
      if (dept) params.set('dept', dept);
      const { data } = await api.get(`/accounting/reports/monthly-assessment?${params}`);
      return data.data;
    },
    enabled: fetched && reportType === 'monthly-assessment' && !!schoolYear,
  });

  const studByAssessQuery = useQuery({
    queryKey: ['report-stud-assess', schoolYear],
    queryFn: async () => {
      const params = new URLSearchParams({ schoolYear });
      const { data } = await api.get(`/accounting/reports/students-by-assessment?${params}`);
      return data.data;
    },
    enabled: fetched && reportType === 'students-by-assessment' && !!schoolYear,
  });

  const balanceAgingQuery = useQuery({
    queryKey: ['report-balance-aging', schoolYear, dept],
    queryFn: async () => {
      const params = new URLSearchParams({ schoolYear });
      if (dept) params.set('dept', dept);
      const { data } = await api.get(`/accounting/reports/balance-aging?${params}`);
      return data.data;
    },
    enabled: fetched && reportType === 'balance-aging' && !!schoolYear,
  });

  const collectionTrendQuery = useQuery({
    queryKey: ['report-collection-trend', schoolYear],
    queryFn: async () => {
      const params = new URLSearchParams({ schoolYear });
      const { data } = await api.get(`/accounting/reports/collection-trend?${params}`);
      return data.data;
    },
    enabled: fetched && reportType === 'collection-trend' && !!schoolYear,
  });

  const isLoading =
    collectionQuery.isFetching ||
    categoryQuery.isFetching ||
    particularQuery.isFetching ||
    eosyQuery.isFetching ||
    examQuery.isFetching ||
    examAssessQuery.isFetching ||
    txListQuery.isFetching ||
    nsCollQuery.isFetching ||
    monthlyAssessQuery.isFetching ||
    studByAssessQuery.isFetching ||
    balanceAgingQuery.isFetching ||
    collectionTrendQuery.isFetching;

  const handleGenerate = () => setFetched(true);

  const handleTypeChange = (v: ReportType) => {
    setReportType(v);
    setFetched(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Generate financial reports and summaries</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => handleTypeChange(v as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collection">Collection Summary</SelectItem>
                  <SelectItem value="category">By Category</SelectItem>
                  <SelectItem value="particular">By Particular</SelectItem>
                  <SelectItem value="eosy">End-of-SY Summary</SelectItem>
                  <SelectItem value="exam-permits">Exam Permits</SelectItem>
                  <SelectItem value="exam-assessment">Exam Assessment</SelectItem>
                  <SelectItem value="transaction-list">Transaction List</SelectItem>
                  <SelectItem value="ns-collection">NS Collection Summary</SelectItem>
                  <SelectItem value="monthly-assessment">Monthly Assessment</SelectItem>
                  <SelectItem value="students-by-assessment">Students by Assessment</SelectItem>
                  <SelectItem value="balance-aging">Balance Aging Report</SelectItem>
                  <SelectItem value="collection-trend">Collection Trend (Assessed vs Collected)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {needsDates && (
              <>
                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setFetched(false); }} />
                </div>
                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setFetched(false); }} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>School Year</Label>
              <Input value={schoolYear} onChange={(e) => { setSchoolYear(e.target.value); setFetched(false); }} placeholder="2025-2026" />
            </div>
            {reportType === 'exam-permits' && (
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={dept} onValueChange={(v) => { setDept((v ?? '') === 'all' ? '' : (v ?? '')); setFetched(false); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {reportType === 'balance-aging' && (
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={dept} onValueChange={(v) => { setDept((v ?? '') === 'all' ? '' : (v ?? '')); setFetched(false); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Generate
            </Button>
            <Button variant="outline" onClick={() => window.print()} disabled={!fetched}>
              <Download className="mr-2 h-4 w-4" /> Print / PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Collection Summary */}
      {fetched && reportType === 'collection' && collectionQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>Collection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Grand Total</p>
                <p className="text-2xl font-bold tabular-nums">{formatPeso(collectionQuery.data.grand_total)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{collectionQuery.data.total_transactions}</p>
              </div>
            </div>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">Collected</th>
                    <th className="text-right p-3">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionQuery.data.daily.map((row: { trans_date: string; total_collected: number; transaction_count: number }) => (
                    <tr key={row.trans_date} className="border-t">
                      <td className="p-3">{new Date(row.trans_date).toLocaleDateString()}</td>
                      <td className="p-3 text-right tabular-nums font-medium">{formatPeso(row.total_collected)}</td>
                      <td className="p-3 text-right tabular-nums">{row.transaction_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Summary */}
      {fetched && reportType === 'category' && categoryQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>Collection by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Category</th>
                    <th className="text-right p-3">Collected</th>
                    <th className="text-right p-3">Payments</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryQuery.data.map((row: { category_id: number; category_name: string; total_collected: number; payment_count: number }) => (
                    <tr key={row.category_id} className="border-t">
                      <td className="p-3 font-medium">{row.category_name}</td>
                      <td className="p-3 text-right tabular-nums font-medium">{formatPeso(row.total_collected)}</td>
                      <td className="p-3 text-right tabular-nums">{row.payment_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Particular Summary */}
      {fetched && reportType === 'particular' && particularQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>Collection by Particular</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Code</th>
                    <th className="text-left p-3">Particular</th>
                    <th className="text-left p-3">Group</th>
                    <th className="text-right p-3">Collected</th>
                    <th className="text-right p-3">Payments</th>
                  </tr>
                </thead>
                <tbody>
                  {particularQuery.data.map((row: { particular_id: number; account_code: string; particular_name: string; account_group: string; total_collected: number; payment_count: number }) => (
                    <tr key={row.particular_id} className="border-t">
                      <td className="p-3 font-mono text-xs">{row.account_code}</td>
                      <td className="p-3 font-medium">{row.particular_name}</td>
                      <td className="p-3"><Badge variant="secondary">{row.account_group}</Badge></td>
                      <td className="p-3 text-right tabular-nums font-medium">{formatPeso(row.total_collected)}</td>
                      <td className="p-3 text-right tabular-nums">{row.payment_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* EOSY Summary */}
      {fetched && reportType === 'eosy' && eosyQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>End-of-School-Year Summary — {eosyQuery.data.school_year}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Enrolled', value: eosyQuery.data.enrolled_count },
                { label: 'With Balance', value: eosyQuery.data.with_balance },
                { label: 'Collection Rate', value: `${eosyQuery.data.collection_rate}%` },
                { label: 'Total Payable', value: formatPeso(eosyQuery.data.total_payable) },
                { label: 'Total Paid', value: formatPeso(eosyQuery.data.total_paid) },
                { label: 'Total Discount', value: formatPeso(eosyQuery.data.total_discount) },
                { label: 'Total Balance', value: formatPeso(eosyQuery.data.total_balance) },
                { label: 'Total Collected', value: formatPeso(eosyQuery.data.total_collected) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exam Permits */}
      {fetched && reportType === 'exam-permits' && examQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>Exam Permit List ({examQuery.data.length} students)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Student ID</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Grade / Dept</th>
                    <th className="text-right p-3">Payable</th>
                    <th className="text-right p-3">Paid</th>
                    <th className="text-right p-3">Balance</th>
                    <th className="text-right p-3">%</th>
                  </tr>
                </thead>
                <tbody>
                  {examQuery.data.map((s: { reg_id: number; student_id: string; lname: string; fname: string; dept: string; gradeLevel: string; total_payable: number; total_paid: number; total_balance: number; payment_percentage: number }) => (
                    <tr key={s.reg_id} className="border-t">
                      <td className="p-3 font-mono text-xs">{s.student_id}</td>
                      <td className="p-3 font-medium">{s.lname}, {s.fname}</td>
                      <td className="p-3">{s.gradeLevel} · {s.dept}</td>
                      <td className="p-3 text-right tabular-nums">{formatPeso(s.total_payable)}</td>
                      <td className="p-3 text-right tabular-nums">{formatPeso(s.total_paid)}</td>
                      <td className="p-3 text-right tabular-nums font-medium">{formatPeso(s.total_balance)}</td>
                      <td className="p-3 text-right tabular-nums">
                        <Badge variant={s.payment_percentage >= 80 ? 'default' : 'secondary'}>
                          {s.payment_percentage}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exam Assessment */}
      {fetched && reportType === 'exam-assessment' && examAssessQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>Exam Assessment — Clearance Status ({examAssessQuery.data.length} students)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Student ID</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Section</th>
                    <th className="text-right p-3">Payable</th>
                    <th className="text-right p-3">Paid</th>
                    <th className="text-right p-3">Balance</th>
                    <th className="text-center p-3">Cleared</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {examAssessQuery.data.map((s: any) => (
                    <tr key={s.reg_id} className="border-t">
                      <td className="p-3 font-mono text-xs">{s.student_id}</td>
                      <td className="p-3 font-medium">{s.lname}, {s.fname}</td>
                      <td className="p-3">{s.gradeLevel} / {s.section}</td>
                      <td className="p-3 text-right tabular-nums">{formatPeso(s.total_payable)}</td>
                      <td className="p-3 text-right tabular-nums">{formatPeso(s.total_paid)}</td>
                      <td className="p-3 text-right tabular-nums font-medium">{formatPeso(s.total_balance)}</td>
                      <td className="p-3 text-center"><Badge variant={s.cleared ? 'default' : 'destructive'}>{s.cleared ? 'Yes' : 'No'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction List */}
      {fetched && reportType === 'transaction-list' && txListQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction List ({txListQuery.data.length} transactions)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Receipt #</th>
                    <th className="text-left p-3">Student</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Mode</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {txListQuery.data.map((t: any) => (
                    <tr key={t.pay_data_id} className="border-t">
                      <td className="p-3 font-mono text-xs">{t.receipt_num}</td>
                      <td className="p-3 font-medium">{t.student ? `${t.student.lname}, ${t.student.fname}` : t.cv_payee || '-'}</td>
                      <td className="p-3">{t.entry_date}</td>
                      <td className="p-3">{t.trans_payment_type}</td>
                      <td className="p-3 text-right tabular-nums font-medium">{formatPeso(t.amt_tend)}</td>
                      <td className="p-3"><Badge variant={t.status === 'Voided' ? 'destructive' : 'secondary'}>{t.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NS Collection Summary */}
      {fetched && reportType === 'ns-collection' && nsCollQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>Non-Student Fee Collection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/50 p-4 mb-4">
              <p className="text-sm text-muted-foreground">Grand Total</p>
              <p className="text-2xl font-bold tabular-nums">{formatPeso(nsCollQuery.data.grand_total)}</p>
            </div>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">Collected</th>
                    <th className="text-right p-3">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {nsCollQuery.data.daily.map((row: any) => (
                    <tr key={row.trans_date} className="border-t">
                      <td className="p-3">{row.trans_date}</td>
                      <td className="p-3 text-right tabular-nums font-medium">{formatPeso(row.total_collected)}</td>
                      <td className="p-3 text-right tabular-nums">{row.transaction_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Assessment */}
      {fetched && reportType === 'monthly-assessment' && monthlyAssessQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Assessment ({monthlyAssessQuery.data.length} students)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Student ID</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Section</th>
                    <th className="text-right p-3">Payable</th>
                    <th className="text-right p-3">Paid</th>
                    <th className="text-right p-3">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {monthlyAssessQuery.data.map((s: any) => {
                    const payable = s.assessments?.reduce((sum: number, a: any) => sum + Number(a.total_amt_payable), 0) ?? 0;
                    const paid = s.assessments?.reduce((sum: number, a: any) => sum + Number(a.total_amt_paid), 0) ?? 0;
                    const bal = s.assessments?.reduce((sum: number, a: any) => sum + Number(a.total_amt_bal), 0) ?? 0;
                    return (
                      <tr key={s.reg_id} className="border-t">
                        <td className="p-3 font-mono text-xs">{s.student_id}</td>
                        <td className="p-3 font-medium">{s.lname}, {s.fname}</td>
                        <td className="p-3">{s.gradeLevel} / {s.section}</td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(payable)}</td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(paid)}</td>
                        <td className="p-3 text-right tabular-nums font-medium">{formatPeso(bal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Students by Assessment */}
      {fetched && reportType === 'students-by-assessment' && studByAssessQuery.data && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Students by Assessment ({studByAssessQuery.data.students?.length ?? 0})</CardTitle>
            <Button size="sm" variant="outline" onClick={() =>
              exportCsv('students-by-assessment.csv',
                (studByAssessQuery.data.students ?? []).map((s: any) => ({
                  student_id: s.student_id, name: `${s.lname}, ${s.fname}`,
                  dept: s.dept, gradeLevel: s.gradeLevel, strand: s.strand, section: s.section,
                }))
              )
            }>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Student ID</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Dept</th>
                    <th className="text-left p-3">Grade / Strand</th>
                    <th className="text-left p-3">Section</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(studByAssessQuery.data.students ?? []).map((s: any) => (
                    <tr key={s.reg_id} className="border-t">
                      <td className="p-3 font-mono text-xs">{s.student_id}</td>
                      <td className="p-3 font-medium">{s.lname}, {s.fname}</td>
                      <td className="p-3">{s.dept}</td>
                      <td className="p-3">{s.gradeLevel} {s.strand && s.strand !== 'N/A' ? `/ ${s.strand}` : ''}</td>
                      <td className="p-3">{s.section}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Balance Aging Report ─────────────────────────────────── */}
      {fetched && reportType === 'balance-aging' && balanceAgingQuery.data && (
        <div className="space-y-4">
          {/* Bucket summary cards */}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {(balanceAgingQuery.data.buckets as { label: string; count: number; total: number }[]).map((b) => (
              <Card key={b.label} className="border-none shadow-sm">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">{b.label}</p>
                  <p className="text-xl font-bold tabular-nums mt-1">{formatPeso(b.total)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{b.count} students</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary totals */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>Total outstanding: <strong className="text-destructive tabular-nums">{formatPeso(balanceAgingQuery.data.grand_total)}</strong></span>
            <span>{balanceAgingQuery.data.total_count} students with balance</span>
          </div>

          {/* Detail table */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Outstanding Balance Detail</CardTitle>
              <Button size="sm" variant="outline" onClick={() =>
                exportCsv('balance-aging.csv',
                  (balanceAgingQuery.data.rows as any[]).map((r) => ({
                    student_id: r.student_id,
                    name: `${r.lname}, ${r.fname}`,
                    dept: r.dept, gradeLevel: r.gradeLevel, section: r.section,
                    status: r.status, days_aged: r.days_aged, bucket: r.bucket,
                    total_payable: r.total_payable, total_paid: r.total_paid,
                    total_discount: r.total_discount, total_balance: r.total_balance,
                  }))
                )
              }>
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3">Student ID</th>
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Grade / Dept</th>
                      <th className="text-center p-3">Aging</th>
                      <th className="text-right p-3">Payable</th>
                      <th className="text-right p-3">Paid</th>
                      <th className="text-right p-3">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(balanceAgingQuery.data.rows as any[]).map((r) => (
                      <tr key={r.reg_id} className="border-t">
                        <td className="p-3 font-mono text-xs">{r.student_id}</td>
                        <td className="p-3 font-medium">{r.lname}, {r.fname}</td>
                        <td className="p-3">{r.gradeLevel} · {r.dept}</td>
                        <td className="p-3 text-center">
                          <Badge variant="secondary"
                            className={cn(
                              r.days_aged > 90 && 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
                              r.days_aged > 60 && r.days_aged <= 90 && 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
                              r.days_aged > 30 && r.days_aged <= 60 && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
                            )}
                          >
                            {r.days_aged}d
                          </Badge>
                        </td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(r.total_payable)}</td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(r.total_paid)}</td>
                        <td className="p-3 text-right tabular-nums font-medium text-destructive">{formatPeso(r.total_balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Collection Trend (Assessed vs Collected) ─────────────── */}
      {fetched && reportType === 'collection-trend' && collectionTrendQuery.data && (() => {
        const td = collectionTrendQuery.data;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const trendFormatter = ((v: any) => [formatPeso(Number(v ?? 0)), '']) as any;
        return (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Total Assessed', value: formatPeso(td.total_assessed) },
                { label: 'Total Collected', value: formatPeso(td.total_collected) },
                { label: 'Collection Rate', value: `${td.collection_rate}%` },
              ].map(({ label, value }) => (
                <Card key={label} className="border-none shadow-sm">
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-xl font-bold tabular-nums mt-1">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Monthly collection bar chart */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Monthly Collection — {schoolYear}</CardTitle>
                <Button size="sm" variant="outline" onClick={() =>
                  exportCsv('collection-trend.csv',
                    (td.monthly as any[]).map((r) => ({
                      month: r.month, collected: r.collected, cumulative: r.cumulative,
                    }))
                  )
                }>
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={td.monthly} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`}
                    />
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={trendFormatter} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="collected"  name="Monthly Collected"  fill="#2563eb" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="cumulative" name="Cumulative Collected" fill="#16a34a" radius={[3, 3, 0, 0]} />
                    <ReferenceLine
                      y={td.net_target}
                      stroke="#dc2626"
                      strokeDasharray="6 3"
                      label={{ value: `Target ₱${(td.net_target / 1000).toFixed(0)}k`, fill: '#dc2626', fontSize: 11, position: 'insideTopRight' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly detail table */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Monthly Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3">Month</th>
                      <th className="text-right p-3">Collected</th>
                      <th className="text-right p-3">Cumulative</th>
                      <th className="text-right p-3">% of Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(td.monthly as any[]).map((r) => (
                      <tr key={r.month} className="border-t">
                        <td className="p-3 font-medium">{r.month}</td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(r.collected)}</td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(r.cumulative)}</td>
                        <td className="p-3 text-right tabular-nums">
                          {td.net_target > 0
                            ? <Badge variant="secondary">{((r.cumulative / td.net_target) * 100).toFixed(1)}%</Badge>
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        );
      })()}
    </div>
  );
}
