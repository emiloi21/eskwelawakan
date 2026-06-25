import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Printer } from 'lucide-react';

interface StatementRow {
  coa_id: number;
  account_code: string;
  account_name: string;
  balance: number;
}

interface FinancialData {
  income_statement: {
    revenue: StatementRow[];
    expenses: StatementRow[];
    total_revenue: number;
    total_expense: number;
    net_income: number;
  };
  balance_sheet: {
    assets: StatementRow[];
    liabilities: StatementRow[];
    equity: StatementRow[];
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
  };
  period: { start: string; end: string };
}

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function FinancialStatementsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(today);
  const [queryPeriod, setQueryPeriod] = useState({ from, to });

  const { data, isLoading } = useQuery<FinancialData>({
    queryKey: ['financial-statements', queryPeriod.from, queryPeriod.to],
    queryFn: async () => {
      const { data } = await api.get('/accounting/chart-of-accounts/financial-statements', {
        params: { start_date: queryPeriod.from, end_date: queryPeriod.to },
      });
      return data.data;
    },
  });

  const is = data?.income_statement;
  const bs = data?.balance_sheet;

  function SectionTable({ title, rows, total, totalLabel }: {
    title: string;
    rows: StatementRow[];
    total: number;
    totalLabel: string;
  }) {
    return (
      <div className="mb-4">
        <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-2">{title}</h3>
        <table className="w-full text-sm">
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="py-1 text-muted-foreground italic">No accounts</td></tr>
            ) : rows.map(r => (
              <tr key={r.coa_id} className="hover:bg-muted/30">
                <td className="py-1 pl-4 font-mono text-xs w-20">{r.account_code}</td>
                <td className="py-1">{r.account_name}</td>
                <td className="py-1 text-right font-mono w-32">{fmt(r.balance)}</td>
              </tr>
            ))}
            <tr className="border-t font-bold">
              <td colSpan={2} className="py-2">{totalLabel}</td>
              <td className="py-2 text-right font-mono">{fmt(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Statements</h1>
          <p className="text-muted-foreground">Income Statement &amp; Balance Sheet</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
      </div>

      {/* Period filter */}
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-44" />
        </div>
        <Button onClick={() => setQueryPeriod({ from, to })}>Generate</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !data ? (
        <p className="text-center text-muted-foreground py-8">Select a period and click Generate.</p>
      ) : (
        <Tabs defaultValue="income" className="print:block">
          <TabsList className="print:hidden">
            <TabsTrigger value="income">Income Statement</TabsTrigger>
            <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          </TabsList>

          {/* Income Statement */}
          <TabsContent value="income">
            <Card className="print:shadow-none">
              <CardHeader className="text-center">
                <CardTitle>
                  <div className="text-lg">Income Statement</div>
                  <div className="text-sm font-normal text-muted-foreground">
                    {queryPeriod.from} to {queryPeriod.to}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-w-xl mx-auto">
                {is && (
                  <>
                    <SectionTable title="Revenue" rows={is.revenue} total={is.total_revenue} totalLabel="Total Revenue" />
                    <SectionTable title="Expenses" rows={is.expenses} total={is.total_expense} totalLabel="Total Expenses" />
                    <div className="border-t-2 border-double mt-2 pt-2">
                      <div className="flex justify-between font-bold text-base">
                        <span>{is.net_income >= 0 ? 'Net Income' : 'Net Loss'}</span>
                        <span className={is.net_income >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {fmt(Math.abs(is.net_income))}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Sheet */}
          <TabsContent value="balance">
            <Card className="print:shadow-none">
              <CardHeader className="text-center">
                <CardTitle>
                  <div className="text-lg">Balance Sheet</div>
                  <div className="text-sm font-normal text-muted-foreground">
                    As of {queryPeriod.to}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-w-xl mx-auto">
                {bs && (
                  <>
                    <SectionTable title="Assets" rows={bs.assets} total={bs.total_assets} totalLabel="Total Assets" />
                    <SectionTable title="Liabilities" rows={bs.liabilities} total={bs.total_liabilities} totalLabel="Total Liabilities" />
                    <SectionTable title="Equity" rows={bs.equity} total={bs.total_equity} totalLabel="Total Equity" />
                    <div className="border-t-2 border-double mt-2 pt-2">
                      <div className="flex justify-between font-bold text-base">
                        <span>Total Liabilities &amp; Equity</span>
                        <span>{fmt(bs.total_liabilities + bs.total_equity)}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
