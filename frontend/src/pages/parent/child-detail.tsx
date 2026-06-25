import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, GraduationCap, Printer, CreditCard, Tag, RefreshCw, Clock, Building2, Wallet, Upload, X as XIcon, CheckCircle2, XCircle, LogIn, LogOut, Monitor, TrendingUp, ClipboardList, Trophy, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface StudentInfo {
  reg_id: number;
  public_id: string;
  name: string;
  student_id: string;
  grade_level: string;
  strand: string;
  section: string;
  school_year: string;
  status: string;
}
interface Summary { total_assessed: number; total_paid: number; total_balance: number }
interface GradeRow {
  grade_id: number; subject: string; semester: string; school_year: string;
  q1: number | null; q2: number | null; q3: number | null; q4: number | null;
  final_grade: number | null; remarks: string | null;
}
interface BalanceCategory {
  cat_id: number; category_name: string;
  total_payable: number; total_discount: number; total_paid: number; total_balance: number;
  particulars: { assessment_id: number; particular: string; payable: number; discount: number; paid: number; balance: number }[];
}
interface Payment {
  payment_id: number; receipt_no: string; amount_paid: number;
  payment_date: string; payment_method: string;
}
interface LedgerChargeItem { description: string; payable: number; discount: number; paid: number; balance: number; }
interface LedgerCategory { category: string; payable: number; discount: number; paid: number; balance: number; items: LedgerChargeItem[]; }
interface LedgerTransaction { receipt_num: string; date: string; type: string; amount: number; remarks: string | null; }
interface LedgerData {
  summary: { total_assessed: number; total_discount: number; total_paid: number; total_balance: number };
  charges: LedgerCategory[];
  transactions: LedgerTransaction[];
}
interface SubjectGrade { grade_id: number; subject: string; q1: number|null; q2: number|null; q3: number|null; q4: number|null; final_grade: number|null; remarks: string|null; }
interface SemesterData { subjects: SubjectGrade[]; general_average: number|null; }
interface ReportCardData { student: { name: string; student_id: string; grade_level: string; strand: string; section: string; school_year: string; }; semesters: Record<string, SemesterData>; overall_average: number|null; }
interface AcademicRecord { school_year: string; grade_level: string; strand: string; section: string; total_subjects: number; general_average: number|null; status: 'Passed'|'Failed'|'In Progress'; }
interface PaymentChannel {
  id: number;
  public_id: string;
  account_type: 'bank' | 'ewallet';
  provider_name: string;
  account_name: string;
  account_number: string;
  branch: string | null;
  instructions: string | null;
  qr_code_url: string | null;
}
interface TransferRequest {
  public_id: string;
  amount: number;
  reference_number: string;
  transfer_date: string;
  status: 'pending' | 'approved' | 'rejected';
  channel: { provider_name: string; account_type: string } | null;
  rejection_reason: string | null;
  receipt_num: string | null;
  submitted_at: string;
}
interface AttendanceRecord { date: string; status: string; remarks: string|null; }
interface AttendanceSummary { present: number; absent: number; late: number; excused: number; half_day: number; total: number; }
interface KioskLogEntry { id: number; direction: 'in'|'out'; log_time: string; method: string; kiosk_code: string|null; kiosk_name: string|null; }
interface KioskLogData { summary: { total_in: number; total_out: number }; logs: KioskLogEntry[]; }
interface EnrollmentCurrent {
  student_id: string; name: string; grade_level: string; strand: string;
  dept: string; school_year: string; classification: string;
  status: string; section: string; remarks: string | null;
}
interface EnrollmentData {
  current: EnrollmentCurrent;
  pending_reenrollment: { public_id: string; school_year: string; grade_level: string; status: string } | null;
}

