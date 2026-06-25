import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Package, Boxes, CalendarCheck, AlertTriangle, Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

type DashboardData = {
  totalProperty: number;
  condemned: number;
  lowStock: number;
  pendingBookings: number;
  conditionBreakdown: Record<string, number>;
  lowStockItems: Array<{
    public_id: string; name: string; unit: string;
    quantity_on_hand: number; reorder_point: number;
    category: { name: string } | null;
  }>;
  todayBookings: Array<{
    public_id: string; title: string; start_time: string; end_time: string;
    attendee_count: number | null;
    facility: { name: string } | null;
  }>;
};

const conditionColor: Record<string, string> = {
  Good: 'text-green-700', Fair: 'text-yellow-600', Poor: 'text-orange-600', Condemned: 'text-red-700',
};

export default function CustodianDashboard() {
  const { data, isLoading } = useQuery<{ data: DashboardData }>({
    queryKey: ['custodian-dashboard'],
    queryFn: () => api.get('/custodian/dashboard').then(r => r.data),
  });

  const d = data?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Custodian Dashboard</h1>
        <p className="text-muted-foreground">Overview of school property, supplies, and facility bookings</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Property</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{isLoading ? '…' : (d?.totalProperty ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Fixed assets on record</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Condemned Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-destructive">{isLoading ? '…' : (d?.condemned ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Needs disposal action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
            <Boxes className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-yellow-700">{isLoading ? '…' : (d?.lowStock ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Consumables at/below reorder point</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Bookings</CardTitle>
            <CalendarCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-blue-700">{isLoading ? '…' : (d?.pendingBookings ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Facility requests awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Property condition breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Property Condition</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading
              ? <p className="text-sm text-muted-foreground">Loading…</p>
              : (
                <div className="space-y-2">
                  {['Good', 'Fair', 'Poor', 'Condemned'].map(c => (
                    <div key={c} className="flex items-center justify-between text-sm">
                      <span className={conditionColor[c] ?? ''}>{c}</span>
                      <span className="font-medium">{d?.conditionBreakdown?.[c] ?? 0}</span>
                    </div>
                  ))}
                </div>
              )
            }
            <Link to="/custodian/property" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4 w-full' })}>View All Property →</Link>
          </CardContent>
        </Card>

        {/* Low stock items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading
              ? <p className="text-sm text-muted-foreground">Loading…</p>
              : d?.lowStockItems.length === 0
                ? <p className="text-sm text-muted-foreground italic">All consumables sufficiently stocked.</p>
                : (
                  <div className="space-y-2">
                    {d?.lowStockItems.map(item => (
                      <div key={item.public_id} className="flex items-center justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.category?.name}</p>
                        </div>
                        <Badge variant="destructive" className="text-xs whitespace-nowrap">
                          {item.quantity_on_hand} {item.unit}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )
            }
            <Link to="/custodian/consumables" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4 w-full' })}>Manage Consumables →</Link>
          </CardContent>
        </Card>

        {/* Today's bookings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Today's Schedule — {format(new Date(), 'MMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading
              ? <p className="text-sm text-muted-foreground">Loading…</p>
              : d?.todayBookings.length === 0
                ? <p className="text-sm text-muted-foreground italic">No approved bookings today.</p>
                : (
                  <div className="space-y-2">
                    {d?.todayBookings.map(b => (
                      <div key={b.public_id} className="text-sm border-l-2 border-blue-400 pl-3">
                        <p className="font-medium">{b.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.facility?.name} · {b.start_time} – {b.end_time}
                          {b.attendee_count ? ` · ${b.attendee_count} pax` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )
            }
            <Link to="/custodian/bookings" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4 w-full' })}>All Bookings →</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
