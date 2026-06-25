import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, HeartPulse, Activity, AlertTriangle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, isToday } from 'date-fns';

type DashboardStats = {
  visitsToday: number;
  openIncidents: number;
  totalHealthRecords: number;
  recentVisits: Array<{
    public_id: string;
    visit_date: string;
    complaint: string;
    disposition: string;
    student: { reg_id: number; public_id: string; fname: string; lname: string; gradeLevel: string; section: string } | null;
  }>;
  recentIncidents: Array<{
    public_id: string;
    incident_type: string;
    incident_datetime: string;
    description: string;
    status: string;
    student: { reg_id: number; public_id: string; fname: string; lname: string; gradeLevel: string; section: string } | null;
  }>;
};

const dispositionColor: Record<string, string> = {
  Released: 'bg-green-100 text-green-700',
  'Sent Home': 'bg-yellow-100 text-yellow-700',
  'Referred to Hospital': 'bg-red-100 text-red-700',
  Admitted: 'bg-red-100 text-red-700',
};

const incidentStatusColor: Record<string, string> = {
  Open: 'bg-red-100 text-red-700',
  'Under Follow-up': 'bg-yellow-100 text-yellow-700',
  Closed: 'bg-gray-100 text-gray-600',
};

function StatCard({ label, value, icon: Icon, color, to }: {
  label: string; value: number | string; icon: React.ElementType; color: string; to?: string;
}) {
  const inner = (
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
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function ClinicDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: visitsData, isLoading: visitsLoading } = useQuery({
    queryKey: ['clinic-visits-today', today],
    queryFn: () => api.get('/clinic/visits', { params: { date: today } }).then(r => r.data),
  });

  const { data: incidentsData, isLoading: incidentsLoading } = useQuery({
    queryKey: ['clinic-incidents-open'],
    queryFn: () => api.get('/clinic/incidents', { params: { status: 'Open' } }).then(r => r.data),
  });

  const { data: recordsData } = useQuery({
    queryKey: ['clinic-health-records'],
    queryFn: () => api.get('/clinic/health-records').then(r => r.data),
  });

  const loading = visitsLoading || incidentsLoading;
  const visitsToday = visitsData?.data ?? [];
  const openIncidents = incidentsData?.data ?? [];
  const totalRecords = recordsData?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clinic Dashboard</h1>
          <p className="text-muted-foreground">Student health services overview</p>
        </div>
        <Button asChild>
          <Link to="/clinic/visits">Log New Visit</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Visits Today" value={loading ? '…' : visitsToday.length} icon={Activity} color="bg-blue-100 text-blue-600" to="/clinic/visits" />
        <StatCard label="Open Incidents" value={loading ? '…' : openIncidents.length} icon={AlertTriangle} color="bg-red-100 text-red-600" to="/clinic/incidents" />
        <StatCard label="Health Records" value={loading ? '…' : totalRecords} icon={HeartPulse} color="bg-rose-100 text-rose-600" to="/clinic/health-records" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's visits */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Today's Visits</CardTitle>
            <Link to="/clinic/visits" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {visitsLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
            {!visitsLoading && visitsToday.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No visits recorded today</p>
            )}
            <div className="space-y-3">
              {visitsToday.slice(0, 5).map((v: any) => (
                <div key={v.public_id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{v.student ? `${v.student.lname}, ${v.student.fname}` : 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{v.student?.gradeLevel} – {v.student?.section} · {v.complaint}</p>
                  </div>
                  <Badge className={`text-xs ${dispositionColor[v.disposition] ?? 'bg-gray-100 text-gray-600'}`} variant="outline">
                    {v.disposition}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Open incidents */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Open Incidents</CardTitle>
            <Link to="/clinic/incidents" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {incidentsLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
            {!incidentsLoading && openIncidents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No open incidents</p>
            )}
            <div className="space-y-3">
              {openIncidents.slice(0, 5).map((inc: any) => (
                <div key={inc.public_id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{inc.student ? `${inc.student.lname}, ${inc.student.fname}` : 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{inc.incident_type} · {format(new Date(inc.incident_datetime), 'MMM d, yyyy')}</p>
                  </div>
                  <Badge className={`text-xs ${incidentStatusColor[inc.status] ?? 'bg-gray-100 text-gray-600'}`} variant="outline">
                    {inc.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
