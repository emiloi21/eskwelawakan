import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, GraduationCap, User, Calendar } from 'lucide-react';

interface ClassInfo {
  class_id: number;
  grade_level: string;
  strand: string;
  section: string;
  dept: string;
  adviser: string;
  school_year: string;
  semester: string;
}

export default function StudentSchedulePage() {
  const { data, isLoading } = useQuery<{ class: ClassInfo | null }>({
    queryKey: ['student-schedule'],
    queryFn: async () => {
      const { data } = await api.get('/student/schedule');
      return data;
    },
  });

  const cls = data?.class;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Schedule</h1>
        <p className="text-muted-foreground">Current class assignment and section info</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : !cls ? (
        <p className="text-sm text-muted-foreground italic py-8">
          No class assigned. Please contact the Registrar's Office.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Class / Section</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">
                {cls.grade_level}
                {cls.strand && cls.strand !== '-' ? ` — ${cls.strand}` : ''}
              </p>
              <p className="text-sm text-muted-foreground">Section {cls.section}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Adviser</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{cls.adviser || '—'}</p>
              <p className="text-sm text-muted-foreground">{cls.dept}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">School Year</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{cls.school_year}</p>
              <p className="text-sm text-muted-foreground">{cls.semester}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
