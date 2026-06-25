import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

interface OverdueBorrowing {
  public_id: string;
  borrower_name: string;
  borrower_type: string;
  borrower_ref: string | null;
  borrow_date: string;
  due_date: string;
  fine_amount: number;
  notes: string | null;
  book: { public_id: string; title: string; isbn: string | null } | null;
}

export default function LibraryOverduePage() {
  const qc = useQueryClient();
  const [returnTarget, setReturnTarget] = useState<OverdueBorrowing | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['library-overdue'],
    queryFn: () => api.get('/library/overdue').then(r => r.data),
  });

  const returnMutation = useMutation({
    mutationFn: (publicId: string) => api.post(`/library/borrowings/${publicId}/return`, { fine_per_day: 5 }),
    onSuccess: () => {
      toast.success('Book returned and fine recorded');
      qc.invalidateQueries({ queryKey: ['library-overdue'] });
      qc.invalidateQueries({ queryKey: ['library-borrowings'] });
      setReturnTarget(null);
    },
    onError: () => toast.error('Failed to process return'),
  });

  const overdue: OverdueBorrowing[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overdue Books</h1>
        <p className="text-muted-foreground">Books that have not been returned by their due date</p>
      </div>

      {!isLoading && overdue.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
          <h2 className="text-lg font-semibold">No Overdue Books</h2>
          <p className="text-muted-foreground text-sm">All borrowed books are within their due dates.</p>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}

      {overdue.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {overdue.map((b) => {
                const today = new Date();
                const dueDate = new Date(b.due_date);
                const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                const estimatedFine = daysLate * 5;

                return (
                  <div key={b.public_id} className="flex items-start justify-between px-4 py-3 hover:bg-muted/30">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                        <span className="font-medium text-sm">{b.book?.title ?? '—'}</span>
                        <Badge variant="outline" className="text-xs bg-red-100 text-red-700">
                          {daysLate} day{daysLate !== 1 ? 's' : ''} late
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">
                        Borrower: <span className="text-foreground font-medium">{b.borrower_name}</span>
                        {b.borrower_ref ? ` (${b.borrower_ref})` : ''} · {b.borrower_type}
                      </p>
                      <p className="text-xs text-muted-foreground pl-6">
                        Due: {format(dueDate, 'MMM d, yyyy')}
                        {' · '}Estimated fine: <span className="text-red-600 font-medium">₱{estimatedFine.toFixed(2)}</span> (₱5/day)
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="ml-4 shrink-0" onClick={() => setReturnTarget(b)}>
                      <CheckCircle2 className="mr-1 h-4 w-4" />Return
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Return Confirmation */}
      <Dialog open={!!returnTarget} onOpenChange={(o) => !o && setReturnTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Process Overdue Return</DialogTitle></DialogHeader>
          {returnTarget && (() => {
            const dueDate = new Date(returnTarget.due_date);
            const daysLate = Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            const fine = daysLate * 5;
            return (
              <div className="space-y-3">
                <p className="text-sm">Returning <strong>{returnTarget.book?.title}</strong> by <strong>{returnTarget.borrower_name}</strong>.</p>
                <div className="rounded-md border p-3 bg-red-50 dark:bg-red-950/20 text-sm text-red-700 dark:text-red-400">
                  <p className="font-medium">Overdue Fine</p>
                  <p>{daysLate} day{daysLate !== 1 ? 's' : ''} × ₱5.00/day = <strong>₱{fine.toFixed(2)}</strong></p>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>Cancel</Button>
            <Button
              onClick={() => returnTarget && returnMutation.mutate(returnTarget.public_id)}
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
