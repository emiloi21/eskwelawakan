import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, BookOpen, ClipboardList, Flame, Zap } from 'lucide-react';

interface DeckCard {
  public_id: string;
  front: string;
  back: string;
  category_tag: string | null;
  has_cloze: boolean;
}

interface Deck {
  public_id: string;
  title: string;
  description: string | null;
  tags: string[];
  is_graded: boolean;
  cards: DeckCard[];
}

export default function StudentFlashcardDeckPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<{ data: Deck }>({
    queryKey: ['student-flashcard-deck', deckId],
    queryFn: async () => {
      const { data } = await api.get(`/student/flashcards/${deckId}`);
      return data;
    },
    enabled: !!deckId,
  });

  const deck = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (!deck) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/student/flashcards')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{deck.title}</h1>
          {deck.description && <p className="text-muted-foreground text-sm">{deck.description}</p>}
        </div>
      </div>

      {/* Tags / badges */}
      <div className="flex flex-wrap gap-2">
        {(deck.tags ?? []).map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
        {deck.is_graded && <Badge className="bg-amber-500">Graded</Badge>}
        <Badge variant="outline">{deck.cards.length} cards</Badge>
      </div>

      {/* Mode buttons */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary"
          onClick={() => navigate(`/student/flashcards/${deckId}/study`)}
        >
          <CardContent className="pt-6 pb-6 text-center space-y-3">
            <BookOpen className="h-8 w-8 mx-auto text-primary" />
            <div>
              <p className="font-semibold">Flashcards</p>
              <p className="text-xs text-muted-foreground mt-0.5">Flip & self-rate. Easy / Good / Hard.</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary"
          onClick={() => navigate(`/student/flashcards/${deckId}/quiz`)}
        >
          <CardContent className="pt-6 pb-6 text-center space-y-3">
            <ClipboardList className="h-8 w-8 mx-auto text-primary" />
            <div>
              <p className="font-semibold">Quiz</p>
              <p className="text-xs text-muted-foreground mt-0.5">MC, T/F, identification, cloze.</p>
              {deck.is_graded && <Badge className="text-xs mt-1 bg-amber-500">Graded</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary"
          onClick={() => navigate('/student/flashcards/review')}
        >
          <CardContent className="pt-6 pb-6 text-center space-y-3">
            <Flame className="h-8 w-8 mx-auto text-orange-500" />
            <div>
              <p className="font-semibold">Review Queue</p>
              <p className="text-xs text-muted-foreground mt-0.5">Spaced repetition — cards due today.</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary"
          onClick={() => navigate(`/student/flashcards/${deckId}/match`)}
        >
          <CardContent className="pt-6 pb-6 text-center space-y-3">
            <Zap className="h-8 w-8 mx-auto text-violet-500" />
            <div>
              <p className="font-semibold">Match</p>
              <p className="text-xs text-muted-foreground mt-0.5">Match fronts to backs. Beat the clock.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card preview */}
      <div>
        <h2 className="text-base font-semibold mb-3">Cards ({deck.cards.length})</h2>
        <div className="space-y-2">
          {deck.cards.map((card) => (
            <div key={card.public_id} className="rounded-lg border bg-muted/20 px-4 py-3 grid sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">Q</span>
                <p className="font-medium leading-snug">{card.front}</p>
              </div>
              {card.back && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">A</span>
                  <p className="text-muted-foreground leading-snug">{card.back}</p>
                </div>
              )}
              {card.category_tag && (
                <div className="sm:col-span-2">
                  <Badge variant="outline" className="text-xs">{card.category_tag}</Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
