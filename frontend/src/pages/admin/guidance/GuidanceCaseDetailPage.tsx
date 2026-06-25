import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BookOpen,
  CheckCheck,
  ClipboardList,
  FileText,
  FlaskConical,
  Plus,
  SendHorizonal,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import type {
  GuidanceCaseRecord,
  GuidanceSession,
  CaseStatus,
  RiskLevel,
  SessionType,
} from '@/types/guidance';

const STATUS_BADGE: Record<string, string> = {
  open:               'bg-blue-100 text-blue-800',
  ongoing:            'bg-indigo-100 text-indigo-800',
  resolved:           'bg-green-100 text-green-800',
  referred_external:  'bg-purple-100 text-purple-800',
  referred_cpc:       'bg-red-100 text-red-800',
  closed_transferred: 'bg-gray-200 text-gray-600',
  closed_withdrawn:   'bg-gray-200 text-gray-600',
};

const RISK_BADGE: Record<string, string> = {
  none:     'bg-gray-100 text-gray-600',
  low:      'bg-green-100 text-green-700',
  moderate: 'bg-yellow-100 text-yellow-800',
  high:     'bg-red-100 text-red-800',
};

const DEFAULT_SESSION_FORM = {
  session_date: '',
  session_type: 'individual' as SessionType,
  approach_used: '',
  presenting_issues: '',
  interventions_done: '',
  response_to_intervention: '',
  risk_level: 'none' as RiskLevel,
  next_steps: '',
  soap_subjective: '',
  soap_objective: '',
  soap_assessment: '',
  soap_plan: '',
};

const DEFAULT_CLOSE_FORM = {
  disposition: '' as CaseStatus | '',
  notes: '',
};

