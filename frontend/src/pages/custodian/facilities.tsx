import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';

type Facility = {
  id: number; public_id: string; name: string; description: string | null;
  location: string | null; capacity: number | null; amenities: string | null;
  status: 'Available' | 'Under Maintenance' | 'Inactive';
  pending_bookings_count: number; approved_bookings_count: number;
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Available: 'default',
  'Under Maintenance': 'secondary',
  Inactive: 'outline',
};

// ── Add/Edit dialog ───────────────────────────────────────────────
function FacilityDialog({
  open, facility, onClose,
}: { open: boolean; facility: Facility | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!facility;
  const empty = { name: '', description: '', location: '', capacity: '', amenities: '', status: 'Available' as string };
  const [form, setForm] = useState(
    facility
      ? { name: facility.name, description: facility.description ?? '', location: facility.location ?? '',
          capacity: String(facility.capacity ?? ''), amenities: facility.amenities ?? '', status: facility.status }
      : empty
  );
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        description: form.description || null,
        location: form.location || null,
        capacity: form.capacity ? parseInt(form.capacity, 10) : null,
        amenities: form.amenities || null,
        status: form.status,
      };
      return isEdit ? api.put(`/custodian/facilities/${facility!.public_id}`, body) : api.post('/custodian/facilities', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilities'] });
      toast.success(isEdit ? 'Facility updated.' : 'Facility added.');
      onClose();
    },
    onError: () => toast.error('Save failed.'),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Facility' : 'Add Facility'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update facility details.' : 'Register a new bookable facility.'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Facility Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Covered Court, Gymnasium" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Bldg / Floor / Area" />
            </div>
            <div className="space-y-1.5">
              <Label>Capacity (persons)</Label>
              <Input type="number" min={1} value={form.capacity} onChange={e => set('capacity', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Amenities</Label>
            <Textarea rows={2} value={form.amenities} onChange={e => set('amenities', e.target.value)} placeholder="PA system, projector, bleachers…" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={mutation.isPending || !form.name} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {isEdit ? 'Save Changes' : 'Add Facility'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function CustodianFacilitiesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFacility, setEditFacility] = useState<Facility | null>(null);

  const { data, isLoading } = useQuery<{ data: Facility[] }>({
    queryKey: ['facilities'],
    queryFn: () => api.get('/custodian/facilities').then(r => r.data),
  });

  const del = useMutation({
    mutationFn: (pid: string) => api.delete(`/custodian/facilities/${pid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facilities'] }); toast.success('Facility deleted.'); },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? 'Delete failed.'),
  });

  const facilities = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facilities</h1>
          <p className="text-muted-foreground">Manage bookable school facilities and venues</p>
        </div>
        <Button onClick={() => { setEditFacility(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Facility
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2" />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                : facilities.length === 0
                  ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">No facilities found. Add one to get started.</TableCell></TableRow>
                  : facilities.map(f => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{f.name}</p>
                        {f.description && <p className="text-xs text-muted-foreground line-clamp-1">{f.description}</p>}
                      </TableCell>
                      <TableCell className="text-sm">{f.location ?? '—'}</TableCell>
                      <TableCell className="text-sm">{f.capacity != null ? `${f.capacity} pax` : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[f.status] ?? 'outline'}>{f.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span className="text-yellow-700 font-medium">{f.pending_bookings_count} pending</span>
                          <span>·</span>
                          <span className="text-green-700 font-medium">{f.approved_bookings_count} approved</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => { setEditFacility(f); setDialogOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm(`Delete "${f.name}"? This cannot be undone.`)) del.mutate(f.public_id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FacilityDialog
        open={dialogOpen}
        facility={editFacility}
        onClose={() => { setDialogOpen(false); setEditFacility(null); }}
      />
    </div>
  );
}
