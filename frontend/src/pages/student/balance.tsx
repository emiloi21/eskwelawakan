import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ParticularsItem {
  description: string;
  amt_payable: number;
  amt_discount: number;
  amt_paid: number;
  balance: number;
}

interface CategoryRow {
  category_id: number;
  description: string;
  total_payable: number;
  total_discount: number;
  total_paid: number;
  total_balance: number;
  particulars: ParticularsItem[];
}

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function StudentBalancePage() {
  const { data, isLoading } = useQuery<{ data: CategoryRow[] }>({
    queryKey: ['student-balance'],
    queryFn: async () => {
      const { data } = await api.get('/student/balance');
      return data;
    },
  });

  const rows = data?.data ?? [];
  const totalBalance = rows.reduce((sum, r) => sum + r.total_balance, 0);
  const totalPaid = rows.reduce((sum, r) => sum + r.total_paid, 0);
  const totalPayable = rows.reduce((sum, r) => sum + r.total_payable, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Balance</h1>
        <p className="text-muted-foreground">Account assessment breakdown</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Total Assessed', value: totalPayable, sub: 'gross amount' },
              { label: 'Total Paid', value: totalPaid, sub: 'amount paid to date' },
              { label: 'Outstanding Balance', value: totalBalance, sub: 'remaining balance', highlight: totalBalance > 0 },
            ].map(({ label, value, sub, highlight }) => (
              <Card key={label}>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-bold mt-1 font-mono ${highlight ? 'text-destructive' : ''}`}>
                    ₱{fmt(value)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Per-category breakdown */}
          <div className="space-y-4">
            {rows.map((cat) => (
              <Card key={cat.category_id}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{cat.description}</CardTitle>
                  <span className={`font-mono text-sm font-semibold ${cat.total_balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    Balance: ₱{fmt(cat.total_balance)}
                  </span>
                </CardHeader>
                <CardContent className="pt-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground text-xs">
                        <th className="pb-1.5">Particular</th>
                        <th className="pb-1.5 text-right">Payable</th>
                        <th className="pb-1.5 text-right">Discount</th>
                        <th className="pb-1.5 text-right">Paid</th>
                        <th className="pb-1.5 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.particulars.map((p, i) => (
                        <tr key={i} className="border-b hover:bg-muted/30">
                          <td className="py-1.5">{p.description}</td>
                          <td className="py-1.5 text-right font-mono">₱{fmt(p.amt_payable)}</td>
                          <td className="py-1.5 text-right font-mono text-green-600">
                            {p.amt_discount > 0 ? `-₱${fmt(p.amt_discount)}` : '—'}
                          </td>
                          <td className="py-1.5 text-right font-mono">₱{fmt(p.amt_paid)}</td>
                          <td className={`py-1.5 text-right font-mono font-medium ${p.balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                            ₱{fmt(p.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold text-sm">
                        <td className="pt-2">Total</td>
                        <td className="pt-2 text-right font-mono">₱{fmt(cat.total_payable)}</td>
                        <td className="pt-2 text-right font-mono text-green-600">
                          {cat.total_discount > 0 ? `-₱${fmt(cat.total_discount)}` : '—'}
                        </td>
                        <td className="pt-2 text-right font-mono">₱{fmt(cat.total_paid)}</td>
                        <td className={`pt-2 text-right font-mono ${cat.total_balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          ₱{fmt(cat.total_balance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
