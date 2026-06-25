import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Users, BookOpen, Brain, MessageSquare } from 'lucide-react';

interface StudentAnalytics {
  reg_id: number;
  student_id: string;
  name: string;
  assignments: { submitted: number; total: number; rate_pct: number };
  quizzes: { taken: number; total: number; avg_score_pct: number | null };
  discussions: { posts: number; replies: number };
}

interface AnalyticsResponse {
  data: StudentAnalytics[];
  totals: { assignments: number; quizzes: number };
}

function rateColor(pct: number): string {
  if (pct >= 80) return 'bg-green-100 text-green-700';
  if (pct >= 50) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

function scoreColor(pct: number | null): string {
  if (pct === null) return 'bg-gray-100 text-gray-500';
  if (pct >= 75) return 'bg-green-100 text-green-700';
  if (pct >= 50) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}

export default function ClassAnalyticsPage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery<AnalyticsResponse>({
    queryKey: ['class-analytics', classId],
    queryFn: () => api.get(`/teacher/classes/${classId}/analytics`).then(r => r.data),
    enabled: !!classId,
  });

  const students = data?.data ?? [];
  const totals = data?.totals;

  const avgSubmitRate = students.length
    ? Math.round(students.reduce((s, st) => s + st.assignments.rate_pct, 0) / students.length)
    : 0;

  const avgQuizScore = (() => {
    const withScores = students.filter(st => st.quizzes.avg_score_pct !== null);
    if (!withScores.length) return null;
    return Math.round(withScores.reduce((s, st) => s + st.quizzes.avg_score_pct!, 0) / withScores.length);
  })();

  const totalDiscussionActivity = students.reduce(
    (s, st) => s + st.discussions.posts + st.discussions.replies, 0
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Could not load analytics. You may not be the adviser of this class.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Class Analytics</h1>
          <p className="text-muted-foreground">LMS engagement and performance overview</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Students</CardTitle>
            <Users className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground mt-1">enrolled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Avg Submission Rate</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgSubmitRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{totals?.assignments ?? 0} assignment{totals?.assignments !== 1 ? 's' : ''} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Avg Quiz Score</CardTitle>
            <Brain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgQuizScore !== null ? `${avgQuizScore}%` : '—'}</div>
            <p className="text-xs text-muted-foreground mt-1">{totals?.quizzes ?? 0} quiz{totals?.quizzes !== 1 ? 'ses' : ''} published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Discussion Activity</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalDiscussionActivity}</div>
            <p className="text-xs text-muted-foreground mt-1">posts + replies</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-student table */}
      {students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No students enrolled in this class.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per-Student Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Student</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">Assignments</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">Submit Rate</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">Quizzes</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">Avg Quiz Score</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">Posts</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">Replies</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((st) => (
                    <tr key={st.reg_id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{st.name}</p>
                        <p className="text-xs text-muted-foreground">{st.student_id}</p>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-muted-foreground">{st.assignments.submitted}/{st.assignments.total}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge className={`text-xs ${rateColor(st.assignments.rate_pct)}`} variant="outline">
                          {st.assignments.rate_pct}%
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-muted-foreground">{st.quizzes.taken}/{st.quizzes.total}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge className={`text-xs ${scoreColor(st.quizzes.avg_score_pct)}`} variant="outline">
                          {st.quizzes.avg_score_pct !== null ? `${st.quizzes.avg_score_pct}%` : '—'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-center">{st.discussions.posts}</td>
                      <td className="px-4 py-2.5 text-center">{st.discussions.replies}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
