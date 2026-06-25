import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronRight, GraduationCap } from 'lucide-react';

interface AcademicRecord {
  school_year: string;
  grade_level: string;
  strand: string;
  section: string;
  total_subjects: number;
  general_average: number | null;
  status: 'Passed' | 'Failed' | 'In Progress';
}

function fmt(v: number | null) {
  if (v === null || v === undefined) return '—';
  return Number(v).toFixed(2);
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Passed: 'default',
  Failed: 'destructive',
  'In Progress': 'secondary',
};

export default function StudentAcademicHistoryPage() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: AcademicRecord[] }>({
    queryKey: ['student-academic-history'],
    queryFn: async () => {
      const { data } = await api.get('/student/academic-history');
      return data;
    },
  });

  const records = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Academic History</h1>
        <p className="text-muted-foreground">Enrollment and performance records by school year</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : records.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-8">
          No academic history available.
        </p>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => (
            <Card
              key={rec.school_year}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => {
                setSelectedYear(selectedYear === rec.school_year ? null : rec.school_year);
                navigate(`/student/report-card?schoolYear=${rec.school_year}`);
              }}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{rec.school_year}</p>
                      <p className="text-xs text-muted-foreground">
                        {rec.grade_level}
                        {rec.strand && rec.strand !== '-' ? ` — ${rec.strand}` : ''}
                        {rec.section && rec.section !== '—' ? ` · Section ${rec.section}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Subjects</p>
                      <p className="font-semibold text-sm">{rec.total_subjects}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">GWA</p>
                      <p className={`font-bold text-sm ${
                        rec.general_average !== null
                          ? rec.general_average >= 75
                            ? 'text-green-600'
                            : 'text-destructive'
                          : 'text-muted-foreground'
                      }`}>
                        {fmt(rec.general_average)}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[rec.status] ?? 'secondary'}>
                      {rec.status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {records.length > 0 && (
        <div className="mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/student/report-card')}
          >
            View Current Report Card
          </Button>
        </div>
      )}
    </div>
  );
}
