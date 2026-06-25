import { useState, useEffect, useRef, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { LedgerStudent, AccountAssessment, SchoolInfo } from '@/types';
import { useSchoolInfo } from '@/hooks/use-school-info';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Loader2, Search, ArrowLeft, BookText, Plus, Trash2,
  ChevronDown, ChevronRight, Ban, RefreshCw, Printer, Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReceiptTemplate, { type ReceiptData } from '@/components/receipt-template';

// ───── Types ─────────────────────────────────────────────

interface StudentInfo {
  reg_id: number;
  public_id: string;
  student_id: string;
  lname: string;
  fname: string;
  mname: string;
  suffix: string;
  sex: string;
  gradeLevel: string;
  strand: string;
  section: string;
  dept: string;
  schoolYear: string;
  sem: string;
  assessment_id: number | null;
}

interface AssessmentItem {
  stud_assess_id: number;
  category_id: number;
  particular_id: number;
  par_stat: string;
  total_amt_payable: number;
  total_amt_discount: number;
  total_amt_paid: number;
  total_amt_bal: number;
  category?: { category_id: number; description: string };
  particular?: { particular_id: number; description: string; amount: number };
}

interface PaymentDataItem {
  pay_data_id: number;
  public_id: string;
  receipt_num: string;
  trans_payment_type: string;
  amt_tend: number;
  entry_date: string;
  trans_time: string;
  status: string;
  remarks: string | null;
}

interface PaymentItem {
  payment_id: number;
  receipt_num: string;
  category_id: number;
  particular_id: number;
  amt_payable: number;
  amt_paid: number;
  payment_type: string;
  trans_date: string;
  trans_time: string;
  status: string;
  void_remarks: string | null;
}

interface OtherFeeItem {
  particular_id: number;
  public_id: string;
  description: string;
  amount: number;
  status: string;
  schoolYear: string;
}

interface DiscountItem {
  discount_id: number;
  description: string;
  amount: number;
  percentage: number;
  type: string;
  status: string;
  deduct_category_id: number;
}

interface LedgerData {
  student: StudentInfo;
  assessments: AssessmentItem[];
  payments: PaymentItem[];
  payment_data: PaymentDataItem[];
  other_fees: OtherFeeItem[];
  discounts: DiscountItem[];
  totals: {
    total_payable: number;
    total_discount: number;
    total_paid: number;
    total_balance: number;
  };
}

interface BookAssignment {
  book_assigned_id: number;
  public_id: string;
  book_id: number;
  book: { book_id: number; book_title: string; book_amt: number; gradeLevel: string } | null;
}

interface AvailableBook {
  book_id: number;
  public_id: string;
  book_title: string;
  book_amt: number;
  gradeLevel: string;
}

// ───── Helpers ───────────────────────────────────────────

function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function studentFullName(s: StudentInfo): string {
  const suffix = s.suffix && s.suffix !== '-' ? ` ${s.suffix}` : '';
  const mi = s.mname ? ` ${s.mname.charAt(0)}.` : '';
  return `${s.fname}${mi} ${s.lname}${suffix}`;
}

function classAssignment(s: StudentInfo): string {
  if (s.dept === 'Senior High School') {
    return `${s.gradeLevel} ${s.strand} - ${s.section}`;
  }
  return `${s.gradeLevel} - ${s.section}`;
}

// ───── Print Helper ─────────────────────────────────────

const EXAM_LABELS: Record<string, string> = {
  '1': 'PRELIM EXAM DUE',
  '2': 'MIDTERM EXAM DUE',
  '3': '3RD MONTH EXAM DUE',
  '4': '4TH MONTH EXAM DUE',
  '5': '5TH MONTH EXAM DUE',
  '6': '6TH MONTH EXAM DUE',
  '7': '7TH MONTH EXAM DUE',
  '8': '8TH MONTH EXAM DUE',
  '9': '9TH MONTH EXAM DUE',
  '10': '10TH MONTH EXAM DUE',
};

function buildAssessmentPrintHTML(
  data: LedgerData,
  student: StudentInfo,
  grouped: { categoryId: number; category: string; items: AssessmentItem[]; totalPayable: number; totalDiscount: number; totalPaid: number; totalBalance: number }[],
  settings: { semester: string; examNo: string; footerNote: string },
  school: SchoolInfo | undefined,
  preparedBy: { name: string; title: string; contact: string },
): string {
  const peso = (n: number) => new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  const esc = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Determine department label for the header
  const deptLabel = student.dept === 'Senior High School' ? 'SENIOR HIGH SCHOOL' : 'JUNIOR HIGH SCHOOL';

  // Build the left-side particulars rows
  const leftRows = grouped.map((g) => {
    const catHeader = `<tr><td colspan="4" style="padding:4px 0 2px 0;font-weight:bold;font-style:italic;text-decoration:underline;font-size:11px">${esc(g.category.toUpperCase())}</td></tr>`;
    const itemRows = g.items.map((i) => `<tr>
      <td style="padding:1px 4px;font-size:11px">${esc(i.particular?.description ?? '')}</td>
      <td style="padding:1px 4px;text-align:right;font-size:11px">${peso(Number(i.total_amt_payable))}</td>
      <td style="padding:1px 4px;text-align:right;font-size:11px">${peso(Number(i.total_amt_paid))}</td>
      <td style="padding:1px 4px;text-align:right;font-size:11px">${peso(Number(i.total_amt_bal))}</td>
    </tr>`).join('');
    return catHeader + itemRows;
  }).join('');

  // Category summary for right side
  const catSummaryRows = grouped.map((g) =>
    `<tr><td style="padding:2px 0;font-size:11px">${esc(g.category.toUpperCase())}</td><td style="padding:2px 8px;text-align:right;font-size:11px">${peso(g.totalPayable)}</td></tr>`
  ).join('');

  const totalPayable = Number(data.totals.total_payable);
  const totalPaid = Number(data.totals.total_paid);
  const totalBalance = Number(data.totals.total_balance);

  // Exam due calculation: total_payable / 10 * examNo - total_paid (simplified)
  const examNum = parseInt(settings.examNo) || 1;
  const examDue = Math.max(0, (totalPayable / 10) * examNum - totalPaid);
  const examLabel = EXAM_LABELS[settings.examNo] || `${settings.examNo}TH MONTH EXAM DUE`;

  const schoolName = school?.schoolName ?? 'St. Vincent\'s High School, Inc.';
  const schoolAddress = school?.address ?? '';
  const schoolLogo = school?.logo ?? '';

  return `<!DOCTYPE html><html><head><title>Assessment - ${esc(student.lname)}, ${esc(student.fname)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px 30px; color: #000; }
  @media print { body { padding: 10px 20px; } }

  .header { text-align: center; margin-bottom: 12px; }
  .header img { height: 60px; vertical-align: middle; margin-right: 10px; }
  .header .title { display: inline-block; vertical-align: middle; }
  .header h2 { font-size: 16px; margin: 0; }
  .header .addr { font-size: 10px; margin: 2px 0 4px; }
  .header h3 { font-size: 13px; font-weight: bold; margin: 4px 0 2px; }
  .header .sy { font-size: 11px; }

  .divider { border: none; border-top: 2px dotted #999; margin: 8px 0; }

  .student-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
  .student-name { font-size: 14px; font-weight: bold; }
  .student-id { font-size: 36px; font-weight: bold; text-align: right; line-height: 1; }
  .student-class { font-size: 12px; font-weight: bold; }

  .content { display: flex; gap: 20px; margin-top: 8px; }
  .left { flex: 1; }
  .right { width: 280px; flex-shrink: 0; }

  .left table { width: 100%; border-collapse: collapse; }
  .left .hdr td { font-weight: bold; font-size: 11px; padding-bottom: 4px; }

  .right .cat-summary { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .right .cat-summary td { font-size: 11px; }
  .right .cat-summary .underline-row td { border-bottom: 1px solid #000; }

  .right .total-section { margin-bottom: 12px; }
  .right .total-line { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
  .right .total-line.bold { font-weight: bold; }
  .right .total-line.red { color: red; }

  .right .exam-section { margin-top: 12px; border-top: 3px double #000; padding-top: 6px; }
  .right .exam-title { font-size: 12px; font-weight: bold; }
  .right .exam-due { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-top: 4px; }

  .right .note { margin-top: 10px; font-style: italic; font-size: 11px; }
  .right .note-divider { border-top: 1px dashed #999; margin-top: 10px; padding-top: 6px; }

  .right .prepared { margin-top: 12px; font-size: 11px; }
  .right .prepared .label { color: #555; }
  .right .prepared .name { font-weight: bold; text-decoration: underline; font-size: 12px; }
  .right .prepared .role { font-size: 11px; }

  .totals-row { font-weight: bold; font-size: 11px; }
  .totals-row td { padding-top: 6px; border-top: 1px solid #000; }

  @media print { button { display: none; } }
</style></head><body>

<!-- HEADER -->
<div class="header">
  ${schoolLogo ? `<img src="${schoolLogo}" alt="Logo" />` : ''}
  <div class="title">
    <h2>${esc(schoolName)}</h2>
    <div class="addr">${esc(schoolAddress.toUpperCase())}</div>
    <h3>${deptLabel} EXAMINATION</h3>
    <h3>ASSESSMENT</h3>
    <div class="sy">S.Y. ${esc(student.schoolYear)}</div>
  </div>
</div>

<hr class="divider" />

<!-- STUDENT INFO -->
<div class="student-row">
  <div>
    <div class="student-name">${esc(student.lname.toUpperCase())}, ${esc(student.fname.toUpperCase())} ${student.mname ? esc(student.mname.toUpperCase()) : ''}</div>
    <div class="student-class">GRADE ${esc(student.gradeLevel)} - ${esc(student.section?.toUpperCase() ?? '')}${student.strand && student.strand !== 'N/A' && student.strand !== '-' ? ' / ' + esc(student.strand) : ''} / ${esc(student.dept === 'Senior High School' ? 'SHS' : student.dept === 'Elementary' ? 'ELEM' : 'JHS')} / OLD</div>
  </div>
  <div class="student-id">${esc(student.student_id)}</div>
</div>

<hr class="divider" style="border-top: 1px solid #999; margin: 6px 0;" />

<!-- TWO COLUMN CONTENT -->
<div class="content">
  <!-- LEFT: Particulars -->
  <div class="left">
    <table>
      <tr class="hdr">
        <td style="width:55%">PARTICULARS</td>
        <td style="text-align:right;width:15%">AMT.</td>
        <td style="text-align:right;width:15%">PAID</td>
        <td style="text-align:right;width:15%">BAL.</td>
      </tr>
      ${leftRows}
      <tr class="totals-row">
        <td style="padding-top:8px">TOTALS</td>
        <td style="padding-top:8px;text-align:right">${peso(totalPayable)}</td>
        <td style="padding-top:8px;text-align:right">${peso(totalPaid)}</td>
        <td style="padding-top:8px;text-align:right">${peso(totalBalance)}</td>
      </tr>
    </table>
  </div>

  <!-- RIGHT: Summary -->
  <div class="right">
    <table class="cat-summary">
      <tr><td colspan="2" style="font-weight:bold;font-size:12px;padding-bottom:4px"><em>SCHOOL FEE CATEGORIES</em></td><td style="font-weight:bold;font-size:11px;text-align:right;padding-bottom:4px">AMOUNT</td></tr>
      ${catSummaryRows}
    </table>

    <div class="total-section">
      <div class="total-line bold"><span>TOTAL WHOLE YEAR</span><span>${peso(totalPayable)}</span></div>
      <div class="total-line bold red"><span>TOTAL AMOUNT PAID</span><span>${peso(totalPaid)}</span></div>
      <hr style="border:none;border-top:1px solid #000;margin:4px 0;" />
      <div class="total-line bold"><span>TOTAL AMOUNT BALANCE</span><span>${peso(totalBalance)}</span></div>
    </div>

    <div class="exam-section">
      <div class="exam-title">${esc(examLabel)}</div>
      <hr style="border:none;border-top:2px double #000;margin:4px 0;" />
      <div class="exam-due"><span>TOTAL AMOUNT DUE</span><span>${peso(examDue)}</span></div>
    </div>

    ${settings.footerNote ? `<div class="note-divider"><div class="note"><em>Note: ${esc(settings.footerNote)}</em></div></div>` : ''}

    <div class="note-divider"></div>
    <div class="prepared">
      <div class="label">PREPARED BY:</div>
      <br/>
      <div class="name">${esc(preparedBy.name.toUpperCase())}</div>
      <div class="role">${esc(preparedBy.title)}</div>
      ${preparedBy.contact ? `<div class="role">Contact #: ${esc(preparedBy.contact)}</div>` : ''}
    </div>
  </div>
</div>

</body></html>`;
}

// ───── Main Component ────────────────────────────────────

export default function LedgerPage() {
  const queryClient = useQueryClient();
  const { data: schoolInfo } = useSchoolInfo();
  const { user } = useAuthStore();

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Student selection
  const [selectedRegId, setSelectedRegId] = useState<string | null>(null);

  // Detail view state
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [voidDialog, setVoidDialog] = useState<{ open: boolean; payDataId: string; receiptNum: string }>({
    open: false, payDataId: '', receiptNum: '',
  });
  const [voidRemarks, setVoidRemarks] = useState('');

  // Books
  const [assignBookOpen, setAssignBookOpen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('');

  // Customized Fees
  const [addFeeOpen, setAddFeeOpen] = useState(false);
  const [newFee, setNewFee] = useState({ description: '', amount: '', account_code: '', paymentTerm: 'Upon Enrollment', status: 'Active' });

  // Change Assessment
  const [changeAssessOpen, setChangeAssessOpen] = useState(false);
  const [newAssessmentId, setNewAssessmentId] = useState('');

  // Generate Assessment (print)
  const [genAssessOpen, setGenAssessOpen] = useState(false);
  const [genSettings, setGenSettings] = useState({ semester: '1st Semester', examNo: '1', footerNote: '' });

  // Ledger accounts journal view
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());
  const [expandedApRows, setExpandedApRows] = useState<Set<number>>(new Set());
  const [reprintReceiptNum, setReprintReceiptNum] = useState<string | null>(null);

  // ── Debounced search ──
  useEffect(() => {
    if (searchTerm.length < 2) { setDebouncedTerm(''); return; }
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Close suggestions on click outside ──
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Queries ──
  const searchQuery = useQuery<LedgerStudent[]>({
    queryKey: ['ledger-search', debouncedTerm],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/ledger/search?q=${encodeURIComponent(debouncedTerm)}`);
      return data.data;
    },
    enabled: debouncedTerm.length >= 2,
  });

  const detailQuery = useQuery<LedgerData>({
    queryKey: ['ledger-detail', selectedRegId],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/ledger/students/${selectedRegId}`);
      return data.data;
    },
    enabled: !!selectedRegId,
  });

  const reprintQuery = useQuery<ReceiptData>({
    queryKey: ['ledger-receipt', reprintReceiptNum],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/cashiering/receipt/${reprintReceiptNum!}`);
      return data.data;
    },
    enabled: !!reprintReceiptNum,
  });

  const booksQuery = useQuery<BookAssignment[]>({
    queryKey: ['student-books', selectedRegId],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/books/student/${selectedRegId}`);
      return data.data;
    },
    enabled: !!selectedRegId,
  });

  const availableBooksQuery = useQuery<AvailableBook[]>({
    queryKey: ['books-list'],
    queryFn: async () => {
      const { data } = await api.get('/accounting/books?per_page=200');
      return data.data;
    },
    enabled: assignBookOpen,
  });

  // Available assessments for change-assessment dialog
  const availableAssessmentsQuery = useQuery<AccountAssessment[]>({
    queryKey: ['available-assessments', selectedRegId, detailQuery.data?.student?.gradeLevel],
    queryFn: async () => {
      const s = detailQuery.data?.student;
      if (!s) return [];
      const params = new URLSearchParams({ per_page: '100', gradeLevel: s.gradeLevel, schoolYear: s.schoolYear });
      if (s.strand) params.set('strand', s.strand);
      const { data } = await api.get(`/accounting/assessments?${params}`);
      return (data.data ?? []).filter((a: AccountAssessment) => a.assessment_id !== s.assessment_id);
    },
    enabled: changeAssessOpen && !!detailQuery.data?.student,
  });

  // ── Mutations ──
  const assignBookMutation = useMutation({
    mutationFn: async (bookPublicId: string) => {
      await api.post('/accounting/books/assign', { reg_id: detailQuery.data?.student?.public_id, book_id: bookPublicId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-books', selectedRegId] });
      setAssignBookOpen(false);
      setSelectedBookId('');
      toast.success('Book assigned.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to assign book.'),
  });

  const removeBookMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/accounting/books/assignment/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-books', selectedRegId] });
      toast.success('Book removed.');
    },
    onError: () => toast.error('Failed to remove.'),
  });

  const voidMutation = useMutation({
    mutationFn: async ({ payDataId, remarks }: { payDataId: string; remarks: string }) => {
      await api.post(`/accounting/cashiering/transactions/${payDataId}/void`, { void_remarks: remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger-detail', selectedRegId] });
      setVoidDialog({ open: false, payDataId: '', receiptNum: '' });
      setVoidRemarks('');
      toast.success('Transaction voided successfully.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to void transaction.'),
  });

  // Add customized fee
  const addFeeMutation = useMutation({
    mutationFn: async (fee: typeof newFee) => {
      await api.post(`/accounting/ledger/students/${selectedRegId}/other-fees`, {
        description: fee.description,
        amount: parseFloat(fee.amount),
        account_code: fee.account_code || null,
        paymentTerm: fee.paymentTerm,
        status: fee.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger-detail', selectedRegId] });
      setAddFeeOpen(false);
      setNewFee({ description: '', amount: '', account_code: '', paymentTerm: 'Upon Enrollment', status: 'Active' });
      toast.success('Customized fee added.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to add fee.'),
  });

  // Delete customized fee
  const deleteFeeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/accounting/ledger/other-fees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger-detail', selectedRegId] });
      toast.success('Customized fee deleted.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete fee.'),
  });

  // Change assessment
  const changeAssessMutation = useMutation({
    mutationFn: async (assessmentId: number) => {
      await api.post(`/accounting/students/${selectedRegId}/assessments/change`, {
        assessment_id: assessmentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger-detail', selectedRegId] });
      setChangeAssessOpen(false);
      setNewAssessmentId('');
      toast.success('Assessment changed successfully. Previous transactions voided.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to change assessment.'),
  });

  // ── Handlers ──
  const selectStudent = (regId: string) => {
    setSelectedRegId(regId);
    setShowSuggestions(false);
    setExpandedCategories(new Set());
  };

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const toggleReceipt = (receiptNum: string) => {
    setExpandedReceipts(prev => {
      const next = new Set(prev);
      if (next.has(receiptNum)) next.delete(receiptNum);
      else next.add(receiptNum);
      return next;
    });
  };

  const toggleApRow = (categoryId: number) => {
    setExpandedApRows(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  // ── Derived data ──
  const groupedAssessments = (() => {
    if (!detailQuery.data?.assessments) return [];
    const map = new Map<number, { category: string; items: AssessmentItem[] }>();
    for (const item of detailQuery.data.assessments) {
      const catId = item.category_id;
      if (!map.has(catId)) {
        map.set(catId, { category: item.category?.description ?? 'CUSTOMIZED FEES', items: [] });
      }
      map.get(catId)!.items.push(item);
    }
    return Array.from(map.entries()).map(([catId, group]) => ({
      categoryId: catId,
      category: group.category,
      items: group.items,
      totalPayable: group.items.reduce((s, i) => s + Number(i.total_amt_payable), 0),
      totalDiscount: group.items.reduce((s, i) => s + Number(i.total_amt_discount), 0),
      totalPaid: group.items.reduce((s, i) => s + Number(i.total_amt_paid), 0),
      totalBalance: group.items.reduce((s, i) => s + Number(i.total_amt_bal), 0),
    }));
  })();

  // Group payments by receipt for ledger accounts view
  const receiptGroups = (() => {
    if (!detailQuery.data) return [];
    const paymentData = detailQuery.data.payment_data ?? [];
    const payments = detailQuery.data.payments ?? [];
    return paymentData.map((pd) => ({
      pay_data_id: pd.pay_data_id,
      public_id: pd.public_id,
      receipt_num: pd.receipt_num,
      payment_type: pd.trans_payment_type,
      amt_tend: Number(pd.amt_tend),
      date: pd.entry_date,
      status: pd.status,
      remarks: pd.remarks,
      lines: payments.filter((p) => p.receipt_num === pd.receipt_num),
    })).sort((a, b) => a.date.localeCompare(b.date));
  })();

  // ════════════════════════════════════════════════════════
  // ── DETAIL VIEW ──
  // ════════════════════════════════════════════════════════

  if (selectedRegId && detailQuery.data) {
    const d = detailQuery.data;
    const student = d.student;

    // Build name maps from assessment data for journal entry labelling
    const categoryMap = new Map<number, string>();
    const particularMap = new Map<number, string>();
    for (const item of d.assessments ?? []) {
      if (item.category) categoryMap.set(item.category_id, item.category.description);
      if (item.particular) particularMap.set(item.particular_id, item.particular.description);
    }

    // Enrich receipt groups with per-category line-item breakdown
    const enrichedReceiptGroups = receiptGroups.map((r) => {
      const catMap = new Map<number, { categoryName: string; items: PaymentItem[]; total: number }>();
      for (const line of r.lines) {
        const catName = categoryMap.get(line.category_id) ?? `Category #${line.category_id}`;
        if (!catMap.has(line.category_id)) {
          catMap.set(line.category_id, { categoryName: catName, items: [], total: 0 });
        }
        const entry = catMap.get(line.category_id)!;
        entry.items.push(line);
        entry.total += Number(line.amt_paid);
      }
      return {
        ...r,
        totalPaid: r.lines.reduce((s, i) => s + Number(i.amt_paid), 0),
        categoryGroups: Array.from(catMap.values()),
      };
    });

    // Pre-compute running balances: A/P rows are debits, payment rows are credits
    let _bal = 0;
    const apEntries = groupedAssessments.map((g) => {
      _bal += g.totalPayable - g.totalDiscount;
      return { group: g, runningBal: _bal };
    });
    const payEntries = enrichedReceiptGroups.map((r) => {
      let rb: number | null = null;
      if (r.status !== 'Voided') { _bal -= r.totalPaid; rb = _bal; }
      return { receipt: r, runningBal: rb };
    });

    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => { setSelectedRegId(null); setSearchTerm(''); }}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to search
        </Button>

        {/* ── Student Info Header ── */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <h3 className="text-lg font-bold">{studentFullName(student)}</h3>
                <p className="text-xs text-muted-foreground uppercase">Student Name</p>
              </div>
              <div>
                <h3 className="text-lg font-bold">{student.student_id}</h3>
                <p className="text-xs text-muted-foreground uppercase">ID Code</p>
              </div>
              <div>
                <h3 className="text-lg font-bold">{student.sex?.toUpperCase()}</h3>
                <p className="text-xs text-muted-foreground uppercase">Sex</p>
              </div>
              <div>
                <h3 className="text-lg font-bold">{classAssignment(student).toUpperCase()}</h3>
                <p className="text-xs text-muted-foreground uppercase">Class Assignment</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => { setChangeAssessOpen(true); setNewAssessmentId(''); }}>
                <RefreshCw className="mr-1 h-3 w-3" /> Change Assessment
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setGenAssessOpen(true); setGenSettings({ semester: '1st Semester', examNo: '1', footerNote: '' }); }}>
                <Printer className="mr-1 h-3 w-3" /> Assessment
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Summary Cards ── */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card><CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Payable</div>
            <div className="text-xl font-bold tabular-nums">{formatPeso(d.totals.total_payable)}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Discount</div>
            <div className="text-xl font-bold tabular-nums">{formatPeso(d.totals.total_discount)}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Paid</div>
            <div className="text-xl font-bold tabular-nums text-green-600">{formatPeso(d.totals.total_paid)}</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Balance</div>
            <div className="text-xl font-bold tabular-nums text-destructive">{formatPeso(d.totals.total_balance)}</div>
          </CardContent></Card>
        </div>

        {/* ── Assessment Summary (Grouped by Category) ── */}
        <Card>
          <CardHeader><CardTitle>Assessment Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 w-[35%]">School Fee Categories</th>
                    <th className="text-right p-3">Total Amt.</th>
                    <th className="text-right p-3">Discount</th>
                    <th className="text-right p-3">Paid</th>
                    <th className="text-right p-3">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedAssessments.map((g) => (
                    <Fragment key={g.categoryId}>
                      <tr
                        className="border-t cursor-pointer hover:bg-muted/30"
                        onClick={() => toggleCategory(g.categoryId)}
                      >
                        <td className="p-3 font-medium">
                          <span className="inline-flex items-center gap-2">
                            {expandedCategories.has(g.categoryId)
                              ? <ChevronDown className="h-4 w-4 shrink-0" />
                              : <ChevronRight className="h-4 w-4 shrink-0" />}
                            {g.category}
                          </span>
                        </td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(g.totalPayable)}</td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(g.totalDiscount)}</td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(g.totalPaid)}</td>
                        <td className="p-3 text-right tabular-nums font-medium">{formatPeso(g.totalBalance)}</td>
                      </tr>
                      {expandedCategories.has(g.categoryId) && g.items.map((item) => (
                        <tr key={item.stud_assess_id} className="border-t bg-muted/20">
                          <td className="p-3 pl-10 text-muted-foreground">
                            {item.particular?.description ?? `Particular #${item.particular_id}`}
                          </td>
                          <td className="p-3 text-right tabular-nums text-muted-foreground">{formatPeso(Number(item.total_amt_payable))}</td>
                          <td className="p-3 text-right tabular-nums text-muted-foreground">{formatPeso(Number(item.total_amt_discount))}</td>
                          <td className="p-3 text-right tabular-nums text-muted-foreground">{formatPeso(Number(item.total_amt_paid))}</td>
                          <td className="p-3 text-right tabular-nums text-muted-foreground">{formatPeso(Number(item.total_amt_bal))}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/50 font-bold">
                    <td className="p-3 text-right">TOTALS</td>
                    <td className="p-3 text-right tabular-nums">{formatPeso(d.totals.total_payable)}</td>
                    <td className="p-3 text-right tabular-nums">{formatPeso(d.totals.total_discount)}</td>
                    <td className="p-3 text-right tabular-nums">{formatPeso(d.totals.total_paid)}</td>
                    <td className="p-3 text-right tabular-nums">{formatPeso(d.totals.total_balance)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Ledger Accounts (Journal Entry Format) ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Ledger Accounts</span>
              <Button variant="outline" size="sm" onClick={() => { window.location.href = '/accounting/cashiering'; }}>
                <Receipt className="mr-1 h-3 w-3" /> Go to Cashiering
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 w-28 font-medium">Date</th>
                    <th className="text-left px-3 py-2 font-medium">Particulars</th>
                    <th className="text-left px-3 py-2 w-24 font-medium">Type</th>
                    <th className="text-right px-3 py-2 w-28 font-medium">Debit</th>
                    <th className="text-right px-3 py-2 w-28 font-medium">Credit</th>
                    <th className="text-right px-3 py-2 w-32 font-medium">Running Bal.</th>
                    <th className="px-3 py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Initial Assessment (A/P) rows */}
                  {apEntries.map(({ group: g, runningBal: rb }) => (
                    <tr key={`ap-${g.categoryId}`} className="border-t bg-sky-50/40 dark:bg-sky-950/20">
                      <td className="px-3 py-2 text-xs text-muted-foreground">—</td>
                      <td className="px-3 py-2">
                        <button
                          className="inline-flex items-center gap-1 text-xs font-semibold uppercase hover:text-primary transition-colors"
                          onClick={() => toggleApRow(g.categoryId)}
                        >
                          {expandedApRows.has(g.categoryId)
                            ? <ChevronDown className="h-3 w-3 shrink-0" />
                            : <ChevronRight className="h-3 w-3 shrink-0" />}
                          {g.category}
                        </button>
                        {expandedApRows.has(g.categoryId) && (
                          <div className="mt-1.5 pl-4 space-y-0.5 border-t pt-1.5">
                            {g.items.map((item) => (
                              <div key={item.stud_assess_id} className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                                <span>{item.particular?.description ?? `Particular #${item.particular_id}`}</span>
                                <span className="tabular-nums shrink-0">
                                  {formatPeso(Number(item.total_amt_payable) - Number(item.total_amt_discount))}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">A/P</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatPeso(g.totalPayable - g.totalDiscount)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">—</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatPeso(rb)}</td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  ))}

                  {/* Payment (Credit) rows */}
                  {payEntries.map(({ receipt: r, runningBal: rb }) => (
                    <Fragment key={r.receipt_num}>
                      <tr className={cn('border-t', r.status === 'Voided' && 'opacity-40')}>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">{formatDate(r.date)}</td>
                        <td className="px-3 py-2">
                          <button
                            className="inline-flex items-center gap-1 font-mono text-xs font-semibold hover:text-primary transition-colors"
                            onClick={() => toggleReceipt(r.receipt_num)}
                          >
                            {expandedReceipts.has(r.receipt_num)
                              ? <ChevronDown className="h-3 w-3 shrink-0" />
                              : <ChevronRight className="h-3 w-3 shrink-0" />}
                            {r.receipt_num}
                          </button>
                          {expandedReceipts.has(r.receipt_num) && (
                            <div className="mt-2 pl-3 space-y-2 border-t pt-2">
                              {r.categoryGroups.map((cg) => (
                                <div key={cg.categoryName}>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                                    {cg.categoryName}
                                  </p>
                                  {cg.items.map((item) => (
                                    <div key={item.payment_id} className="flex items-center justify-between gap-4 pl-3 text-xs text-muted-foreground">
                                      <span>{particularMap.get(item.particular_id) ?? `Item #${item.particular_id}`}</span>
                                      <span className="tabular-nums shrink-0">{formatPeso(Number(item.amt_paid))}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">{r.payment_type || 'Cash'}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">—</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-green-600">
                          {formatPeso(r.totalPaid)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                          {r.status === 'Voided'
                            ? <Badge variant="destructive" className="text-[10px]">Voided</Badge>
                            : formatPeso(rb!)
                          }
                        </td>
                        <td className="px-3 py-2">
                          {r.status !== 'Voided' && (
                            <div className="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                title="Reprint receipt"
                                onClick={() => setReprintReceiptNum(r.receipt_num)}
                              >
                                <Printer className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                title="Void transaction"
                                onClick={() => setVoidDialog({ open: true, payDataId: r.public_id, receiptNum: r.receipt_num })}
                              >
                                <Ban className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    </Fragment>
                  ))}

                  {receiptGroups.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No payment transactions recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="border-t-2 bg-muted/50">
                  <tr>
                    <td className="px-3 py-2" colSpan={2}></td>
                    <td className="px-3 py-2 text-xs font-bold uppercase">Totals</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">
                      {formatPeso(Number(d.totals.total_payable) - Number(d.totals.total_discount))}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-green-600">
                      {formatPeso(Number(d.totals.total_paid))}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">
                      {formatPeso(Number(d.totals.total_balance))}
                    </td>
                    <td className="px-3 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Customized Fees ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Customized Fees</span>
              <Button variant="outline" size="sm" onClick={() => { setAddFeeOpen(true); setNewFee({ description: '', amount: '', account_code: '', paymentTerm: 'Upon Enrollment', status: 'Active' }); }}>
                <Plus className="mr-1 h-3 w-3" /> Add Fee
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(d.other_fees ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No customized fees.</p>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3">Description</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="text-left p-3">Status</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.other_fees.map((f) => (
                      <tr key={f.public_id} className="border-t">
                        <td className="p-3">{f.description}</td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(Number(f.amount))}</td>
                        <td className="p-3"><Badge variant="outline">{f.status}</Badge></td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete customized fee"
                            onClick={() => { if (confirm('Delete this customized fee?')) deleteFeeMutation.mutate(f.public_id); }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Discounts / Scholarships ── */}
        {(d.discounts ?? []).length > 0 && (
          <Card>
            <CardHeader><CardTitle>Discounts / Scholarships</CardTitle></CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3">Description</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="text-left p-3">Type</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.discounts.map((disc) => (
                      <tr key={disc.discount_id} className="border-t">
                        <td className="p-3">{disc.description}</td>
                        <td className="p-3 text-right tabular-nums">
                          {disc.type === 'Percentage' ? `${disc.percentage}%` : formatPeso(Number(disc.amount))}
                        </td>
                        <td className="p-3">{disc.type}</td>
                        <td className="p-3"><Badge variant="outline">{disc.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Assigned Books ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><BookText className="h-4 w-4" /> Assigned Books</span>
              <Button variant="outline" size="sm" onClick={() => setAssignBookOpen(true)}>
                <Plus className="mr-1 h-3 w-3" /> Assign Book
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {booksQuery.isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (booksQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No books assigned.</p>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3">Title</th>
                      <th className="text-left p-3">Grade Level</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(booksQuery.data ?? []).map((a) => (
                      <tr key={a.public_id} className="border-t">
                        <td className="p-3">{a.book?.book_title ?? '—'}</td>
                        <td className="p-3">{a.book?.gradeLevel ?? '—'}</td>
                        <td className="p-3 text-right tabular-nums">{formatPeso(a.book?.book_amt ?? 0)}</td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm" onClick={() => removeBookMutation.mutate(a.public_id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assign Book Dialog */}
        <Dialog open={assignBookOpen} onOpenChange={setAssignBookOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Book</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={selectedBookId} onValueChange={(v) => setSelectedBookId(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Select a book..." /></SelectTrigger>
                <SelectContent>
                  {(availableBooksQuery.data ?? []).map((b) => (
                    <SelectItem key={b.book_id} value={b.public_id}>
                      {b.book_title} ({b.gradeLevel}) — {formatPeso(b.book_amt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAssignBookOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => assignBookMutation.mutate(selectedBookId)}
                  disabled={!selectedBookId || assignBookMutation.isPending}
                >
                  {assignBookMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Assign
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Void Transaction Dialog */}
        <Dialog
          open={voidDialog.open}
          onOpenChange={(open) => {
            if (!open) { setVoidDialog({ open: false, payDataId: '', receiptNum: '' }); setVoidRemarks(''); }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Void Transaction</DialogTitle>
              <DialogDescription>
                Void receipt <span className="font-mono font-bold">{voidDialog.receiptNum}</span>? This will reverse all payment amounts.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Enter reason for voiding..."
              value={voidRemarks}
              onChange={(e) => setVoidRemarks(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setVoidDialog({ open: false, payDataId: '', receiptNum: '' })}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => voidMutation.mutate({ payDataId: voidDialog.payDataId, remarks: voidRemarks })}
                disabled={!voidRemarks.trim() || voidMutation.isPending}
              >
                {voidMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Void Transaction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reprint Receipt Dialog */}
        <Dialog open={!!reprintReceiptNum} onOpenChange={(open) => { if (!open) setReprintReceiptNum(null); }}>
          <DialogContent className="max-w-md print:max-w-full print:shadow-none print:border-none">
            <DialogHeader className="print:hidden">
              <DialogTitle>Receipt — {reprintReceiptNum}</DialogTitle>
            </DialogHeader>
            {reprintQuery.isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {reprintQuery.data && (
              <ReceiptTemplate
                data={reprintQuery.data}
                categoryMap={reprintQuery.data.categoryMap}
                particularMap={reprintQuery.data.particularMap}
              />
            )}
            <div className="flex justify-end gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => setReprintReceiptNum(null)}>Close</Button>
              <Button size="sm" onClick={() => window.print()} disabled={!reprintQuery.data}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Customized Fee Dialog */}
        <Dialog open={addFeeOpen} onOpenChange={setAddFeeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Customized Fee</DialogTitle>
              <DialogDescription>Add a fee exclusive to this student (e.g., back accounts from a previous school year).</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newFee.description}
                  onChange={(e) => setNewFee((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g., Back Account - Tuition SY 2023-2024"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number" step="0.01" min="0"
                    value={newFee.amount}
                    onChange={(e) => setNewFee((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Code</Label>
                  <Input
                    value={newFee.account_code}
                    onChange={(e) => setNewFee((p) => ({ ...p, account_code: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Term</Label>
                  <Select value={newFee.paymentTerm} onValueChange={(v) => setNewFee((p) => ({ ...p, paymentTerm: v ?? 'Upon Enrollment' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Upon Enrollment">Upon Enrollment</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Semi-Annual">Semi-Annual</SelectItem>
                      <SelectItem value="Annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={newFee.status} onValueChange={(v) => setNewFee((p) => ({ ...p, status: v ?? 'Active' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddFeeOpen(false)}>Cancel</Button>
              <Button
                onClick={() => addFeeMutation.mutate(newFee)}
                disabled={!newFee.description.trim() || !newFee.amount || addFeeMutation.isPending}
              >
                {addFeeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Fee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Assessment Dialog */}
        <Dialog open={changeAssessOpen} onOpenChange={setChangeAssessOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Assessment</DialogTitle>
              <DialogDescription>
                Changing the assessment will void all existing payment transactions for this school year and reassign billing items.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Current Assessment:</span>{' '}
                <strong>{student.assessment_id ? `#${student.assessment_id}` : 'Not Assigned'}</strong>
              </div>
              {availableAssessmentsQuery.isLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (availableAssessmentsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No alternative assessments available for this grade level and school year.</p>
              ) : (
                <div className="space-y-2">
                  <Label>Change Assessment to</Label>
                  <Select value={newAssessmentId} onValueChange={(v) => setNewAssessmentId(v ?? '')}>
                    <SelectTrigger><SelectValue placeholder="Select an assessment..." /></SelectTrigger>
                    <SelectContent>
                      {(availableAssessmentsQuery.data ?? []).map((a) => (
                        <SelectItem key={a.assessment_id} value={String(a.assessment_id)}>
                          {a.gradeLevel} {a.strand !== 'N/A' ? `- ${a.strand} ` : ''}{a.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setChangeAssessOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => changeAssessMutation.mutate(Number(newAssessmentId))}
                disabled={!newAssessmentId || changeAssessMutation.isPending}
              >
                {changeAssessMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Assessment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generate Assessment (Print) Dialog */}
        <Dialog open={genAssessOpen} onOpenChange={setGenAssessOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Assessment</DialogTitle>
              <DialogDescription>Configure and print the student assessment.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>School Year</Label>
                  <Input value={student.schoolYear} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select value={genSettings.semester} onValueChange={(v) => setGenSettings((p) => ({ ...p, semester: v ?? '1st Semester' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st Semester">1st Semester</SelectItem>
                      <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Examination No.</Label>
                <Select value={genSettings.examNo} onValueChange={(v) => setGenSettings((p) => ({ ...p, examNo: v ?? '1' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {['1st', '2nd', '3rd'][i] ?? `${i + 1}th`} Exam
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assessment Footer Note</Label>
                <Textarea
                  value={genSettings.footerNote}
                  onChange={(e) => setGenSettings((p) => ({ ...p, footerNote: e.target.value }))}
                  placeholder="Enter footer note for the printed assessment"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGenAssessOpen(false)}>Cancel</Button>
              <Button onClick={() => {
                const printContent = buildAssessmentPrintHTML(
                  d, student, groupedAssessments, genSettings, schoolInfo ?? undefined,
                  { name: user?.full_name ?? '', title: user?.access === 'Administrator' ? 'Students Account Administrator' : user?.access ?? '', contact: user?.contact_number ?? '' },
                );
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(printContent);
                  printWindow.document.close();
                  printWindow.focus();
                  printWindow.print();
                }
                setGenAssessOpen(false);
              }}>
                <Printer className="mr-2 h-4 w-4" /> Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Loading state for detail
  if (selectedRegId && detailQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // ── SEARCH VIEW ──
  // ════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Student Ledger</h1>
        <p className="text-muted-foreground">Search by Student ID or name to view billing and payment history</p>
      </div>

      <Card className="overflow-visible">
        <CardContent className="pt-6 overflow-visible">
          <div ref={searchRef} className="relative max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Type student ID or name..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
                onFocus={() => { if (debouncedTerm.length >= 2) setShowSuggestions(true); }}
                onKeyDown={(e) => { if (e.key === 'Escape') setShowSuggestions(false); }}
              />
              {searchQuery.isFetching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Suggestion Dropdown */}
            {showSuggestions && debouncedTerm.length >= 2 && searchQuery.data && (
              <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-md shadow-lg max-h-80 overflow-y-auto">
                {searchQuery.data.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">No students found.</div>
                ) : (
                  searchQuery.data.map((s) => (
                    <button
                      key={s.public_id ?? s.reg_id}
                      className="flex w-full items-center justify-between py-3 px-4 hover:bg-accent text-left border-b last:border-b-0"
                      onClick={() => selectStudent(s.public_id)}
                    >
                      <div>
                        <p className="font-medium">{s.lname}, {s.fname} {s.mname ? s.mname.charAt(0) + '.' : ''}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.student_id} &middot; {s.gradeLevel} &middot; {s.dept}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          'text-sm tabular-nums font-medium',
                          (s.total_balance ?? 0) > 0 ? 'text-destructive' : 'text-green-600',
                        )}>
                          {formatPeso(s.total_balance ?? 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Balance</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
