import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import type { GuidanceDashboardData } from '@/types/guidance';

const URGENCY_COLOR: Record<string, string> = {
  crisis:  'bg-red-100 text-red-800 border-l-4 border-l-red-500',
  urgent:  'bg-yellow-50 text-yellow-800 border-l-4 border-l-yellow-400',
  routine: 'bg-gray-50 border-l-4 border-l-gray-300',
};

const STATUS_BADGE: Record<string, string> = {
  open:               'bg-blue-100 text-blue-800',
  ongoing:            'bg-indigo-100 text-indigo-800',
  resolved:           'bg-green-100 text-green-800',
  referred_external:  'bg-purple-100 text-purple-800',
  referred_cpc:       'bg-red-100 text-red-800',
  closed_transferred: 'bg-gray-200 text-gray-700',
  closed_withdrawn:   'bg-gray-200 text-gray-700',
};

export default function GuidanceDashboardPage() {
  const { data, isLoading } = useQuery<GuidanceDashboardData>({
    queryKey: ['guidance-dashboard'],
    queryFn: () => api.get('/admin/guidance/dashboard').then(r => r.data),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading guidance dashboard…</div>;
  }

  const stats = data?.stats;

  const kpis = [
    { label: 'Total Cases',        value: stats?.total_cases ?? 0,       icon: ClipboardList,  color: 'text-blue-600' },
    { label: 'Open / Ongoing',     value: stats?.open_cases ?? 0,        icon: BookOpen,       color: 'text-indigo-600' },
    { label: 'Resolved',           value: stats?.resolved_cases ?? 0,    icon: CheckCircle2,   color: 'text-green-600' },
    { label: 'Active Crisis Cases', value: stats?.crisis_active ?? 0,    icon: ShieldAlert,    color: 'text-red-600' },
    { label: 'Pending Referrals',  value: stats?.pending_referrals ?? 0, icon: Users,          color: 'text-yellow-600' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <HeartHandshake className="h-7 w-7 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold">Guidance Office</h1>
          <p className="text-sm text-muted-foreground">
            RA 9258 · DepEd Order 36 s. 2016 — all records are strictly confidential
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                </div>
                <kpi.icon className={`h-5 w-5 mt-1 ${kpi.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open cases */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-500" />
              Recent Open Cases
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data?.recent_cases?.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">No open cases.</p>
            ) : (
              <ul className="divide-y">
                {data?.recent_cases?.map(c => (
                  <li key={c.public_id} className={`px-4 py-3 ${URGENCY_COLOR[c.urgency] ?? ''}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <Link
                          to={`/admin/guidance/cases/${c.public_id}`}
                          className="font-medium text-sm hover:underline"
                        >
                          {c.case_number}
                        </Link>
                        <span className="text-xs text-muted-foreground ml-2">
                          {c.student
                            ? `${c.student.last_name}, ${c.student.first_name}`
                            : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status] ?? ''}`}
                        >
                          {c.status.replace('_', ' ')}
                        </span>
                        {c.urgency === 'crisis' && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.case_type.replace('_', ' ')} &nbsp;·&nbsp;{' '}
                      {new Date(c.opened_at).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="p-3 border-t">
              <Link
                to="/admin/guidance/cases"
                className="text-xs text-emerald-700 hover:underline font-medium"
              >
                View all cases →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Pending referrals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-yellow-500" />
              Pending Referrals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data?.pending_referrals?.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">No pending referrals.</p>
            ) : (
              <ul className="divide-y">
                {data?.pending_referrals?.map(r => (
                  <li key={r.public_id} className={`px-4 py-3 ${URGENCY_COLOR[r.urgency] ?? ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {r.student
                          ? `${r.student.last_name}, ${r.student.first_name}`
                          : '—'}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${r.urgency === 'crisis' ? 'border-red-400 text-red-700' : r.urgency === 'urgent' ? 'border-yellow-400 text-yellow-700' : ''}`}
                      >
                        {r.urgency}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.referral_type} referral &nbsp;·&nbsp; {r.concern_description}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="p-3 border-t">
              <Link
                to="/admin/guidance/referrals"
                className="text-xs text-emerald-700 hover:underline font-medium"
              >
                Manage referral queue →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cases by type */}
      {stats?.by_type && Object.keys(stats.by_type).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
              Cases by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.by_type).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2 bg-muted/40 rounded-md px-3 py-2">
                  <span className="text-xs font-medium capitalize">{type.replace('_', ' ')}</span>
                  <span className="text-base font-bold text-emerald-700">{String(count)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
