import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wallet, Receipt, GraduationCap } from 'lucide-react';

interface DashboardData {
  student: {
    student_id: string;
    name: string;
    grade_level: string;
    strand: string;
    section: string;
    school_year: string;
    status: string;
  };
  balance: number;
  recent_payments: {
    payment_id: number;
    receipt_num: string;
    trans_date: string;
    amt_paid: string;
    payment_type: string;
  }[];
}

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function StudentDashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['student-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/student/dashboard');
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const s = data?.student;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {s?.name?.split(',')[1]?.trim() ?? s?.name}!</h1>
        <p className="text-muted-foreground">
          {s?.grade_level} {s?.strand && s.strand !== '-' ? `— ${s.strand}` : ''} · Section {s?.section} · {s?.school_year}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${(data?.balance ?? 0) > 0 ? 'text-destructive' : 'text-green-600'}`}>
              ₱{fmt(data?.balance ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(data?.balance ?? 0) <= 0 ? 'No outstanding balance' : 'Total amount due'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Student ID</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{s?.student_id ?? '—'}</div>
            <div className="mt-1">
              <Badge variant={s?.status === 'Enrolled' ? 'default' : 'secondary'} className="text-xs">
                {s?.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4" /> Recent Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.recent_payments?.length ? (
            <p className="text-sm text-muted-foreground italic">No payments recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">Receipt #</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_payments.map((p) => (
                  <tr key={p.payment_id} className="border-b hover:bg-muted/30">
                    <td className="py-2 font-mono text-xs">{p.receipt_num}</td>
                    <td className="py-2">{p.trans_date}</td>
                    <td className="py-2 text-xs">{p.payment_type}</td>
                    <td className="py-2 text-right font-mono">₱{fmt(Number(p.amt_paid))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
