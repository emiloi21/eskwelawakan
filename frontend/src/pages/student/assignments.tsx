import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, ClipboardList, ArrowLeft, Trash2, Download, AlertCircle, CheckCircle2, Clock, BookOpen } from 'lucide-react';

interface SubmissionFile {
  id: number;
  original_name: string;
  download_url: string;
  file_size: number;
}

interface Submission {
  id: number;
  public_id: string;
  status: 'assigned' | 'turned_in' | 'graded' | 'returned' | 'late';
  student_note: string | null;
  submitted_at: string | null;
  score: string | null;
  feedback: string | null;
  graded_at: string | null;
  files: SubmissionFile[];
}

interface Assignment {
  id: number;
  public_id: string;
  type: 'assignment' | 'quiz' | 'material';
  title: string;
  instructions: string | null;
  points: string | null;
  due_date: string | null;
  topic: string | null;
  allow_late: boolean;
  created_at: string;
  my_submission: Submission | null;
  flashcard_deck_id: number | null;
  deck?: { id: number; public_id: string; title: string } | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  assigned:  { label: 'Not submitted', class: 'bg-gray-100 text-gray-600' },
  turned_in: { label: 'Submitted', class: 'bg-blue-100 text-blue-700' },
  late:      { label: 'Late', class: 'bg-yellow-100 text-yellow-700' },
  graded:    { label: 'Graded', class: 'bg-green-100 text-green-700' },
  returned:  { label: 'Returned', class: 'bg-purple-100 text-purple-700' },
};

