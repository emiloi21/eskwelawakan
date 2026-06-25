import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface Choice {
  id: number;
  text: string;
  order: number;
}

interface Question {
  id: number;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  points: number;
  order: number;
  choices: Choice[];
}

interface AttemptAnswer {
  question_id: number;
  choice_id: number | null;
  text_answer: string | null;
  is_correct: boolean | null;
  points_earned: string | null;
  question?: Question & { choices: (Choice & { is_correct: boolean })[] };
  choice?: (Choice & { is_correct: boolean }) | null;
}

interface Attempt {
  id: number;
  public_id: string;
  attempt_number: number;
  score: string | null;
  max_score: string | null;
  submitted_at: string | null;
  answers: AttemptAnswer[];
}

interface QuizInfo {
  id: number;
  public_id: string;
  title: string;
  instructions: string | null;
  points: string | null;
  due_date: string | null;
  allow_late: boolean;
}

interface QuizShowResponse {
  assignment: QuizInfo;
  questions: Question[];
  attempt: Attempt | null;
}

interface QuizResultResponse {
  assignment: QuizInfo;
  data: Attempt & {
    answers: (AttemptAnswer & {
      question: Question & { choices: (Choice & { is_correct: boolean })[] };
      choice: (Choice & { is_correct: boolean }) | null;
    })[];
  };
}

