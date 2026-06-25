import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useLookups } from '@/hooks/use-lookups';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BookOpen, Users, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClassItem {
  class_id: number;
  public_id: string;
  gradeLevel: string;
  strand: string;
  section: string;
  dept: string;
  schoolYear: string;
  semester: string;
  students_count: number;
}

interface DashboardData {
  classes_count: number;
  students_count: number;
  classes: ClassItem[];
}

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const { data: lookups } = useLookups();
  const sy = user?.selected_sy || lookups?.active_school_year || '';
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['teacher-dashboard', sy],
    queryFn: async () => {
      const { data } = await api.get('/teacher/dashboard', { params: { schoolYear: sy } });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {user?.fname}!</h1>
        <p className="text-muted-foreground">Teacher Portal — {sy}</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">My Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.classes_count ?? 0}</div>
            <p className="text-xs text-muted-foreground">for {sy}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">My Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.students_count ?? 0}</div>
            <p className="text-xs text-muted-foreground">across all advisory classes</p>
          </CardContent>
        </Card>
      </div>

      {/* Classes list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> My Advisory Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.classes?.length ? (
            <p className="text-sm text-muted-foreground italic">No classes assigned for {sy}.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.classes.map((cls) => (
                <button
                  key={cls.class_id}
                  onClick={() => navigate(`/teacher/my-classes/${cls.public_id}`)}
                  className="rounded-lg border p-4 text-left hover:bg-accent transition-colors"
                >
                  <div className="font-semibold">
                    {cls.gradeLevel} {cls.strand !== '-' ? `— ${cls.strand}` : ''}
                  </div>
                  <div className="text-sm text-muted-foreground">Section {cls.section}</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {cls.students_count} students · {cls.semester}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
