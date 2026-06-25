import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useLookups } from '@/hooks/use-lookups';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronRight } from 'lucide-react';
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

export default function MyClassesPage() {
  const { user } = useAuthStore();
  const { data: lookups } = useLookups();
  const sy = user?.selected_sy || lookups?.active_school_year || '';
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<{ data: ClassItem[] }>({
    queryKey: ['teacher-classes', sy],
    queryFn: async () => {
      const { data } = await api.get('/teacher/my-classes', { params: { schoolYear: sy } });
      return data;
    },
  });

  const classes = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Classes</h1>
        <p className="text-muted-foreground">Advisory classes for {sy}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : classes.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-8">
          No classes assigned for {sy}. Contact the Registrar if this is incorrect.
        </p>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <Card
              key={cls.class_id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate(`/teacher/my-classes/${cls.public_id}`)}
            >
              <CardContent className="flex items-center justify-between py-4 px-5">
                <div className="space-y-1">
                  <div className="font-semibold text-base">
                    {cls.gradeLevel}
                    {cls.strand && cls.strand !== '-' && (
                      <span className="text-muted-foreground ml-1">— {cls.strand}</span>
                    )}
                    <span className="ml-2">Section {cls.section}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{cls.dept}</span>
                    <span>·</span>
                    <span>{cls.semester}</span>
                    <span>·</span>
                    <span>{cls.schoolYear}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{cls.students_count} students</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
