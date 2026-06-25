import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { Student, PaginatedResponse } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DataTableFilterButton, DataTableFilterSheet } from '@/components/ui/data-table-filter-sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Loader2, Search, Eye, ChevronRight, CheckCircle2, XCircle,
  Clock, FileText, Upload, AlertCircle, ExternalLink, CalendarCheck, MapPin, MoreVertical, Printer, Download,
} from 'lucide-react';

const APPLICANT_STATUSES = ['Pending', 'For Application Assessment'] as const;

type ApplicantStatus = (typeof APPLICANT_STATUSES)[number];

const NEXT_STATUS: Record<ApplicantStatus, string> = {
  'Pending':                   'For Application Assessment',
  'For Application Assessment': 'For Accounts Assessment',
};

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  'Pending':                    'outline',
  'For Application Assessment': 'secondary',
  'For Accounts Assessment':    'default',
};

type RequirementChecklist = {
  require_id: number;
  public_id: string;
  requirement_name: string;
  description: string | null;
  purpose: string;
  submitted: boolean;
  stud_reqs_id: number | null;
  stud_req_public_id: string | null;
  req_status: string;
  file_path: string | null;
  remarks: string | null;
};

function reqStatusIcon(status: string) {
  switch (status) {
    case 'Approved':      return <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />;
    case 'Disapproved':   return <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />;
    case 'For Validation': return <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
    case 'Not Submitted': return <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    default:              return <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
  }
}

function reqStatusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'Approved') return 'default';
  if (status === 'Disapproved') return 'destructive';
  if (status === 'For Validation') return 'secondary';
  return 'outline';
}

