import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, DoorOpen, Mail } from 'lucide-react';
import { format } from 'date-fns';

export default function FrontOfficeDashboardPage() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: visitorsData, isLoading: vLoading } = useQuery({
    queryKey: ['front-office-visitors-today'],
    queryFn: () => api.get('/front-office/visitors', { params: { date: today } }).then(r => r.data),
  });

  const { data: passesData, isLoading: pLoading } = useQuery({
    queryKey: ['front-office-passes-active'],
    queryFn: () => api.get('/front-office/gate-passes', { params: { status: 'Active' } }).then(r => r.data),
  });

  const { data: corrData, isLoading: cLoading } = useQuery({
    queryKey: ['front-office-correspondence-pending'],
    queryFn: () => api.get('/front-office/correspondence', { params: { status: 'Pending' } }).then(r => r.data),
  });

  const visitors: any[] = visitorsData?.data ?? [];
  const activePasses: any[] = passesData?.data ?? [];
  const pendingCorr: any[] = corrData?.data ?? [];

  const inNow = visitors.filter(v => v.status === 'In');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Front Office Dashboard</h1>
        <p className="text-muted-foreground">Overview for {format(new Date(), 'MMMM d, yyyy')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Visitors On-Site</CardTitle>
            <Users className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            {vLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <div className="text-3xl font-bold">{inNow.length}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{visitors.length} total today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Gate Passes</CardTitle>
            <DoorOpen className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {pLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <div className="text-3xl font-bold">{activePasses.length}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Students currently out</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Correspondence</CardTitle>
            <Mail className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {cLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <div className="text-3xl font-bold">{pendingCorr.length}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent check-ins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            {vLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : inNow.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No visitors currently on campus</p>
            ) : (
              <div className="divide-y">
                {inNow.slice(0, 8).map((v: any) => (
                  <div key={v.public_id} className="py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{v.visitor_name}</p>
                        <p className="text-xs text-muted-foreground">{v.purpose}{v.host_name ? ` · Host: ${v.host_name}` : ''}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(v.check_in_at), 'h:mm a')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Gate Passes</CardTitle>
          </CardHeader>
          <CardContent>
            {pLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : activePasses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No active gate passes</p>
            ) : (
              <div className="divide-y">
                {activePasses.slice(0, 8).map((p: any) => (
                  <div key={p.public_id} className="py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{p.student?.full_name ?? 'Unknown Student'}</p>
                        <p className="text-xs text-muted-foreground">{p.purpose} · {p.destination}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(p.issued_at), 'h:mm a')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
