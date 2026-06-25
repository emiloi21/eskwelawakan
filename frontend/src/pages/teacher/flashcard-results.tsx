import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Loader2, TrendingUp, Users, Trophy } from 'lucide-react';

interface SessionResult {
  public_id: string;
  student: { id: number; fname: string; lname: string; student_id: string };
  score_percent: number;
  correct_count: number;
  total_questions: number;
  quiz_types: string[];
  is_graded: boolean;
  completed_at: string;
}

export default function TeacherFlashcardResultsPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const { data: deckData } = useQuery<{ data: { title: string; is_graded: boolean } }>({
    queryKey: ['teacher-flashcard-meta', deckId],
    queryFn: async () => {
      const { data } = await api.get(`/teacher/flashcards/${deckId}`);
      return data;
    },
    enabled: !!deckId,
  });

  const { data, isLoading } = useQuery<{ data: SessionResult[] }>({
    queryKey: ['teacher-flashcard-results', deckId],
    queryFn: async () => {
      const { data } = await api.get(`/teacher/flashcards/${deckId}/results`);
      return data;
    },
    enabled: !!deckId,
  });

  const results = data?.data ?? [];
  const avg = results.length
    ? (results.reduce((s, r) => s + r.score_percent, 0) / results.length).toFixed(1)
    : null;
  const highest = results.length ? Math.max(...results.map((r) => r.score_percent)).toFixed(1) : null;

  const badgeColor = (pct: number) => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/teacher/flashcards/${deckId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quiz Results</h1>
          <p className="text-muted-foreground">{deckData?.data?.title}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Submissions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{results.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg. Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{avg !== null ? `${avg}%` : '—'}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{highest !== null ? `${highest}%` : '—'}</div>
              </CardContent>
            </Card>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No quiz submissions yet.</div>
          ) : (
            <Card>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Correct</TableHead>
                      <TableHead>Types</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r) => (
                      <TableRow key={r.public_id}>
                        <TableCell className="font-medium">
                          {r.student.lname}, {r.student.fname}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{r.student.student_id}</TableCell>
                        <TableCell>
                          <Badge className={`${badgeColor(r.score_percent)} text-white`}>
                            {r.score_percent}%
                          </Badge>
                        </TableCell>
                        <TableCell>{r.correct_count}/{r.total_questions}</TableCell>
                        <TableCell className="text-sm">
                          {r.quiz_types.join(', ')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(r.completed_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