export default function StudentAssignmentsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [view, setView] = useState<Assignment | null>(null);
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [unsubmitDialog, setUnsubmitDialog] = useState(false);

  const { data, isLoading, isError } = useQuery<{ data: Assignment[] }>({
    queryKey: ['student-assignments'],
    queryFn: async () => {
      const { data } = await api.get('/student/assignments');
      return data;
    },
  });

  const { data: detail, isLoading: detailLoading } = useQuery<{ data: Assignment; submission: Submission | null }>({
    queryKey: ['student-assignment-detail', view?.public_id],
    queryFn: async () => {
      const { data } = await api.get(`/student/assignments/${view!.public_id}`);
      return data;
    },
    enabled: !!view,
  });

  const submission = detail?.submission ?? view?.my_submission ?? null;
  const assignment = detail?.data ?? view;

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!view) return;
      const form = new FormData();
      form.append('student_note', note);
      files.forEach((f) => form.append('files[]', f));
      await api.post(`/student/assignments/${view.public_id}/submit`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-assignments'] });
      qc.invalidateQueries({ queryKey: ['student-assignment-detail', view?.public_id] });
      setNote('');
      setFiles([]);
      toast.success('Submitted successfully.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Submission failed.'),
  });

  const unsubmitMutation = useMutation({
    mutationFn: async () => {
      if (!view) return;
      await api.delete(`/student/assignments/${view.public_id}/unsubmit`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-assignments'] });
      qc.invalidateQueries({ queryKey: ['student-assignment-detail', view?.public_id] });
      setUnsubmitDialog(false);
      toast.success('Submission retracted.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to retract.'),
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await api.delete(`/student/assignments/files/${fileId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-assignment-detail', view?.public_id] });
      toast.success('File removed.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to remove file.'),
  });

  const assignments = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading assignments…
      </div>
    );
  }

  if (isError) {
    return <div className="py-12 text-center text-sm text-destructive">Failed to load assignments.</div>;
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  if (view) {
    const canSubmit = !submission || submission.status === 'returned';
    const isOverdue = assignment?.due_date && new Date(assignment.due_date) < new Date();

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView(null)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </div>

        {detailLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <>
            {/* Assignment info */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{assignment?.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs capitalize">{assignment?.type}</Badge>
                      {assignment?.topic && <Badge variant="secondary" className="text-xs">{assignment.topic}</Badge>}
                      {assignment?.points && <span className="text-xs text-muted-foreground">{assignment.points} pts</span>}
                    </div>
                  </div>
                  <span className={`inline-block rounded px-2 py-1 text-xs font-medium shrink-0 ${STATUS_BADGE[submission?.status ?? 'assigned'].class}`}>
                    {STATUS_BADGE[submission?.status ?? 'assigned'].label}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {assignment?.due_date && (
                  <p className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                    <Clock className="h-3.5 w-3.5" />
                    Due {new Date(assignment.due_date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {isOverdue && ' (overdue)'}
                  </p>
                )}
                {assignment?.instructions && (
                  <p className="whitespace-pre-wrap text-muted-foreground">{assignment.instructions}</p>
                )}
              </CardContent>
            </Card>

            {/* Study Deck card (for material type with linked deck) */}
            {assignment?.type === 'material' && assignment?.deck && (
              <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
                <CardContent className="py-4 px-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">{assignment.deck.title}</p>
                      <p className="text-xs text-muted-foreground">Linked flashcard deck</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/student/flashcards/${assignment.deck!.public_id}`)}>
                    Study Deck
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Grade & Feedback (if graded) */}
            {submission && submission.status === 'graded' && (
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5 text-green-700">
                    <CheckCircle2 className="h-4 w-4" /> Graded
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {submission.score != null && (
                    <p className="font-semibold">
                      Score: {submission.score}{assignment?.points ? ` / ${assignment.points}` : ''}
                    </p>
                  )}
                  {submission.feedback && <p className="text-muted-foreground">{submission.feedback}</p>}
                </CardContent>
              </Card>
            )}

            {/* Returned for revision */}
            {submission?.status === 'returned' && (
              <Card className="border-purple-200 bg-purple-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5 text-purple-700">
                    <AlertCircle className="h-4 w-4" /> Returned for Revision
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {submission.feedback && <p className="text-muted-foreground">{submission.feedback}</p>}
                </CardContent>
              </Card>
            )}

            {/* Existing submission files */}
            {submission && submission.files.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Submitted files</p>
                {submission.files.map((f) => (
                  <Card key={f.id}>
                    <CardContent className="py-2 px-4 flex items-center gap-3">
                      <p className="flex-1 text-sm truncate">{f.original_name}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{formatBytes(f.file_size)}</span>
                      <a href={f.download_url} target="_blank" rel="noreferrer" download={f.original_name}>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                      </a>
                      {canSubmit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm('Remove this file?')) deleteFileMutation.mutate(f.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Submit / Re-submit form */}
            {canSubmit && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {submission?.status === 'returned' ? 'Resubmit' : 'Turn In'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label>Note <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Any note for your teacher…"
                      rows={3}
                      maxLength={5000}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Attach files <span className="text-muted-foreground text-xs">(optional, max 10 × 20MB)</span></Label>
                    <input
                      ref={fileRef}
                      type="file"
                      multiple
                      className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded file:border file:border-input file:bg-background file:px-3 file:py-1 file:text-sm file:font-medium hover:file:bg-accent cursor-pointer"
                      onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                    />
                    {files.length > 0 && (
                      <ul className="text-xs text-muted-foreground space-y-0.5 pl-1">
                        {files.map((f, i) => <li key={i}>{f.name} ({formatBytes(f.size)})</li>)}
                      </ul>
                    )}
                  </div>

                  {isOverdue && !assignment?.allow_late && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> Late submissions are not allowed for this assignment.
                    </p>
                  )}

                  <div className="flex justify-between pt-1">
                    {submission && (
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setUnsubmitDialog(true)}>
                        Retract submission
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="ml-auto"
                      onClick={() => submitMutation.mutate()}
                      disabled={submitMutation.isPending || (!!isOverdue && !assignment?.allow_late)}
                    >
                      {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {submission?.status === 'returned' ? 'Resubmit' : 'Turn In'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Retract confirmation dialog */}
        <Dialog open={unsubmitDialog} onOpenChange={setUnsubmitDialog}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Retract Submission?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Your submitted files and note will be removed. You can submit again after.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUnsubmitDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => unsubmitMutation.mutate()} disabled={unsubmitMutation.isPending}>
                {unsubmitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Retract
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
        <p className="text-muted-foreground">Classwork assigned by your teacher</p>
      </div>

      {assignments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <ClipboardList className="h-10 w-10" />
          <p className="text-sm">No assignments yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => {
            const sub = a.my_submission;
            const status = sub?.status ?? 'assigned';
            const badge = STATUS_BADGE[status];
            const isOverdue = a.due_date && new Date(a.due_date) < new Date() && status === 'assigned';

            return (
              <Card
                key={a.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => {
                  if (a.type === 'quiz') {
                    navigate(`/student/quizzes/${a.public_id}`);
                  } else {
                    setView(a); setNote(''); setFiles([]);
                  }
                }}
              >
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <div className="shrink-0">
                    {a.type === 'quiz'
                      ? <AlertCircle className="h-5 w-5 text-orange-500" />
                      : a.type === 'material' && a.flashcard_deck_id
                        ? <BookOpen className="h-5 w-5 text-blue-500" />
                        : <ClipboardList className="h-5 w-5 text-blue-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.topic && <span className="mr-2 italic">{a.topic}</span>}
                      {a.points ? `${a.points} pts` : 'Ungraded'}
                      {a.due_date && (
                        <span className={isOverdue ? ' text-destructive font-medium' : ''}>
                          {' · Due '}{new Date(a.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium shrink-0 ${badge.class}`}>
                    {badge.label}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
