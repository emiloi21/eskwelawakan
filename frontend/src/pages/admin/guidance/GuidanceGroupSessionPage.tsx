import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, Plus } from 'lucide-react';
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
import type { GuidanceGroupSession, GroupSessionType, PaginatedGuidance } from '@/types/guidance';

const GROUP_SESSION_TYPES: GroupSessionType[] = [
  'group_counseling',
  'psychoeducational',
  'career_guidance',
  'information',
  'values_formation',
  'homeroom_guidance',
];

const DEFAULT_FORM = {
  school_year_id: '',
  session_title: '',
  session_type: 'information' as GroupSessionType,
  target_group: '',
  session_date: '',
  venue: '',
  objectives: '',
  activities: '',
  observations: '',
  attendee_count: '',
};

export default function GuidanceGroupSessionPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const { data: syData } = useQuery<{ id: number; school_year: string }[]>({
    queryKey: ['school-years'],
    queryFn: () => api.get('/admin/school-years').then(r => r.data),
  });

  const [syFilter, setSyFilter] = useState('');

  const { data, isLoading } = useQuery<PaginatedGuidance<GuidanceGroupSession>>({
    queryKey: ['guidance-group-sessions', syFilter],
    queryFn: () =>
      api.get('/admin/guidance/group-sessions', {
        params: { school_year_id: syFilter || undefined },
      }).then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (payload: typeof DEFAULT_FORM) =>
      api.post('/admin/guidance/group-sessions', {
        ...payload,
        school_year_id: Number(payload.school_year_id),
        attendee_count: Number(payload.attendee_count) || 0,
      }),
    onSuccess: () => {
      toast.success('Group session recorded.');
      qc.invalidateQueries({ queryKey: ['guidance-group-sessions'] });
      setOpen(false);
      setForm(DEFAULT_FORM);
    },
    onError: () => toast.error('Failed to save.'),
  });

  const sessions = data?.data ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          <h1 className="text-xl font-bold">Group Sessions & Activities</h1>
        </div>

        <div className="flex items-center gap-2">
          <Select value={syFilter} onValueChange={setSyFilter}>
            <SelectTrigger className="w-48 h-8 text-sm">
              <SelectValue placeholder="All school years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All School Years</SelectItem>
              {syData?.map(sy => (
                <SelectItem key={sy.id} value={String(sy.id)}>{sy.school_year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Session</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
              <DialogHeader><DialogTitle>Record Group Session</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
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
                <div>
                  <Label>Title</Label>
                  <Input value={form.session_title} onChange={e => setForm(f => ({ ...f, session_title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.session_type} onValueChange={v => setForm(f => ({ ...f, session_type: v as GroupSessionType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GROUP_SESSION_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Target Group</Label>
                    <Input value={form.target_group} onChange={e => setForm(f => ({ ...f, target_group: e.target.value }))} placeholder="e.g. Grade 9" />
                  </div>
                  <div>
                    <Label>Venue</Label>
                    <Input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Objectives</Label>
                  <Textarea rows={2} value={form.objectives} onChange={e => setForm(f => ({ ...f, objectives: e.target.value }))} />
                </div>
                <div>
                  <Label>Activities</Label>
                  <Textarea rows={2} value={form.activities} onChange={e => setForm(f => ({ ...f, activities: e.target.value }))} />
                </div>
                <div>
                  <Label>Observations / Outcomes</Label>
                  <Textarea rows={2} value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} />
                </div>
                <div>
                  <Label>Attendee Count</Label>
                  <Input type="number" min={0} value={form.attendee_count} onChange={e => setForm(f => ({ ...f, attendee_count: e.target.value }))} />
                </div>
                <Button className="w-full" disabled={addMutation.isPending} onClick={() => addMutation.mutate(form)}>
                  {addMutation.isPending ? 'Saving…' : 'Save Session'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="py-8 text-center text-muted-foreground text-sm">Loading…</p>
      ) : sessions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No group sessions recorded.</CardContent></Card>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Title</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Target Group</th>
                <th className="text-left p-3 font-medium">Venue</th>
                <th className="text-left p-3 font-medium">Attendees</th>
                <th className="text-left p-3 font-medium">Facilitator</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sessions.map(s => (
                <tr key={s.public_id} className="hover:bg-muted/30">
                  <td className="p-3 text-xs">{new Date(s.session_date).toLocaleDateString()}</td>
                  <td className="p-3">{s.session_title}</td>
                  <td className="p-3 capitalize text-xs">{s.session_type.replace('_', ' ')}</td>
                  <td className="p-3 text-xs">{s.target_group ?? '—'}</td>
                  <td className="p-3 text-xs">{s.venue ?? '—'}</td>
                  <td className="p-3 text-center font-semibold">{s.attendee_count}</td>
                  <td className="p-3 text-xs">{s.facilitator?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
