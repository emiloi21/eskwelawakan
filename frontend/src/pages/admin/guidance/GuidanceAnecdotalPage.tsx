import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, Plus } from 'lucide-react';
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
import type { GuidanceAnecdotalRecord, PaginatedGuidance } from '@/types/guidance';

const DEFAULT_FORM = {
  reg_id: '',
  observed_by_name: '',
  observed_by_role: 'Teacher',
  observation_date: '',
  location: '',
  behavior_description: '',
  interpretation: '',
};

export default function GuidanceAnecdotalPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<PaginatedGuidance<GuidanceAnecdotalRecord>>({
    queryKey: ['guidance-anecdotals', search],
    queryFn: () =>
      api.get('/admin/guidance/anecdotals', { params: { search: search || undefined } }).then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (payload: typeof DEFAULT_FORM) => api.post('/admin/guidance/anecdotals', payload),
    onSuccess: () => {
      toast.success('Anecdotal record filed.');
      qc.invalidateQueries({ queryKey: ['guidance-anecdotals'] });
      setOpen(false);
      setForm(DEFAULT_FORM);
    },
    onError: () => toast.error('Failed to save.'),
  });

  const records = data?.data ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-600" />
          <h1 className="text-xl font-bold">Anecdotal Records</h1>
        </div>

        <div className="flex items-center gap-2">
          <Input
            className="w-48 h-8 text-sm"
            placeholder="Search student…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Record</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>File Anecdotal Record</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <Label>Student LRN / Reg ID</Label>
                  <Input value={form.reg_id} onChange={e => setForm(f => ({ ...f, reg_id: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Observed By (Name)</Label>
                    <Input value={form.observed_by_name} onChange={e => setForm(f => ({ ...f, observed_by_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Input value={form.observed_by_role} onChange={e => setForm(f => ({ ...f, observed_by_role: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Observation Date</Label>
                    <Input type="date" value={form.observation_date} onChange={e => setForm(f => ({ ...f, observation_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Classroom" />
                  </div>
                </div>
                <div>
                  <Label>Behavioral Description <span className="text-xs text-muted-foreground">(objective, factual)</span></Label>
                  <Textarea rows={4} value={form.behavior_description} onChange={e => setForm(f => ({ ...f, behavior_description: e.target.value }))} />
                </div>
                <div>
                  <Label>Interpretation / Notes <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Textarea rows={2} value={form.interpretation} onChange={e => setForm(f => ({ ...f, interpretation: e.target.value }))} />
                </div>
                <Button className="w-full" disabled={addMutation.isPending} onClick={() => addMutation.mutate(form)}>
                  {addMutation.isPending ? 'Saving…' : 'File Record'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-muted-foreground text-sm">Loading…</p>
      ) : records.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No anecdotal records found.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {records.map(r => (
            <div key={r.public_id} className="rounded-lg border p-4 text-sm">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <span className="font-semibold">
                    {r.student ? `${r.student.last_name}, ${r.student.first_name}` : r.reg_id}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    Observed by {r.observed_by_name} ({r.observed_by_role})
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.observation_date).toLocaleDateString()} {r.location ? `· ${r.location}` : ''}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-700">{r.behavior_description}</p>
              {r.interpretation && (
                <p className="mt-1 text-xs text-muted-foreground italic">{r.interpretation}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
