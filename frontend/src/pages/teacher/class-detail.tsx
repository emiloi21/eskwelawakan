import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save, Megaphone, Pin, Pencil, Trash2, Plus, BookOpen, FileText, FileImage, File, Download, ClipboardList, CheckCircle2, Clock, AlertCircle, ChevronRight, MessageSquare, BarChart2 } from 'lucide-react';

interface StudentRow {
  reg_id: number;
  student_id: string;
  lname: string;
  fname: string;
  mname: string;
  suffix: string;
  sex: string;
  status: string;
}

interface ClassInfo {
  class_id: number;
  gradeLevel: string;
  strand: string;
  section: string;
  schoolYear: string;
  semester: string;
}

interface GradeRow {
  grade_id: number;
  reg_id: number;
  subject: string;
  q1: string | null;
  q2: string | null;
  q3: string | null;
  q4: string | null;
  final_grade: string | null;
  remarks: string | null;
  student?: { reg_id: number; student_id: string; lname: string; fname: string; mname: string };
}

interface AttendanceRow {
  attendance_id: number;
  reg_id: number;
  date: string;
  status: string;
  remarks: string | null;
  student?: { reg_id: number; student_id: string; lname: string; fname: string };
}

interface AnnouncementRow {
  id: number;
  class_id: number;
  user_id: number;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: { id: number; name: string };
}

interface MaterialRow {
  id: number;
  class_id: number;
  user_id: number;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  download_url: string;
  created_at: string;
  uploader?: { id: number; name: string };
}

interface AssignmentRow {
  id: number;
  public_id: string;
  class_id: number;
  type: 'assignment' | 'quiz' | 'material';
  title: string;
  instructions: string | null;
  points: string | null;
  due_date: string | null;
  topic: string | null;
  allow_late: boolean;
  created_at: string;
  submissions_count: number;
  turned_in_count: number;
  flashcard_deck_id: number | null;
  deck?: { id: number; public_id: string; title: string } | null;
}

interface FlashcardDeckOption {
  id: number;
  public_id: string;
  title: string;
}

interface DiscussionAuthor {
  id: number;
  fname: string;
  lname: string;
}

interface DiscussionReply {
  id: number;
  public_id: string;
  user_id: number;
  body: string;
  created_at: string;
  author: DiscussionAuthor;
}

interface DiscussionRow {
  id: number;
  public_id: string;
  user_id: number;
  title: string;
  body: string;
  is_pinned: boolean;
  replies_count: number;
  created_at: string;
  updated_at: string;
  author: DiscussionAuthor;
}

interface SubmissionRosterRow {
  reg_id: number;
  student_id: string;
  name: string;
  submission: {
    id: number;
    public_id: string;
    status: string;
    student_note: string | null;
    submitted_at: string | null;
    score: string | null;
    feedback: string | null;
    graded_at: string | null;
    files: { id: number; original_name: string; download_url: string; file_size: number }[];
  } | null;
}

interface GradebookAssignment {
  id: number;
  public_id: string;
  title: string;
  points: string | null;
  type: 'assignment' | 'quiz';
  due_date: string | null;
}

interface GradebookStudent {
  reg_id: number;
  student_id: string;
  name: string;
}

interface GradebookData {
  assignments: GradebookAssignment[];
  students: GradebookStudent[];
  scores: Record<number, Record<number, { score: string | null; status: string }>>;
}

const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Excused', 'Half Day'] as const;
const ATTENDANCE_COLORS: Record<string, string> = {
  Present: 'bg-green-100 text-green-800',
  Absent: 'bg-red-100 text-red-800',
  Late: 'bg-yellow-100 text-yellow-800',
  Excused: 'bg-blue-100 text-blue-800',
  'Half Day': 'bg-purple-100 text-purple-800',
};

