import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function formatPeso(amount: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

interface Receivable {
  discount_id: number;
  reg_id: number;
  description: string;
  amount: number;
  amt_rcv_paid: number;
  balance: number;
  schoolYear: string;
  status: string;
  student?: { reg_id: number; lname: string; fname: string; mname: string; student_id: string; gradeLevel: string; dept: string } | null;
}

interface SummaryData {
  total_receivable: number;
  total_collected: number;
  total_balance: number;
  count: number;
}

export default function ReceivablesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);

  const { data, isLoading } = useQuery<PaginatedResponse<Receivable>>({
    queryKey: ['receivables', page, pageSize],
    queryFn: async () => {
      const { data } = await api.get(`/accounting/receivables?page=${page}&per_page=${pageSize}`);
      return data;
    },
  });

  const { data: summary } = useQuery<SummaryData>({
    queryKey: ['receivables-summary'],
    queryFn: async () => {
      const { data } = await api.get('/accounting/receivables/summary');
      return data.data;
    },
  });

  const items = data?.data ?? [];
  const filtered = search
    ? items.filter(r =>
        r.student?.lname?.toLowerCase().includes(search.toLowerCase()) ||
        r.student?.fname?.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()))
    : items;

  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const columns: ColumnDef<Receivable>[] = [
    {
      id: 'select',
      header: () => null,
      cell: ({ row }) => (
        <input type="checkbox" checked={selected.includes(row.original.discount_id)} onChange={() => toggleSelect(row.original.discount_id)} />
      ),
    },
    {
      id: 'student_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Student" />,
      cell: ({ row }) => {
        const s = row.original.student;
        return <span className="font-medium">{s ? `${s.lname}, ${s.fname}` : `Reg#${row.original.reg_id}`}</span>;
      },
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
    },
    {
      accessorKey: 'amount',
      header: () => <span className="flex justify-end">Receivable</span>,
      cell: ({ row }) => <div className="text-right tabular-nums">{formatPeso(row.original.amount)}</div>,
    },
    {
      accessorKey: 'amt_rcv_paid',
      header: () => <span className="flex justify-end">Collected</span>,
      cell: ({ row }) => <div className="text-right tabular-nums">{formatPeso(row.original.amt_rcv_paid)}</div>,
    },
    {
      accessorKey: 'balance',
      header: () => <span className="flex justify-end">Balance</span>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums font-medium">
          <Badge variant={row.original.balance > 0 ? 'default' : 'secondary'}>{formatPeso(row.original.balance)}</Badge>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accounts Receivable</h1>
        <p className="text-muted-foreground">Track receivable balances from government subsidies and vouchers</p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Receivable', value: formatPeso(summary.total_receivable) },
            { label: 'Collected', value: formatPeso(summary.total_collected) },
            { label: 'Outstanding', value: formatPeso(summary.total_balance) },
            { label: 'Students', value: String(summary.count) },
          ].map(c => (
            <Card key={c.label}><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{c.label}</p><p className="text-2xl font-bold tabular-nums">{c.value}</p></CardContent></Card>
          ))}
        </div>
      )}

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
        getRowId={(row) => String(row.discount_id)}
        noResultsMessage="No receivables found."
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {selected.length > 0 && (
              <Button onClick={() => navigate('/accounting/mass-transactions', { state: { discount_ids: selected } })}>
                <ArrowRight className="mr-2 h-4 w-4" /> Mass Transaction ({selected.length})
              </Button>
            )}
          </div>
        }
      />
    </div>
  );
}
