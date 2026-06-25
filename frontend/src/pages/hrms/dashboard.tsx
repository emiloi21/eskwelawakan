import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, CalendarClock, CheckCircle2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';

type DashboardStats = {
  totalPersonnel: number;
  onLeaveToday: number;
  presentToday: number;
  pendingLeaves: number;
};

type AttendanceSummary = {
  date: string;
  studentIn: number;
  studentOut: number;
  staffIn: number;
  staffOut: number;
};

function StatCard({
  label, value, icon: Icon, color, to,
}: { label: string; value: number; icon: React.ElementType; color: string; to?: string }) {
  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-4 py-5">
        <div className={`rounded-full p-3 ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function HrmsDashboard() {
  const { data: statsData, isLoading: statsLoading } = useQuery<{ data: DashboardStats }>({
    queryKey: ['hrms-dashboard'],
    queryFn: () => api.get('/hrms/dashboard').then(r => r.data),
  });

  const { data: summaryData } = useQuery<{ data: AttendanceSummary }>({
    queryKey: ['attendance-summary-today'],
    queryFn: () => api.get('/hrms/attendance/summary').then(r => r.data),
  });

  if (statsLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const stats = statsData?.data;
  const summary = summaryData?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HR Dashboard</h1>
          <p className="text-muted-foreground">Overview of personnel and attendance</p>
        </div>
        <Link to="/kiosk" target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'outline' })}>
          Open Kiosk
        </Link>
      </div>

      {/* HR stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Personnel"
          value={stats?.totalPersonnel ?? 0}
          icon={Users}
          color="bg-blue-100 text-blue-600"
          to="/hrms/personnel"
        />
        <StatCard
          label="On Leave Today"
          value={stats?.onLeaveToday ?? 0}
          icon={CalendarClock}
          color="bg-yellow-100 text-yellow-600"
          to="/hrms/leaves"
        />
        <StatCard
          label="Staff Present Today"
          value={stats?.presentToday ?? 0}
          icon={CheckCircle2}
          color="bg-green-100 text-green-600"
          to="/hrms/attendance"
        />
        <StatCard
          label="Pending Leave Requests"
          value={stats?.pendingLeaves ?? 0}
          icon={Clock}
          color="bg-orange-100 text-orange-600"
          to="/hrms/leaves"
        />
      </div>

      {/* Today's attendance summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today's Kiosk Attendance</CardTitle>
            <CardDescription>{summary.date}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{summary.studentIn}</p>
              <p className="text-xs text-muted-foreground">Students In</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{summary.studentOut}</p>
              <p className="text-xs text-muted-foreground">Students Out</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{summary.staffIn}</p>
              <p className="text-xs text-muted-foreground">Staff Time-In</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{summary.staffOut}</p>
              <p className="text-xs text-muted-foreground">Staff Time-Out</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