const SCHOOL_YEARS = ['2024-2025', '2025-2026', '2026-2027'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TABS = ['Overview', 'Grades', 'Balance', 'Payments', 'Ledger', 'Report Card', 'History', 'Attendance', 'Enrollment', 'LMS'] as const;
type Tab = typeof TABS[number];

const DEPTS = ['Preschool', 'Grade School', 'Junior High School', 'Senior High School'];
const GRADE_LEVELS: Record<string, string[]> = {
  'Preschool':          ['Prekinder', 'Kinder', 'Preparatory'],
  'Grade School':       ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
  'Junior High School': ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
  'Senior High School': ['Grade 11', 'Grade 12'],
};
const STRANDS = ['STEM', 'ABM', 'HUMSS', 'HE', 'ICT', 'TVL', 'N/A'];
const CLASSIFICATIONS = ['Old', 'Transferee', 'Returnee'];

const ATTENDANCE_COLORS: Record<string, string> = {
  Present:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Absent:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Late:     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500',
  Excused:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Half Day': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

function buildCalendar(year: number, month: number, records: AttendanceRecord[]) {
  const recordMap: Record<string, AttendanceRecord> = {};
  for (const r of records) recordMap[r.date] = r;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }
  return { weeks, recordMap };
}

function fmt(v: number | null) {
  if (v === null || v === undefined) return '—';
  return Number(v).toFixed(2);
}
function peso(v: number) {
  return `₱${v.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

export default function ChildDetailPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('Overview');
  const [gradesYear, setGradesYear] = useState(SCHOOL_YEARS[1]);
  const [page, setPage] = useState(1);
  const [rcYear, setRcYear] = useState(SCHOOL_YEARS[1]);
  const [paying, setPaying] = useState(false);
  const now = new Date();
  const [attYear, setAttYear] = useState(now.getFullYear());
  const [attMonth, setAttMonth] = useState(now.getMonth());

  // Discount code state
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  // Bank transfer state
  const [transferOpen, setTransferOpen] = useState(false);
  const [txChannelId, setTxChannelId] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txRef, setTxRef] = useState('');
  const [txDate, setTxDate] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txReceipt, setTxReceipt] = useState<File | null>(null);
  const [resubmitTarget, setResubmitTarget] = useState<TransferRequest | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Re-enrollment state
  const [showReEnroll, setShowReEnroll] = useState(false);
  const [reEnrollError, setReEnrollError] = useState('');
  const [reEnrollForm, setReEnrollForm] = useState({
    dept: '', gradeLevel: '', strand: '', classification: 'Old', schoolYear: '',
  });

  // Handle redirect back from PayMongo
  useEffect(() => {
    const status = searchParams.get('payment');
    if (status === 'success') {
      toast.success('Payment successful! Ledger will refresh shortly.');
      setSearchParams({}, { replace: true });
    } else if (status === 'cancelled') {
      toast.info('Payment cancelled.');
      setSearchParams({}, { replace: true });
    }
  }, []);

  const handlePayOnline = async () => {
    if (!publicId) return;
    setPaying(true);
    try {
      const { data } = await api.post(`/parent/children/${publicId}/payment/checkout`);
      window.location.href = data.checkout_url;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to initiate payment. Please try again.');
      setPaying(false);
    }
  };

  const handleRedeemCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code || !publicId) return;
    setRedeeming(true);
    try {
      const { data } = await api.post(`/parent/children/${publicId}/discount-code/redeem`, { code });
      toast.success(data.message ?? 'Discount code applied!');
      setCodeInput('');
      setCodeOpen(false);
      queryClient.invalidateQueries({ queryKey: ['parent-child-ledger', publicId] });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Invalid or expired discount code.');
    } finally {
      setRedeeming(false);
    }
  };

  const { data: detailData, isLoading: detailLoading } = useQuery<{ student: StudentInfo; summary: Summary }>({
    queryKey: ['parent-child', publicId],
    queryFn: async () => { const { data } = await api.get(`/parent/children/${publicId}`); return data; },
    enabled: !!publicId,
  });

  const { data: gradesData, isLoading: gradesLoading } = useQuery<{ data: GradeRow[] }>({
    queryKey: ['parent-child-grades', publicId, gradesYear],
    queryFn: async () => { const { data } = await api.get(`/parent/children/${publicId}/grades`, { params: { schoolYear: gradesYear } }); return data; },
    enabled: !!publicId && tab === 'Grades',
  });

  const { data: balanceData, isLoading: balanceLoading } = useQuery<{ categories: BalanceCategory[]; total_assessed: number; total_paid: number; total_balance: number }>({
    queryKey: ['parent-child-balance', publicId],
    queryFn: async () => { const { data } = await api.get(`/parent/children/${publicId}/balance`); return data; },
    enabled: !!publicId && tab === 'Balance',
  });

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery<LedgerData>({
    queryKey: ['parent-child-ledger', publicId, SCHOOL_YEARS[1]],
    queryFn: async () => { const { data } = await api.get(`/parent/children/${publicId}/ledger`); return data; },
    enabled: !!publicId && tab === 'Ledger',
  });

  const { data: channels = [] } = useQuery<PaymentChannel[]>({
    queryKey: ['payment-channels'],
    queryFn: async () => { const { data } = await api.get('/payment/channels'); return data; },
  });

  const { data: myTransfers = [], refetch: refetchTransfers } = useQuery<TransferRequest[]>({
    queryKey: ['parent-bank-transfers', publicId],
    queryFn: async () => { const { data } = await api.get(`/parent/children/${publicId}/bank-transfers`); return data; },
    enabled: !!publicId && tab === 'Ledger',
  });

  const openTransferDialog = (prefill?: TransferRequest) => {
    if (prefill) {
      setResubmitTarget(prefill);
      setTxChannelId(String(channels.find(c => c.provider_name === prefill.channel?.provider_name)?.id ?? ''));
      setTxAmount(String(prefill.amount));
    } else {
      setResubmitTarget(null);
      setTxChannelId('');
      setTxAmount(String(ledgerData?.summary?.total_balance ?? ''));
    }
    setTxRef('');
    setTxDate('');
    setTxNotes('');
    setTxReceipt(null);
    setTransferOpen(true);
  };

  const submitTransferMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (resubmitTarget) {
        const { data } = await api.post(`/parent/children/${publicId}/bank-transfers/${resubmitTarget.public_id}/resubmit`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        return data;
      }
      const { data } = await api.post(`/parent/children/${publicId}/bank-transfers`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      return data;
    },
    onSuccess: () => {
      toast.success(resubmitTarget ? 'Transfer request resubmitted.' : 'Transfer request submitted. Awaiting validation.');
      setTransferOpen(false);
      refetchTransfers();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to submit transfer request.');
    },
  });

  const handleTransferSubmit = () => {
    if (!txChannelId || !txAmount || !txRef || !txDate || !txReceipt) {
      toast.error('Please fill in all required fields and attach the receipt.');
      return;
    }
    const fd = new FormData();
    fd.append('payment_channel_id', txChannelId);
    fd.append('amount', txAmount);
    fd.append('reference_number', txRef);
    fd.append('transfer_date', txDate);
    if (txNotes) fd.append('notes', txNotes);
    fd.append('receipt', txReceipt);
    submitTransferMutation.mutate(fd);
  };

  const cancelTransferMutation = useMutation({
    mutationFn: async (requestPublicId: string) => {
      await api.delete(`/parent/children/${publicId}/bank-transfers/${requestPublicId}`);
    },
    onSuccess: () => { toast.success('Transfer request cancelled.'); refetchTransfers(); },
  });

  const selectedChannel = channels.find(c => String(c.id) === txChannelId) ?? null;

  const { data: reportCardData, isLoading: rcLoading } = useQuery<ReportCardData>({
    queryKey: ['parent-child-report-card', publicId, rcYear],
    queryFn: async () => { const { data } = await api.get(`/parent/children/${publicId}/report-card`, { params: { schoolYear: rcYear } }); return data; },
    enabled: !!publicId && tab === 'Report Card',
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<{ data: AcademicRecord[] }>({
    queryKey: ['parent-child-history', publicId],
    queryFn: async () => { const { data } = await api.get(`/parent/children/${publicId}/academic-history`); return data; },
    enabled: !!publicId && tab === 'History',
  });

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery<{ summary: AttendanceSummary; records: AttendanceRecord[] }>({
    queryKey: ['parent-child-attendance', publicId, attYear, attMonth],
    queryFn: async () => { const { data } = await api.get(`/parent/children/${publicId}/attendance`, { params: { year: attYear, month: attMonth + 1 } }); return data; },
    enabled: !!publicId && tab === 'Attendance',
  });

  const [attSubTab, setAttSubTab] = useState<'records' | 'kiosk'>('records');

  const { data: kioskLogData, isLoading: kioskLogLoading } = useQuery<KioskLogData>({
    queryKey: ['parent-child-kiosk-logs', publicId, attYear, attMonth],
    queryFn: async () => { const { data } = await api.get(`/parent/children/${publicId}/kiosk-logs`, { params: { year: attYear, month: attMonth + 1 } }); return data; },
    enabled: !!publicId && tab === 'Attendance' && attSubTab === 'kiosk',
  });

  const { data: enrollmentData, isLoading: enrollmentLoading } = useQuery<{ data: EnrollmentData }>({
    queryKey: ['parent-child-enrollment', publicId],
    queryFn: async () => { const { data } = await api.get(`/parent/children/${publicId}/enrollment-status`); return data; },
    enabled: !!publicId && tab === 'Enrollment',
  });

  interface LmsProgressData {
    assignments: { total: number; submitted: number; graded: number; pending: number; late: number; rate_pct: number };
    quizzes:     { total: number; taken: number; avg_score_pct: number | null };
    discussions: { posts: number; replies: number };
    recent_grades: Array<{ title: string; score: number | null; points: number | null; pct: number | null; graded_at: string | null }>;
  }
  const { data: lmsData, isLoading: lmsLoading } = useQuery<{ data: LmsProgressData | null }>({
    queryKey: ['parent-child-lms', publicId],
    queryFn: async () => { const { data } = await api.get(`/parent/children/${publicId}/lms-progress`); return data; },
    enabled: !!publicId && tab === 'LMS',
  });

  const reEnrollMutation = useMutation({
    mutationFn: (body: typeof reEnrollForm) => api.post(`/parent/children/${publicId}/re-enroll`, body),
    onSuccess: () => {
      setShowReEnroll(false);
      queryClient.invalidateQueries({ queryKey: ['parent-child-enrollment', publicId] });
      toast.success('Re-enrollment request submitted successfully.');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setReEnrollError(e.response?.data?.message ?? 'Failed to submit re-enrollment request.');
    },
  });

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery<{ data: Payment[]; last_page: number; current_page: number }>({
    queryKey: ['parent-child-payments', publicId, page],
    queryFn: async () => { const { data } = await api.get(`/parent/children/${publicId}/payments`, { params: { page } }); return data; },
    enabled: !!publicId && tab === 'Payments',
  });

  const student = detailData?.student;
  const summary = detailData?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/parent')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{student?.name ?? '…'}</h1>
          <p className="text-muted-foreground text-sm">{student?.student_id} · {student?.grade_level} {student?.section}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'Overview' && (
        detailLoading ? <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div> :
        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Total Assessed</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold">{peso(summary?.total_assessed ?? 0)}</p></CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Total Paid</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold text-green-600">{peso(summary?.total_paid ?? 0)}</p></CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding Balance</CardTitle></CardHeader>
            <CardContent>
              <p className={`text-xl font-bold ${(summary?.total_balance ?? 0) > 0 ? 'text-destructive' : 'text-green-600'}`}>{peso(summary?.total_balance ?? 0)}</p>
              {(summary?.total_balance ?? 0) > 0 && (
                <Button size="sm" className="mt-2 w-full" onClick={handlePayOnline} disabled={paying}>
                  {paying ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CreditCard className="h-4 w-4 mr-1.5" />}Pay Online
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grades */}
      {tab === 'Grades' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Select value={gradesYear} onValueChange={(v) => setGradesYear(v ?? gradesYear)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCHOOL_YEARS.map(sy => <SelectItem key={sy} value={sy}>{sy}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {gradesLoading ? <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div> :
            !(gradesData?.data?.length) ? <p className="text-sm text-muted-foreground italic">No grade records.</p> :
            Object.entries(
              (gradesData?.data ?? []).reduce<Record<string, GradeRow[]>>((acc, r) => { (acc[r.semester] ??= []).push(r); return acc; }, {})
            ).map(([sem, rows]) => (
              <Card key={sem}>
                <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">{sem}</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-muted/40">
                        <th className="px-4 py-2 text-left">Subject</th>
                        <th className="px-4 py-2 text-center">Q1</th><th className="px-4 py-2 text-center">Q2</th>
                        <th className="px-4 py-2 text-center">Q3</th><th className="px-4 py-2 text-center">Q4</th>
                        <th className="px-4 py-2 text-center">Final</th><th className="px-4 py-2 text-center">Remarks</th>
                      </tr></thead>
                      <tbody>
                        {rows.map(r => (
                          <tr key={r.grade_id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-2 font-medium">{r.subject}</td>
                            <td className="px-4 py-2 text-center">{fmt(r.q1)}</td>
                            <td className="px-4 py-2 text-center">{fmt(r.q2)}</td>
                            <td className="px-4 py-2 text-center">{fmt(r.q3)}</td>
                            <td className="px-4 py-2 text-center">{fmt(r.q4)}</td>
                            <td className="px-4 py-2 text-center font-semibold">{fmt(r.final_grade)}</td>
                            <td className="px-4 py-2 text-center">
                              {r.remarks ? <Badge variant={r.remarks === 'Passed' ? 'default' : r.remarks === 'Failed' ? 'destructive' : 'secondary'}>{r.remarks}</Badge> : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </div>
      )}

      {/* Balance */}
      {tab === 'Balance' && (
        balanceLoading ? <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div> :
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Assessed</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-bold">{peso(balanceData?.total_assessed ?? 0)}</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Paid</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-bold text-green-600">{peso(balanceData?.total_paid ?? 0)}</p></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Balance</CardTitle></CardHeader>
              <CardContent><p className={`text-lg font-bold ${(balanceData?.total_balance ?? 0) > 0 ? 'text-destructive' : 'text-green-600'}`}>{peso(balanceData?.total_balance ?? 0)}</p></CardContent></Card>
          </div>
          {(balanceData?.categories ?? []).map(cat => (
            <Card key={cat.cat_id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">{cat.category_name}</CardTitle>
                <span className={`text-sm font-bold ${cat.total_balance > 0 ? 'text-destructive' : 'text-green-600'}`}>{peso(cat.total_balance)}</span>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead><tr className="border-b bg-muted/40">
                    <th className="px-4 py-1.5 text-left">Particular</th>
                    <th className="px-4 py-1.5 text-right">Payable</th>
                    <th className="px-4 py-1.5 text-right">Discount</th>
                    <th className="px-4 py-1.5 text-right">Paid</th>
                    <th className="px-4 py-1.5 text-right">Balance</th>
                  </tr></thead>
                  <tbody>
                    {cat.particulars.map(p => (
                      <tr key={p.assessment_id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-1.5">{p.particular}</td>
                        <td className="px-4 py-1.5 text-right">{peso(p.payable)}</td>
                        <td className="px-4 py-1.5 text-right">{peso(p.discount)}</td>
                        <td className="px-4 py-1.5 text-right">{peso(p.paid)}</td>
                        <td className={`px-4 py-1.5 text-right font-medium ${p.balance > 0 ? 'text-destructive' : ''}`}>{peso(p.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payments */}
      {tab === 'Payments' && (
        paymentsLoading ? <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div> :
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/40">
                  <th className="px-4 py-2 text-left">Receipt #</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Method</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr></thead>
                <tbody>
                  {!(paymentsData?.data?.length) ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No payments.</td></tr>
                  ) : paymentsData.data.map(p => (
                    <tr key={p.payment_id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{p.receipt_no}</td>
                      <td className="px-4 py-2">{p.payment_date}</td>
                      <td className="px-4 py-2">{p.payment_method}</td>
                      <td className="px-4 py-2 text-right font-medium">{peso(p.amount_paid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(paymentsData?.last_page ?? 1) > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                <span>Page {paymentsData?.current_page} of {paymentsData?.last_page}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === (paymentsData?.last_page ?? 1)} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ledger / SOA */}
      {tab === 'Ledger' && (
        ledgerLoading ? <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div> :
        <div className="space-y-4">
          <div className="flex justify-end gap-2 flex-wrap">
            {(ledgerData?.summary.total_balance ?? 0) > 0 && (
              <Button size="sm" onClick={handlePayOnline} disabled={paying}>
                {paying ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CreditCard className="h-4 w-4 mr-1.5" />}Pay Online
              </Button>
            )}
            {(ledgerData?.summary.total_balance ?? 0) > 0 && channels.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => openTransferDialog()}>
                <Building2 className="h-4 w-4 mr-1.5" />Pay via Bank / E-Wallet
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setCodeOpen(v => !v); setTimeout(() => codeRef.current?.focus(), 50); }}
            >
              <Tag className="h-4 w-4 mr-1.5" />Redeem Code
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1.5" />Print
            </Button>
          </div>
          {codeOpen && (
            <Card className="border-dashed">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm font-medium mb-3">Have a discount code?</p>
                <div className="flex gap-2 max-w-sm">
                  <input
                    ref={codeRef}
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter code…"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono uppercase tracking-widest"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRedeemCode(); }}
                    disabled={redeeming}
                  />
                  <Button size="sm" onClick={handleRedeemCode} disabled={redeeming || !codeInput.trim()}>
                    {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setCodeOpen(false); setCodeInput(''); }}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-3 sm:grid-cols-4">
            {[{l:'Assessed',v:ledgerData?.summary.total_assessed??0},{l:'Discount',v:ledgerData?.summary.total_discount??0},{l:'Paid',v:ledgerData?.summary.total_paid??0,g:true},{l:'Balance',v:ledgerData?.summary.total_balance??0,r:(ledgerData?.summary.total_balance??0)>0}].map(({l,v,g,r})=>(
              <Card key={l}><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">{l}</p><p className={`text-lg font-bold font-mono ${r?'text-destructive':g?'text-green-600':''}`}>{peso(v)}</p></CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Assessment Charges</CardTitle></CardHeader>
            <CardContent className="p-0">
              {!(ledgerData?.charges?.length) ? <p className="px-4 py-6 text-sm text-muted-foreground italic">No assessment records.</p> : (
                <div className="divide-y">
                  {(ledgerData?.charges??[]).map(cat=>(
                    <div key={cat.category}>
                      <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-muted/40 text-xs font-semibold text-muted-foreground">
                        <span className="col-span-2">{cat.category}</span>
                        <span className="text-right">{peso(cat.payable)}</span>
                        <span className="text-right text-green-700">{cat.discount>0?`-${peso(cat.discount)}`:'—'}</span>
                        <span className={`text-right font-bold ${cat.balance>0?'text-destructive':'text-green-600'}`}>{peso(cat.balance)}</span>
                      </div>
                      {cat.items.map((item,i)=>(
                        <div key={i} className="grid grid-cols-5 gap-2 px-4 py-1.5 text-xs border-b last:border-0 hover:bg-muted/20">
                          <span className="col-span-2 pl-2 text-muted-foreground">{item.description}</span>
                          <span className="text-right font-mono">{peso(item.payable)}</span>
                          <span className="text-right font-mono text-green-700">{item.discount>0?`-${peso(item.discount)}`:'—'}</span>
                          <span className={`text-right font-mono font-semibold ${item.balance>0?'text-destructive':'text-green-600'}`}>{peso(item.balance)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Payment Transactions</CardTitle></CardHeader>
            <CardContent className="p-0">
              {!(ledgerData?.transactions?.length) ? <p className="px-4 py-6 text-sm text-muted-foreground italic">No transactions recorded.</p> : (
                <table className="w-full text-xs">
                  <thead><tr className="border-b bg-muted/30 text-muted-foreground">
                    <th className="px-4 py-2 text-left">Receipt #</th><th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-right">Amount</th>
                  </tr></thead>
                  <tbody>
                    {(ledgerData?.transactions??[]).map((t,i)=>(
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2 font-mono">{t.receipt_num}</td>
                        <td className="px-4 py-2">{t.date}</td>
                        <td className="px-4 py-2">{t.type}</td>
                        <td className="px-4 py-2 text-right font-mono font-semibold text-green-600">{peso(t.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Transfer Requests */}
          {myTransfers.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Bank / E-Wallet Transfer Requests</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead><tr className="border-b bg-muted/30 text-muted-foreground">
                    <th className="px-4 py-2 text-left">Channel</th>
                    <th className="px-4 py-2 text-left">Reference #</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr></thead>
                  <tbody>
                    {myTransfers.map(req => (
                      <tr key={req.public_id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center gap-1">
                            {req.channel?.account_type === 'bank' ? <Building2 className="h-3 w-3 text-muted-foreground" /> : <Wallet className="h-3 w-3 text-muted-foreground" />}
                            {req.channel?.provider_name ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono">{req.reference_number}</td>
                        <td className="px-4 py-2 text-right font-mono font-semibold">{peso(req.amount)}</td>
                        <td className="px-4 py-2">
                          {req.status === 'pending' && <span className="inline-flex items-center gap-1 text-yellow-700 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded-full"><Clock className="h-3 w-3" />Pending</span>}
                          {req.status === 'approved' && <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full"><CheckCircle2 className="h-3 w-3" />Approved</span>}
                          {req.status === 'rejected' && (
                            <div>
                              <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full"><XCircle className="h-3 w-3" />Rejected</span>
                              {req.rejection_reason && <p className="text-muted-foreground mt-0.5">{req.rejection_reason}</p>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {req.status === 'rejected' && (
                            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => openTransferDialog(req)}>Resubmit</Button>
                          )}
                          {req.status === 'pending' && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive hover:text-destructive" onClick={() => cancelTransferMutation.mutate(req.public_id)} disabled={cancelTransferMutation.isPending}>Cancel</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Report Card */}
      {tab === 'Report Card' && (
        <div className="space-y-4">
          <div className="flex items-center justify-end gap-2">
            <Select value={rcYear} onValueChange={v=>setRcYear(v??rcYear)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{SCHOOL_YEARS.map(sy=><SelectItem key={sy} value={sy}>{sy}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={()=>window.print()}><Printer className="h-4 w-4 mr-1.5" />Print</Button>
          </div>
          {rcLoading ? <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div> :
          !reportCardData?.student ? <p className="text-sm text-muted-foreground italic">No report card data for {rcYear}.</p> : (
            <div className="space-y-4">
              <Card><CardContent className="pt-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Student</p>
                    <p className="font-semibold">{reportCardData.student.name}</p>
                    <p className="text-sm text-muted-foreground">{reportCardData.student.student_id}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Grade & Section</p>
                    <p className="font-semibold">{reportCardData.student.grade_level}{reportCardData.student.strand&&reportCardData.student.strand!=='-'?` — ${reportCardData.student.strand}`:''}</p>
                    <p className="text-sm text-muted-foreground">Section {reportCardData.student.section}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase tracking-wide">School Year</p>
                    <p className="font-semibold">{reportCardData.student.school_year}</p>
                    {reportCardData.overall_average!=null&&<p className={`text-sm font-bold ${reportCardData.overall_average>=75?'text-green-600':'text-destructive'}`}>GWA: {Number(reportCardData.overall_average).toFixed(2)}</p>}
                  </div>
                </div>
              </CardContent></Card>
              {Object.entries(reportCardData.semesters??{}).length===0 ? <p className="text-sm text-muted-foreground italic">No grade entries for this year.</p> :
              Object.entries(reportCardData.semesters??{}).map(([sem,semData])=>(
                <Card key={sem}>
                  <div className="px-4 pt-4 pb-2 border-b flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{sem}</h3>
                    {semData.general_average!=null&&<span className={`text-sm font-bold ${semData.general_average>=75?'text-green-600':'text-destructive'}`}>Avg: {Number(semData.general_average).toFixed(2)}</span>}
                  </div>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left">Subject</th><th className="px-4 py-2 text-center">Q1</th>
                        <th className="px-4 py-2 text-center">Q2</th><th className="px-4 py-2 text-center">Q3</th>
                        <th className="px-4 py-2 text-center">Q4</th><th className="px-4 py-2 text-center">Final</th><th className="px-4 py-2 text-center">Remarks</th>
                      </tr></thead>
                      <tbody>
                        {semData.subjects.map(r=>(
                          <tr key={r.grade_id} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-2 font-medium">{r.subject}</td>
                            {[r.q1,r.q2,r.q3,r.q4].map((v,i)=><td key={i} className="px-4 py-2 text-center font-mono">{v!=null?Number(v).toFixed(2):'—'}</td>)}
                            <td className="px-4 py-2 text-center"><Badge variant={r.final_grade==null?'secondary':r.final_grade>=75?'default':'destructive'} className="font-mono">{r.final_grade!=null?Number(r.final_grade).toFixed(2):'—'}</Badge></td>
                            <td className="px-4 py-2 text-center">{r.remarks?<Badge variant={r.remarks==='Passed'?'default':r.remarks==='Failed'?'destructive':'secondary'}>{r.remarks}</Badge>:'—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Academic History */}
      {tab === 'History' && (
        historyLoading ? <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div> :
        !(historyData?.data?.length) ? <p className="text-sm text-muted-foreground italic py-8">No academic history available.</p> :
        <div className="space-y-3">
          {(historyData?.data??[]).map(rec=>(
            <Card key={rec.school_year}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{rec.school_year}</p>
                      <p className="text-xs text-muted-foreground">{rec.grade_level}{rec.strand&&rec.strand!=='-'?` — ${rec.strand}`:''}{rec.section&&rec.section!=='—'?` · Section ${rec.section}`:''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block"><p className="text-xs text-muted-foreground">Subjects</p><p className="font-semibold text-sm">{rec.total_subjects}</p></div>
                    <div className="text-right hidden sm:block"><p className="text-xs text-muted-foreground">GWA</p>
                      <p className={`font-bold text-sm ${rec.general_average!=null?rec.general_average>=75?'text-green-600':'text-destructive':'text-muted-foreground'}`}>{rec.general_average!=null?Number(rec.general_average).toFixed(2):'—'}</p>
                    </div>
                    <Badge variant={rec.status==='Passed'?'default':rec.status==='Failed'?'destructive':'secondary'}>{rec.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Attendance */}
      {tab === 'Attendance' && (
        <div className="space-y-4">
          {/* Sub-tab switcher */}
          <div className="flex gap-1 border-b">
            <button onClick={() => setAttSubTab('records')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${attSubTab === 'records' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              Class Attendance
            </button>
            <button onClick={() => setAttSubTab('kiosk')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${attSubTab === 'kiosk' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <Monitor className="h-3.5 w-3.5" /> Kiosk Scans
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={()=>{if(attMonth===0){setAttMonth(11);setAttYear(y=>y-1);}else setAttMonth(m=>m-1);}}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-semibold w-36 text-center">{MONTHS[attMonth]} {attYear}</span>
            <Button variant="outline" size="icon" onClick={()=>{if(attMonth===11){setAttMonth(0);setAttYear(y=>y+1);}else setAttMonth(m=>m+1);}}><ChevronRight className="h-4 w-4" /></Button>
          </div>

          {attSubTab === 'records' ? (
            attendanceLoading ? <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div> : (
              <>
                <div className="grid gap-3 grid-cols-3 sm:grid-cols-5">
                  {[{l:'Present',v:attendanceData?.summary.present??0,c:'text-green-600'},{l:'Absent',v:attendanceData?.summary.absent??0,c:'text-destructive'},{l:'Late',v:attendanceData?.summary.late??0,c:'text-yellow-600'},{l:'Excused',v:attendanceData?.summary.excused??0,c:'text-blue-600'},{l:'Half Day',v:attendanceData?.summary.half_day??0,c:'text-purple-600'}].map(({l,v,c})=>(
                    <Card key={l}><CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">{l}</p><p className={`text-xl font-bold ${c}`}>{v}</p></CardContent></Card>
                  ))}
                </div>
                {(() => {
                  const { weeks, recordMap } = buildCalendar(attYear, attMonth, attendanceData?.records??[]);
                  const dk = (d:number) => `${attYear}-${String(attMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                  return (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Calendar</CardTitle></CardHeader>
                      <CardContent>
                        <table className="w-full text-sm">
                          <thead><tr>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><th key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">{d}</th>)}</tr></thead>
                          <tbody>
                            {weeks.map((week,wi)=>(
                              <tr key={wi}>
                                {week.map((day,di)=>{
                                  if(day===null) return <td key={di} className="p-1 text-center text-xs text-muted-foreground/30">—</td>;
                                  const rec=recordMap[dk(day)];
                                  return <td key={di} className="p-1 text-center"><div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${rec?ATTENDANCE_COLORS[rec.status]??'':'text-muted-foreground'}`} title={rec?`${rec.status}${rec.remarks?` — ${rec.remarks}`:''}`:undefined}>{day}</div></td>;
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  );
                })()}
                {(attendanceData?.records??[]).length===0&&<p className="text-sm text-muted-foreground italic">No attendance records for {MONTHS[attMonth]} {attYear}.</p>}
              </>
            )
          ) : (
            /* Kiosk Scans sub-tab */
            kioskLogLoading ? <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div> : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
                  <Card><CardContent className="pt-3 pb-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><LogIn className="h-3.5 w-3.5 text-green-600" /> Time-In</p>
                    <p className="text-2xl font-bold text-green-600">{kioskLogData?.summary.total_in ?? 0}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-3 pb-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><LogOut className="h-3.5 w-3.5 text-blue-600" /> Time-Out</p>
                    <p className="text-2xl font-bold text-blue-600">{kioskLogData?.summary.total_out ?? 0}</p>
                  </CardContent></Card>
                </div>
                {(kioskLogData?.logs ?? []).length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                    <Monitor className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No kiosk scans for {MONTHS[attMonth]} {attYear}.</p>
                  </div>
                ) : (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Scan History</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                          <th className="px-4 py-2 text-left">Date &amp; Time</th>
                          <th className="px-4 py-2 text-left">Direction</th>
                          <th className="px-4 py-2 text-left">Kiosk</th>
                        </tr></thead>
                        <tbody>
                          {(kioskLogData?.logs ?? []).map(l => (
                            <tr key={l.id} className="border-b last:border-0 hover:bg-muted/20">
                              <td className="px-4 py-2 whitespace-nowrap">
                                {format(new Date(l.log_time), 'MMM d, yyyy')}<br />
                                <span className="text-xs text-muted-foreground">{format(new Date(l.log_time), 'hh:mm:ss a')}</span>
                              </td>
                              <td className="px-4 py-2">
                                {l.direction === 'in'
                                  ? <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium"><LogIn className="h-3.5 w-3.5" /> Time-In</span>
                                  : <span className="inline-flex items-center gap-1 text-xs text-blue-700 font-medium"><LogOut className="h-3.5 w-3.5" /> Time-Out</span>}
                              </td>
                              <td className="px-4 py-2">
                                {l.kiosk_code ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded w-fit">{l.kiosk_code}</span>
                                    {l.kiosk_name && <span className="text-xs text-muted-foreground">{l.kiosk_name}</span>}
                                  </div>
                                ) : <span className="text-xs text-muted-foreground italic">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}
              </>
            )
          )}
        </div>
      )}

      {/* Enrollment */}
      {tab === 'Enrollment' && (
        enrollmentLoading
          ? <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
          : (() => {
            const current = enrollmentData?.data.current;
            const pending = enrollmentData?.data.pending_reenrollment;
            const canReEnroll = current?.status === 'Enrolled' && !pending;
            const isSHS = reEnrollForm.dept === 'Senior High School';

            return (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">Current Enrollment</CardTitle>
                        <p className="text-sm text-muted-foreground">SY {current?.school_year}</p>
                      </div>
                      {current?.status && (
                        <Badge variant={
                          current.status === 'Enrolled' ? 'default'
                          : current.status === 'Pending' ? 'secondary'
                          : current.status === 'Withdrawn' || current.status === 'Dropped' ? 'destructive'
                          : 'outline'
                        }>
                          {current.status}
                        </Badge>
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

                    {canReEnroll && (
                      <div className="mt-4 pt-4 border-t">
                        <Button onClick={() => { setReEnrollError(''); setShowReEnroll(true); }} variant="outline" size="sm">
                          <RefreshCw className="h-4 w-4 mr-2" /> Request Re-Enrollment for Next Year
                        </Button>
                      </div>
                    )}

                    {pending && (
                      <Alert className="mt-4">
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                          A re-enrollment request for <strong>SY {pending.school_year}</strong> ({pending.grade_level}) has been submitted and is currently <strong>{pending.status}</strong>. The registrar will review the application.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* Re-enroll dialog */}
                <Dialog open={showReEnroll} onOpenChange={o => { setShowReEnroll(o); if (!o) setReEnrollError(''); }}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Re-Enrollment</DialogTitle>
                      <DialogDescription>
                        Complete the details for {current?.name}'s re-enrollment application. The registrar will review and process the request.
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
          })()
      )}

      {/* LMS Progress */}
      {tab === 'LMS' && (
        lmsLoading
          ? <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
          : !lmsData?.data
          ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <TrendingUp className="h-8 w-8" />
              <p className="text-sm">No LMS class assigned yet.</p>
            </div>
          ) : (() => {
            const { assignments, quizzes, discussions, recent_grades } = lmsData.data;
            const submitColor = assignments.total === 0 ? '' :
              assignments.rate_pct >= 75 ? 'text-green-700' :
              assignments.rate_pct >= 50 ? 'text-yellow-700' : 'text-red-600';
            const quizColor = quizzes.avg_score_pct === null ? 'text-muted-foreground' :
              quizzes.avg_score_pct >= 75 ? 'text-green-700' :
              quizzes.avg_score_pct >= 50 ? 'text-yellow-700' : 'text-red-600';
            return (
              <div className="space-y-4 py-2">
                {/* Headline stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="p-4 text-center">
                    <p className={`text-2xl font-bold ${submitColor}`}>{assignments.rate_pct}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Submission Rate</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className={`text-2xl font-bold ${quizColor}`}>
                      {quizzes.avg_score_pct !== null ? `${quizzes.avg_score_pct}%` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Quiz Avg Score</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold">{quizzes.taken}<span className="text-muted-foreground text-sm">/{quizzes.total}</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Quizzes Taken</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold">{discussions.posts + discussions.replies}</p>
                    <p className="text-xs text-muted-foreground mt-1">Discussion Activity</p>
                  </Card>
                </div>

                {/* Assignments detail */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Assignments</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                    <div>
                      <p className="text-xl font-semibold">{assignments.submitted}<span className="text-muted-foreground text-sm">/{assignments.total}</span></p>
                      <p className="text-xs text-muted-foreground">Submitted</p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-green-700">{assignments.graded}</p>
                      <p className="text-xs text-muted-foreground">Graded</p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-blue-600">{assignments.pending}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-orange-600">{assignments.late}</p>
                      <p className="text-xs text-muted-foreground">Late</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Quizzes detail */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4" /> Quizzes</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center text-sm">
                    <div>
                      <p className="text-xl font-semibold">{quizzes.taken}<span className="text-muted-foreground text-sm">/{quizzes.total}</span></p>
                      <p className="text-xs text-muted-foreground">Taken</p>
                    </div>
                    <div>
                      <p className={`text-xl font-semibold ${quizColor}`}>
                        {quizzes.avg_score_pct !== null ? `${quizzes.avg_score_pct}%` : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">Average Score</p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold">{discussions.posts} / {discussions.replies}</p>
                      <p className="text-xs text-muted-foreground">Posts / Replies</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent grades */}
                {recent_grades.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Recent Grades</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {recent_grades.map((g, i) => {
                        const badgeClass = g.pct === null ? 'bg-gray-100 text-gray-700' :
                          g.pct >= 75 ? 'bg-green-100 text-green-800' :
                          g.pct >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-700';
                        return (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{g.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {g.graded_at ?? ''}
                                {g.points != null && <span className="ml-2">{g.score ?? '—'} / {g.points} pts</span>}
                              </p>
                            </div>
                            <Badge className={`${badgeClass} hover:${badgeClass} ml-2`}>
                              {g.pct !== null ? `${g.pct}%` : '—'}
                            </Badge>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()
      )}

      {/* Bank Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{resubmitTarget ? 'Resubmit Transfer Request' : 'Pay via Bank Transfer / E-Wallet'}</DialogTitle>
            <DialogDescription>Transfer to the school account, then upload your deposit slip or transaction receipt.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Payment Channel <span className="text-destructive">*</span></Label>
              <Select value={txChannelId} onValueChange={(v) => setTxChannelId(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Select bank or e-wallet…" /></SelectTrigger>
                <SelectContent>
                  {channels.map(ch => (
                    <SelectItem key={ch.id} value={String(ch.id)}>
                      <span className="flex items-center gap-1.5">
                        {ch.account_type === 'bank' ? <Building2 className="h-3.5 w-3.5" /> : <Wallet className="h-3.5 w-3.5" />}
                        {ch.provider_name} — {ch.account_name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedChannel && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Account Name</span><span className="font-medium">{selectedChannel.account_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Account Number</span><span className="font-mono font-semibold">{selectedChannel.account_number}</span></div>
                {selectedChannel.branch && <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span>{selectedChannel.branch}</span></div>}
                {selectedChannel.instructions && <p className="text-xs text-muted-foreground pt-1 border-t mt-1">{selectedChannel.instructions}</p>}
                {selectedChannel.qr_code_url && (
                  <div className="flex justify-center pt-2">
                    <img src={selectedChannel.qr_code_url} alt="QR Code" className="h-32 w-32 object-contain rounded border" />
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (₱) <span className="text-destructive">*</span></Label>
                <Input type="number" min="1" step="0.01" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Transfer Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reference / Transaction Number <span className="text-destructive">*</span></Label>
              <Input value={txRef} onChange={e => setTxRef(e.target.value)} placeholder="e.g. 12345678" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea value={txNotes} onChange={e => setTxNotes(e.target.value)} rows={2} placeholder="Any additional info…" />
            </div>
            <div className="space-y-1.5">
              <Label>Deposit Slip / Receipt <span className="text-destructive">*</span></Label>
              <input ref={receiptInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => setTxReceipt(e.target.files?.[0] ?? null)} />
              {txReceipt ? (
                <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <span className="flex-1 truncate">{txReceipt.name}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setTxReceipt(null)}><XIcon className="h-3.5 w-3.5" /></Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => receiptInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Choose File
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Accepted: images (JPG, PNG) or PDF. Max 5 MB.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button onClick={handleTransferSubmit} disabled={submitTransferMutation.isPending || !txChannelId || !txAmount || !txRef || !txDate || !txReceipt}>
              {submitTransferMutation.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              {resubmitTarget ? 'Resubmit Request' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
