import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, FileText, CheckCircle2, Clock, XCircle, AlertCircle, CalendarCheck, MapPin } from 'lucide-react';

type AppStatus = {
  name: string; student_id: string; grade_level: string; strand: string;
  dept: string; school_year: string; classification: string;
  status: string; app_date: string; remarks: string | null;
};

type Submission = {
  stud_reqs_id: number; public_id: string;  status: string;
  file_path: string | null;
  file_url?: string | null;
  remarks: string | null;
};

type Requirement = {
  require_id: number; public_id: string; requirement_name: string;
  description: string | null; type: string; purpose: string;
  submission: Submission | null;
};

type ExamSchedule = {
  booking_id: number;
  result: string | null;
  remarks: string | null;
  slot: {
    public_id: string;
    exam_date: string;
    exam_time: string;
    location: string;
    school_year: string;
    dept: string | null;
    grade_level: string | null;
    notes: string | null;
  };
};

function formatExamDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatExamTime(t: string) {
  try {
    const [h, m] = t.split(':');
    const d = new Date();
    d.setHours(Number(h), Number(m));
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch { return t; }
}

const STATUS_STEPS = [
  { key: 'Pending',                   label: 'Application Received' },
  { key: 'For Application Assessment', label: 'Document Review' },
  { key: 'For Accounts Assessment',    label: 'Accounts Assessment' },
  { key: 'For Payment',                label: 'For Payment' },
  { key: 'Enrolled',                   label: 'Enrolled' },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Pending: 'secondary',
    'For Validation': 'outline',
    Approved: 'default',
    Disapproved: 'destructive',
  };
  return (map[status] ?? 'outline') as 'default' | 'secondary' | 'outline' | 'destructive';
}

function submissionIcon(status?: string | null) {
  switch (status) {
    case 'Approved':     return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'Disapproved':  return <XCircle className="h-4 w-4 text-destructive" />;
    case 'For Validation': return <Clock className="h-4 w-4 text-yellow-500" />;
    default:             return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

function RequirementRow({ req }: { req: Requirement }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/applicant/requirements/${req.public_id}/submit`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applicant-requirements'] }),
  });

  const handleUpload = async (file: File) => {
    setUploadError('');

    // Ensure a StudentRequirement row exists first
    let studReqPublicId = req.submission?.public_id;
    if (!studReqPublicId) {
      const res = await submitMutation.mutateAsync();
      studReqPublicId = (res.data as { data: { public_id: string } }).data.public_id;
    }

    const fd = new FormData();
    fd.append('file', file);

    setUploading(true);
    try {
      await api.post(`/applicant/requirements/${studReqPublicId}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['applicant-requirements'] });
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const canUpload = !req.submission || req.submission.status === 'Disapproved';

  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {submissionIcon(req.submission?.status)}
          <div>
            <p className="text-sm font-medium">{req.requirement_name}</p>
            {req.description && <p className="text-xs text-muted-foreground">{req.description}</p>}
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          {req.submission && (
            <Badge variant={statusBadge(req.submission.status)} className="text-xs">
              {req.submission.status}
            </Badge>
          )}
          {req.submission?.file_url && (
            <a
              href={req.submission.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <FileText className="h-3 w-3" /> View
            </a>
          )}
          {canUpload && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { handleUpload(f); e.target.value = ''; }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={uploading || submitMutation.isPending}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                {req.submission?.status === 'Disapproved' ? 'Re-upload' : 'Upload'}
              </Button>
            </>
          )}
        </div>
      </div>
      {req.submission?.status === 'Disapproved' && req.submission.remarks && (
        <p className="text-xs text-destructive ml-7">Note: {req.submission.remarks}</p>
      )}
      {uploadError && <p className="text-xs text-destructive ml-7">{uploadError}</p>}
    </div>
  );
}

export default function ApplicantDashboard() {
  const { data: statusData, isLoading: statusLoading } = useQuery<{ data: AppStatus }>({
    queryKey: ['applicant-status'],
    queryFn: () => api.get('/applicant/status').then(r => r.data),
  });

  const { data: examData } = useQuery<{ data: ExamSchedule | null }>({
    queryKey: ['applicant-exam-schedule'],
    queryFn: () => api.get('/applicant/exam-schedule').then(r => r.data),
  });

  const { data: reqData, isLoading: reqLoading } = useQuery<{ data: Requirement[] }>({
    queryKey: ['applicant-requirements'],
    queryFn: () => api.get('/applicant/requirements').then(r => r.data),
  });

  if (statusLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const appData = statusData?.data;
  const reqs = reqData?.data ?? [];

  // Determine current step index
  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === appData?.status);
  const effectiveStep = appData?.status === 'Enrolled' ? STATUS_STEPS.length - 1
    : currentStepIdx >= 0 ? currentStepIdx : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Application</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {appData?.name} — {appData?.grade_level}{appData?.strand && appData.strand !== 'N/A' ? ` (${appData.strand})` : ''}, SY {appData?.school_year}
        </p>
      </div>

      {/* Status timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Application Status</CardTitle>
          <CardDescription>Track your enrollment progress below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-muted-foreground/20" />
            <ol className="space-y-4 relative">
              {STATUS_STEPS.map((s, i) => {
                const done  = i < effectiveStep;
                const active = i === effectiveStep;
                return (
                  <li key={s.key} className="flex items-start gap-3 pl-0">
                    <div className={`relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      done  ? 'bg-primary border-primary text-primary-foreground'
                      : active ? 'bg-background border-primary'
                      : 'bg-background border-muted-foreground/30'
                    }`}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : (
                        <span className={`text-xs font-semibold ${active ? 'text-primary' : 'text-muted-foreground'}`}>{i + 1}</span>
                      )}
                    </div>
                    <div className="pt-0.5">
                      <p className={`text-sm font-medium ${active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {s.label}
                      </p>
                      {active && appData?.remarks && (
                        <p className="text-xs text-muted-foreground mt-0.5">{appData.remarks}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {appData?.status === 'Enrolled' && (
            <Alert className="mt-4 border-green-200 bg-green-50 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Congratulations! You are now enrolled. You can log in to your <strong>Student Portal</strong> using the same credentials.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Exam Schedule */}
      {examData?.data && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4" />
                  Entrance Exam Schedule
                </CardTitle>
                <CardDescription>Your exam appointment has been set.</CardDescription>
              </div>
              {examData.data.result ? (
                <Badge variant={examData.data.result === 'Pass' ? 'default' : 'destructive'}>
                  {examData.data.result === 'Pass' ? '✓ Passed' : '✗ Failed'}
                </Badge>
              ) : (
                <Badge variant="secondary">Scheduled</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{formatExamDate(examData.data.slot.exam_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{formatExamTime(examData.data.slot.exam_time)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{examData.data.slot.location}</span>
            </div>
            {examData.data.slot.notes && (
              <p className="text-xs text-muted-foreground border-t pt-2 mt-1">{examData.data.slot.notes}</p>
            )}
            {examData.data.remarks && (
              <p className="text-xs text-muted-foreground italic">Remarks: {examData.data.remarks}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Requirements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Document Requirements</CardTitle>
          <CardDescription>
            Upload JPG, PNG, or PDF files (max 5 MB each). The registrar will review your submissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reqLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : reqs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-6">
              No requirements have been set up for your grade level yet. Please check back later or contact the registrar.
            </p>
          ) : (
            <div className="space-y-2">
              {reqs.map(req => <RequirementRow key={req.require_id} req={req} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
