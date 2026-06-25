import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCheck,
  Clock,
  Eye,
  ShieldAlert,
  Users,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { GuidanceReferral, PaginatedGuidance, UrgencyLevel, ReferralType } from '@/types/guidance';

const URGENCY_COLORS: Record<string, string> = {
  crisis:  'border-l-4 border-l-red-500 bg-red-50',
  urgent:  'border-l-4 border-l-yellow-400 bg-yellow-50',
  routine: 'border-l-4 border-l-gray-300 bg-white',
};

const URGENCY_BADGE: Record<string, string> = {
  crisis:  'bg-red-100 text-red-800',
  urgent:  'bg-yellow-100 text-yellow-800',
  routine: 'bg-gray-100 text-gray-700',
};

const STATUS_BADGE: Record<string, string> = {
  pending:           'bg-yellow-100 text-yellow-800',
  acknowledged:      'bg-blue-100 text-blue-800',
  converted_to_case: 'bg-green-100 text-green-800',
  declined:          'bg-gray-200 text-gray-600',
};

const DEFAULT_FORM = {
  reg_id: '',
  referral_type: 'teacher' as ReferralType,
  referrer_name: '',
  referrer_role: '',
  concern_description: '',
  urgency: 'routine' as UrgencyLevel,
};

export default function GuidanceReferralPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [openDialog, setOpenDialog] = useState(false);
  const [ackDialog, setAckDialog] = useState<{ referral: GuidanceReferral; action: string } | null>(null);

  const { data, isLoading } = useQuery<PaginatedGuidance<GuidanceReferral>>({
    queryKey: ['guidance-referrals', statusFilter, search],
    queryFn: () =>
      api
        .get('/admin/guidance/referrals', { params: { status: statusFilter || undefined, search: search || undefined } })
        .then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (payload: typeof DEFAULT_FORM) => api.post('/admin/guidance/referrals', payload),
    onSuccess: () => {
      toast.success('Referral submitted.');
      qc.invalidateQueries({ queryKey: ['guidance-referrals'] });
      qc.invalidateQueries({ queryKey: ['guidance-dashboard'] });
      setOpenDialog(false);
      setForm(DEFAULT_FORM);
    },
    onError: () => toast.error('Failed to submit referral.'),
  });

  const ackMutation = useMutation({
    mutationFn: ({ publicId, action }: { publicId: string; action: string }) =>
      api.post(`/admin/guidance/referrals/${publicId}/${action}`, {}),
    onSuccess: (_d, vars) => {
      toast.success(vars.action === 'acknowledge' ? 'Referral acknowledged.' : 'Referral declined.');
      qc.invalidateQueries({ queryKey: ['guidance-referrals'] });
      qc.invalidateQueries({ queryKey: ['guidance-dashboard'] });
      setAckDialog(null);
    },
    onError: () => toast.error('Action failed.'),
  });

  const referrals = data?.data ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-yellow-600" />
          <h1 className="text-xl font-bold">Referral Queue</h1>
        </div>

        {/* Add referral dialog */}
        <Button size="sm" onClick={() => setOpenDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Referral
        </Button>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Submit Referral</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Student LRN / Reg ID</Label>
                <Input
                  value={form.reg_id}
                  onChange={e => setForm(f => ({ ...f, reg_id: e.target.value }))}
                  placeholder="e.g. 123456789012"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Referral Type</Label>
                  <Select
                    value={form.referral_type}
                    onValueChange={v => setForm(f => ({ ...f, referral_type: v as ReferralType }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['self', 'teacher', 'parent', 'admin', 'nurse'].map(t => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Urgency</Label>
                  <Select
                    value={form.urgency}
                    onValueChange={v => setForm(f => ({ ...f, urgency: v as UrgencyLevel }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="crisis">Crisis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Referrer Name</Label>
                  <Input
                    value={form.referrer_name}
                    onChange={e => setForm(f => ({ ...f, referrer_name: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label>Referrer Role</Label>
                  <Input
                    value={form.referrer_role}
                    onChange={e => setForm(f => ({ ...f, referrer_role: e.target.value }))}
                    placeholder="e.g. Class Adviser"
                  />
                </div>
              </div>
              <div>
                <Label>Concern / Reason</Label>
                <Textarea
                  rows={4}
                  value={form.concern_description}
                  onChange={e => setForm(f => ({ ...f, concern_description: e.target.value }))}
                />
              </div>
              <Button
                className="w-full"
                disabled={addMutation.isPending}
                onClick={() => addMutation.mutate(form)}
              >
                {addMutation.isPending ? 'Submitting…' : 'Submit Referral'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          className="w-48 h-8 text-sm"
          placeholder="Search student…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {['', 'pending', 'acknowledged', 'converted_to_case', 'declined'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              statusFilter === s
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s === '' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>
      ) : referrals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No referrals found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {referrals.map(r => (
            <div
              key={r.public_id}
              className={`rounded-lg px-4 py-3 shadow-sm border ${URGENCY_COLORS[r.urgency] ?? ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-sm">
                    {r.student
                      ? `${r.student.last_name}, ${r.student.first_name}`
                      : r.reg_id}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {r.referral_type} referral by {r.referrer_name}
                    {r.referrer_role ? ` (${r.referrer_role})` : ''}
                  </span>
                  <p className="text-xs mt-1 text-gray-600 line-clamp-2">{r.concern_description}</p>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_BADGE[r.urgency]}`}>
                    {r.urgency}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>
                    {r.status.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(r.referred_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {r.status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => ackMutation.mutate({ publicId: r.public_id, action: 'acknowledge' })}
                    disabled={ackMutation.isPending}
                  >
                    <CheckCheck className="h-3 w-3 mr-1" /> Acknowledge
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-red-600"
                    onClick={() => ackMutation.mutate({ publicId: r.public_id, action: 'decline' })}
                    disabled={ackMutation.isPending}
                  >
                    Decline
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
