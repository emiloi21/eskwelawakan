import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2, Upload, FileText, CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw, Download,
} from 'lucide-react';
import { toast } from 'sonner';

type EnrollmentData = {
  current: {
    student_id: string; name: string; grade_level: string; strand: string;
    dept: string; school_year: string; classification: string;
    status: string; section: string; remarks: string | null;
  };
  pending_reenrollment: {
    public_id: string; school_year: string; grade_level: string; status: string;
  } | null;
};

type Submission = {
  stud_reqs_id: number; public_id: string; status: string;
  file_path: string | null; remarks: string | null;
};

type Requirement = {
  require_id: number; public_id: string; requirement_name: string;
  description: string | null; type: string; purpose: string;
  submission: Submission | null;
};

const DEPTS = ['Preschool', 'Grade School', 'Junior High School', 'Senior High School'];

const GRADE_LEVELS: Record<string, string[]> = {
  'Preschool':          ['Prekinder', 'Kinder', 'Preparatory'],
  'Grade School':       ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
  'Junior High School': ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
  'Senior High School': ['Grade 11', 'Grade 12'],
};

const STRANDS = ['STEM', 'ABM', 'HUMSS', 'HE', 'ICT', 'TVL', 'N/A'];
const CLASSIFICATIONS = ['Old', 'Transferee', 'Returnee'];

function statusBadge(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  const map: Record<string, string> = {
    Enrolled:    'default',
    Pending:     'secondary',
    'For Validation': 'outline',
    Approved:    'default',
    Disapproved: 'destructive',
  };
  return (map[status] ?? 'outline') as 'default' | 'secondary' | 'outline' | 'destructive';
}

