import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { PaymentTransaction, PaginatedResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Ban, Printer, MoreVertical } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ReceiptTemplate, { type ReceiptData } from '@/components/receipt-template';
import { DataTableFilterSheet, DataTableFilterButton } from '@/components/ui/data-table-filter-sheet';
import { Label } from '@/components/ui/label';

function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<PaymentTransaction>>({
    queryKey: ['transactions', page, pageSize, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: String(pageSize) });
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/accounting/cashiering/transactions?${params}`);
      return data;
    },
  });

  const voidMutation = useMutation({
    mutationFn: async (payDataId: string) => {
      await api.post(`/accounting/cashiering/transactions/${payDataId}/void`, { void_remarks: 'Voided by staff' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction voided.');
    },
    onError: () => toast.error('Failed to void transaction.'),
  });

  const handleReprint = async (receiptNum: string) => {
    try {
      const { data } = await api.get(`/accounting/cashiering/receipt/${receiptNum}`);
      setReceiptData(data.data);
      setReceiptOpen(true);
    } catch {
      toast.error('Failed to load receipt.');
    }
  };

  const studentName = (tx: PaymentTransaction) =>
    tx.student ? `${tx.student.lname}, ${tx.student.fname}` : `Reg#${tx.reg_id}`;

  const items = data?.data ?? [];
  const filtered = search
    ? items.filter((t) =>
        t.receipt_num?.toLowerCase().includes(search.toLowerCase()) ||
        studentName(t).toLowerCase().includes(search.toLowerCase()))
    : items;

  const columns: ColumnDef<PaymentTransaction>[] = [
    {
      accessorKey: 'receipt_num',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Receipt #" />,
      cell: ({ row }) => <span className="font-mono font-medium">{row.original.receipt_num}</span>,
    },
    {
      id: 'student_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Student" />,
      cell: ({ row }) => <span className="font-medium">{studentName(row.original)}</span>,
    },
    {
      accessorKey: 'amt_tend',
      header: () => <span className="flex justify-end">Amount</span>,
      cell: ({ row }) => <div className="text-right tabular-nums font-medium">{formatPeso(row.original.amt_tend)}</div>,
    },
    {
      accessorKey: 'trans_payment_type',
      header: 'Mode',
      cell: ({ row }) => <Badge variant="secondary">{row.original.trans_payment_type}</Badge>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status ?? 'Active';
        return <Badge variant={s === 'Voided' ? 'destructive' : 'default'}>{s}</Badge>;
      },
    },
    {
      accessorKey: 'entry_date',
      header: 'Date',
      cell: ({ row }) => row.original.entry_date ?? '',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const tx = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleReprint(tx.receipt_num)}>
                  <Printer className="mr-2 h-4 w-4" /> Reprint
                </DropdownMenuItem>
                {tx.status !== 'Voided' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Void this transaction? This will reverse all payments.')) voidMutation.mutate(tx.public_id); }}>
                      <Ban className="mr-2 h-4 w-4" /> Void
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">View and manage payment transactions</p>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        page={page}
        pageCount={data?.last_page ?? 1}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        total={data?.total}
        from={data?.from}
        to={data?.to}
        getRowId={(row) => row.public_id}
        noResultsMessage="No transactions found."
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search receipt or student..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <DataTableFilterButton onClick={() => setFilterOpen(true)} activeCount={statusFilter ? 1 : 0} />
          </div>
        }
      />

      <DataTableFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeCount={statusFilter ? 1 : 0}
        onReset={() => { setStatusFilter(''); setPage(1); }}
      >
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter((v ?? '') === 'all' ? '' : (v ?? '')); setPage(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Void">Void</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      {/* Receipt Reprint Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-lg print:max-w-full print:shadow-none print:border-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Receipt Preview</DialogTitle>
          </DialogHeader>
          {receiptData && <ReceiptTemplate ref={receiptRef} data={receiptData} />}
          <div className="flex justify-end gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={() => setReceiptOpen(false)}>Close</Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
