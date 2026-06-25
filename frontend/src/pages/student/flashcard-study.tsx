import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, RotateCcw, Loader2, CheckCircle, XCircle, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FlashCard {
  public_id: string;
  front: string;
  back: string;
  category_tag: string | null;
  has_cloze: boolean;
}

export default function StudentFlashcardStudyPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [flipped, setFlipped] = useState(false);
  const [current, setCurrent] = useState(0);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery<{ data: { title: string; cards: FlashCard[] } }>({
    queryKey: ['student-flashcard-study', deckId],
    queryFn: async () => {
      const { data } = await api.get(`/student/flashcards/${deckId}`);
      return data;
    },
    enabled: !!deckId,
  });

  const srMutation = useMutation({
    mutationFn: ({ cardPublicId, rating }: { cardPublicId: string; rating: number }) =>
      api.post(`/student/flashcards/cards/${cardPublicId}/sr`, { rating }),
  });

  const deck = data?.data;
  const cards = deck?.cards ?? [];
  const card = cards[current];
  const progress = cards.length > 0 ? ((current) / cards.length) * 100 : 0;

  const rate = (rating: number) => {
    if (!card) return;
    setRatings((prev) => ({ ...prev, [card.public_id]: rating }));
    srMutation.mutate({ cardPublicId: card.public_id, rating });

    if (current + 1 < cards.length) {
      setCurrent((p) => p + 1);
      setFlipped(false);
    }
  };

  const reset = () => {
    setCurrent(0);
    setFlipped(false);
    setRatings({});
    qc.invalidateQueries({ queryKey: ['student-flashcards'] });
    toast.success('Session reset.');
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const done = current >= cards.length;

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/student/flashcards/${deckId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{deck?.title}</h1>
          <p className="text-sm text-muted-foreground">Flashcard mode — {cards.length} cards</p>
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      {done ? (
        <CompletionScreen ratings={ratings} cards={cards} onReset={reset} onBack={() => navigate(`/student/flashcards/${deckId}`)} />
      ) : (
        <>
          <p className="text-center text-sm text-muted-foreground">
            {current + 1} / {cards.length}
          </p>

          {/* Flip card */}
          <div
            className="relative h-56 cursor-pointer select-none"
            onClick={() => setFlipped((p) => !p)}
          >
            <div
              className={cn(
                'absolute inset-0 rounded-xl border bg-card shadow-md flex flex-col items-center justify-center p-6 text-center transition-all duration-300',
                'backface-hidden'
              )}
              style={{ backfaceVisibility: 'hidden', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 0.4s' }}
            >
              {card?.category_tag && (
                <Badge variant="outline" className="text-xs mb-3">{card.category_tag}</Badge>
              )}
              <p className="text-base font-semibold leading-snug">{card?.front}</p>
              <p className="text-xs text-muted-foreground mt-4">Tap to reveal answer</p>
            </div>

            <div
              className="absolute inset-0 rounded-xl border bg-primary/5 shadow-md flex flex-col items-center justify-center p-6 text-center"
              style={{ backfaceVisibility: 'hidden', transform: flipped ? 'rotateY(0deg)' : 'rotateY(-180deg)', transition: 'transform 0.4s' }}
            >
              <p className="text-base leading-snug">{card?.back}</p>
              <p className="text-xs text-muted-foreground mt-4">How well did you know this?</p>
            </div>
          </div>

          {/* Rating buttons */}
          {flipped ? (
            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => rate(0)}>
                <XCircle className="mr-1.5 h-4 w-4" /> Hard
              </Button>
              <Button variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950" onClick={() => rate(1)}>
                <Minus className="mr-1.5 h-4 w-4" /> Good
              </Button>
              <Button variant="outline" className="border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-950" onClick={() => rate(2)}>
                <CheckCircle className="mr-1.5 h-4 w-4" /> Easy
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={() => setFlipped(true)}>
                Show Answer <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CompletionScreen({ ratings, cards, onReset, onBack }: {
  ratings: Record<string, number>;
  cards: FlashCard[];
  onReset: () => void;
  onBack: () => void;
}) {
  const easyCount = Object.values(ratings).filter((r) => r === 2).length;
  const goodCount = Object.values(ratings).filter((r) => r === 1).length;
  const hardCount = Object.values(ratings).filter((r) => r === 0).length;

  return (
    <Card>
      <CardContent className="pt-8 pb-8 text-center space-y-6">
        <div className="text-4xl">🎉</div>
        <div>
          <h2 className="text-xl font-bold">Session Complete!</h2>
          <p className="text-muted-foreground text-sm mt-1">You reviewed {cards.length} cards.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3">
            <div className="text-2xl font-bold text-green-600">{easyCount}</div>
            <div className="text-green-700 dark:text-green-300">Easy</div>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3">
            <div className="text-2xl font-bold text-blue-600">{goodCount}</div>
            <div className="text-blue-700 dark:text-blue-300">Good</div>
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3">
            <div className="text-2xl font-bold text-red-600">{hardCount}</div>
            <div className="text-red-700 dark:text-red-300">Hard</div>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> Study Again
          </Button>
          <Button onClick={onBack}>Back to Deck</Button>
        </div>
      </CardContent>
    </Card>
  );
}