function fullName(s: { lname: string; fname: string; mname?: string }) {
  return `${s.lname}, ${s.fname}${s.mname ? ' ' + s.mname[0] + '.' : ''}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <FileImage className="h-5 w-5 text-blue-500 shrink-0" />;
  if (mime === 'application/pdf') return <FileText className="h-5 w-5 text-red-500 shrink-0" />;
  return <File className="h-5 w-5 text-muted-foreground shrink-0" />;
}

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Grades state
  const [subject, setSubject] = useState('');
  const [gradeEdits, setGradeEdits] = useState<Record<number, Partial<GradeRow>>>({});

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [queryDate, setQueryDate] = useState(attendanceDate);
  const [attEdits, setAttEdits] = useState<Record<number, string>>({});

  // Announcements state
  const [announceDialogOpen, setAnnounceDialogOpen] = useState(false);
  const [editAnnounce, setEditAnnounce] = useState<AnnouncementRow | null>(null);
  const [announceForm, setAnnounceForm] = useState({ title: '', body: '', pinned: false });

  // Materials state
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDesc, setMaterialDesc] = useState('');
  const [materialFile, setMaterialFile] = useState<File | null>(null);

  // Assignments state
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editAssignment, setEditAssignment] = useState<AssignmentRow | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    type: 'assignment' as 'assignment' | 'quiz' | 'material',
    title: '',
    instructions: '',
    points: '',
    due_date: '',
    topic: '',
    allow_late: true,
    flashcard_deck_id: null as number | null,
  });
  const [viewAssignment, setViewAssignment] = useState<AssignmentRow | null>(null);
  const [gradeDialog, setGradeDialog] = useState<{ submissionId: number; name: string; score: string; feedback: string; status: 'graded' | 'returned' } | null>(null);

  // Discussion state
  const [discussionDialogOpen, setDiscussionDialogOpen] = useState(false);
  const [editDiscussion, setEditDiscussion] = useState<DiscussionRow | null>(null);
  const [discussionForm, setDiscussionForm] = useState({ title: '', body: '', is_pinned: false });
  const [viewDiscussion, setViewDiscussion] = useState<DiscussionRow | null>(null);
  const [replyBody, setReplyBody] = useState('');

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: classData, isLoading: classLoading } = useQuery<{ data: StudentRow[]; class: ClassInfo }>({
    queryKey: ['teacher-class-students', classId],
    queryFn: async () => {
      const { data } = await api.get(`/teacher/classes/${classId}/students`);
      return data;
    },
    enabled: !!classId,
  });

  const { data: gradesData, isLoading: gradesLoading } = useQuery<{ data: GradeRow[]; subjects: string[]; class: ClassInfo }>({
    queryKey: ['teacher-grades', classId, subject],
    queryFn: async () => {
      const { data } = await api.get(`/teacher/classes/${classId}/grades`, {
        params: subject ? { subject } : {},
      });
      return data;
    },
    enabled: !!classId,
  });

  const { data: attendanceData, isLoading: attLoading } = useQuery<{ data: AttendanceRow[]; date: string; class: ClassInfo }>({
    queryKey: ['teacher-attendance', classId, queryDate],
    queryFn: async () => {
      const { data } = await api.get(`/teacher/classes/${classId}/attendance`, {
        params: { date: queryDate },
      });
      return data;
    },
    enabled: !!classId,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const saveGradesMutation = useMutation({
    mutationFn: async () => {
      const grades = classData?.data.map((s) => {
        const found = gradesData?.data.find((g) => g.reg_id === s.reg_id && g.subject === subject);
        const edits = gradeEdits[s.reg_id] ?? {};
        return {
          reg_id: s.reg_id,
          subject: subject,
          q1: edits.q1 ?? found?.q1 ?? null,
          q2: edits.q2 ?? found?.q2 ?? null,
          q3: edits.q3 ?? found?.q3 ?? null,
          q4: edits.q4 ?? found?.q4 ?? null,
          final_grade: edits.final_grade ?? found?.final_grade ?? null,
          remarks: edits.remarks ?? found?.remarks ?? null,
        };
      }) ?? [];
      await api.post(`/teacher/classes/${classId}/grades`, { grades });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-grades', classId] });
      setGradeEdits({});
      toast.success('Grades saved.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save grades.'),
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      const records = classData?.data.map((s) => {
        const found = attendanceData?.data.find((a) => a.reg_id === s.reg_id);
        return {
          reg_id: s.reg_id,
          status: attEdits[s.reg_id] ?? found?.status ?? 'Present',
        };
      }) ?? [];
      await api.post(`/teacher/classes/${classId}/attendance`, {
        date: queryDate,
        records,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-attendance', classId, queryDate] });
      setAttEdits({});
      toast.success('Attendance saved.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save attendance.'),
  });

  // Announcements query
  const { data: announcementsData, isLoading: annLoading } = useQuery<{ data: AnnouncementRow[] }>({
    queryKey: ['teacher-announcements', classId],
    queryFn: async () => {
      const { data } = await api.get(`/teacher/classes/${classId}/announcements`);
      return data;
    },
    enabled: !!classId,
  });

  const openNewAnnounce = () => {
    setEditAnnounce(null);
    setAnnounceForm({ title: '', body: '', pinned: false });
    setAnnounceDialogOpen(true);
  };

  const openEditAnnounce = (a: AnnouncementRow) => {
    setEditAnnounce(a);
    setAnnounceForm({ title: a.title, body: a.body, pinned: a.pinned });
    setAnnounceDialogOpen(true);
  };

  const storeAnnounceMutation = useMutation({
    mutationFn: async () => {
      if (editAnnounce) {
        await api.put(`/teacher/classes/${classId}/announcements/${editAnnounce.id}`, announceForm);
      } else {
        await api.post(`/teacher/classes/${classId}/announcements`, announceForm);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-announcements', classId] });
      setAnnounceDialogOpen(false);
      toast.success(editAnnounce ? 'Announcement updated.' : 'Announcement posted.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save announcement.'),
  });

  const deleteAnnounceMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/teacher/classes/${classId}/announcements/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-announcements', classId] });
      toast.success('Announcement deleted.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete.'),
  });

  // Materials query
  const { data: materialsData, isLoading: matLoading } = useQuery<{ data: MaterialRow[] }>({
    queryKey: ['teacher-materials', classId],
    queryFn: async () => {
      const { data } = await api.get(`/teacher/classes/${classId}/materials`);
      return data;
    },
    enabled: !!classId,
  });

  const uploadMaterialMutation = useMutation({
    mutationFn: async () => {
      if (!materialFile) throw new Error('No file selected');
      const form = new FormData();
      form.append('title', materialTitle);
      form.append('description', materialDesc);
      form.append('file', materialFile);
      await api.post(`/teacher/classes/${classId}/materials`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-materials', classId] });
      setMaterialTitle('');
      setMaterialDesc('');
      setMaterialFile(null);
      toast.success('Material uploaded.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Upload failed.'),
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/teacher/classes/${classId}/materials/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-materials', classId] });
      toast.success('Material deleted.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete.'),
  });

  // Assignments queries
  const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery<{ data: AssignmentRow[] }>({
    queryKey: ['teacher-assignments', classId],
    queryFn: async () => {
      const { data } = await api.get(`/teacher/classes/${classId}/assignments`);
      return data;
    },
    enabled: !!classId,
  });

  const { data: gradebookData, isLoading: gradebookLoading } = useQuery<GradebookData>({
    queryKey: ['teacher-gradebook', classId],
    queryFn: async () => {
      const { data } = await api.get(`/teacher/classes/${classId}/assignments/gradebook`);
      return data;
    },
    enabled: !!classId,
  });

  const { data: teacherDecksData } = useQuery<{ data: FlashcardDeckOption[] }>({
    queryKey: ['teacher-flashcard-decks-simple'],
    queryFn: async () => {
      const { data } = await api.get('/teacher/flashcards');
      return data;
    },
  });
  const teacherDecks = teacherDecksData?.data ?? [];

  // Discussion queries
  const { data: discussionsData, isLoading: discussionsLoading } = useQuery<{ data: DiscussionRow[] }>({
    queryKey: ['teacher-discussions', classId],
    queryFn: async () => {
      const { data } = await api.get(`/teacher/classes/${classId}/discussions`);
      return data;
    },
    enabled: !!classId,
  });

  const { data: discussionDetail, isLoading: discussionDetailLoading } = useQuery<{ discussion: DiscussionRow; replies: DiscussionReply[] }>({
    queryKey: ['teacher-discussion-detail', classId, viewDiscussion?.public_id],
    queryFn: async () => {
      const { data } = await api.get(`/teacher/classes/${classId}/discussions/${viewDiscussion!.public_id}/replies`);
      return data;
    },
    enabled: !!classId && !!viewDiscussion,
  });

  // Analytics query
  interface AnalyticsStudent {
    reg_id: number; student_id: string; name: string;
    assignments: { submitted: number; total: number; rate_pct: number };
    quizzes:     { taken: number; total: number; avg_score_pct: number | null };
    discussions: { posts: number; replies: number };
  }
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<{
    data: AnalyticsStudent[];
    totals: { assignments: number; quizzes: number };
  }>({
    queryKey: ['teacher-analytics', classId],
    queryFn: async () => {
      const { data } = await api.get(`/teacher/classes/${classId}/analytics`);
      return data;
    },
    enabled: !!classId,
  });

  const storeDiscussionMutation = useMutation({
    mutationFn: async () => {
      if (editDiscussion) {
        await api.put(`/teacher/classes/${classId}/discussions/${editDiscussion.public_id}`, discussionForm);
      } else {
        await api.post(`/teacher/classes/${classId}/discussions`, discussionForm);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-discussions', classId] });
      setDiscussionDialogOpen(false);
      toast.success(editDiscussion ? 'Discussion updated.' : 'Discussion posted.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save discussion.'),
  });

  const deleteDiscussionMutation = useMutation({
    mutationFn: async (publicId: string) => {
      await api.delete(`/teacher/classes/${classId}/discussions/${publicId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-discussions', classId] });
      if (viewDiscussion) setViewDiscussion(null);
      toast.success('Discussion deleted.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete.'),
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ publicId, is_pinned }: { publicId: string; is_pinned: boolean }) => {
      await api.put(`/teacher/classes/${classId}/discussions/${publicId}`, { is_pinned });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-discussions', classId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update pin.'),
  });

  const storeReplyMutation = useMutation({
    mutationFn: async () => {
      if (!viewDiscussion) return;
      await api.post(`/teacher/classes/${classId}/discussions/${viewDiscussion.public_id}/replies`, { body: replyBody });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-discussion-detail', classId, viewDiscussion?.public_id] });
      qc.invalidateQueries({ queryKey: ['teacher-discussions', classId] });
      setReplyBody('');
      toast.success('Reply posted.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to post reply.'),
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (replyPublicId: string) => {
      if (!viewDiscussion) return;
      await api.delete(`/teacher/classes/${classId}/discussions/${viewDiscussion.public_id}/replies/${replyPublicId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-discussion-detail', classId, viewDiscussion?.public_id] });
      qc.invalidateQueries({ queryKey: ['teacher-discussions', classId] });
      toast.success('Reply deleted.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete reply.'),
  });

  const { data: assignmentDetail, isLoading: assignmentDetailLoading } = useQuery<{
    data: AssignmentRow;
    roster: SubmissionRosterRow[];
  }>({
    queryKey: ['teacher-assignment-detail', classId, viewAssignment?.public_id],
    queryFn: async () => {
      const { data } = await api.get(`/teacher/classes/${classId}/assignments/${viewAssignment!.public_id}`);
      return data;
    },
    enabled: !!classId && !!viewAssignment,
  });

  const openNewAssignment = () => {
    setEditAssignment(null);
    setAssignmentForm({ type: 'assignment', title: '', instructions: '', points: '', due_date: '', topic: '', allow_late: true, flashcard_deck_id: null });
    setAssignmentDialogOpen(true);
  };

  const openEditAssignment = (a: AssignmentRow) => {
    setEditAssignment(a);
    setAssignmentForm({
      type: a.type,
      title: a.title,
      instructions: a.instructions ?? '',
      points: a.points ?? '',
      due_date: a.due_date ? a.due_date.slice(0, 16) : '',
      topic: a.topic ?? '',
      allow_late: a.allow_late,
      flashcard_deck_id: a.flashcard_deck_id ?? null,
    });
    setAssignmentDialogOpen(true);
  };

  const storeAssignmentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...assignmentForm,
        points: assignmentForm.points !== '' ? parseFloat(assignmentForm.points) : null,
        due_date: assignmentForm.due_date || null,
        topic: assignmentForm.topic || null,
      };
      if (editAssignment) {
        await api.put(`/teacher/classes/${classId}/assignments/${editAssignment.public_id}`, payload);
      } else {
        await api.post(`/teacher/classes/${classId}/assignments`, payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-assignments', classId] });
      setAssignmentDialogOpen(false);
      toast.success(editAssignment ? 'Assignment updated.' : 'Assignment created.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save assignment.'),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (publicId: string) => {
      await api.delete(`/teacher/classes/${classId}/assignments/${publicId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-assignments', classId] });
      if (viewAssignment) setViewAssignment(null);
      toast.success('Assignment deleted.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete.'),
  });

  const gradeSubmissionMutation = useMutation({
    mutationFn: async () => {
      if (!gradeDialog || !viewAssignment) return;
      await api.post(
        `/teacher/classes/${classId}/assignments/${viewAssignment.public_id}/submissions/${gradeDialog.submissionId}/grade`,
        { score: gradeDialog.score !== '' ? parseFloat(gradeDialog.score) : null, feedback: gradeDialog.feedback, status: gradeDialog.status }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-assignment-detail', classId, viewAssignment?.public_id] });
      setGradeDialog(null);
      toast.success('Submission graded.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to grade.'),
  });

  if (classLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const cls = classData?.class;
  const students = classData?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/my-classes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {cls?.gradeLevel} {cls?.strand !== '-' ? `— ${cls?.strand}` : ''} · Section {cls?.section}
          </h1>
          <p className="text-muted-foreground">{cls?.schoolYear} · {cls?.semester}</p>
        </div>
        <Badge variant="secondary" className="ml-auto">{students.length} students</Badge>
      </div>

      <Tabs defaultValue="roster">
        <TabsList>
          <TabsTrigger value="roster">Roster</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="gradebook">Gradebook</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ── Roster ── */}
        <TabsContent value="roster" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 w-10">#</th>
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Student ID</th>
                    <th className="pb-2">Sex</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.reg_id} className="border-b hover:bg-muted/30">
                      <td className="py-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 font-medium">{fullName(s)}</td>
                      <td className="py-2 font-mono text-xs">{s.student_id}</td>
                      <td className="py-2">{s.sex}</td>
                      <td className="py-2">
                        <Badge variant={s.status === 'Enrolled' ? 'default' : 'secondary'} className="text-xs">
                          {s.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Grades ── */}
        <TabsContent value="grades" className="mt-4 space-y-4">
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={(v) => { setSubject(v ?? ''); setGradeEdits({}); }}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Select or type subject…" />
                </SelectTrigger>
                <SelectContent>
                  {gradesData?.subjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Or type a new subject…"
              className="w-52"
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setGradeEdits({}); }}
            />
          </div>

          {subject && (
            <>
              <Card>
                <CardContent className="pt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2">Name</th>
                        <th className="pb-2 text-center">Q1</th>
                        <th className="pb-2 text-center">Q2</th>
                        <th className="pb-2 text-center">Q3</th>
                        <th className="pb-2 text-center">Q4</th>
                        <th className="pb-2 text-center">Final</th>
                        <th className="pb-2 text-center">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => {
                        const g = gradesData?.data.find((r) => r.reg_id === s.reg_id && r.subject === subject);
                        const edits = gradeEdits[s.reg_id] ?? {};

                        const gradeInput = (field: 'q1' | 'q2' | 'q3' | 'q4' | 'final_grade') => (
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            className="w-16 rounded border px-1 py-0.5 text-center text-sm focus:outline-none focus:ring-1"
                            value={edits[field] ?? g?.[field] ?? ''}
                            onChange={(e) =>
                              setGradeEdits((prev) => ({
                                ...prev,
                                [s.reg_id]: { ...(prev[s.reg_id] ?? {}), [field]: e.target.value },
                              }))
                            }
                          />
                        );

                        return (
                          <tr key={s.reg_id} className="border-b hover:bg-muted/30">
                            <td className="py-2 font-medium">{fullName(s)}</td>
                            <td className="py-2 text-center">{gradeInput('q1')}</td>
                            <td className="py-2 text-center">{gradeInput('q2')}</td>
                            <td className="py-2 text-center">{gradeInput('q3')}</td>
                            <td className="py-2 text-center">{gradeInput('q4')}</td>
                            <td className="py-2 text-center">{gradeInput('final_grade')}</td>
                            <td className="py-2 text-center">
                              <Select
                                value={edits.remarks ?? g?.remarks ?? ''}
                                onValueChange={(v) =>
                                  setGradeEdits((prev) => ({
                                    ...prev,
                                    [s.reg_id]: { ...(prev[s.reg_id] ?? {}), remarks: v ?? '' },
                                  }))
                                }
                              >
                                <SelectTrigger className="w-28 h-7 text-xs">
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">—</SelectItem>
                                  <SelectItem value="Passed">Passed</SelectItem>
                                  <SelectItem value="Failed">Failed</SelectItem>
                                  <SelectItem value="Incomplete">Incomplete</SelectItem>
                                  <SelectItem value="Dropped">Dropped</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={() => saveGradesMutation.mutate()} disabled={saveGradesMutation.isPending}>
                  {saveGradesMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Grades
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Attendance ── */}
        <TabsContent value="attendance" className="mt-4 space-y-4">
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                className="w-48"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => { setQueryDate(attendanceDate); setAttEdits({}); }}>
              Load
            </Button>
          </div>

          {attLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading attendance…
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Attendance — {queryDate}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2">#</th>
                        <th className="pb-2">Name</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, i) => {
                        const found = attendanceData?.data.find((a) => a.reg_id === s.reg_id);
                        const currentStatus = attEdits[s.reg_id] ?? found?.status ?? 'Present';

                        return (
                          <tr key={s.reg_id} className="border-b hover:bg-muted/30">
                            <td className="py-2 text-muted-foreground">{i + 1}</td>
                            <td className="py-2 font-medium">{fullName(s)}</td>
                            <td className="py-2">
                              <Select
                                value={currentStatus}
                                onValueChange={(v) =>
                                  setAttEdits((prev) => ({ ...prev, [s.reg_id]: v ?? 'Present' }))
                                }
                              >
                                <SelectTrigger className="w-36 h-7">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ATTENDANCE_STATUSES.map((st) => (
                                    <SelectItem key={st} value={st}>{st}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={() => saveAttendanceMutation.mutate()} disabled={saveAttendanceMutation.isPending}>
                  {saveAttendanceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Attendance
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Announcements ── */}
        <TabsContent value="announcements" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openNewAnnounce}>
              <Plus className="mr-2 h-4 w-4" /> New Announcement
            </Button>
          </div>

          {annLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : announcementsData?.data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Megaphone className="h-8 w-8" />
              <p className="text-sm">No announcements yet. Post one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcementsData?.data.map((a) => (
                <Card key={a.id} className={a.pinned ? 'border-primary/40 bg-primary/5' : ''}>
                  <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {a.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      <CardTitle className="text-base leading-snug">{a.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAnnounce(a)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm('Delete this announcement?')) deleteAnnounceMutation.mutate(a.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <p className="text-sm whitespace-pre-wrap">{a.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.author?.name} · {new Date(a.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {a.updated_at !== a.created_at && ' (edited)'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Materials ── */}
        <TabsContent value="materials" className="mt-4 space-y-4">
          {/* Upload card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Upload Material</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Title <span className="text-destructive">*</span></Label>
                <Input
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  placeholder="e.g. Chapter 3 Notes"
                  maxLength={200}
                />
              </div>
              <div className="space-y-1">
                <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  value={materialDesc}
                  onChange={(e) => setMaterialDesc(e.target.value)}
                  placeholder="Brief description…"
                  maxLength={1000}
                />
              </div>
              <div className="space-y-1">
                <Label>File <span className="text-destructive">*</span></Label>
                <input
                  type="file"
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded file:border file:border-input file:bg-background file:px-3 file:py-1 file:text-sm file:font-medium hover:file:bg-accent cursor-pointer"
                  onChange={(e) => setMaterialFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">Max 20 MB. PDF, images, documents, etc.</p>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={() => uploadMaterialMutation.mutate()}
                  disabled={uploadMaterialMutation.isPending || !materialTitle.trim() || !materialFile}
                >
                  {uploadMaterialMutation.isPending
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
                    : 'Upload'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Uploaded files list */}
          {matLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : materialsData?.data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <BookOpen className="h-8 w-8" />
              <p className="text-sm">No materials uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {materialsData?.data.map((m) => (
                <Card key={m.id}>
                  <CardContent className="py-3 px-4 flex items-start gap-3">
                    <FileIcon mime={m.mime_type} />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="font-medium text-sm leading-snug truncate">{m.title}</p>
                      {m.description && (
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {m.file_name} · {formatBytes(m.file_size)} · {m.uploader?.name} ·{' '}
                        {new Date(m.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a href={m.download_url} target="_blank" rel="noreferrer" download={m.file_name}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm('Delete this material?')) deleteMaterialMutation.mutate(m.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Assignments ── */}
        <TabsContent value="assignments" className="mt-4 space-y-4">
          {viewAssignment ? (
            /* Detail view — submission roster */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setViewAssignment(null)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold truncate">{viewAssignment.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {viewAssignment.points ? `${viewAssignment.points} pts` : 'Ungraded'}
                    {viewAssignment.due_date && ` · Due ${new Date(viewAssignment.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEditAssignment(viewAssignment)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                {viewAssignment.type === 'quiz' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/teacher/my-classes/${classId}/quiz/${viewAssignment.public_id}`)}
                  >
                    Build Quiz
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => { if (confirm('Delete this assignment?')) deleteAssignmentMutation.mutate(viewAssignment.public_id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {viewAssignment.instructions && (
                <Card>
                  <CardContent className="py-3 px-4 text-sm whitespace-pre-wrap text-muted-foreground">
                    {viewAssignment.instructions}
                  </CardContent>
                </Card>
              )}

              {assignmentDetailLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading submissions…</div>
              ) : (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Submissions — {assignmentDetail?.roster.filter((r) => r.submission && r.submission.status !== 'assigned').length ?? 0} / {assignmentDetail?.roster.length ?? 0} turned in
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2">Student</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2">Submitted</th>
                          <th className="pb-2 text-center">Score</th>
                          <th className="pb-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignmentDetail?.roster.map((row) => {
                          const sub = row.submission;
                          const statusColor: Record<string, string> = {
                            assigned: 'bg-gray-100 text-gray-600',
                            turned_in: 'bg-blue-100 text-blue-700',
                            late: 'bg-yellow-100 text-yellow-700',
                            graded: 'bg-green-100 text-green-700',
                            returned: 'bg-purple-100 text-purple-700',
                          };
                          return (
                            <tr key={row.reg_id} className="border-b hover:bg-muted/30">
                              <td className="py-2 font-medium">{row.name}</td>
                              <td className="py-2">
                                <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColor[sub?.status ?? 'assigned']}`}>
                                  {sub?.status ?? 'assigned'}
                                </span>
                              </td>
                              <td className="py-2 text-xs text-muted-foreground">
                                {sub?.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                              </td>
                              <td className="py-2 text-center text-xs">
                                {sub?.score != null ? `${sub.score}${viewAssignment.points ? ` / ${viewAssignment.points}` : ''}` : '—'}
                              </td>
                              <td className="py-2">
                                {sub && ['turned_in', 'late', 'graded', 'returned'].includes(sub.status) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => setGradeDialog({
                                      submissionId: sub.id,
                                      name: row.name,
                                      score: sub.score ?? '',
                                      feedback: sub.feedback ?? '',
                                      status: 'graded',
                                    })}
                                  >
                                    Grade
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* List view */
            <>
              <div className="flex justify-end">
                <Button size="sm" onClick={openNewAssignment}>
                  <Plus className="mr-2 h-4 w-4" /> New Assignment
                </Button>
              </div>

              {assignmentsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
              ) : (assignmentsData?.data.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <ClipboardList className="h-8 w-8" />
                  <p className="text-sm">No assignments yet. Create one to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignmentsData?.data.map((a) => (
                    <Card
                      key={a.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setViewAssignment(a)}
                    >
                      <CardContent className="py-3 px-4 flex items-center gap-3">
                        <div className="shrink-0">
                          {a.type === 'quiz' ? <AlertCircle className="h-5 w-5 text-orange-500" /> : <ClipboardList className="h-5 w-5 text-blue-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{a.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.topic && <span className="mr-2 italic">{a.topic}</span>}
                            {a.points ? `${a.points} pts` : 'Ungraded'}
                            {a.due_date && (
                              <span className={new Date(a.due_date) < new Date() ? ' text-destructive' : ''}>
                                {' · Due '}{new Date(a.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" />{a.turned_in_count}/{a.submissions_count}</span>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Gradebook ── */}
        <TabsContent value="gradebook" className="mt-4">
          {gradebookLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading gradebook…</div>
          ) : !gradebookData || gradebookData.assignments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <ClipboardList className="h-8 w-8" />
              <p className="text-sm">No gradable assignments yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="text-xs border-collapse min-w-full">
                <thead>
                  <tr className="bg-muted border-b">
                    <th className="sticky left-0 z-10 bg-muted px-3 py-2 text-left font-semibold min-w-[180px] border-r">Student</th>
                    {gradebookData.assignments.map((a) => (
                      <th key={a.id} className="px-2 py-2 text-center font-medium max-w-[90px] border-r last:border-r-0">
                        <div className="truncate max-w-[88px]" title={a.title}>{a.title}</div>
                        <div className="text-muted-foreground font-normal">{a.points ? `/${a.points}` : 'NG'}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gradebookData.students.map((student, i) => (
                    <tr key={student.reg_id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="sticky left-0 z-10 px-3 py-1.5 border-r font-medium" style={{ background: i % 2 === 0 ? 'hsl(var(--background))' : 'hsl(var(--muted) / 0.3)' }}>
                        <div className="truncate max-w-[168px]" title={student.name}>{student.name}</div>
                        <div className="text-muted-foreground text-[10px]">{student.student_id}</div>
                      </td>
                      {gradebookData.assignments.map((a) => {
                        const cell = gradebookData.scores[student.reg_id]?.[a.id];
                        const status = cell?.status ?? 'assigned';
                        const score = cell?.score;
                        let cellClass = 'text-center px-2 py-1.5 border-r last:border-r-0 ';
                        if (status === 'graded' || status === 'returned') {
                          const pct = a.points && score != null ? parseFloat(score) / parseFloat(a.points) : null;
                          if (pct === null) cellClass += 'bg-green-50 text-green-800';
                          else if (pct >= 0.75) cellClass += 'bg-green-50 text-green-800';
                          else if (pct >= 0.5) cellClass += 'bg-yellow-50 text-yellow-800';
                          else cellClass += 'bg-red-50 text-red-700';
                        } else if (status === 'turned_in' || status === 'late') {
                          cellClass += 'bg-blue-50 text-blue-700';
                        } else {
                          cellClass += 'text-muted-foreground';
                        }
                        return (
                          <td key={a.id} className={cellClass}>
                            {status === 'graded' || status === 'returned'
                              ? (score != null ? score : '—')
                              : status === 'turned_in' ? '✓'
                              : status === 'late' ? '⏰'
                              : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Legend */}
          {gradebookData && gradebookData.assignments.length > 0 && (
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300" /> Graded (≥75%)</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-yellow-100 border border-yellow-300" /> Graded (50–74%)</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300" /> Graded (&lt;50%)</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-blue-100 border border-blue-300" /> Turned in / Late</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-gray-100 border border-gray-300" /> Not submitted</span>
            </div>
          )}
        </TabsContent>

        {/* ── Discussion ── */}
        <TabsContent value="discussion" className="mt-4 space-y-4">
          {viewDiscussion ? (
            // ── Thread detail ─────────────────────────────────────────────────
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setViewDiscussion(null)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base leading-snug">{viewDiscussion.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {viewDiscussion.author.fname} {viewDiscussion.author.lname} · {new Date(viewDiscussion.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {viewDiscussion.is_pinned && <span className="ml-2 text-amber-600 font-medium">📌 Pinned</span>}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        setEditDiscussion(viewDiscussion);
                        setDiscussionForm({ title: viewDiscussion.title, body: viewDiscussion.body, is_pinned: viewDiscussion.is_pinned });
                        setDiscussionDialogOpen(true);
                      }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => {
                        if (confirm('Delete this discussion?')) deleteDiscussionMutation.mutate(viewDiscussion.public_id);
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="whitespace-pre-wrap text-muted-foreground">{viewDiscussion.body}</p>
                </CardContent>
              </Card>

              {/* Replies */}
              {discussionDetailLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading replies…</div>
              ) : (
                <div className="space-y-2">
                  {(discussionDetail?.replies ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No replies yet. Be the first to reply.</p>
                  )}
                  {(discussionDetail?.replies ?? []).map((r) => (
                    <Card key={r.id} className="border-muted">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1 font-medium">
                              {r.author.fname} {r.author.lname} · {new Date(r.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm('Delete this reply?')) deleteReplyMutation.mutate(r.public_id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Reply form */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Add Reply</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Write your reply…"
                    rows={3}
                    maxLength={10000}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => storeReplyMutation.mutate()}
                      disabled={storeReplyMutation.isPending || !replyBody.trim()}
                    >
                      {storeReplyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Post Reply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            // ── Discussion list ───────────────────────────────────────────────
            <>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => {
                  setEditDiscussion(null);
                  setDiscussionForm({ title: '', body: '', is_pinned: false });
                  setDiscussionDialogOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" /> New Discussion
                </Button>
              </div>

              {discussionsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
              ) : (discussionsData?.data ?? []).length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <MessageSquare className="h-8 w-8" />
                  <p className="text-sm">No discussions yet. Start the conversation.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(discussionsData?.data ?? []).map((d) => (
                    <Card
                      key={d.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => { setViewDiscussion(d); setReplyBody(''); }}
                    >
                      <CardContent className="py-3 px-4 flex items-center gap-3">
                        <MessageSquare className={`h-5 w-5 shrink-0 ${d.is_pinned ? 'text-amber-500' : 'text-muted-foreground'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {d.is_pinned && <Pin className="h-3 w-3 text-amber-500 shrink-0" />}
                            <p className="font-medium text-sm truncate">{d.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {d.author.fname} {d.author.lname} · {d.replies_count} {d.replies_count === 1 ? 'reply' : 'replies'} · {new Date(d.updated_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={d.is_pinned ? 'Unpin' : 'Pin'}
                            onClick={() => togglePinMutation.mutate({ publicId: d.public_id, is_pinned: !d.is_pinned })}
                          >
                            <Pin className={`h-3.5 w-3.5 ${d.is_pinned ? 'text-amber-500' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditDiscussion(d);
                              setDiscussionForm({ title: d.title, body: d.body, is_pinned: d.is_pinned });
                              setDiscussionDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm('Delete this discussion?')) deleteDiscussionMutation.mutate(d.public_id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Analytics ── */}
        <TabsContent value="analytics" className="mt-4">
          {analyticsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading analytics…</div>
          ) : !analyticsData || analyticsData.data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <BarChart2 className="h-8 w-8" />
              <p className="text-sm">No students enrolled yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold">{analyticsData.data.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Students</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold">{analyticsData.totals.assignments}</p>
                  <p className="text-xs text-muted-foreground mt-1">Assignments</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold">{analyticsData.totals.quizzes}</p>
                  <p className="text-xs text-muted-foreground mt-1">Quizzes</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold">
                    {analyticsData.totals.assignments > 0
                      ? Math.round(
                          analyticsData.data.reduce((acc, s) => acc + s.assignments.rate_pct, 0) /
                          analyticsData.data.length
                        )
                      : '—'}
                    {analyticsData.totals.assignments > 0 ? '%' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Avg Submission Rate</p>
                </Card>
              </div>
              {/* Per-student table */}
              <div className="overflow-x-auto rounded-md border">
                <table className="text-xs border-collapse min-w-full">
                  <thead>
                    <tr className="bg-muted border-b">
                      <th className="sticky left-0 z-10 bg-muted px-3 py-2 text-left font-semibold min-w-[160px] border-r">Student</th>
                      <th className="px-3 py-2 text-center font-medium border-r">Submitted</th>
                      <th className="px-3 py-2 text-center font-medium border-r">Submit Rate</th>
                      <th className="px-3 py-2 text-center font-medium border-r">Quizzes Taken</th>
                      <th className="px-3 py-2 text-center font-medium border-r">Quiz Avg</th>
                      <th className="px-3 py-2 text-center font-medium">Posts / Replies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.data.map((s, i) => {
                      const submitBg = s.assignments.total === 0 ? '' :
                        s.assignments.rate_pct >= 75 ? 'text-green-700' :
                        s.assignments.rate_pct >= 50 ? 'text-yellow-700' : 'text-red-600';
                      const quizBg = s.quizzes.avg_score_pct === null ? 'text-muted-foreground' :
                        s.quizzes.avg_score_pct >= 75 ? 'text-green-700' :
                        s.quizzes.avg_score_pct >= 50 ? 'text-yellow-700' : 'text-red-600';
                      return (
                        <tr key={s.reg_id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                          <td className="sticky left-0 z-10 px-3 py-1.5 border-r font-medium"
                            style={{ background: i % 2 === 0 ? 'hsl(var(--background))' : 'hsl(var(--muted) / 0.3)' }}>
                            <div className="truncate max-w-[148px]" title={s.name}>{s.name}</div>
                            <div className="text-muted-foreground text-[10px]">{s.student_id}</div>
                          </td>
                          <td className="px-3 py-1.5 text-center border-r">
                            {s.assignments.submitted}/{s.assignments.total}
                          </td>
                          <td className={`px-3 py-1.5 text-center font-semibold border-r ${submitBg}`}>
                            {s.assignments.total === 0 ? '—' : `${s.assignments.rate_pct}%`}
                          </td>
                          <td className="px-3 py-1.5 text-center border-r">
                            {s.quizzes.taken}/{s.quizzes.total}
                          </td>
                          <td className={`px-3 py-1.5 text-center font-semibold border-r ${quizBg}`}>
                            {s.quizzes.avg_score_pct !== null ? `${s.quizzes.avg_score_pct}%` : '—'}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {s.discussions.posts + s.discussions.replies > 0
                              ? `${s.discussions.posts} / ${s.discussions.replies}`
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300" /> ≥75%</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-yellow-100 border border-yellow-300" /> 50–74%</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300" /> &lt;50%</span>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Discussion Create/Edit Dialog ── */}
      <Dialog open={discussionDialogOpen} onOpenChange={setDiscussionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editDiscussion ? 'Edit Discussion' : 'New Discussion'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                value={discussionForm.title}
                onChange={(e) => setDiscussionForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Discussion topic…"
                maxLength={255}
              />
            </div>
            <div className="space-y-1">
              <Label>Body <span className="text-destructive">*</span></Label>
              <Textarea
                value={discussionForm.body}
                onChange={(e) => setDiscussionForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Start the discussion…"
                rows={5}
                maxLength={20000}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="disc_pinned"
                checked={discussionForm.is_pinned}
                onCheckedChange={(v) => setDiscussionForm((f) => ({ ...f, is_pinned: v }))}
              />
              <Label htmlFor="disc_pinned">Pin to top</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscussionDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => storeDiscussionMutation.mutate()}
              disabled={storeDiscussionMutation.isPending || !discussionForm.title.trim() || !discussionForm.body.trim()}
            >
              {storeDiscussionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editDiscussion ? 'Save Changes' : 'Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Announcement Create/Edit Dialog ── */}
      <Dialog open={announceDialogOpen} onOpenChange={setAnnounceDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editAnnounce ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={announceForm.title}
                onChange={(e) => setAnnounceForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Announcement title…"
                maxLength={200}
              />
            </div>
            <div className="space-y-1">
              <Label>Body</Label>
              <Textarea
                value={announceForm.body}
                onChange={(e) => setAnnounceForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Write your announcement…"
                rows={5}
                maxLength={5000}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="pinned"
                checked={announceForm.pinned}
                onCheckedChange={(v) => setAnnounceForm((f) => ({ ...f, pinned: v }))}
              />
              <Label htmlFor="pinned">Pin to top</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnounceDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => storeAnnounceMutation.mutate()}
              disabled={storeAnnounceMutation.isPending || !announceForm.title.trim() || !announceForm.body.trim()}
            >
              {storeAnnounceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editAnnounce ? 'Save Changes' : 'Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assignment Create/Edit Dialog ── */}
      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editAssignment ? 'Edit Assignment' : 'New Assignment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={assignmentForm.type} onValueChange={(v) => setAssignmentForm((f) => ({ ...f, type: v as 'assignment' | 'quiz' | 'material' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="material">Material</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                value={assignmentForm.title}
                onChange={(e) => setAssignmentForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Assignment title…"
                maxLength={255}
              />
            </div>
            <div className="space-y-1">
              <Label>Instructions</Label>
              <Textarea
                value={assignmentForm.instructions}
                onChange={(e) => setAssignmentForm((f) => ({ ...f, instructions: e.target.value }))}
                placeholder="Instructions for students…"
                rows={4}
                maxLength={10000}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Points</Label>
                <Input
                  type="number"
                  min={0}
                  max={9999}
                  step={0.5}
                  value={assignmentForm.points}
                  onChange={(e) => setAssignmentForm((f) => ({ ...f, points: e.target.value }))}
                  placeholder="Leave blank = ungraded"
                />
              </div>
              <div className="space-y-1">
                <Label>Due Date</Label>
                <Input
                  type="datetime-local"
                  value={assignmentForm.due_date}
                  onChange={(e) => setAssignmentForm((f) => ({ ...f, due_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Topic <span className="text-muted-foreground text-xs">(optional grouping)</span></Label>
              <Input
                value={assignmentForm.topic}
                onChange={(e) => setAssignmentForm((f) => ({ ...f, topic: e.target.value }))}
                placeholder="e.g. Week 1, Chapter 3…"
                maxLength={100}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="allow_late"
                checked={assignmentForm.allow_late}
                onCheckedChange={(v) => setAssignmentForm((f) => ({ ...f, allow_late: v }))}
              />
              <Label htmlFor="allow_late">Allow late submissions</Label>
            </div>
            {assignmentForm.type === 'material' && (
              <div className="space-y-1">
                <Label>Linked Flashcard Deck <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Select
                  value={assignmentForm.flashcard_deck_id?.toString() ?? 'none'}
                  onValueChange={(v) => setAssignmentForm((f) => ({ ...f, flashcard_deck_id: v !== 'none' ? parseInt(v) : null }))}
                >
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {teacherDecks.map((d) => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => storeAssignmentMutation.mutate()}
              disabled={storeAssignmentMutation.isPending || !assignmentForm.title.trim()}
            >
              {storeAssignmentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editAssignment ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Grade Submission Dialog ── */}
      <Dialog open={!!gradeDialog} onOpenChange={(open) => { if (!open) setGradeDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Grade — {gradeDialog?.name}</DialogTitle>
          </DialogHeader>
          {gradeDialog && (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Score{viewAssignment?.points ? ` (max ${viewAssignment.points})` : ''}</Label>
                <Input
                  type="number"
                  min={0}
                  max={viewAssignment?.points ? parseFloat(viewAssignment.points) : undefined}
                  step={0.5}
                  value={gradeDialog.score}
                  onChange={(e) => setGradeDialog((d) => d ? { ...d, score: e.target.value } : d)}
                  placeholder="Leave blank = no score"
                />
              </div>
              <div className="space-y-1">
                <Label>Feedback</Label>
                <Textarea
                  value={gradeDialog.feedback}
                  onChange={(e) => setGradeDialog((d) => d ? { ...d, feedback: e.target.value } : d)}
                  placeholder="Optional feedback for the student…"
                  rows={3}
                  maxLength={5000}
                />
              </div>
              <div className="space-y-1">
                <Label>Action</Label>
                <Select value={gradeDialog.status} onValueChange={(v) => setGradeDialog((d) => d ? { ...d, status: v as 'graded' | 'returned' } : d)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="graded">Grade (keep submission)</SelectItem>
                    <SelectItem value="returned">Return for revision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradeDialog(null)}>Cancel</Button>
            <Button onClick={() => gradeSubmissionMutation.mutate()} disabled={gradeSubmissionMutation.isPending}>
              {gradeSubmissionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
