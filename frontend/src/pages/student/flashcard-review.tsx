import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Loader2, Flame, XCircle, CheckCircle, Minus } from 'lucide-react';

interface SrCard {
  id: number;
  card: {
    public_id: string;
    front: string;
    back: string;
    category_tag: string | null;
    deck: { public_id: string; title: string };
  };
  interval_days: number;
  next_due: string;
}

export default function StudentFlashcardReviewPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone]       = useState(false);
  // Cards that were marked "Again" loop back to the end
  const [queue, setQueue]     = useState<SrCard[]>([]);

  const { data, isLoading } = useQuery<{ data: SrCard[]; total: number }>({
    queryKey: ['student-sr-review'],
    queryFn: async () => {
      const { data } = await api.get('/student/flashcards/review');
      return data;
    },
  });

  const srMutation = useMutation({
    mutationFn: ({ cardPublicId, rating }: { cardPublicId: string; rating: number }) =>
      api.post(`/student/flashcards/cards/${cardPublicId}/sr`, { rating }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-sr-due'] });
    },
  });

  const cards = data?.data ?? [];
  // Use queue once populated (bootstrapped on first load)
  const [bootstrapped, setBootstrapped] = useState(false);
  if (!bootstrapped && cards.length > 0) {
    setQueue(cards);
    setBootstrapped(true);
  }
  const activeCards = bootstrapped ? queue : cards;
  const card        = activeCards[current];

  const rate = (rating: number) => {
    if (!card) return;
    srMutation.mutate({ cardPublicId: card.card.public_id, rating });
    qc.invalidateQueries({ queryKey: ['student-sr-due'] });

    setQueue((prev) => {
      const next = prev.filter((_, i) => i !== current);
      if (rating === 0) return [...next, card]; // Again → re-queue at end
      return next;
    });
    setCurrent((p) => Math.max(0, Math.min(p, activeCards.length - 2)));
    setFlipped(false);

    if (activeCards.length <= 1 && rating !== 0) setDone(true);
  };

  // Keyboard: Space to flip, 1/2/3 to rate
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space')  { e.preventDefault(); setFlipped((v) => !v); }
    if (e.key === '1' && flipped) rateWithKey(0);
    if (e.key === '2' && flipped) rateWithKey(1);
    if (e.key === '3' && flipped) rateWithKey(2);
  }, [flipped, current, queue]); // eslint-disable-line

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rateWithKey = (r: number) => rate(r);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const progress = activeCards.length > 0 ? (current / activeCards.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your review queue…
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-bold">All caught up!</h1>
        <p className="text-muted-foreground text-sm">No cards are due for review today. Come back tomorrow.</p>
        <Button onClick={() => navigate('/student/flashcards')}>Back to Decks</Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="text-5xl">🔥</div>
        <h1 className="text-xl font-bold">Review Complete!</h1>
        <p className="text-muted-foreground text-sm">You reviewed {cards.length} cards due today.</p>
        <Button onClick={() => navigate('/student/flashcards')}>Back to Decks</Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/student/flashcards')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h1 className="text-lg font-bold">Spaced Repetition Review</h1>
          </div>
          <p className="text-sm text-muted-foreground">{activeCards.length} card{activeCards.length !== 1 ? 's' : ''} remaining</p>
        </div>
        <span className="text-sm font-medium text-muted-foreground">{activeCards.length} LEFT</span>
      </div>

      <Progress value={progress} className="h-1.5" />

      {/* Counter + deck info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{current + 1} / {activeCards.length}</span>
        <div className="flex items-center gap-2">
          <span>{card.card.deck.title}</span>
          {card.card.category_tag && (
            <Badge variant="outline" className="text-xs uppercase tracking-wide">{card.card.category_tag}</Badge>
          )}
        </div>
      </div>

      {/* Flip card — kwek style */}
      <div
        className="min-h-[240px] rounded-xl border bg-card cursor-pointer select-none p-8 flex flex-col justify-between"
        onClick={() => setFlipped((v) => !v)}
      >
        {!flipped ? (
          <div className="space-y-4">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Question</p>
            <p className="text-lg font-semibold leading-snug">{card.card.front}</p>
            <p className="text-xs text-muted-foreground mt-4">
              Click or press{' '}
              <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Space</kbd>{' '}
              to flip
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Answer</p>
            <p className="text-lg leading-snug">{card.card.back}</p>
            <p className="text-xs text-muted-foreground">
              Next interval: +{card.interval_days}d after rating
            </p>
          </div>
        )}
      </div>

      {/* Rating — only after flip */}
      {flipped ? (
        <div className="space-y-2">
          <p className="text-xs text-center text-muted-foreground">
            After flipping —{' '}
            <kbd className="rounded border bg-muted px-1 py-0.5 text-xs font-mono">1</kbd> Again{' '}
            <kbd className="rounded border bg-muted px-1 py-0.5 text-xs font-mono">2</kbd> Good{' '}
            <kbd className="rounded border bg-muted px-1 py-0.5 text-xs font-mono">3</kbd> Easy
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => rate(0)}>
              <XCircle className="mr-1.5 h-4 w-4" /> Again
            </Button>
            <Button variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950" onClick={() => rate(1)}>
              <Minus className="mr-1.5 h-4 w-4" /> Good
            </Button>
            <Button variant="outline" className="border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-950" onClick={() => rate(2)}>
              <CheckCircle className="mr-1.5 h-4 w-4" /> Easy
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setFlipped(true)}>
          Show Answer
        </Button>
      )}
    </div>
  );
}
