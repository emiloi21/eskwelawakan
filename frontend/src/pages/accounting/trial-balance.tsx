import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrialBalanceRow {
  coa_id: number;
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

interface TrialBalanceData {
  accounts: TrialBalanceRow[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  as_of_date: string;
}

export default function TrialBalancePage() {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [queryDate, setQueryDate] = useState(asOf);

  const { data, isLoading } = useQuery<TrialBalanceData>({
    queryKey: ['trial-balance', queryDate],
    queryFn: async () => {
      const { data } = await api.get('/accounting/chart-of-accounts/trial-balance', {
        params: { as_of_date: queryDate },
      });
      return data.data;
    },
  });

  const rows = data?.accounts ?? [];
  const totals = { total_debit: data?.total_debit ?? 0, total_credit: data?.total_credit ?? 0 };
  const isBalanced = data?.is_balanced ?? true;

  // Group by account type
  const grouped = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(type => ({
    type,
    rows: rows.filter(r => r.account_type === type),
  })).filter(g => g.rows.length > 0);

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trial Balance</h1>
          <p className="text-muted-foreground">Summary of all account balances from posted entries</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
      </div>

      {/* Date filter */}
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label>As of Date</Label>
          <Input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="w-48" />
        </div>
        <Button onClick={() => setQueryDate(asOf)}>Generate</Button>
        {data && (
          <div className="ml-auto flex items-center gap-2">
            {isBalanced ? (
              <Badge variant="default">Balanced</Badge>
            ) : (
              <Badge variant="destructive">
                Out of balance by {fmt(Math.abs(totals.total_debit - totals.total_credit))}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Trial Balance Table */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="print:pb-2">
          <CardTitle className="text-center">
            <div className="text-lg">Trial Balance</div>
            <div className="text-sm font-normal text-muted-foreground">As of {queryDate}</div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No posted entries found for the selected period.</p>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 w-[15%]">Code</th>
                    <th className="text-left p-3 w-[40%]">Account Name</th>
                    <th className="text-right p-3 w-[20%]">Debit</th>
                    <th className="text-right p-3 w-[20%]">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(({ type, rows: typeRows }) => (
                    <React.Fragment key={type}>
                      <tr className="bg-muted/20 border-t">
                        <td colSpan={4} className="p-2 font-bold text-xs uppercase tracking-wide text-muted-foreground">
                          {type}
                        </td>
                      </tr>
                      {typeRows.map(row => (
                        <tr key={row.coa_id} className="border-t hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{row.account_code}</td>
                          <td className="p-3">{row.account_name}</td>
                          <td className="p-3 text-right font-mono">
                            {row.total_debit > 0 ? fmt(row.total_debit) : ''}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {row.total_credit > 0 ? fmt(row.total_credit) : ''}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  <tr className="border-t-2 border-double font-bold">
                    <td colSpan={2} className="p-3 text-right">Totals</td>
                    <td className="p-3 text-right font-mono">{fmt(totals.total_debit)}</td>
                    <td className="p-3 text-right font-mono">{fmt(totals.total_credit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
