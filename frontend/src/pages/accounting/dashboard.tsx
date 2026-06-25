import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { AccountingDashboardData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, DollarSign, TrendingUp, Users, AlertTriangle } from 'lucide-react';

function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

export default function AccountingDashboardPage() {
  const { data, isLoading } = useQuery<AccountingDashboardData>({
    queryKey: ['accounting-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/accounting/dashboard');
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accounting Dashboard</h1>
        <p className="text-muted-foreground">Financial overview and collection summary</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Collections</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPeso(stats?.stats?.today_collected ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{stats?.stats?.today_transactions ?? 0} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPeso(stats?.stats?.total_collected ?? 0)}</div>
            <p className="text-xs text-muted-foreground">This school year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPeso(stats?.stats?.total_balance ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Outstanding balances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessed Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stats?.total_assessments ?? 0}</div>
            <p className="text-xs text-muted-foreground">With active assessments</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Collection by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.collection_by_dept && Object.keys(stats.collection_by_dept).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(stats.collection_by_dept).map(([dept, total]) => {
                  const maxAmount = Math.max(...Object.values(stats.collection_by_dept));
                  const pct = maxAmount > 0 ? (total / maxAmount) * 100 : 0;
                  return (
                    <div key={dept} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{dept}</span>
                        <span className="tabular-nums">{formatPeso(total)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No collections data available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recent_transactions && stats.recent_transactions.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_transactions.map((tx) => (
                  <div key={tx.pay_data_id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{tx.receipt_num}</p>
                      <p className="text-xs text-muted-foreground">{tx.student ? `${tx.student.lname}, ${tx.student.fname}` : '-'} &middot; {tx.entry_date ? new Date(tx.entry_date).toLocaleDateString() : '-'}</p>
                    </div>
                    <span className="tabular-nums font-medium">{formatPeso(tx.amt_tend)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent transactions.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
