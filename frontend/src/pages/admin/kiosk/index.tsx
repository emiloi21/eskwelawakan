import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { toast } from 'sonner';
import { Loader2, Pencil, Trash2, Monitor, ExternalLink, LogIn, LogOut, Users, UserCog, CalendarDays, Copy, Check, Search, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';

interface KioskStats {
  date_from: string;
  date_to: string;
  overall: {
    total_in: number; total_out: number;
    student_in: number; student_out: number;
    personnel_in: number; personnel_out: number;
    unique_students: number; unique_personnel: number;
  };
  kiosks: {
    id: number; kiosk_code: string | null; name: string; gate_label: string; is_active: boolean;
    student_in: number; student_out: number; personnel_in: number; personnel_out: number; total: number;
  }[];
}

interface Kiosk {
  id: number;
  kiosk_code: string | null;
  name: string;
  gate_label: string;
  direction_mode: 'auto' | 'force_in' | 'force_out';
  is_active: boolean;
}

const schema = z.object({
  name:           z.string().min(1, 'Required'),
  gate_label:     z.string().min(1, 'Required'),
  direction_mode: z.enum(['auto', 'force_in', 'force_out']),
  is_active:      z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const directionLabels: Record<Kiosk['direction_mode'], string> = {
  auto:       'Auto-toggle',
  force_in:   'Force Time-In',
  force_out:  'Force Time-Out',
};

export default function AdminKioskPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Kiosk | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [statsDate, setStatsDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: kiosks = [], isLoading } = useQuery<Kiosk[]>({
    queryKey:  ['admin-kiosks'],
    queryFn:   () => api.get('/admin/kiosk-management').then(r => r.data),
  });

  const { data: stats, isLoading: statsLoading } = useQuery<KioskStats>({
    queryKey: ['admin-kiosk-stats', statsDate],
    queryFn:  () => api.get('/admin/kiosk-management/stats', { params: { date: statsDate } }).then(r => r.data),
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { direction_mode: 'auto', is_active: true },
  });

  const upsert = useMutation({
    mutationFn: (values: FormValues) =>
      editItem
        ? api.put(`/admin/kiosk-management/${editItem.id}`, values).then(r => r.data)
        : api.post('/admin/kiosk-management', values).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-kiosks'] });
      toast.success(editItem ? 'Kiosk updated.' : 'Kiosk created.');
      setFormOpen(false);
      setEditItem(null);
      reset();
    },
    onError: () => toast.error('Failed to save kiosk.'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/kiosk-management/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-kiosks'] });
      toast.success('Kiosk deleted.');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete kiosk.'),
  });

  const openEdit = (k: Kiosk) => {
    setEditItem(k);
    reset({ name: k.name, gate_label: k.gate_label, direction_mode: k.direction_mode, is_active: k.is_active });
    setFormOpen(true);
  };

  const copyUrl = (k: Kiosk) => {
    const url = `${window.location.origin}/kiosk?kiosk_code=${k.kiosk_code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(k.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const isActive = watch('is_active');
  const dirMode  = watch('direction_mode');

  const [search, setSearch] = useState('');

  const filteredKiosks = useMemo(() => {
    if (!search.trim()) return kiosks;
    const q = search.toLowerCase();
    return kiosks.filter(k =>
      k.name.toLowerCase().includes(q) ||
      k.gate_label.toLowerCase().includes(q) ||
      (k.kiosk_code ?? '').toLowerCase().includes(q),
    );
  }, [kiosks, search]);

  const columns: ColumnDef<Kiosk>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Kiosk Name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'kiosk_code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Kiosk ID" />,
      cell: ({ row }) =>
        row.original.kiosk_code
          ? <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{row.original.kiosk_code}</span>
          : <span className="text-xs text-muted-foreground italic">—</span>,
    },
    {
      accessorKey: 'gate_label',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Gate" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.gate_label}</span>,
    },
    {
      accessorKey: 'direction_mode',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Direction Mode" />,
      cell: ({ row }) => (
        <Badge variant={row.original.direction_mode === 'auto' ? 'secondary' : row.original.direction_mode === 'force_in' ? 'default' : 'outline'}>
          {directionLabels[row.original.direction_mode]}
        </Badge>
      ),
    },
    {
      accessorKey: 'is_active',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) =>
        row.original.is_active
          ? <Badge variant="default">Active</Badge>
          : <Badge variant="secondary">Inactive</Badge>,
    },
    {
      id: 'kiosk_url',
      header: 'Kiosk URL',
      enableSorting: false,
      cell: ({ row }) => {
        const k = row.original;
        return k.kiosk_code ? (
          <div className="flex items-center gap-1.5">
            <a
              href={`/kiosk?kiosk_code=${k.kiosk_code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
            >
              /kiosk?kiosk_code={k.kiosk_code} <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={() => copyUrl(k)}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Copy URL"
            >
              {copiedId === k.id
                ? <Check className="h-3.5 w-3.5 text-green-600" />
                : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">Not registered</span>
        );
      },
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const k = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(k)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(k.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      meta: { className: 'text-right' },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kiosk Management</h1>
          <p className="text-muted-foreground">
            Kiosks are registered from the device itself via the settings (⚙) button.
          </p>
        </div>
      </div>

      {/* Slideshow link */}
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <Monitor className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">Kiosk Slideshow</p>
          <p className="text-xs text-muted-foreground">Manage the idle-screen slideshow images shown on all kiosks.</p>
        </div>
        <Link to="/admin/kiosk/slides" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Manage Slides</Link>
      </div>

      {/* KPI Stats */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Daily Statistics</h2>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={statsDate}
              onChange={e => setStatsDate(e.target.value)}
              className="h-8 w-40 text-sm"
            />
          </div>
        </div>

        {statsLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Students In',   value: stats.overall.student_in,    icon: LogIn,    color: 'text-green-600' },
                { label: 'Students Out',  value: stats.overall.student_out,   icon: LogOut,   color: 'text-blue-600'  },
                { label: 'Personnel In',  value: stats.overall.personnel_in,  icon: LogIn,    color: 'text-emerald-600' },
                { label: 'Personnel Out', value: stats.overall.personnel_out, icon: LogOut,   color: 'text-indigo-600' },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label}>
                  <CardContent className="flex items-start gap-3 pt-4 pb-4">
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${color}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
              <Card><CardContent className="flex items-start gap-3 pt-4 pb-4">
                <Users className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div><p className="text-xs text-muted-foreground">Unique Students</p><p className="text-xl font-bold">{stats.overall.unique_students}</p></div>
              </CardContent></Card>
              <Card><CardContent className="flex items-start gap-3 pt-4 pb-4">
                <UserCog className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div><p className="text-xs text-muted-foreground">Unique Personnel</p><p className="text-xl font-bold">{stats.overall.unique_personnel}</p></div>
              </CardContent></Card>
            </div>

            {stats.kiosks.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Per-Kiosk Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kiosk</TableHead>
                        <TableHead>Gate</TableHead>
                        <TableHead className="text-right">Stu. In</TableHead>
                        <TableHead className="text-right">Stu. Out</TableHead>
                        <TableHead className="text-right">Staff In</TableHead>
                        <TableHead className="text-right">Staff Out</TableHead>
                        <TableHead className="text-right font-semibold">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.kiosks.map(k => (
                        <TableRow key={k.id}>
                          <TableCell>
                            <div className="font-medium">{k.name}</div>
                            {k.kiosk_code && <span className="font-mono text-xs text-muted-foreground">{k.kiosk_code}</span>}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{k.gate_label}</TableCell>
                          <TableCell className="text-right text-green-700 font-medium">{k.student_in}</TableCell>
                          <TableCell className="text-right text-blue-700 font-medium">{k.student_out}</TableCell>
                          <TableCell className="text-right text-emerald-700 font-medium">{k.personnel_in}</TableCell>
                          <TableCell className="text-right text-indigo-700 font-medium">{k.personnel_out}</TableCell>
                          <TableCell className="text-right font-bold">{k.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>

      {/* Kiosk list */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Registered Kiosks</h2>
        <DataTable
          columns={columns}
          data={filteredKiosks}
          isLoading={isLoading}
          getRowId={(row) => String(row.id)}
          noResultsMessage="No kiosks found."
          toolbar={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, gate, or kiosk ID..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          }
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={o => { setFormOpen(o); if (!o) { setEditItem(null); reset(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Kiosk</DialogTitle>
          </DialogHeader>
          <form id="kiosk-form" onSubmit={handleSubmit(v => upsert.mutate(v))} className="space-y-4">
            <div className="space-y-1">
              <Label>Kiosk Name</Label>
              <Input {...register('name')} placeholder="e.g. Main Gate Kiosk" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Gate Label</Label>
              <Input {...register('gate_label')} placeholder="e.g. Main Entrance, Exit Gate" />
              {errors.gate_label && <p className="text-xs text-destructive">{errors.gate_label.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Direction Mode</Label>
              <Select
                value={dirMode}
                onValueChange={v => setValue('direction_mode', v as FormValues['direction_mode'])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-toggle (last log determines direction)</SelectItem>
                  <SelectItem value="force_in">Force Time-In (always logs IN)</SelectItem>
                  <SelectItem value="force_out">Force Time-Out (always logs OUT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Inactive kiosks ignore direction_mode settings</p>
              </div>
              <Switch checked={isActive} onCheckedChange={v => setValue('is_active', v)} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" form="kiosk-form" disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Kiosk?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the kiosk configuration. Attendance logs already recorded are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && remove.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
