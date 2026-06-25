import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ClipboardList, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import type { GuidanceCaseRecord, PaginatedGuidance, CaseType, UrgencyLevel } from '@/types/guidance';

const STATUS_BADGE: Record<string, string> = {
  open:               'bg-blue-100 text-blue-800',
  ongoing:            'bg-indigo-100 text-indigo-800',
  resolved:           'bg-green-100 text-green-800',
  referred_external:  'bg-purple-100 text-purple-800',
  referred_cpc:       'bg-red-100 text-red-800',
  closed_transferred: 'bg-gray-200 text-gray-600',
  closed_withdrawn:   'bg-gray-200 text-gray-600',
};

const URGENCY_DOT: Record<string, string> = {
  crisis:  'bg-red-500',
  urgent:  'bg-yellow-400',
  routine: 'bg-gray-300',
};

const CASE_TYPES: CaseType[] = [
  'academic', 'behavioral', 'personal_social', 'career', 'family', 'crisis', 'child_protection',
];

const DEFAULT_FORM = {
  reg_id: '',
  school_year_id: '',
  case_type: 'academic' as CaseType,
  presenting_concern: '',
  urgency: 'routine' as UrgencyLevel,
  notes: '',
};

export default function GuidanceCaseListPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const { data: syData } = useQuery<{ id: number; school_year: string }[]>({
    queryKey: ['school-years'],
    queryFn: () => api.get('/admin/school-years').then(r => r.data),
  });

  const { data, isLoading } = useQuery<PaginatedGuidance<GuidanceCaseRecord>>({
    queryKey: ['guidance-cases', statusFilter, search],
    queryFn: () =>
      api
        .get('/admin/guidance/cases', {
          params: { status: statusFilter || undefined, search: search || undefined },
        })
        .then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (payload: typeof DEFAULT_FORM) =>
      api.post('/admin/guidance/cases', { ...payload, school_year_id: Number(payload.school_year_id) }),
    onSuccess: () => {
      toast.success('Case opened.');
      qc.invalidateQueries({ queryKey: ['guidance-cases'] });
      qc.invalidateQueries({ queryKey: ['guidance-dashboard'] });
      setOpen(false);
      setForm(DEFAULT_FORM);
    },
    onError: () => toast.error('Failed to open case.'),
  });

  const cases = data?.data ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-indigo-600" />
          <h1 className="text-xl font-bold">Case Records</h1>
        </div>

        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Open Case</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Open New Case</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Student LRN / Reg ID</Label>
                <Input value={form.reg_id} onChange={e => setForm(f => ({ ...f, reg_id: e.target.value }))} />
              </div>
              <div>
                <Label>School Year</Label>
                <Select value={form.school_year_id} onValueChange={v => setForm(f => ({ ...f, school_year_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {syData?.map(sy => (
                      <SelectItem key={sy.id} value={String(sy.id)}>{sy.school_year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Case Type</Label>
                  <Select value={form.case_type} onValueChange={v => setForm(f => ({ ...f, case_type: v as CaseType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CASE_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Urgency</Label>
                  <Select value={form.urgency} onValueChange={v => setForm(f => ({ ...f, urgency: v as UrgencyLevel }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="crisis">Crisis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Presenting Concern</Label>
                <Textarea rows={3} value={form.presenting_concern} onChange={e => setForm(f => ({ ...f, presenting_concern: e.target.value }))} />
              </div>
              <div>
                <Label>Initial Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <Button className="w-full" disabled={addMutation.isPending} onClick={() => addMutation.mutate(form)}>
                {addMutation.isPending ? 'Opening…' : 'Open Case'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
          <Input
            className="pl-7 h-8 w-48 text-sm"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {['', 'open', 'ongoing', 'resolved', 'referred_external'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              statusFilter === s ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s === '' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="py-8 text-center text-muted-foreground text-sm">Loading…</p>
      ) : cases.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No cases found.</CardContent></Card>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Case #</th>
                <th className="text-left p-3 font-medium">Student</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Urgency</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Opened</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {cases.map(c => (
                <tr key={c.public_id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono text-xs">{c.case_number}</td>
                  <td className="p-3">
                    {c.student
                      ? `${c.student.last_name}, ${c.student.first_name}`
                      : '—'}
                  </td>
                  <td className="p-3 capitalize">{c.case_type.replace('_', ' ')}</td>
                  <td className="p-3">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${URGENCY_DOT[c.urgency]}`} />
                      {c.urgency}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status] ?? ''}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(c.opened_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <Link
                      to={`/admin/guidance/cases/${c.public_id}`}
                      className="text-xs text-emerald-700 hover:underline font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
