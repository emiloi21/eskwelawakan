import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, CheckCircle2, BookMarked } from 'lucide-react';
import { format, isPast } from 'date-fns';

interface LibraryBook {
  id: number;
  public_id: string;
  title: string;
  available_copies: number;
  isbn: string | null;
}

interface Borrowing {
  public_id: string;
  borrower_name: string;
  borrower_type: string;
  borrower_ref: string | null;
  borrow_date: string;
  due_date: string;
  returned_date: string | null;
  fine_amount: number;
  status: string;
  notes: string | null;
  book: { public_id: string; title: string; isbn: string | null } | null;
}

const borrowerTypes = ['student', 'personnel', 'teacher'];
const statusColor: Record<string, string> = {
  Borrowed: 'bg-blue-100 text-blue-700',
  Returned: 'bg-green-100 text-green-700',
  Overdue: 'bg-red-100 text-red-700',
};

export default function LibraryBorrowingsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('Borrowed');
  const [showIssue, setShowIssue] = useState(false);
  const [returnTarget, setReturnTarget] = useState<Borrowing | null>(null);
  const [bookSearch, setBookSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
  const [form, setForm] = useState({
    borrower_type: 'student',
    borrower_ref: '',
    borrower_name: '',
    due_date: '',
    notes: '',
  });
  const [finePerDay] = useState(5);

  const { data, isLoading } = useQuery({
    queryKey: ['library-borrowings', statusFilter],
    queryFn: () => api.get('/library/borrowings', { params: { status: statusFilter || undefined } }).then(r => r.data),
  });

  const { data: booksData } = useQuery({
    queryKey: ['library-books-search', bookSearch],
    queryFn: () => api.get('/library/books', { params: { search: bookSearch, per_page: 10 } }).then(r => r.data),
    enabled: bookSearch.length >= 2,
  });

  const issueMutation = useMutation({
    mutationFn: (payload: any) => api.post('/library/borrowings', payload),
    onSuccess: () => {
      toast.success('Book issued');
      qc.invalidateQueries({ queryKey: ['library-borrowings'] });
      setShowIssue(false);
      setSelectedBook(null);
      setBookSearch('');
      setForm({ borrower_type: 'student', borrower_ref: '', borrower_name: '', due_date: '', notes: '' });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? 'Failed to issue book';
      toast.error(msg);
    },
  });

  const returnMutation = useMutation({
    mutationFn: ({ publicId }: { publicId: string }) =>
      api.post(`/library/borrowings/${publicId}/return`, { fine_per_day: finePerDay }),
    onSuccess: () => {
      toast.success('Book returned');
      qc.invalidateQueries({ queryKey: ['library-borrowings'] });
      setReturnTarget(null);
    },
    onError: () => toast.error('Failed to mark book as returned'),
  });

  const handleIssue = () => {
    if (!selectedBook) { toast.error('Please select a book'); return; }
    if (!form.borrower_name.trim()) { toast.error('Borrower name is required'); return; }
    if (!form.due_date) { toast.error('Due date is required'); return; }
    issueMutation.mutate({
      book_id: selectedBook.id,
      borrower_type: form.borrower_type,
      borrower_ref: form.borrower_ref || null,
      borrower_name: form.borrower_name,
      due_date: form.due_date,
      notes: form.notes || null,
    });
  };

  const borrowings: Borrowing[] = data?.data ?? [];
  const books: LibraryBook[] = booksData?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Borrowings</h1>
          <p className="text-muted-foreground">Book lending and return management</p>
        </div>
        <Button onClick={() => setShowIssue(true)}><Plus className="mr-2 h-4 w-4" />Issue Book</Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="Borrowed">Borrowed</SelectItem>
            <SelectItem value="Returned">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : borrowings.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No borrowing records found</p>
          ) : (
            <div className="divide-y">
              {borrowings.map((b) => {
                const isOverdue = b.status === 'Borrowed' && isPast(new Date(b.due_date));
                return (
                  <div key={b.public_id} className="flex items-start justify-between px-4 py-3 hover:bg-muted/30">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <BookMarked className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{b.book?.title ?? '—'}</span>
                        <Badge
                          className={`text-xs shrink-0 ${isOverdue ? 'bg-red-100 text-red-700' : (statusColor[b.status] ?? 'bg-gray-100 text-gray-600')}`}
                          variant="outline"
                        >
                          {isOverdue ? 'Overdue' : b.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">
                        Borrower: <span className="text-foreground font-medium">{b.borrower_name}</span>
                        {b.borrower_ref ? ` (${b.borrower_ref})` : ''} · {b.borrower_type}
                      </p>
                      <p className="text-xs text-muted-foreground pl-6">
                        Borrowed: {format(new Date(b.borrow_date), 'MMM d, yyyy')}
                        {' · '}Due: {format(new Date(b.due_date), 'MMM d, yyyy')}
                        {b.returned_date ? ` · Returned: ${format(new Date(b.returned_date), 'MMM d, yyyy')}` : ''}
                        {b.fine_amount > 0 ? ` · Fine: ₱${b.fine_amount.toFixed(2)}` : ''}
                      </p>
                    </div>
                    {b.status === 'Borrowed' && (
                      <Button size="sm" variant="outline" className="ml-4 shrink-0" onClick={() => setReturnTarget(b)}>
                        <CheckCircle2 className="mr-1 h-4 w-4" />Return
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue Book Dialog */}
      <Dialog open={showIssue} onOpenChange={(o) => !o && setShowIssue(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Issue Book</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Book *</Label>
              <Input
                placeholder="Search book title..."
                value={selectedBook ? selectedBook.title : bookSearch}
                onChange={e => { setBookSearch(e.target.value); setSelectedBook(null); }}
              />
              {books.length > 0 && !selectedBook && (
                <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                  {books.map((bk: any) => (
                    <button
                      key={bk.public_id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => { setSelectedBook(bk); setBookSearch(''); }}
                    >
                      {bk.title} {bk.isbn ? `(${bk.isbn})` : ''} · {bk.available_copies} available
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Borrower Type *</Label>
              <Select value={form.borrower_type} onValueChange={v => setForm(f => ({ ...f, borrower_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{borrowerTypes.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Borrower Name *</Label>
                <Input value={form.borrower_name} onChange={e => setForm(f => ({ ...f, borrower_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>ID / Student No.</Label>
                <Input value={form.borrower_ref} onChange={e => setForm(f => ({ ...f, borrower_ref: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Due Date *</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssue(false)}>Cancel</Button>
            <Button onClick={handleIssue} disabled={issueMutation.isPending}>
              {issueMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Issue Book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Confirmation Dialog */}
      <Dialog open={!!returnTarget} onOpenChange={(o) => !o && setReturnTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Book Return</DialogTitle></DialogHeader>
          {returnTarget && (
            <div className="space-y-3">
              <p className="text-sm">Mark <strong>{returnTarget.book?.title}</strong> as returned by <strong>{returnTarget.borrower_name}</strong>?</p>
              {isPast(new Date(returnTarget.due_date)) && (
                <p className="text-sm text-red-600">
                  This book is overdue. A fine of ₱{finePerDay}/day will be calculated automatically.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>Cancel</Button>
            <Button
              onClick={() => returnTarget && returnMutation.mutate({ publicId: returnTarget.public_id })}
              disabled={returnMutation.isPending}
            >
              {returnMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