export default function StudentQuizPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [answers, setAnswers] = useState<Record<number, { choice_id?: number; text_answer?: string }>>({});
  const [currentAttemptId, setCurrentAttemptId] = useState<number | null>(null);
  const [phase, setPhase] = useState<'view' | 'taking' | 'result'>('view');
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const { data, isLoading } = useQuery<QuizShowResponse>({
    queryKey: ['student-quiz', publicId],
    queryFn: async () => {
      const { data } = await api.get(`/student/quizzes/${publicId}`);
      return data;
    },
    enabled: !!publicId,
  });

  const { data: result, isLoading: resultLoading } = useQuery<QuizResultResponse>({
    queryKey: ['student-quiz-result', publicId],
    queryFn: async () => {
      const { data } = await api.get(`/student/quizzes/${publicId}/result`);
      return data;
    },
    enabled: phase === 'result' && !!publicId,
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/student/quizzes/${publicId}/start`);
      return data.data as Attempt;
    },
    onSuccess: (attempt) => {
      setCurrentAttemptId(attempt.id);
      // Prefill saved answers if returning to an open attempt
      const prefill: typeof answers = {};
      attempt.answers?.forEach((a) => {
        prefill[a.question_id] = { choice_id: a.choice_id ?? undefined, text_answer: a.text_answer ?? undefined };
      });
      setAnswers(prefill);
      setPhase('taking');
    },
    onError: () => toast.error('Could not start quiz.'),
  });

  const saveAnswerMutation = useMutation({
    mutationFn: async ({ questionId, choiceId, textAnswer }: { questionId: number; choiceId?: number; textAnswer?: string }) => {
      await api.put(`/student/quizzes/${publicId}/attempt/${currentAttemptId}/answer`, {
        question_id: questionId,
        choice_id: choiceId ?? null,
        text_answer: textAnswer ?? null,
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/student/quizzes/${publicId}/attempt/${currentAttemptId}/submit`);
      return data;
    },
    onSuccess: () => {
      toast.success('Quiz submitted!');
      setConfirmSubmit(false);
      setPhase('result');
      qc.invalidateQueries({ queryKey: ['student-quiz', publicId] });
      qc.invalidateQueries({ queryKey: ['student-assignments'] });
    },
    onError: () => toast.error('Failed to submit quiz.'),
  });

  const handleAnswer = (questionId: number, choiceId?: number, textAnswer?: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { choice_id: choiceId, text_answer: textAnswer } }));
    if (currentAttemptId) {
      saveAnswerMutation.mutate({ questionId, choiceId, textAnswer });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading quiz…
      </div>
    );
  }

  const quiz = data?.assignment;
  const questions = data?.questions ?? [];
  const existingAttempt = data?.attempt;
  const answeredCount = Object.keys(answers).filter((k) => {
    const a = answers[parseInt(k)];
    return a.choice_id != null || (a.text_answer ?? '').trim().length > 0;
  }).length;

  // ── Result view ────────────────────────────────────────────────────────────

  if (phase === 'result') {
    const attempt = result?.data;
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <h1 className="font-semibold flex-1 truncate">{quiz?.title}</h1>
        </div>

        {resultLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading results…</div>
        ) : attempt ? (
          <>
            <Card>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Your Score</p>
                  <p className="text-3xl font-bold">
                    {attempt.score ?? '—'}
                    {attempt.max_score && <span className="text-lg text-muted-foreground"> / {attempt.max_score}</span>}
                  </p>
                  {attempt.max_score && attempt.score != null && (
                    <p className="text-xs text-muted-foreground">
                      {Math.round((parseFloat(attempt.score) / parseFloat(attempt.max_score)) * 100)}%
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Attempt #{attempt.attempt_number}</p>
                  {attempt.submitted_at && (
                    <p>{new Date(attempt.submitted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {attempt.answers.map((a, i) => {
                const q = a.question;
                if (!q) return null;
                const isShort = q.type === 'short_answer';
                const correct = a.is_correct;
                return (
                  <Card key={q.id} className={`border-l-4 ${correct === true ? 'border-l-green-500' : correct === false ? 'border-l-red-400' : 'border-l-muted'}`}>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {correct === true
                          ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          : correct === false
                          ? <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                          : <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                        Q{i + 1}: {q.question}
                        <span className="ml-auto text-xs text-muted-foreground font-normal">
                          {a.points_earned ?? '?'} / {q.points} pts
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-1 text-sm">
                      {isShort ? (
                        <div>
                          <p className="text-muted-foreground text-xs">Your answer:</p>
                          <p className="italic">{a.text_answer || '—'}</p>
                          {correct === null && <p className="text-xs text-yellow-600 mt-1">Pending manual grading</p>}
                        </div>
                      ) : (
                        q.choices.map((c) => {
                          const chosen = a.choice_id === c.id;
                          const isRight = (c as Choice & { is_correct?: boolean }).is_correct ?? false;
                          let cls = 'px-3 py-1 rounded text-sm ';
                          if (isRight) cls += 'bg-green-100 text-green-800 font-medium';
                          else if (chosen && !isRight) cls += 'bg-red-100 text-red-700 line-through';
                          else cls += 'text-muted-foreground';
                          return (
                            <div key={c.id} className={cls}>
                              {chosen ? '► ' : ''}{c.text}
                              {isRight && ' ✓'}
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  // ── Taking view ────────────────────────────────────────────────────────────

  if (phase === 'taking') {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <h1 className="font-semibold truncate">{quiz?.title}</h1>
            <p className="text-xs text-muted-foreground">{answeredCount} / {questions.length} answered</p>
          </div>
          <Button
            onClick={() => setConfirmSubmit(true)}
            disabled={submitMutation.isPending}
          >
            Submit Quiz
          </Button>
        </div>

        <div className="space-y-4">
          {questions.map((q, i) => {
            const myAnswer = answers[q.id];
            return (
              <Card key={q.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Q{i + 1} · {q.points} pt{q.points !== 1 ? 's' : ''}
                    {myAnswer && (myAnswer.choice_id != null || (myAnswer.text_answer ?? '').trim()) && (
                      <CheckCircle2 className="inline ml-2 h-3.5 w-3.5 text-green-500" />
                    )}
                  </CardTitle>
                  <p className="text-sm font-normal">{q.question}</p>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {q.type === 'short_answer' ? (
                    <Textarea
                      placeholder="Type your answer…"
                      rows={3}
                      value={myAnswer?.text_answer ?? ''}
                      onChange={(e) => handleAnswer(q.id, undefined, e.target.value)}
                      className="text-sm"
                    />
                  ) : (
                    q.choices.map((c) => {
                      const selected = myAnswer?.choice_id === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleAnswer(q.id, c.id)}
                          className={`w-full text-left px-3 py-2 rounded border text-sm transition-colors ${
                            selected
                              ? 'border-primary bg-primary/10 font-medium'
                              : 'border-input hover:bg-muted/50'
                          }`}
                        >
                          {c.text}
                        </button>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setConfirmSubmit(true)} disabled={submitMutation.isPending} size="lg">
            Submit Quiz
          </Button>
        </div>

        <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Submit Quiz?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              You've answered {answeredCount} of {questions.length} questions. You cannot change your answers after submission.
            </p>
            {answeredCount < questions.length && (
              <div className="flex items-center gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {questions.length - answeredCount} question{questions.length - answeredCount > 1 ? 's' : ''} unanswered.
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmSubmit(false)}>Cancel</Button>
              <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Pre-quiz view ──────────────────────────────────────────────────────────

  const alreadySubmitted = existingAttempt?.submitted_at != null;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <h1 className="font-semibold flex-1 truncate">{quiz?.title}</h1>
      </div>

      <Card>
        <CardContent className="py-4 space-y-3">
          {quiz?.instructions && (
            <p className="text-sm whitespace-pre-wrap">{quiz.instructions}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {quiz?.points && <span>{quiz.points} pts</span>}
            <span>{questions.length} questions</span>
            {quiz?.due_date && (
              <span>Due {new Date(quiz.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
          {alreadySubmitted && (
            <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Submitted — Score: {existingAttempt.score ?? 'pending'} / {existingAttempt.max_score}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {alreadySubmitted ? (
          <Button variant="outline" onClick={() => setPhase('result')}>
            View Results
          </Button>
        ) : (
          <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
            {startMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingAttempt && !existingAttempt.submitted_at ? 'Continue Quiz' : 'Start Quiz'}
          </Button>
        )}
      </div>
    </div>
  );
}
