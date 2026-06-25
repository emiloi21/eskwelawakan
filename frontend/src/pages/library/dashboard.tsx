import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, BookMarked, AlertCircle, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, isPast } from 'date-fns';

type BorrowingRow = {
  public_id: string;
  borrower_name: string;
  borrower_type: string;
  due_date: string;
  status: string;
  book: { public_id: string; title: string; isbn: string | null } | null;
};

type BookRow = {
  public_id: string;
  title: string;
  author: string;
  available_copies: number;
  total_copies: number;
  status: string;
  category: { name: string } | null;
};

export default function LibraryDashboard() {
  const { data: booksData, isLoading: booksLoading } = useQuery({
    queryKey: ['library-books'],
    queryFn: () => api.get('/library/books', { params: { per_page: 100 } }).then(r => r.data),
  });

  const { data: borrowingsData, isLoading: borrowingsLoading } = useQuery({
    queryKey: ['library-borrowings'],
    queryFn: () => api.get('/library/borrowings', { params: { status: 'Borrowed' } }).then(r => r.data),
  });

  const { data: overdueData } = useQuery({
    queryKey: ['library-overdue'],
    queryFn: () => api.get('/library/overdue').then(r => r.data),
  });

  const books: BookRow[] = booksData?.data ?? [];
  const borrowings: BorrowingRow[] = borrowingsData?.data ?? [];
  const overdue: BorrowingRow[] = overdueData?.data ?? [];

  const totalBooks = books.length;
  const currentlyBorrowed = borrowings.length;
  const overdueCount = overdue.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Library Dashboard</h1>
        <p className="text-muted-foreground">Book catalog and borrowing management</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Books', value: booksLoading ? '…' : totalBooks, icon: BookOpen, color: 'bg-amber-100 text-amber-600', to: '/library/books' },
          { label: 'Currently Borrowed', value: borrowingsLoading ? '…' : currentlyBorrowed, icon: BookMarked, color: 'bg-blue-100 text-blue-600', to: '/library/borrowings' },
          { label: 'Overdue', value: booksLoading ? '…' : overdueCount, icon: AlertCircle, color: 'bg-red-100 text-red-600', to: '/library/overdue' },
          { label: 'Categories', value: '—', icon: FolderOpen, color: 'bg-green-100 text-green-600', to: '/library/categories' },
        ].map(({ label, value, icon: Icon, color, to }) => (
          <Link key={label} to={to}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 py-5">
                <div className={`rounded-full p-3 ${color}`}><Icon className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent borrowings */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Active Borrowings</CardTitle>
            <Link to="/library/borrowings" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {borrowingsLoading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
            {!borrowingsLoading && borrowings.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No active borrowings</p>
            )}
            <div className="space-y-3">
              {borrowings.slice(0, 5).map((b) => (
                <div key={b.public_id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{b.borrower_name}</p>
                    <p className="text-xs text-muted-foreground">{b.book?.title ?? '—'} · Due: {format(new Date(b.due_date), 'MMM d, yyyy')}</p>
                  </div>
                  {isPast(new Date(b.due_date)) && (
                    <Badge variant="outline" className="text-xs bg-red-100 text-red-700">Overdue</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Overdue list */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Overdue Books</CardTitle>
            <Link to="/library/overdue" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {overdue.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No overdue books</p>
            )}
            <div className="space-y-3">
              {overdue.slice(0, 5).map((b) => (
                <div key={b.public_id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{b.borrower_name}</p>
                    <p className="text-xs text-muted-foreground">{b.book?.title ?? '—'} · Due: {format(new Date(b.due_date), 'MMM d, yyyy')}</p>
                  </div>
                  <Badge variant="outline" className="text-xs bg-red-100 text-red-700">Overdue</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