type ExamBookingInfo = {
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

type ExamSlotOption = {
  id: number;
  public_id: string;
  exam_date: string;
  exam_time: string;
  location: string;
  capacity: number;
  bookings_count: number;
  dept: string | null;
  grade_level: string | null;
};

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtTime(t: string) {
  try {
    const [h, m] = t.split(':');
    const dt = new Date();
    dt.setHours(Number(h), Number(m));
    return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch { return t; }
}

// ── Requirement row with approve/disapprove ─────────────────────────────────
function RequirementVerifyRow({
  req, studentId, sy,
}: { req: RequirementChecklist; studentId: string; sy: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [disapproveOpen, setDisapproveOpen] = useState(false);
  const [disapproveRemarks, setDisapproveRemarks] = useState('');
  const [uploading, setUploading] = useState(false);

  const approveMutation = useMutation({
    mutationFn: () =>
      api.post(`/registrar/requirements/approve/${req.stud_req_public_id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicant-reqs', studentId, sy] });
      qc.invalidateQueries({ queryKey: ['applicants'] });
      toast.success('Requirement approved.');
    },
    onError: () => toast.error('Approve failed.'),
  });

  const disapproveMutation = useMutation({
    mutationFn: () =>
      api.post(`/registrar/requirements/disapprove/${req.stud_req_public_id}`, {
        remarks: disapproveRemarks,
      }),
    onSuccess: () => {
      setDisapproveOpen(false);
      qc.invalidateQueries({ queryKey: ['applicant-reqs', studentId, sy] });
      qc.invalidateQueries({ queryKey: ['applicants'] });
      toast.success('Requirement disapproved.');
    },
    onError: () => toast.error('Disapprove failed.'),
  });

  const toggleMutation = useMutation({
    mutationFn: () =>
      api.post(`/registrar/requirements/student/${studentId}/${req.public_id}`, {
        submitted: true,
        schoolYear: sy,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicant-reqs', studentId, sy] });
      toast.success('Requirement marked as submitted.');
    },
    onError: () => toast.error('Failed to update requirement.'),
  });

  const handleUpload = async (file: File) => {
    if (!req.stud_req_public_id) {
      toast.error('Submit the requirement first before uploading.');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      await api.post(`/registrar/requirements/upload/${req.stud_req_public_id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['applicant-reqs', studentId, sy] });
      toast.success('File uploaded.');
    } catch {
      toast.error('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const canAction = req.submitted && req.stud_req_public_id && req.req_status === 'For Validation';
  const canApprove = canAction;
  const canDisapprove = canAction || req.req_status === 'Approved';

  return (
    <>
      <div className="flex flex-col gap-1.5 rounded-lg border p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {reqStatusIcon(req.req_status)}
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">{req.requirement_name}</p>
              {req.description && (
                <p className="text-xs text-muted-foreground">{req.description}</p>
              )}
              {req.purpose && (
                <p className="text-xs text-muted-foreground italic">{req.purpose}</p>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-2 flex-wrap justify-end">
            <Badge variant={reqStatusVariant(req.req_status)} className="text-xs whitespace-nowrap">
              {req.req_status}
            </Badge>

            {req.file_path && (
              <a
                href={req.file_path}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 whitespace-nowrap"
              >
                <ExternalLink className="h-3 w-3" /> View File
              </a>
            )}

            {canApprove && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate()}
              >
                {approveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                Approve
              </Button>
            )}

            {canDisapprove && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => { setDisapproveRemarks(''); setDisapproveOpen(true); }}
              >
                <XCircle className="h-3 w-3 mr-1" /> Disapprove
              </Button>
            )}

            {!req.submitted && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                disabled={toggleMutation.isPending}
                onClick={() => toggleMutation.mutate()}
              >
                {toggleMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Mark Submitted'}
              </Button>
            )}

            {req.submitted && !req.file_path && (
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
                  variant="ghost"
                  className="h-7 text-xs"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                  Upload
                </Button>
              </>
            )}
          </div>
        </div>

        {req.req_status === 'Disapproved' && req.remarks && (
          <p className="text-xs text-destructive ml-7">Reason: {req.remarks}</p>
        )}
      </div>

      {/* Disapprove dialog */}
      <Dialog open={disapproveOpen} onOpenChange={setDisapproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disapprove Requirement</DialogTitle>
            <DialogDescription>
              Provide a reason so the applicant knows what to re-upload.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Remarks / Reason</Label>
            <Textarea
              rows={3}
              placeholder="e.g. Photo is blurry or document is incomplete"
              value={disapproveRemarks}
              onChange={e => setDisapproveRemarks(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisapproveOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={disapproveMutation.isPending}
              onClick={() => disapproveMutation.mutate()}
            >
              {disapproveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Disapprove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Applicant detail side panel ─────────────────────────────────────────────
function ApplicantDetailSheet({
  student, open, onClose,
}: { student: Student | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const sy = student?.schoolYear ?? '';
  const studentId = student?.student_id ?? '';

  const { data: reqData, isLoading: reqLoading } = useQuery<{ data: RequirementChecklist[] }>({
    queryKey: ['applicant-reqs', studentId, sy],
    queryFn: () =>
      api.get(`/registrar/requirements/student/${studentId}`, {
        params: { schoolYear: sy, reg_id: student?.reg_id },
      }).then(r => r.data),
    enabled: open && !!student,
  });

  const { data: examBookingData, isLoading: examBookingLoading } = useQuery<{ data: ExamBookingInfo | null }>({
    queryKey: ['applicant-exam-booking', student?.public_id],
    queryFn: () => api.get(`/registrar/applicants/${student!.public_id}/exam-booking`).then(r => r.data),
    enabled: open && !!student,
  });

  const { data: slotsData } = useQuery<{ data: ExamSlotOption[] }>({
    queryKey: ['exam-slots', sy],
    queryFn: () => api.get('/registrar/exam-slots', { params: { schoolYear: sy } }).then(r => r.data),
    enabled: open && !!student,
  });

  const [selectedSlotId, setSelectedSlotId] = useState('');

  const bookMutation = useMutation({
    mutationFn: () =>
      api.post(`/registrar/exam-slots/${selectedSlotId}/book`, {
        applicant_public_id: student!.public_id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicant-exam-booking', student?.public_id] });
      qc.invalidateQueries({ queryKey: ['exam-slots', sy] });
      qc.invalidateQueries({ queryKey: ['exam-bookings'] });
      setSelectedSlotId('');
      toast.success('Applicant assigned to exam slot.');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Assignment failed.'),
  });

  const unbookMutation = useMutation({
    mutationFn: (slotPublicId: string) =>
      api.delete(`/registrar/exam-slots/${slotPublicId}/book/${student!.public_id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicant-exam-booking', student?.public_id] });
      qc.invalidateQueries({ queryKey: ['exam-slots', sy] });
      qc.invalidateQueries({ queryKey: ['exam-bookings'] });
      toast.success('Exam booking removed.');
    },
    onError: () => toast.error('Failed to remove booking.'),
  });

  const advanceMutation = useMutation({
    mutationFn: (nextStatus: string) =>
      api.post(`/registrar/enrollment/${student!.public_id}/transition`, { status: nextStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicants'] });
      qc.invalidateQueries({ queryKey: ['applicant-reqs', studentId, sy] });
      toast.success('Status updated.');
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Transition failed.'),
  });

  if (!student) return null;

  const status = student.status as ApplicantStatus;
  const nextStatus = NEXT_STATUS[status];

  const reqs = reqData?.data ?? [];
  const allAdmissionApproved = reqs
    .filter(r => r.purpose === 'for Admission')
    .every(r => r.req_status === 'Approved');
  const hasAnyRequirements = reqs.length > 0;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{student.lname}, {student.fname}</SheetTitle>
          <SheetDescription className="flex flex-wrap gap-2 items-center">
            <span className="font-mono text-xs">{student.student_id}</span>
            <Badge variant={STATUS_BADGE[student.status] ?? 'outline'}>{student.status}</Badge>
            <span className="text-xs">{student.gradeLevel} · {student.dept}</span>
            <span className="text-xs">SY {student.schoolYear}</span>
          </SheetDescription>
        </SheetHeader>

        {/* Applicant info */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-5">
          <div><p className="text-muted-foreground text-xs">LRN</p><p className="font-mono">{student.lrn}</p></div>
          <div><p className="text-muted-foreground text-xs">Birthday</p><p>{student.bdMM}/{student.bdDD}/{student.bdYYYY}</p></div>
          <div><p className="text-muted-foreground text-xs">Sex</p><p>{student.sex}</p></div>
          <div><p className="text-muted-foreground text-xs">Classification</p><p>{student.classification}</p></div>
          <div><p className="text-muted-foreground text-xs">Guardian</p><p>{student.guardian_fname} {student.guardian_lname}</p></div>
          <div><p className="text-muted-foreground text-xs">Contact</p><p>{student.guardian_contact}</p></div>
          <div className="col-span-2"><p className="text-muted-foreground text-xs">Last School</p><p>{student.last_school} ({student.last_school_sy})</p></div>
        </div>

        {/* Requirements */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Document Requirements</h3>
          {reqLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : reqs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No document requirements found for this applicant's profile.</p>
          ) : (
            <div className="space-y-2">
              {reqs.map(r => (
                <RequirementVerifyRow key={r.require_id} req={r} studentId={studentId} sy={sy} />
              ))}
            </div>
          )}
        </div>

        {/* Exam Slot */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <CalendarCheck className="h-4 w-4" /> Entrance Exam Slot
          </h3>
          {examBookingLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : examBookingData?.data ? (
            <Card className="mb-2">
              <CardContent className="py-3 space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{fmtDate(examBookingData.data.slot.exam_date)} at {fmtTime(examBookingData.data.slot.exam_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{examBookingData.data.slot.location}</span>
                </div>
                {examBookingData.data.result && (
                  <Badge variant={examBookingData.data.result === 'Pass' ? 'default' : 'destructive'} className="text-xs">
                    {examBookingData.data.result === 'Pass' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    {examBookingData.data.result}
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 h-7 text-xs mt-1"
                  disabled={unbookMutation.isPending}
                  onClick={() => {
                    if (confirm('Remove this exam booking?')) {
                      unbookMutation.mutate(examBookingData.data!.slot.public_id);
                    }
                  }}
                >
                  {unbookMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                  Remove Booking
                </Button>
              </CardContent>
            </Card>
          ) : (
            <p className="text-xs text-muted-foreground italic mb-2">No exam slot assigned.</p>
          )}

          {!examBookingData?.data && (
            <div className="flex gap-2">
              <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                <SelectTrigger className="flex-1 text-xs h-9">
                  <SelectValue placeholder="Select an exam slot…" />
                </SelectTrigger>
                <SelectContent>
                  {(slotsData?.data ?? [])
                    .filter(s => s.bookings_count < s.capacity)
                    .map(s => (
                      <SelectItem key={s.public_id} value={s.public_id}>
                        {fmtDate(s.exam_date)} {fmtTime(s.exam_time)} — {s.location} ({s.capacity - s.bookings_count} left)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="h-9 flex-shrink-0"
                disabled={!selectedSlotId || bookMutation.isPending}
                onClick={() => bookMutation.mutate()}
              >
                {bookMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign'}
              </Button>
            </div>
          )}
        </div>

        {/* Advance status action */}
        {nextStatus && (
          <div className="border-t pt-4 space-y-2">
            {status === 'For Application Assessment' && hasAnyRequirements && !allAdmissionApproved && (
              <p className="text-xs text-muted-foreground">
                Some required documents are not yet approved (auto-advance triggers when all Admission requirements are approved).
              </p>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => advanceMutation.mutate(nextStatus)}
                disabled={advanceMutation.isPending}
              >
                {advanceMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Advance to <ChevronRight className="h-4 w-4 mx-0.5" /> <strong>{nextStatus}</strong>
              </Button>
              <Link
                to={`/registrar/students/${student.public_id}`}
                className={buttonVariants({ variant: 'outline' })}
                onClick={onClose}
              >
                Full Profile
              </Link>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function RegistrarApplicantsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const sy = user?.selected_sy ?? '';

  const [filterStatus, setFilterStatus] = useState<ApplicantStatus>('Pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Student | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, isLoading } = useQuery<PaginatedResponse<Student>>({
    queryKey: ['applicants', page, filterStatus, sy, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(pageSize),
        status: filterStatus,
      });
      if (sy) params.set('schoolYear', sy);
      if (search) params.set('search', search);
      const { data } = await api.get(`/registrar/students?${params}`);
      return data;
    },
  });

  // Counts per status
  const { data: counts } = useQuery<{ data: Record<string, number> }>({
    queryKey: ['applicant-counts', sy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sy) params.set('schoolYear', sy);
      const { data } = await api.get(`/registrar/students/counts?${params}`);
      return data;
    },
  });

  const byStatus = (counts?.data?.by_status ?? {}) as Record<string, number>;

  const students = data?.data ?? [];
  const lastPage = data?.last_page ?? 1;

  const columns: ColumnDef<Student>[] = useMemo(() => [
    {
      accessorKey: 'student_id',
      header: ({ column }) => <DataTableColumnHeader column={column} title="App ID" />,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.student_id}</span>,
    },
    {
      id: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      accessorFn: (row) => `${row.lname}, ${row.fname}`,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <span className="font-medium">
            {s.lname}, {s.fname}{s.mname && s.mname !== '-' ? ` ${s.mname.charAt(0)}.` : ''}
          </span>
        );
      },
    },
    {
      accessorKey: 'gradeLevel',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grade" />,
    },
    {
      accessorKey: 'dept',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dept" />,
    },
    {
      accessorKey: 'classification',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Classification" />,
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={STATUS_BADGE[row.original.status] ?? 'outline'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSelected(row.original); setSheetOpen(true); }}>
                <Eye className="mr-2 h-4 w-4" /> Review
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`/registrar/students/${row.original.public_id}`)}>
                <ExternalLink className="mr-2 h-4 w-4" /> Full Profile
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Enrollment Applications</h1>
          <p className="text-muted-foreground">
            Review new and returning applicants and advance them through the enrollment pipeline
            {sy ? ` — ${sy}` : ''}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const printWindow = window.open('', '_blank');
            if (!printWindow) return;
            const rows = students;
            printWindow.document.write(`
              <html><head><title>Enrollment Applications</title>
              <style>
                body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
                h2 { margin-bottom: 4px; } p { margin-top: 0; color: #666; font-size: 11px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
                th { background: #f5f5f5; font-weight: 600; }
                @media print { body { margin: 0; } }
              </style></head><body>
              <h2>Enrollment Applications</h2>
              <p>Status: ${filterStatus}${sy ? ' · SY ' + sy : ''}</p>
              <table>
                <thead><tr><th>App ID</th><th>Name</th><th>Grade</th><th>Dept</th><th>Classification</th><th>Status</th></tr></thead>
                <tbody>${rows.map(s => `<tr><td>${s.student_id}</td><td>${s.lname}, ${s.fname}</td><td>${s.gradeLevel}</td><td>${s.dept}</td><td>${s.classification || '—'}</td><td>${s.status}</td></tr>`).join('')}</tbody>
              </table></body></html>`);
            printWindow.document.close();
            printWindow.print();
          }}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const params = new URLSearchParams();
            if (filterStatus) params.set('status', filterStatus);
            if (sy) params.set('schoolYear', sy);
            window.open(`${import.meta.env.VITE_API_URL || '/api'}/registrar/students/export?${params}`, '_blank');
          }}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-3">
        {APPLICANT_STATUSES.map(s => (
          <Card
            key={s}
            className={`cursor-pointer flex-1 transition-colors ${filterStatus === s ? 'border-primary ring-1 ring-primary' : 'hover:border-muted-foreground/40'}`}
            onClick={() => { setFilterStatus(s); setPage(1); }}
          >
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">{s}</CardTitle>
              <CardDescription className="text-2xl font-bold text-foreground leading-none">
                {byStatus[s] ?? 0}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
        {/* Also show For Accounts Assessment count as context */}
        <Card className="flex-1 opacity-60">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">For Accounts Assessment</CardTitle>
            <CardDescription className="text-2xl font-bold text-foreground leading-none">
              {byStatus['For Accounts Assessment'] ?? 0}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Search + table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={students}
              page={page}
              pageCount={lastPage}
              onPageChange={setPage}
              toolbar={
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search name, student ID..."
                      value={search}
                      onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                  </div>
                  <DataTableFilterButton activeCount={0} onClick={() => setFilterOpen(true)} />
                </div>
              }
            />
          )}
        </CardContent>
      </Card>

      <DataTableFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeCount={0}
        onReset={() => setPage(1)}
      >
        <div className="space-y-1">
          <Label className="text-sm font-medium">Status</Label>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v as ApplicantStatus); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {APPLICANT_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      {/* Detail sheet */}
      <ApplicantDetailSheet
        student={selected}
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setSelected(null); }}
      />
    </div>
  );
}
