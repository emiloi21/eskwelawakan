import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import api from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Flame, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface DeckItem {
  public_id: string;
  title: string;
  description: string | null;
  tags: string[];
  is_graded: boolean;
  cards_count: number;
  sr_due_count: number;
  last_session: {
    public_id: string;
    correct_count: number;
    total_questions: number;
    completed_at: string;
  } | null;
}

export default function StudentFlashcardsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<{ data: DeckItem[] }>({
    queryKey: ['student-flashcards'],
    queryFn: async () => {
      const { data } = await api.get('/student/flashcards');
      return data;
    },
  });

  const { data: reviewData } = useQuery<{ total: number }>({
    queryKey: ['student-sr-due'],
    queryFn: async () => {
      const { data } = await api.get('/student/flashcards/review');
      return data;
    },
  });

  const importMutation = useMutation({
    mutationFn: (form: FormData) =>
      api.post('/student/flashcards/import', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      toast.success('Deck imported!');
      qc.invalidateQueries({ queryKey: ['student-flashcards'] });
    },
    onError: () => toast.error('Invalid deck file.'),
  });

  const handleImport = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error('Select a .json file first.');
    const form = new FormData();
    form.append('file', file);
    importMutation.mutate(form);
  };

  const decks = data?.data ?? [];
  const totalDue = reviewData?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flashcards</h1>
          <p className="text-muted-foreground">Study your assigned decks and quizzes.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {totalDue > 0 && (
            <Button variant="outline" onClick={() => navigate('/student/flashcards/review')}>
              <Flame className="mr-2 h-4 w-4 text-orange-500" />
              Review ({totalDue} due)
            </Button>
          )}
          <Input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            {importMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import Shared Deck
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : decks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <p>No decks assigned yet.</p>
          <p className="text-xs">Your teacher will assign decks to your class.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => {
            const lastScore = deck.last_session
              ? Math.round((deck.last_session.correct_count / deck.last_session.total_questions) * 100)
              : null;
            return (
              <Card
                key={deck.public_id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/student/flashcards/${deck.public_id}`)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base truncate">{deck.title}</CardTitle>
                  {deck.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{deck.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {(deck.tags ?? []).map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                    {deck.is_graded && <Badge className="text-xs bg-amber-500">Graded</Badge>}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{deck.cards_count} cards</span>
                    <div className="flex gap-2 items-center">
                      {deck.sr_due_count > 0 && (
                        <span className="flex items-center gap-1 text-orange-500 text-xs font-medium">
                          <Flame className="h-3 w-3" /> {deck.sr_due_count} due
                        </span>
                      )}
                      {lastScore !== null && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${lastScore >= 80 ? 'border-green-500 text-green-600' : lastScore >= 60 ? 'border-amber-500 text-amber-600' : 'border-red-500 text-red-600'}`}
                        >
                          Last: {lastScore}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
