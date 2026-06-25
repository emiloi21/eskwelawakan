import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Trophy, RotateCcw, Timer } from 'lucide-react';

interface DeckCard {
  public_id: string;
  front: string;
  back: string;
}

interface Deck {
  public_id: string;
  title: string;
  cards: DeckCard[];
}

interface Tile {
  id: string;          // unique tile id
  cardPublicId: string;
  side: 'front' | 'back';
  text: string;
}

type TileState = 'idle' | 'selected' | 'matched' | 'wrong';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function useTimer(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return seconds;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

export default function StudentFlashcardMatchPage() {
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

  // ── Game state ──────────────────────────────────────────────────────────────
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [tileStates, setTileStates] = useState<Record<string, TileState>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const elapsed = useTimer(timerRunning);

  const totalPairs = tiles.length / 2;

  const initGame = useCallback((d: Deck) => {
    const valid = d.cards.filter((c) => c.front && c.back);
    const builtTiles: Tile[] = [];
    valid.forEach((c) => {
      builtTiles.push({ id: `f-${c.public_id}`, cardPublicId: c.public_id, side: 'front', text: c.front });
      builtTiles.push({ id: `b-${c.public_id}`, cardPublicId: c.public_id, side: 'back', text: c.back });
    });
    const shuffled = shuffle(builtTiles);
    setTiles(shuffled);
    const states: Record<string, TileState> = {};
    shuffled.forEach((t) => { states[t.id] = 'idle'; });
    setTileStates(states);
    setSelected(null);
    setWrongPair(null);
    setMatchedCount(0);
    setFinished(false);
    setTimerRunning(true);
  }, []);

  useEffect(() => {
    if (deck) initGame(deck);
  }, [deck, initGame]);

  // Clear wrong pair after animation
  useEffect(() => {
    if (!wrongPair) return;
    const t = setTimeout(() => {
      setTileStates((prev) => {
        const next = { ...prev };
        wrongPair.forEach((id) => { if (next[id] !== 'matched') next[id] = 'idle'; });
        return next;
      });
      setWrongPair(null);
      setSelected(null);
    }, 700);
    return () => clearTimeout(t);
  }, [wrongPair]);

  const handleTileClick = useCallback((tileId: string) => {
    if (finished) return;
    const state = tileStates[tileId];
    if (state === 'matched' || state === 'wrong') return;
    if (wrongPair) return; // wait for reset animation

    if (!selected) {
      setSelected(tileId);
      setTileStates((prev) => ({ ...prev, [tileId]: 'selected' }));
      return;
    }

    if (selected === tileId) {
      // deselect
      setSelected(null);
      setTileStates((prev) => ({ ...prev, [tileId]: 'idle' }));
      return;
    }

    // Compare
    const tileA = tiles.find((t) => t.id === selected)!;
    const tileB = tiles.find((t) => t.id === tileId)!;

    if (tileA.cardPublicId === tileB.cardPublicId && tileA.side !== tileB.side) {
      // Correct match
      setTileStates((prev) => ({ ...prev, [selected]: 'matched', [tileId]: 'matched' }));
      setSelected(null);
      setMatchedCount((c) => {
        const next = c + 1;
        const total = tiles.length / 2;
        if (next === total) {
          setFinished(true);
          setTimerRunning(false);
        }
        return next;
      });
    } else {
      // Wrong
      setTileStates((prev) => ({ ...prev, [selected]: 'wrong', [tileId]: 'wrong' }));
      setWrongPair([selected, tileId]);
    }
  }, [finished, tileStates, wrongPair, selected, tiles]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (!deck) return null;

  const validCards = deck.cards.filter((c) => c.front && c.back);

  if (validCards.length < 2) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <p className="text-sm text-muted-foreground">This deck needs at least 2 cards with both front and back text to play Match.</p>
      </div>
    );
  }

  // ── Finished screen ──────────────────────────────────────────────────────────
  if (finished) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 max-w-sm mx-auto text-center">
        <Trophy className="h-16 w-16 text-amber-500" />
        <h2 className="text-2xl font-bold">You matched them all!</h2>
        <p className="text-muted-foreground text-sm">
          Completed <strong>{totalPairs}</strong> pairs in <strong>{formatTime(elapsed)}</strong>.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={() => initGame(deck)}>
            <RotateCcw className="mr-2 h-4 w-4" /> Play Again
          </Button>
        </div>
      </div>
    );
  }

  // ── Game board ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">{deck.title} — Match</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="outline" className="flex items-center gap-1.5">
            <Timer className="h-3 w-3" /> {formatTime(elapsed)}
          </Badge>
          <Badge variant="secondary">
            {matchedCount} / {totalPairs}
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => initGame(deck)}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {tiles.map((tile) => {
          const state = tileStates[tile.id] ?? 'idle';
          const baseClass =
            'relative rounded-lg border-2 px-3 py-4 text-sm text-center cursor-pointer select-none transition-all duration-200 min-h-[72px] flex items-center justify-center leading-snug font-medium';
          const stateClass =
            state === 'matched'
              ? 'border-green-400 bg-green-100 text-green-800 dark:border-green-600 dark:bg-green-900/40 dark:text-green-300 cursor-default'
              : state === 'selected'
              ? 'border-primary bg-primary/10 text-primary scale-[1.04]'
              : state === 'wrong'
              ? 'border-destructive bg-destructive/10 text-destructive animate-[shake_0.4s_ease-in-out]'
              : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30';

          return (
            <div
              key={tile.id}
              className={`${baseClass} ${stateClass}`}
              onClick={() => handleTileClick(tile.id)}
            >
              {tile.text}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