function enrollmentStatusBadge(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'Enrolled') return 'default';
  if (status === 'Pending') return 'secondary';
  if (status === 'Withdrawn' || status === 'Dropped') return 'destructive';
  return 'outline';
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
    mutationFn: () => api.post(`/student/enrollment/requirements/${req.public_id}/submit`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-enrollment-requirements'] }),
  });

  const handleUpload = async (file: File) => {
    setUploadError('');

    let studReqPublicId = req.submission?.public_id;
    if (!studReqPublicId) {
      const res = await submitMutation.mutateAsync();
      studReqPublicId = (res.data as { data: { public_id: string } }).data.public_id;
    }

    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      await api.post(`/student/enrollment/requirements/${studReqPublicId}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['student-enrollment-requirements'] });
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
          {req.submission?.file_path && (
            <a
              href={req.submission.file_path}
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
        <p className="text-xs text-destructive ml-7">Reason: {req.submission.remarks}</p>
      )}
      {uploadError && <p className="text-xs text-destructive ml-7">{uploadError}</p>}
    </div>
  );
}

export default function StudentEnrollmentPage() {
  const qc = useQueryClient();
  const [showReEnroll, setShowReEnroll] = useState(false);
  const [downloadingCoe, setDownloadingCoe] = useState(false);

  async function handleDownloadCoe() {
    setDownloadingCoe(true);
    try {
      const response = await api.get('/student/enrollment-certificate/pdf', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Certificate_of_Enrollment.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to generate certificate. Please try again.');
    } finally {
      setDownloadingCoe(false);
    }
  }
  const [reEnrollForm, setReEnrollForm] = useState({
    dept: '', gradeLevel: '', strand: '', classification: 'Old', schoolYear: '',
  });
  const [reEnrollError, setReEnrollError] = useState('');

  const { data: enrollData, isLoading } = useQuery<{ data: EnrollmentData }>({
    queryKey: ['student-enrollment-status'],
    queryFn: () => api.get('/student/enrollment').then(r => r.data),
  });

  const { data: reqData, isLoading: reqLoading } = useQuery<{ data: Requirement[] }>({
    queryKey: ['student-enrollment-requirements'],
    queryFn: () => api.get('/student/enrollment/requirements').then(r => r.data),
  });

  const reEnrollMutation = useMutation({
    mutationFn: (body: typeof reEnrollForm) => api.post('/student/enrollment/re-enroll', body),
    onSuccess: () => {
      setShowReEnroll(false);
      qc.invalidateQueries({ queryKey: ['student-enrollment-status'] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setReEnrollError(e.response?.data?.message ?? 'Failed to submit re-enrollment request.');
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const current = enrollData?.data.current;
  const pending = enrollData?.data.pending_reenrollment;
  const reqs    = reqData?.data ?? [];
  const isSHS = reEnrollForm.dept === 'Senior High School';

  const canReEnroll = current?.status === 'Enrolled' && !pending;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Enrollment & Requirements</h1>

      {/* Current enrollment info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">Current Enrollment</CardTitle>
              <CardDescription>SY {current?.school_year}</CardDescription>
            </div>
            {current?.status && (
              <Badge variant={enrollmentStatusBadge(current.status)}>{current.status}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 text-sm">
            <div><dt className="text-muted-foreground">Student ID</dt><dd className="font-mono">{current?.student_id}</dd></div>
            <div><dt className="text-muted-foreground">Name</dt><dd>{current?.name}</dd></div>
            <div><dt className="text-muted-foreground">Grade Level</dt><dd>{current?.grade_level}</dd></div>
            {current?.strand && current.strand !== 'N/A' && (
              <div><dt className="text-muted-foreground">Strand</dt><dd>{current.strand}</dd></div>
            )}
            <div><dt className="text-muted-foreground">Section</dt><dd>{current?.section !== '-' ? current?.section : '—'}</dd></div>
            <div><dt className="text-muted-foreground">Department</dt><dd>{current?.dept}</dd></div>
          </dl>

          {current?.remarks && (
            <p className="mt-3 text-xs text-muted-foreground border-t pt-3">
              <strong>Remarks:</strong> {current.remarks}
            </p>
          )}

          {/* Re-enrollment */}
          {canReEnroll && (
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
              <Button onClick={() => setShowReEnroll(true)} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" /> Request Re-Enrollment for Next Year
              </Button>
              {current?.status === 'Enrolled' && (
                <Button onClick={handleDownloadCoe} variant="outline" size="sm" disabled={downloadingCoe}>
                  {downloadingCoe
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Download className="h-4 w-4 mr-2" />}
                  Certificate of Enrollment
                </Button>
              )}
            </div>
          )}

          {pending && (
            <Alert className="mt-4">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                A re-enrollment request for <strong>SY {pending.school_year}</strong> ({pending.grade_level}) has been submitted and is currently <strong>{pending.status}</strong>. The registrar will review your application.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Requirements checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Document Requirements</CardTitle>
          <CardDescription>
            Upload required documents (JPG, PNG, or PDF, max 5 MB). The registrar will verify your submissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reqLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : reqs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-6">
              No document requirements found for your current enrollment. Contact the registrar if you have questions.
            </p>
          ) : (
            <div className="space-y-2">
              {reqs.map(req => <RequirementRow key={req.require_id} req={req} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Re-enroll dialog */}
      <Dialog open={showReEnroll} onOpenChange={o => { setShowReEnroll(o); setReEnrollError(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Re-Enrollment</DialogTitle>
            <DialogDescription>
              Complete the details for your re-enrollment application. The registrar will review and process your request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {reEnrollError && <Alert variant="destructive"><AlertDescription>{reEnrollError}</AlertDescription></Alert>}

            <div className="space-y-1.5">
              <Label>Department <span className="text-destructive">*</span></Label>
              <Select
                value={reEnrollForm.dept}
                onValueChange={v => setReEnrollForm(f => ({ ...f, dept: v ?? '', gradeLevel: '' }))}
              >
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Grade Level <span className="text-destructive">*</span></Label>
              <Select
                value={reEnrollForm.gradeLevel}
                onValueChange={v => setReEnrollForm(f => ({ ...f, gradeLevel: v ?? '' }))}
                disabled={!reEnrollForm.dept}
              >
                <SelectTrigger><SelectValue placeholder="Select grade level" /></SelectTrigger>
                <SelectContent>
                  {(GRADE_LEVELS[reEnrollForm.dept] ?? []).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {isSHS && (
              <div className="space-y-1.5">
                <Label>Strand <span className="text-destructive">*</span></Label>
                <Select
                  value={reEnrollForm.strand}
                  onValueChange={v => setReEnrollForm(f => ({ ...f, strand: v ?? '' }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select strand" /></SelectTrigger>
                  <SelectContent>{STRANDS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Classification <span className="text-destructive">*</span></Label>
              <Select
                value={reEnrollForm.classification}
                onValueChange={v => setReEnrollForm(f => ({ ...f, classification: v ?? '' }))}
              >
                <SelectTrigger><SelectValue placeholder="Select classification" /></SelectTrigger>
                <SelectContent>{CLASSIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>School Year to Enroll In <span className="text-destructive">*</span></Label>
              <input
                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm"
                placeholder="e.g. 2026-2027"
                maxLength={9}
                value={reEnrollForm.schoolYear}
                onChange={e => setReEnrollForm(f => ({ ...f, schoolYear: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReEnroll(false)}>Cancel</Button>
            <Button
              onClick={() => reEnrollMutation.mutate(reEnrollForm)}
              disabled={reEnrollMutation.isPending || !reEnrollForm.dept || !reEnrollForm.gradeLevel || !reEnrollForm.schoolYear}
            >
              {reEnrollMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