export default function GuidanceCaseDetailPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [sessionDialog, setSessionDialog] = useState(false);
  const [sessionForm, setSessionForm] = useState(DEFAULT_SESSION_FORM);
  const [closeDialog, setCloseDialog] = useState(false);
  const [closeForm, setCloseForm] = useState(DEFAULT_CLOSE_FORM);

  const { data: caseData, isLoading } = useQuery<GuidanceCaseRecord>({
    queryKey: ['guidance-case', publicId],
    queryFn: () => api.get(`/admin/guidance/cases/${publicId}`).then(r => r.data),
    enabled: !!publicId,
  });

  const { data: sessions = [] } = useQuery<GuidanceSession[]>({
    queryKey: ['guidance-sessions', publicId],
    queryFn: () => api.get(`/admin/guidance/cases/${publicId}/sessions`).then(r => r.data),
    enabled: !!publicId,
  });

  const addSessionMutation = useMutation({
    mutationFn: (payload: typeof DEFAULT_SESSION_FORM) =>
      api.post(`/admin/guidance/cases/${publicId}/sessions`, payload),
    onSuccess: () => {
      toast.success('Session recorded.');
      qc.invalidateQueries({ queryKey: ['guidance-sessions', publicId] });
      qc.invalidateQueries({ queryKey: ['guidance-case', publicId] });
      setSessionDialog(false);
      setSessionForm(DEFAULT_SESSION_FORM);
    },
    onError: () => toast.error('Failed to record session.'),
  });

  const closeCaseMutation = useMutation({
    mutationFn: (payload: { disposition: string; notes: string }) =>
      api.post(`/admin/guidance/cases/${publicId}/close`, payload),
    onSuccess: () => {
      toast.success('Case closed.');
      qc.invalidateQueries({ queryKey: ['guidance-case', publicId] });
      qc.invalidateQueries({ queryKey: ['guidance-cases'] });
      setCloseDialog(false);
    },
    onError: () => toast.error('Failed to close case.'),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading case…</div>;
  }

  if (!caseData) {
    return <div className="p-8 text-center text-red-600">Case not found.</div>;
  }

  const isActive = ['open', 'ongoing'].includes(caseData.status);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/guidance/cases')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <h1 className="text-xl font-bold">{caseData.case_number}</h1>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[caseData.status] ?? ''}`}
          >
            {caseData.status.replace('_', ' ')}
          </span>
          {caseData.urgency === 'crisis' && (
            <span className="flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full font-medium">
              <ShieldAlert className="h-3 w-3" /> Crisis
            </span>
          )}
        </div>
        {isActive && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setCloseDialog(true)}
          >
            <XCircle className="h-4 w-4 mr-1" /> Close Case
          </Button>
        )}
      </div>

      {/* Case summary */}
      <Card>
        <CardContent className="pt-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Student</p>
            <p className="font-medium">
              {caseData.student
                ? `${caseData.student.last_name}, ${caseData.student.first_name}`
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="capitalize">{caseData.case_type.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Counselor</p>
            <p>{caseData.assigned_counselor?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Opened</p>
            <p>{new Date(caseData.opened_at).toLocaleDateString()}</p>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-muted-foreground">Presenting Concern</p>
            <p className="text-sm">{caseData.presenting_concern}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">
            <BookOpen className="h-3.5 w-3.5 mr-1" /> Sessions ({sessions.length})
          </TabsTrigger>
          <TabsTrigger value="referrals">
            <ClipboardList className="h-3.5 w-3.5 mr-1" /> Referrals ({caseData.referrals?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="psych">
            <FlaskConical className="h-3.5 w-3.5 mr-1" /> Psych Tests ({caseData.psych_tests?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="external">
            <SendHorizonal className="h-3.5 w-3.5 mr-1" /> External Referrals ({caseData.external_referrals?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Sessions */}
        <TabsContent value="sessions">
          <div className="space-y-3 mt-3">
            {isActive && (
              <Button size="sm" onClick={() => setSessionDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Record Session
              </Button>
            )}
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No sessions recorded yet.</p>
            ) : (
              sessions.map(s => (
                <Card key={s.public_id}>
                  <CardHeader className="pb-1 pt-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>
                        Session #{s.session_number} &mdash; {new Date(s.session_date).toLocaleDateString()}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${RISK_BADGE[s.risk_level]}`}
                      >
                        Risk: {s.risk_level}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2 pb-3">
                    {s.interventions_done && (
                      <p><span className="text-muted-foreground text-xs">Interventions:</span> {s.interventions_done}</p>
                    )}
                    {s.next_steps && (
                      <p><span className="text-muted-foreground text-xs">Next steps:</span> {s.next_steps}</p>
                    )}
                    {s.case_note && (
                      <div className="bg-muted/30 rounded p-3 mt-2 space-y-1 text-xs">
                        <p className="font-semibold text-muted-foreground uppercase text-[10px]">SOAP Note</p>
                        <p><strong>S:</strong> {s.case_note.subjective}</p>
                        <p><strong>O:</strong> {s.case_note.objective}</p>
                        <p><strong>A:</strong> {s.case_note.assessment}</p>
                        <p><strong>P:</strong> {s.case_note.plan}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Referrals */}
        <TabsContent value="referrals">
          <div className="mt-3 space-y-2">
            {(caseData.referrals?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No referrals linked.</p>
            ) : (
              caseData.referrals?.map(r => (
                <div key={r.public_id} className="rounded border p-3 text-sm">
                  <p className="font-medium capitalize">{r.referral_type} referral by {r.referrer_name}</p>
                  <p className="text-muted-foreground text-xs mt-1">{r.concern_description}</p>
                  <p className="text-xs mt-1">Date: {r.referred_at} · Status: {r.status}</p>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Psych tests */}
        <TabsContent value="psych">
          <div className="mt-3 space-y-2">
            {(caseData.psych_tests?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No psychological tests on record.</p>
            ) : (
              caseData.psych_tests?.map(t => (
                <Card key={t.public_id}>
                  <CardContent className="pt-3 pb-3 text-sm space-y-1">
                    <p className="font-medium">{t.test_name}</p>
                    <p className="text-xs text-muted-foreground">Date: {t.test_date} · Score: {t.score_interpretation ?? '—'}</p>
                    {t.full_interpretation && <p className="text-xs">{t.full_interpretation}</p>}
                    <p className="text-xs text-muted-foreground">
                      Feedback given: {t.feedback_given ? `Yes (${t.feedback_date})` : 'No'}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* External referrals */}
        <TabsContent value="external">
          <div className="mt-3 space-y-2">
            {(caseData.external_referrals?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No external referrals.</p>
            ) : (
              caseData.external_referrals?.map(er => (
                <div key={er.public_id} className="rounded border p-3 text-sm">
                  <p className="font-medium">{er.agency_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{er.agency_type.replace('_', ' ')} · {er.referred_at}</p>
                  <p className="text-xs mt-1">{er.reason_for_referral}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    School head co-sign: {er.school_head_cosigned ? 'Yes' : 'No'} · Status: {er.status}
                  </p>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Session Dialog */}
      <Dialog open={sessionDialog} onOpenChange={setSessionDialog}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>Record Counseling Session</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Session Date</Label>
                <Input
                  type="date"
                  value={sessionForm.session_date}
                  onChange={e => setSessionForm(f => ({ ...f, session_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Session Type</Label>
                <Select
                  value={sessionForm.session_type}
                  onValueChange={v => setSessionForm(f => ({ ...f, session_type: v as SessionType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['individual', 'group', 'family', 'phone'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Approach Used</Label>
                <Input
                  value={sessionForm.approach_used}
                  onChange={e => setSessionForm(f => ({ ...f, approach_used: e.target.value }))}
                  placeholder="e.g. Client-Centered"
                />
              </div>
              <div>
                <Label>Risk Level</Label>
                <Select
                  value={sessionForm.risk_level}
                  onValueChange={v => setSessionForm(f => ({ ...f, risk_level: v as RiskLevel }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['none', 'low', 'moderate', 'high'].map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Interventions Done</Label>
              <Textarea
                rows={2}
                value={sessionForm.interventions_done}
                onChange={e => setSessionForm(f => ({ ...f, interventions_done: e.target.value }))}
              />
            </div>
            <div>
              <Label>Next Steps</Label>
              <Textarea
                rows={2}
                value={sessionForm.next_steps}
                onChange={e => setSessionForm(f => ({ ...f, next_steps: e.target.value }))}
              />
            </div>

            {/* SOAP Note */}
            <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
              <p className="text-xs font-semibold uppercase text-muted-foreground">SOAP Progress Note</p>
              {(['soap_subjective', 'soap_objective', 'soap_assessment', 'soap_plan'] as const).map(field => (
                <div key={field}>
                  <Label className="text-xs">{field.replace('soap_', '').toUpperCase()}</Label>
                  <Textarea
                    rows={2}
                    value={sessionForm[field]}
                    onChange={e => setSessionForm(f => ({ ...f, [field]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <Button
              className="w-full"
              disabled={addSessionMutation.isPending}
              onClick={() => addSessionMutation.mutate(sessionForm)}
            >
              {addSessionMutation.isPending ? 'Saving…' : 'Save Session'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Case Dialog */}
      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close / Dispose Case</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Disposition</Label>
              <Select
                value={closeForm.disposition}
                onValueChange={v => setCloseForm(f => ({ ...f, disposition: v as CaseStatus }))}
              >
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="referred_external">Referred to External Agency</SelectItem>
                  <SelectItem value="referred_cpc">Referred to Child Protection Committee</SelectItem>
                  <SelectItem value="closed_transferred">Closed — Student Transferred</SelectItem>
                  <SelectItem value="closed_withdrawn">Closed — Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Closure Notes</Label>
              <Textarea
                rows={3}
                value={closeForm.notes}
                onChange={e => setCloseForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <Button
              className="w-full"
              disabled={closeCaseMutation.isPending || !closeForm.disposition}
              onClick={() => closeCaseMutation.mutate({ disposition: closeForm.disposition, notes: closeForm.notes })}
            >
              {closeCaseMutation.isPending ? 'Closing…' : 'Confirm Closure'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
