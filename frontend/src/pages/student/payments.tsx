import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface PaymentRow {
  payment_id: number;
  receipt_num: string;
  trans_date: string;
  amt_paid: string;
  amt_payable: string;
  payment_type: string;
  status: string;
}

interface PaginatedPayments {
  data: PaymentRow[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function StudentPaymentsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedPayments>({
    queryKey: ['student-payments', page],
    queryFn: async () => {
      const { data } = await api.get('/student/payments', { params: { page, per_page: 20 } });
      return data;
    },
  });

  const payments = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment History</h1>
        <p className="text-muted-foreground">All transactions for the current school year</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : payments.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-8">No payment records found.</p>
      ) : (
        <>
          <Card>
            <CardContent className="pt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2">Receipt #</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Payment Type</th>
                    <th className="pb-2 text-right">Amount Paid</th>
                    <th className="pb-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.payment_id} className="border-b hover:bg-muted/30">
                      <td className="py-2 font-mono text-xs">{p.receipt_num}</td>
                      <td className="py-2">{p.trans_date}</td>
                      <td className="py-2 text-xs">{p.payment_type}</td>
                      <td className="py-2 text-right font-mono">₱{fmt(Number(p.amt_paid))}</td>
                      <td className="py-2 text-center">
                        <Badge
                          variant={p.status === 'Voided' ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {p.status === '' ? 'Posted' : p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {(data?.last_page ?? 1) > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {data?.current_page} of {data?.last_page} · {data?.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= (data?.last_page ?? 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
