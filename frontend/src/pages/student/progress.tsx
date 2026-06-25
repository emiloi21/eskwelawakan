import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ClipboardList, BarChart2, MessageSquare, Trophy, TrendingUp, CheckCircle2 } from 'lucide-react';

interface ProgressData {
  assignments: {
    total: number; submitted: number; graded: number;
    pending: number; late: number; rate_pct: number;
  };
  quizzes: {
    total: number; taken: number;
    avg_score_pct: number | null; best_score_pct: number | null;
  };
  discussions: { posts: number; replies: number };
  recent_grades: Array<{
    title: string; score: number | null; points: number | null;
    pct: number | null; graded_at: string | null;
  }>;
}

function ScoreBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <Badge variant="outline">—</Badge>;
  if (pct >= 75) return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{pct}%</Badge>;
  if (pct >= 50) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{pct}%</Badge>;
  return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{pct}%</Badge>;
}

export default function StudentProgressPage() {
  const { data, isLoading, isError } = useQuery<{ data: ProgressData | null }>({
    queryKey: ['student-progress'],
    queryFn: async () => {
      const { data } = await api.get('/student/progress');
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading progress…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-destructive text-sm">Failed to load progress data.</div>
    );
  }

  const progress = data?.data;

  if (!progress) {
    return (
      <div className="p-6 flex flex-col items-center gap-2 py-16 text-muted-foreground">
        <BarChart2 className="h-8 w-8" />
        <p className="text-sm">You are not assigned to a class yet.</p>
      </div>
    );
  }

  const { assignments, quizzes, discussions, recent_grades } = progress;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6" />
        <h1 className="text-xl font-semibold">My Progress</h1>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold tracking-tight">{assignments.rate_pct}%</p>
          <p className="text-xs text-muted-foreground mt-1">Submission Rate</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold tracking-tight">
            {quizzes.avg_score_pct !== null ? `${quizzes.avg_score_pct}%` : '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Quiz Avg Score</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold tracking-tight">
            {quizzes.best_score_pct !== null ? `${quizzes.best_score_pct}%` : '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Quiz Best Score</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold tracking-tight">
            {discussions.posts + discussions.replies}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Discussion Activity</p>
        </Card>
      </div>

      {/* ── Assignments breakdown ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Assignments
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
          <div>
            <p className="text-xl font-semibold">{assignments.submitted}<span className="text-muted-foreground text-sm">/{assignments.total}</span></p>
            <p className="text-xs text-muted-foreground">Submitted</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-green-700">{assignments.graded}</p>
            <p className="text-xs text-muted-foreground">Graded</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-blue-600">{assignments.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-orange-600">{assignments.late}</p>
            <p className="text-xs text-muted-foreground">Late</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Quizzes breakdown ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Quizzes
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center text-sm">
          <div>
            <p className="text-xl font-semibold">{quizzes.taken}<span className="text-muted-foreground text-sm">/{quizzes.total}</span></p>
            <p className="text-xs text-muted-foreground">Taken</p>
          </div>
          <div>
            <p className="text-xl font-semibold">
              {quizzes.avg_score_pct !== null ? `${quizzes.avg_score_pct}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Average Score</p>
          </div>
          <div>
            <p className="text-xl font-semibold">
              {quizzes.best_score_pct !== null ? `${quizzes.best_score_pct}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Best Score</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Discussions breakdown ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Discussion Participation
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-center text-sm">
          <div>
            <p className="text-xl font-semibold">{discussions.posts}</p>
            <p className="text-xs text-muted-foreground">Posts Started</p>
          </div>
          <div>
            <p className="text-xl font-semibold">{discussions.replies}</p>
            <p className="text-xs text-muted-foreground">Replies Made</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Recent Grades ── */}
      {recent_grades.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Recent Grades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent_grades.map((g, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{g.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.graded_at ?? ''}
                    {g.points != null && (
                      <span className="ml-2">{g.score ?? '—'} / {g.points} pts</span>
                    )}
                  </p>
                </div>
                <ScoreBadge pct={g.pct} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
