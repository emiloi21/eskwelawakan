import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, ArrowRight, Loader2, CheckCircle2, Sparkles,
  Layers, Eye, AlignLeft, RotateCcw, ListCheck, XCircle, Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────

type QuizType = 'mc' | 'tf' | 'identification' | 'cloze';

interface Question {
  card_public_id: string;
  type: QuizType;
  question_data: { question: string; options?: string[]; statement?: string };
  correct_answer: string;
  category_tag: string | null;
}

interface QuizSession {
  session_public_id: string;
  is_graded: boolean;
  total_questions: number;
  questions: Question[];
}

interface QuestionResult {
  card_public_id: string;
  is_correct: boolean;
  student_answer: string;
  correct_answer: string;
  question_data: { question: string; options?: string[]; statement?: string };
  question_type: QuizType;
}

interface QuizResult {
  session_public_id: string;
  correct_count: number;
  total_questions: number;
  score_percent: number;
  is_graded: boolean;
  question_results: QuestionResult[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<QuizType, string> = {
  mc:             'MULTIPLE CHOICE',
  tf:             'TRUE / FALSE',
  identification: 'IDENTIFICATION',
  cloze:          'FILL IN BLANK',
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function scoreLabel(pct: number): string {
  if (pct >= 90) return 'Excellent!';
  if (pct >= 75) return 'Good';
  if (pct >= 60) return 'Needs Practice';
  return 'Keep Reviewing';
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StudentFlashcardQuizPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  // phase: setup → quiz → result → (optional) review
  const [phase, setPhase] = useState<'setup' | 'quiz' | 'result' | 'review'>('setup');
  const [session, setSession]     = useState<QuizSession | null>(null);
  const [answers, setAnswers]     = useState<Record<string, string>>({});
  const [catFilter, setCatFilter] = useState<string>('all');
  const [result, setResult]       = useState<QuizResult | null>(null);
  const [resultMap, setResultMap] = useState<Record<string, QuestionResult>>({});

  // Review-mistakes state
  const [reviewCards, setReviewCards]     = useState<Question[]>([]);
  const [reviewCurrent, setReviewCurrent] = useState(0);
  const [reviewFlipped, setReviewFlipped] = useState(false);
  const [reviewAgainQueue, setReviewAgainQueue] = useState<Question[]>([]);

  const { data: deckData } = useQuery<{ data: { title: string; cards: any[] } }>({
    queryKey: ['student-quiz-deck', deckId],
    queryFn: async () => {
      const { data } = await api.get(`/student/flashcards/${deckId}`);
      return data;
    },
    enabled: !!deckId,
  });

  const startMutation = useMutation({
    mutationFn: (types: string[]) =>
      api.post(`/student/flashcards/${deckId}/quiz`, { quiz_types: types }),
    onSuccess: (res) => {
      setSession(res.data as QuizSession);
      setAnswers({});
      setCatFilter('all');
      setResultMap({});
      setResult(null);
      setPhase('quiz');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Could not start quiz.'),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: { session_public_id: string; answers: object[] }) =>
      api.post(`/student/flashcards/quiz/${payload.session_public_id}/submit`, { answers: payload.answers }),
    onSuccess: (res) => {
      const data = res.data as QuizResult;
      setResult(data);
      const map: Record<string, QuestionResult> = {};
      for (const qr of data.question_results) map[qr.card_public_id] = qr;
      setResultMap(map);
      setPhase('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: () => toast.error('Failed to submit quiz.'),
  });

  const srMutation = useMutation({
    mutationFn: ({ cardPublicId, rating }: { cardPublicId: string; rating: number }) =>
      api.post(`/student/flashcards/cards/${cardPublicId}/sr`, { rating }),
  });

  const deckTitle      = deckData?.data?.title ?? '—';
  const answeredCount  = session ? session.questions.filter((q) => answers[q.card_public_id] !== undefined).length : 0;
  const totalQuestions = session?.total_questions ?? 0;

  const categories = session
    ? [...new Set(session.questions.map((q) => q.category_tag).filter(Boolean) as string[])]
    : [];

  const visibleQuestions = (phase === 'result' && session ? session.questions : session?.questions ?? []).filter(
    (q) => catFilter === 'all' || q.category_tag === catFilter,
  );

  const submitAll = () => {
    if (!session) return;
    const payload = session.questions.map((q) => ({
      card_public_id: q.card_public_id,
      answer: answers[q.card_public_id] ?? '',
    }));
    submitMutation.mutate({ session_public_id: session.session_public_id, answers: payload });
  };

  const retake = () => {
    setPhase('setup');
    setSession(null);
    setAnswers({});
    setResult(null);
    setResultMap({});
    setCatFilter('all');
  };

  const startReviewMistakes = () => {
    if (!session || !result) return;
    const mistakes = session.questions.filter((q) => !resultMap[q.card_public_id]?.is_correct);
    setReviewCards(mistakes);
    setReviewCurrent(0);
    setReviewFlipped(false);
    setReviewAgainQueue([]);
    setPhase('review');
  };

  // Keyboard: Space to flip in review mode
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (phase !== 'review') return;
    if (e.code === 'Space') { e.preventDefault(); setReviewFlipped((v) => !v); }
    if (e.key === '1') rateReview(0);
    if (e.key === '2') rateReview(1);
    if (e.key === '3') rateReview(2);
  }, [phase, reviewCurrent, reviewCards, reviewAgainQueue]); // eslint-disable-line

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const rateReview = (rating: number) => {
    const card = reviewCards[reviewCurrent];
    if (!card) return;
    srMutation.mutate({ cardPublicId: card.card_public_id, rating });

    let nextCards = [...reviewCards];
    if (rating === 0) {
      // "Again" — put back at end
      nextCards = [...nextCards.filter((_, i) => i !== reviewCurrent), card];
    } else {
      nextCards = nextCards.filter((_, i) => i !== reviewCurrent);
    }

    if (nextCards.length === 0) {
      setPhase('result');
      return;
    }
    setReviewCards(nextCards);
    setReviewCurrent(Math.min(reviewCurrent, nextCards.length - 1));
    setReviewFlipped(false);
  };

  // ── SETUP PHASE ─────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    const TYPES = [
      { value: 'mc',             label: 'Multiple Choice',  desc: 'Pick the correct answer from available options', icon: <Layers className="h-5 w-5 text-muted-foreground" /> },
      { value: 'tf',             label: 'True / False',     desc: 'Evaluate whether a statement is correct',        icon: <Eye className="h-5 w-5 text-muted-foreground" /> },
      { value: 'identification', label: 'Identification',   desc: 'Type the answer from memory',                    icon: <AlignLeft className="h-5 w-5 text-muted-foreground" /> },
    ];

    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/student/flashcards/${deckId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Quiz Mode</h1>
            <p className="text-sm text-muted-foreground">{deckTitle}</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Customize your quiz</h2>
            <p className="text-sm text-muted-foreground">Pick a type, or go fully randomized.</p>
          </div>

          <div className="space-y-2.5">
            {TYPES.map((t) => (
              <button
                key={t.value}
                disabled={startMutation.isPending}
                onClick={() => startMutation.mutate([t.value])}
                className="w-full flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-4 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  {t.icon}
                  <div>
                    <p className="font-semibold text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span>OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate(['mc', 'tf', 'identification', 'cloze'])}
            >
              {startMutation.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <ListCheck className="mr-2 h-4 w-4" />}
              Mixed
            </Button>
            <Button
              disabled={startMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => startMutation.mutate(['mc', 'tf', 'identification', 'cloze'])}
            >
              {startMutation.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Sparkles className="mr-2 h-4 w-4" />}
              Randomized
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── QUIZ PHASE ─────────────────────────────────────────────────────────────
  if (phase === 'quiz' && session) {
    return (
      <div className="max-w-2xl mx-auto pb-12 space-y-4">
        {/* Sticky progress header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b pb-3 pt-2 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>{answeredCount} / {totalQuestions} ANSWERED</span>
            <span>SCORE: —</span>
          </div>
          <Progress value={totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0} className="h-1.5" />
          {categories.length > 1 && (
            <div className="flex gap-1.5 flex-wrap pt-1">
              {['all', ...categories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat)}
                  className={cn(
                    'rounded-full px-3 py-0.5 text-xs font-semibold transition-colors',
                    catFilter === cat
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70',
                  )}
                >
                  {cat === 'all' ? 'ALL' : cat.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Question cards */}
        {visibleQuestions.map((q) => {
          const idx = session.questions.findIndex((sq) => sq.card_public_id === q.card_public_id);
          return (
            <div key={q.card_public_id}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide px-1 mb-1">{deckTitle}</p>
              <QuestionCard
                q={q}
                index={idx}
                total={totalQuestions}
                answer={answers[q.card_public_id]}
                result={undefined}
                onAnswer={(val) => setAnswers((prev) => ({ ...prev, [q.card_public_id]: val }))}
                locked={false}
              />
            </div>
          );
        })}

        <Button
          className="w-full mt-2"
          onClick={submitAll}
          disabled={answeredCount < totalQuestions || submitMutation.isPending}
        >
          {submitMutation.isPending
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <CheckCircle2 className="mr-2 h-4 w-4" />}
          {answeredCount < totalQuestions
            ? `${totalQuestions - answeredCount} question${totalQuestions - answeredCount !== 1 ? 's' : ''} remaining`
            : 'Submit Quiz'}
        </Button>
      </div>
    );
  }

  // ── RESULT PHASE ────────────────────────────────────────────────────────────
  if (phase === 'result' && result && session) {
    const pct      = result.score_percent ?? 0;
    const mistakes = result.total_questions - result.correct_count;

    return (
      <div className="max-w-2xl mx-auto pb-12 space-y-4">
        {/* Score card */}
        <div className="rounded-xl bg-foreground text-background p-8 space-y-3">
          <div className="text-7xl font-black leading-none tabular-nums">
            {result.correct_count}/{result.total_questions}
          </div>
          <p className="text-base font-semibold text-background/70">{pct}% · {scoreLabel(pct)}</p>
          <div className="flex flex-wrap gap-5 text-sm font-medium">
            <span className="text-green-400">Correct: {result.correct_count}</span>
            <span className="text-red-400">Incorrect: {mistakes}</span>
            <span className="text-background/50">Total: {result.total_questions}</span>
          </div>
          {result.is_graded && (
            <p className="text-xs text-green-400 flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Score saved to teacher
            </p>
          )}
          <div className="flex gap-2 flex-wrap pt-2">
            <Button size="sm" variant="outline" className="border-background/20 text-background hover:bg-background/10" onClick={retake}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retake Quiz
            </Button>
            {mistakes > 0 && (
              <Button size="sm" variant="outline" className="border-background/20 text-background hover:bg-background/10" onClick={startReviewMistakes}>
                Review {mistakes} Mistake{mistakes !== 1 ? 's' : ''}
              </Button>
            )}
            <Button size="sm" variant="outline" className="border-background/20 text-background hover:bg-background/10" onClick={() => navigate(`/student/flashcards/${deckId}`)}>
              Back to Study
            </Button>
          </div>
        </div>

        {/* Category filter pills */}
        {categories.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            {['all', ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={cn(
                  'rounded-full px-3 py-0.5 text-xs font-semibold transition-colors',
                  catFilter === cat
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70',
                )}
              >
                {cat === 'all' ? 'ALL' : cat.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Questions with feedback */}
        {visibleQuestions.map((q) => {
          const idx = session.questions.findIndex((sq) => sq.card_public_id === q.card_public_id);
          return (
            <div key={q.card_public_id}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide px-1 mb-1">{deckTitle}</p>
              <QuestionCard
                q={q}
                index={idx}
                total={totalQuestions}
                answer={answers[q.card_public_id]}
                result={resultMap[q.card_public_id]}
                onAnswer={() => {}}
                locked
              />
            </div>
          );
        })}
      </div>
    );
  }

  // ── REVIEW MISTAKES PHASE ───────────────────────────────────────────────────
  if (phase === 'review') {
    const reviewCard = reviewCards[reviewCurrent];
    const remaining  = reviewCards.length;

    if (remaining === 0) {
      return (
        <div className="max-w-md mx-auto text-center py-20 space-y-4">
          <div className="text-5xl">✅</div>
          <h1 className="text-xl font-bold">All mistakes reviewed!</h1>
          <p className="text-muted-foreground text-sm">You've gone through every card you missed.</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button variant="outline" onClick={retake}><RotateCcw className="mr-1.5 h-4 w-4" /> Retake Quiz</Button>
            <Button onClick={() => navigate(`/student/flashcards/${deckId}`)}>Back to Study</Button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-lg mx-auto space-y-4 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setPhase('result')}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Quiz
          </Button>
          <h1 className="text-base font-bold">Quiz Review</h1>
          <span className="text-sm font-medium text-muted-foreground">{remaining} LEFT</span>
        </div>

        <Progress value={reviewCard ? ((reviewCurrent) / (reviewCurrent + remaining)) * 100 : 100} className="h-1.5" />

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{reviewCurrent + 1} / {reviewCurrent + remaining}</span>
          <div className="flex items-center gap-2">
            {deckTitle && <span>{deckTitle}</span>}
            {reviewCard?.category_tag && (
              <Badge variant="outline" className="text-xs uppercase tracking-wide">{reviewCard.category_tag}</Badge>
            )}
          </div>
        </div>

        {/* Flip card */}
        <div
          className="min-h-[220px] rounded-xl border bg-card cursor-pointer select-none p-8 flex flex-col justify-between"
          onClick={() => setReviewFlipped((v) => !v)}
        >
          {!reviewFlipped ? (
            <div className="space-y-4">
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Question</p>
              <p className="text-lg font-semibold leading-snug">{reviewCard?.question_data.question}</p>
              {reviewCard?.type === 'tf' && reviewCard.question_data.statement && (
                <div className="rounded bg-muted/40 px-3 py-2 text-sm">
                  <p className="text-xs text-muted-foreground mb-0.5">Answer to evaluate</p>
                  <p>{reviewCard.question_data.statement}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Click or press{' '}
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Space</kbd>{' '}
                to flip
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Answer</p>
              <p className="text-lg font-semibold leading-snug text-primary">{resultMap[reviewCard?.card_public_id ?? '']?.correct_answer ?? '—'}</p>
              <p className="text-xs text-muted-foreground">
                You answered:{' '}
                <span className="font-medium text-foreground">{answers[reviewCard?.card_public_id ?? ''] ?? '(no answer)'}</span>
              </p>
            </div>
          )}
        </div>

        {/* Rating buttons — only show after flip */}
        {reviewFlipped ? (
          <div className="space-y-2">
            <p className="text-xs text-center text-muted-foreground">
              After flipping —{' '}
              <kbd className="rounded border bg-muted px-1 py-0.5 text-xs font-mono">1</kbd> Again{' '}
              <kbd className="rounded border bg-muted px-1 py-0.5 text-xs font-mono">2</kbd> Good{' '}
              <kbd className="rounded border bg-muted px-1 py-0.5 text-xs font-mono">3</kbd> Easy
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => rateReview(0)}>
                <XCircle className="mr-1.5 h-4 w-4" /> Again
              </Button>
              <Button variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950" onClick={() => rateReview(1)}>
                <Minus className="mr-1.5 h-4 w-4" /> Good
              </Button>
              <Button variant="outline" className="border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-950" onClick={() => rateReview(2)}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Easy
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setReviewFlipped(true)}>
            Show Answer
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-muted-foreground py-12">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading…
    </div>
  );
}

// ── QuestionCard sub-component ────────────────────────────────────────────────

interface QuestionCardProps {
  q: Question;
  index: number;
  total: number;
  answer?: string;
  result?: QuestionResult;
  onAnswer: (val: string) => void;
  locked: boolean;
}

function QuestionCard({ q, index, answer, result, onAnswer, total, locked }: QuestionCardProps) {
  const [typedAnswer, setTypedAnswer] = useState('');

  const submitted  = !!result;
  const isCorrect  = result?.is_correct;
  const isAnswered = answer !== undefined;

  const submitTyped = () => {
    if (!typedAnswer.trim()) return;
    onAnswer(typedAnswer.trim());
  };

  return (
    <div className={cn(
      'rounded-xl border bg-card overflow-hidden',
      submitted && isCorrect  && 'border-l-4 border-l-green-500',
      submitted && !isCorrect && 'border-l-4 border-l-orange-500',
    )}>
      {/* Question header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">Q{index + 1}</span>
          <Badge variant="outline" className="text-[10px] tracking-widest font-semibold uppercase">
            {TYPE_LABELS[q.type]}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{index + 1} / {total}</span>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Question text */}
        <p className="font-semibold text-sm leading-snug">{q.question_data.question}</p>

        {/* True/False: statement box */}
        {q.type === 'tf' && q.question_data.statement && (
          <div className="rounded-md bg-muted/40 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Answer to evaluate</p>
            <p className="text-sm">{q.question_data.statement}</p>
          </div>
        )}

        {/* Multiple Choice */}
        {q.type === 'mc' && q.question_data.options && (
          <div className="space-y-2">
            {q.question_data.options.map((opt, i) => {
              const isSelected   = answer === opt;
              const isCorrectOpt = submitted && result?.correct_answer === opt;
              const isWrong      = submitted && isSelected && !isCorrect;

              return (
                <button
                  key={i}
                  disabled={locked || isAnswered}
                  onClick={() => !locked && !isAnswered && onAnswer(opt)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors',
                    !submitted && !isAnswered && 'hover:bg-muted/50 cursor-pointer',
                    !submitted && isSelected  && 'border-primary bg-primary/5',
                    isCorrectOpt              && 'border-green-500 bg-green-50 dark:bg-green-950/30',
                    isWrong                   && 'border-red-500 bg-red-50 dark:bg-red-950/30',
                    (locked || isAnswered) && !isCorrectOpt && !isWrong && 'opacity-60',
                  )}
                >
                  <span className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold',
                    !submitted && isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    isCorrectOpt             && '!bg-green-500 !text-white',
                    isWrong                  && '!bg-red-500 !text-white',
                  )}>
                    {OPTION_LETTERS[i]}
                  </span>
                  <span className={cn(
                    isCorrectOpt && 'text-green-700 dark:text-green-400 font-medium',
                    isWrong      && 'text-red-700 dark:text-red-400',
                  )}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* True / False */}
        {q.type === 'tf' && (
          <div className="grid grid-cols-2 gap-3">
            {['True', 'False'].map((opt) => {
              const isSelected   = answer === opt;
              const isCorrectOpt = submitted && result?.correct_answer === opt;
              const isWrong      = submitted && isSelected && !isCorrect;

              return (
                <button
                  key={opt}
                  disabled={locked || isAnswered}
                  onClick={() => !locked && !isAnswered && onAnswer(opt)}
                  className={cn(
                    'rounded-lg border p-3 text-sm font-medium transition-colors',
                    !submitted && !isAnswered && 'hover:bg-muted/50 cursor-pointer',
                    !submitted && isSelected  && 'border-primary bg-primary/5 text-primary',
                    isCorrectOpt              && 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400',
                    isWrong                   && 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
                    (locked || isAnswered) && !isCorrectOpt && !isWrong && 'opacity-60',
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {/* Identification / Cloze */}
        {(q.type === 'identification' || q.type === 'cloze') && (
          <div className="space-y-2">
            {!isAnswered ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Type your answer…"
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
                  disabled={locked}
                  className="h-9"
                  autoFocus={false}
                />
                <Button size="sm" onClick={submitTyped} disabled={!typedAnswer.trim() || locked}>
                  Submit
                </Button>
              </div>
            ) : (
              <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                <span className="text-xs text-muted-foreground">Your answer: </span>
                <span className="font-medium">{answer}</span>
              </div>
            )}
            {submitted && (
              <p className="text-xs text-muted-foreground">
                Correct answer:{' '}
                <span className="font-semibold text-foreground">{result.correct_answer}</span>
              </p>
            )}
            {!isAnswered && (
              <p className="text-xs text-muted-foreground">Case insensitive · typos accepted (±2 chars)</p>
            )}
          </div>
        )}

        {/* Per-question result banner */}
        {submitted && (
          <div className={cn(
            'rounded-md px-3 py-2',
            isCorrect ? 'bg-green-50 dark:bg-green-950/30' : 'bg-orange-50 dark:bg-orange-950/20',
          )}>
            <p className={cn(
              'font-bold text-xs tracking-wide',
              isCorrect ? 'text-green-700 dark:text-green-400' : 'text-orange-600 dark:text-orange-400',
            )}>
              {isCorrect ? '✓ CORRECT' : '✗ INCORRECT'}
            </p>
            {!isCorrect && (q.type === 'mc' || q.type === 'tf') && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Correct answer:{' '}
                <span className="font-semibold text-foreground">{result.correct_answer}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
