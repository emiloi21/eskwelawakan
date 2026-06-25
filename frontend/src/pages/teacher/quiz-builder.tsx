import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Plus, Trash2, Save, GripVertical, CheckCircle2 } from 'lucide-react';

interface ChoiceDraft {
  text: string;
  is_correct: boolean;
  order: number;
}

interface QuestionDraft {
  _key: string; // local React key
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  points: number;
  order: number;
  choices: ChoiceDraft[];
}

interface Assignment {
  id: number;
  public_id: string;
  title: string;
  points: string | null;
  type: string;
}

let _seq = 0;
function uid() { return `q_${Date.now()}_${++_seq}`; }

function defaultChoices(type: QuestionDraft['type']): ChoiceDraft[] {
  if (type === 'true_false') {
    return [
      { text: 'True', is_correct: true, order: 0 },
      { text: 'False', is_correct: false, order: 1 },
    ];
  }
  if (type === 'multiple_choice') {
    return [
      { text: '', is_correct: false, order: 0 },
      { text: '', is_correct: false, order: 1 },
      { text: '', is_correct: false, order: 2 },
      { text: '', is_correct: false, order: 3 },
    ];
  }
  return [];
}

function newQuestion(order: number): QuestionDraft {
  const type: QuestionDraft['type'] = 'multiple_choice';
  return { _key: uid(), type, question: '', points: 1, order, choices: defaultChoices(type) };
}

export default function TeacherQuizBuilderPage() {
  const { classId, publicId } = useParams<{ classId: string; publicId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestion(0)]);
  const [initialized, setInitialized] = useState(false);

  const { data: assignmentData, isLoading: assignmentLoading } = useQuery<{ assignment: Assignment; data: unknown[] }>({
    queryKey: ['quiz-builder', classId, publicId],
    queryFn: async () => {
      const { data } = await api.get(`/teacher/classes/${classId}/assignments/${publicId}/quiz/questions`);
      return data;
    },
    enabled: !!classId && !!publicId,
  });

  // Populate questions from server on first load
  if (assignmentData && !initialized) {
    setInitialized(true);
    const serverQs = assignmentData.data as Array<{
      _key?: string; type: QuestionDraft['type']; question: string; points: number; order: number;
      choices: ChoiceDraft[];
    }>;
    if (serverQs.length > 0) {
      setQuestions(serverQs.map((q, i) => ({ ...q, _key: uid(), order: i, choices: q.choices ?? [] })));
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = questions.map((q, i) => ({ ...q, order: i }));
      const { data } = await api.post(`/teacher/classes/${classId}/assignments/${publicId}/quiz/questions`, { questions: payload });
      return data;
    },
    onSuccess: () => {
      toast.success('Quiz saved.');
      qc.invalidateQueries({ queryKey: ['quiz-builder', classId, publicId] });
    },
    onError: () => toast.error('Failed to save quiz.'),
  });

  // ── question helpers ───────────────────────────────────────────────────────

  const updateQuestion = (key: string, patch: Partial<QuestionDraft>) => {
    setQuestions((qs) => qs.map((q) => (q._key === key ? { ...q, ...patch } : q)));
  };

  const changeType = (key: string, type: QuestionDraft['type']) => {
    setQuestions((qs) =>
      qs.map((q) => (q._key === key ? { ...q, type, choices: defaultChoices(type) } : q)),
    );
  };

  const addQuestion = () => {
    setQuestions((qs) => [...qs, newQuestion(qs.length)]);
  };

  const removeQuestion = (key: string) => {
    setQuestions((qs) => qs.filter((q) => q._key !== key));
  };

  const updateChoice = (qKey: string, idx: number, patch: Partial<ChoiceDraft>) => {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q._key !== qKey) return q;
        const choices = q.choices.map((c, i) => (i === idx ? { ...c, ...patch } : c));
        return { ...q, choices };
      }),
    );
  };

  const setCorrect = (qKey: string, idx: number) => {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q._key !== qKey) return q;
        return { ...q, choices: q.choices.map((c, i) => ({ ...c, is_correct: i === idx })) };
      }),
    );
  };

  const addChoice = (qKey: string) => {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q._key !== qKey) return q;
        return { ...q, choices: [...q.choices, { text: '', is_correct: false, order: q.choices.length }] };
      }),
    );
  };

  const removeChoice = (qKey: string, idx: number) => {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q._key !== qKey) return q;
        return { ...q, choices: q.choices.filter((_, i) => i !== idx) };
      }),
    );
  };

  if (assignmentLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading quiz…
      </div>
    );
  }

  const assignment = assignmentData?.assignment;
  const totalPts = questions.reduce((s, q) => s + (q.points || 0), 0);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{assignment?.title ?? 'Quiz Builder'}</h1>
          <p className="text-xs text-muted-foreground">{questions.length} questions · {totalPts} pts total</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Quiz
        </Button>
      </div>

      {/* Questions */}
      {questions.map((q, qIdx) => (
        <Card key={q._key} className="relative">
          <CardHeader className="pb-2 flex flex-row items-start gap-3">
            <div className="mt-1 text-muted-foreground cursor-grab">
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold shrink-0">Q{qIdx + 1}</span>
                <Select value={q.type} onValueChange={(v) => changeType(q._key, v as QuestionDraft['type'])}>
                  <SelectTrigger className="h-7 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True / False</SelectItem>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1 ml-auto">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={q.points}
                    onChange={(e) => updateQuestion(q._key, { points: parseInt(e.target.value) || 1 })}
                    className="h-7 w-16 text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground">pts</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeQuestion(q._key)}
                  disabled={questions.length <= 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea
                placeholder="Enter question text…"
                value={q.question}
                onChange={(e) => updateQuestion(q._key, { question: e.target.value })}
                rows={2}
                className="text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="pl-10 space-y-2">
            {/* Choices */}
            {q.type !== 'short_answer' && (
              <>
                {q.choices.map((choice, cIdx) => (
                  <div key={cIdx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrect(q._key, cIdx)}
                      className={`shrink-0 rounded-full w-5 h-5 border-2 flex items-center justify-center transition-colors ${
                        choice.is_correct
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-gray-300 hover:border-green-400'
                      }`}
                      title="Mark as correct"
                    >
                      {choice.is_correct && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                    {q.type === 'true_false' ? (
                      <span className="text-sm">{choice.text}</span>
                    ) : (
                      <Input
                        value={choice.text}
                        onChange={(e) => updateChoice(q._key, cIdx, { text: e.target.value })}
                        placeholder={`Choice ${cIdx + 1}`}
                        className="h-7 text-sm flex-1"
                      />
                    )}
                    {q.type === 'multiple_choice' && q.choices.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground"
                        onClick={() => removeChoice(q._key, cIdx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                {q.type === 'multiple_choice' && q.choices.length < 6 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addChoice(q._key)}>
                    <Plus className="mr-1 h-3 w-3" /> Add choice
                  </Button>
                )}
              </>
            )}
            {q.type === 'short_answer' && (
              <p className="text-xs text-muted-foreground italic">Students type their answer. Graded manually.</p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Add question */}
      <Button variant="outline" className="w-full" onClick={addQuestion}>
        <Plus className="mr-2 h-4 w-4" /> Add Question
      </Button>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="lg">
          {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Quiz
        </Button>
      </div>
    </div>
  );
}
