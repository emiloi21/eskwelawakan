import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '@/lib/api';
import type { PaginatedResponse, LedgerStudent } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Plus, ArrowRight, Trash2, Loader2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function formatPeso(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

interface AdvancePayment {
  adv_pay_id: number;
  public_id: string;
  reg_id: number;
  description: string;
  adv_pay_amt: number;
  created_at: string;
  updated_at: string;
  student?: { reg_id: number; public_id: string; lname: string; fname: string; mname: string; student_id: string } | null;
}

interface AssessmentItem {
  stud_assess_id: number;
  category_id: number;
  particular_id: number;
  total_amt_payable: number;
  total_amt_discount: number;
  total_amt_paid: number;
  total_amt_bal: number;
  par_stat: string;
  category?: { category_id: number; category_name: string } | null;
}

const createSchema = z.object({
  reg_id: z.string({ required_error: 'Select a student' }).min(1, 'Select a student'),
  description: z.string().min(1, 'Description is required').max(255),
  adv_pay_amt: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
});
type CreateFormValues = z.infer<typeof createSchema>;

export default function AdvancePaymentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [applyTarget, setApplyTarget] = useState<AdvancePayment | null>(null);
  const [applyItem, setApplyItem] = useState('');
  const [applyAmount, setApplyAmount] = useState('');

  // Student search for creating advance payment
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSearched, setStudentSearched] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<LedgerStudent | null>(null);

  // ── Data queries ──────────────────────────────────
  const { data, isLoading } = useQuery<PaginatedResponse<AdvancePayment>>({
    queryKey: ['advance-payments', page, pageSize],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/advance-payments?page=${page}&per_page=${pageSize}`);
      return data;
    },
  });

  const studentSearchQuery = useQuery<LedgerStudent[]>({
    queryKey: ['adv-student-search', studentSearch],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/ledger/search?q=${encodeURIComponent(studentSearch)}`);
      return data;
    },
    enabled: studentSearched && studentSearch.length >= 2,
  });

  // Student assessments for apply dialog
  const assessmentsQuery = useQuery<{ assessments: AssessmentItem[] }>({
    queryKey: ['student-assessments', applyTarget?.reg_id],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/students/${applyTarget!.student!.public_id}/assessments`);
      return data.data;
    },
    enabled: applyOpen && applyTarget !== null,
  });

  const unpaidItems = (assessmentsQuery.data?.assessments ?? []).filter(
    (a) => a.par_stat === 'Active' && a.total_amt_bal > 0,
  );

  // ── Mutations ─────────────────────────────────────
  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { description: '', adv_pay_amt: 0, reg_id: '' },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateFormValues) => api.post('/accounting/advance-payments', values),
    onSuccess: () => {
      toast.success('Advance payment recorded.');
      queryClient.invalidateQueries({ queryKey: ['advance-payments'] });
      setCreateOpen(false);
      createForm.reset();
      setSelectedStudent(null);
      setStudentSearch('');
      setStudentSearched(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to create advance payment.'),
  });

  const applyMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; category_id: number; particular_id: number; amount: number }) =>
      api.post(`/accounting/advance-payments/${id}/apply`, body),
    onSuccess: (res) => {
      const remaining = res.data.remaining ?? 0;
      toast.success(remaining > 0 ? `Applied. ${formatPeso(remaining)} remaining.` : 'Fully applied and removed.');
      queryClient.invalidateQueries({ queryKey: ['advance-payments'] });
      setApplyOpen(false);
      setApplyTarget(null);
      setApplyItem('');
      setApplyAmount('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to apply advance.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/accounting/advance-payments/${id}`),
    onSuccess: () => {
      toast.success('Advance payment deleted.');
      queryClient.invalidateQueries({ queryKey: ['advance-payments'] });
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to delete.'),
  });

  // ── Helpers ───────────────────────────────────────
  const items = data?.data ?? [];
  const filtered = search
    ? items.filter(
        (r) =>
          r.student?.lname?.toLowerCase().includes(search.toLowerCase()) ||
          r.student?.fname?.toLowerCase().includes(search.toLowerCase()) ||
          r.description.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  const totalAmount = items.reduce((sum, r) => sum + Number(r.adv_pay_amt), 0);

  function openApply(row: AdvancePayment) {
    setApplyTarget(row);
    setApplyItem('');
    setApplyAmount('');
    setApplyOpen(true);
  }

  function handleApplySubmit() {
    if (!applyTarget || !applyItem || !applyAmount) return;
    const [catId, parId] = applyItem.split('-').map(Number);
    applyMutation.mutate({
      id: applyTarget.public_id,
      category_id: catId,
      particular_id: parId,
      amount: parseFloat(applyAmount),
    });
  }

  const selectedAssessment = unpaidItems.find(
    (a) => `${a.category_id}-${a.particular_id}` === applyItem,
  );
  const maxApply = Math.min(
    selectedAssessment?.total_amt_bal ?? 0,
    applyTarget?.adv_pay_amt ?? 0,
  );

  // ── Columns ───────────────────────────────────────
  const columns: ColumnDef<AdvancePayment>[] = [
    {
      id: 'student_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Student" />,
      cell: ({ row }) => {
        const s = row.original.student;
        return (
          <div>
            <span className="font-medium">{s ? `${s.lname}, ${s.fname}` : `Reg#${row.original.reg_id}`}</span>
            {s?.student_id && <p className="text-xs text-muted-foreground">{s.student_id}</p>}
          </div>
        );
      },
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
    },
    {
      accessorKey: 'adv_pay_amt',
      header: () => <span className="flex justify-end">Amount</span>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums font-medium">{formatPeso(Number(row.original.adv_pay_amt))}</div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openApply(row.original)}>
                <ArrowRight className="mr-2 h-4 w-4" /> Apply
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(row.original.public_id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Advance Payments</h1>
          <p className="text-muted-foreground">Record and apply advance payments / deposits</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Advance Payment
        </Button>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Unapplied Advances</p>
            <p className="text-2xl font-bold tabular-nums">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold tabular-nums">{formatPeso(totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main list */}
      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        page={page}
        pageCount={data?.last_page ?? 1}
        onPageChange={setPage}
        total={data?.total}
        from={data?.from}
        to={data?.to}
        pageSize={pageSize}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        getRowId={(row) => row.public_id}
        noResultsMessage="No advance payments found."
        toolbar={
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        }
      />

      {/* ── Create Dialog ────────────────────────────── */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            createForm.reset();
            setSelectedStudent(null);
            setStudentSearch('');
            setStudentSearched(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Advance Payment</DialogTitle>
            <DialogDescription>Record an advance payment or deposit for a student.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
            className="space-y-4"
          >
            {/* Student search */}
            <div className="space-y-2">
              <Label>Student</Label>
              {selectedStudent ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {selectedStudent.lname}, {selectedStudent.fname} — {selectedStudent.student_id}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedStudent(null);
                      createForm.setValue('reg_id', undefined as any);
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search by name or ID..."
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setStudentSearched(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setStudentSearched(true);
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={() => setStudentSearched(true)}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  {studentSearchQuery.isLoading && (
                    <p className="text-sm text-muted-foreground">Searching...</p>
                  )}
                  {studentSearchQuery.data && studentSearchQuery.data.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
                      {studentSearchQuery.data.map((s) => (
                        <button
                          key={s.reg_id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                          onClick={() => {
                            setSelectedStudent(s);
                            createForm.setValue('reg_id', s.public_id);
                          }}
                        >
                          {s.lname}, {s.fname} — {s.student_id}
                        </button>
                      ))}
                    </div>
                  )}
                  {studentSearchQuery.data?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No students found.</p>
                  )}
                </div>
              )}
              {createForm.formState.errors.reg_id && (
                <p className="text-sm text-destructive">{createForm.formState.errors.reg_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...createForm.register('description')} placeholder="e.g. Advance deposit" />
              {createForm.formState.errors.description && (
                <p className="text-sm text-destructive">{createForm.formState.errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="adv_pay_amt">Amount</Label>
              <Input
                id="adv_pay_amt"
                type="number"
                step="0.01"
                min="0.01"
                {...createForm.register('adv_pay_amt')}
                placeholder="0.00"
              />
              {createForm.formState.errors.adv_pay_amt && (
                <p className="text-sm text-destructive">{createForm.formState.errors.adv_pay_amt.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Apply Dialog ─────────────────────────────── */}
      <Dialog
        open={applyOpen}
        onOpenChange={(open) => {
          setApplyOpen(open);
          if (!open) {
            setApplyTarget(null);
            setApplyItem('');
            setApplyAmount('');
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply Advance Payment</DialogTitle>
            <DialogDescription>
              {applyTarget?.student
                ? `Apply ${formatPeso(Number(applyTarget.adv_pay_amt))} for ${applyTarget.student.lname}, ${applyTarget.student.fname}`
                : 'Apply advance to a student assessment item'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {assessmentsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading assessments...
              </div>
            ) : unpaidItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unpaid assessment items found for this student.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Assessment Item</Label>
                  <Select value={applyItem} onValueChange={(v) => { setApplyItem(v); setApplyAmount(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an assessment item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unpaidItems.map((a) => (
                        <SelectItem key={`${a.category_id}-${a.particular_id}`} value={`${a.category_id}-${a.particular_id}`}>
                          {a.category?.category_name ?? `Cat#${a.category_id}`} — Balance: {formatPeso(a.total_amt_bal)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAssessment && (
                  <div className="space-y-2">
                    <Label htmlFor="apply-amount">
                      Amount to Apply (max {formatPeso(maxApply)})
                    </Label>
                    <Input
                      id="apply-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={maxApply}
                      value={applyAmount}
                      onChange={(e) => setApplyAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleApplySubmit}
              disabled={
                applyMutation.isPending || !applyItem || !applyAmount || parseFloat(applyAmount) <= 0 || parseFloat(applyAmount) > maxApply
              }
            >
              {applyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────── */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Advance Payment</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this advance payment record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
