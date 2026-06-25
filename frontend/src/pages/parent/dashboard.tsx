import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, GraduationCap, AlertCircle, ChevronRight, Wallet } from 'lucide-react';

interface ChildSummary {
  reg_id: number;
  public_id: string;
  name: string;
  student_id: string;
  grade_level: string;
  strand: string;
  section: string;
  school_year: string;
  status: string;
  balance: number;
  class: { grade_level: string; section: string; adviser: string } | null;
}

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Enrolled: 'default',
  'For Payment': 'secondary',
  'For Assessment': 'secondary',
  Withdrawn: 'destructive',
  Graduated: 'outline',
};

export default function ParentDashboard() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<{ children: ChildSummary[] }>({
    queryKey: ['parent-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/parent/dashboard');
      return data;
    },
  });

  const children = data?.children ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Parent Dashboard</h1>
        <p className="text-muted-foreground">Monitor your children's academic and financial status</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : children.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p>No students are linked to your account.</p>
          <p className="text-sm">Please contact the Registrar's Office to link your children.</p>
        </div>
      ) : (
        <>
        {/* Total balance summary */}
        {children.some(c => c.balance > 0) && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium">Total Outstanding Balance</p>
                  <p className="text-xs text-muted-foreground">
                    Across {children.filter(c => c.balance > 0).length} student{children.filter(c => c.balance > 0).length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <span className="text-xl font-bold text-destructive">
                ₱{children.reduce((sum, c) => sum + c.balance, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </CardContent>
          </Card>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map(child => (
            <Card
              key={child.public_id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate(`/parent/children/${child.public_id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm leading-tight">{child.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{child.student_id}</p>
                    </div>
                  </div>
                  <Badge variant={STATUS_COLORS[child.status] ?? 'secondary'} className="shrink-0 text-xs">
                    {child.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span>Grade / Section</span>
                  <span className="font-medium text-foreground text-right">
                    {child.grade_level} — {child.section}
                  </span>
                  <span>School Year</span>
                  <span className="font-medium text-foreground text-right">{child.school_year}</span>
                  <span>Outstanding</span>
                  <span className={`font-semibold text-right ${child.balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    ₱{child.balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <Button variant="outline" size="sm" className="w-full gap-1">
                  View Details <ChevronRight className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
