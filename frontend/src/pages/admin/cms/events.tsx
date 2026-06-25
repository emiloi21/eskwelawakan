import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';

interface CmsEvent {
  id: number;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  category: string;
  color: string;
  is_public: boolean;
}

const EVENT_CATEGORIES = ['Enrollment', 'Academics', 'Event', 'Faculty', 'Holiday', 'Sports', 'Other'];

const schema = z.object({
  title:       z.string().min(1, 'Required'),
  description: z.string().optional().or(z.literal('')),
  start_date:  z.string().min(1, 'Required'),
  end_date:    z.string().optional().or(z.literal('')),
  location:    z.string().optional().or(z.literal('')),
  category:    z.string().min(1, 'Required'),
  color:       z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color').default('#3b82f6'),
  is_public:   z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const CATEGORY_COLORS: Record<string, string> = {
  Enrollment: '#10b981',
  Faculty:    '#8b5cf6',
  Event:      '#f59e0b',
  Academics:  '#3b82f6',
  Holiday:    '#ef4444',
  Sports:     '#ec4899',
  Other:      '#6b7280',
};

export default function CmsEventsPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<CmsEvent | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: events = [], isLoading } = useQuery<CmsEvent[]>({
    queryKey: ['cms-events'],
    queryFn: () => api.get('/admin/cms/events').then(r => r.data),
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { is_public: true, category: 'Event', color: '#3b82f6' },
  });

  const upsert = useMutation({
    mutationFn: (values: FormValues) =>
      editItem
        ? api.put(`/admin/cms/events/${editItem.id}`, values).then(r => r.data)
        : api.post('/admin/cms/events', values).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-events'] });
      toast.success(editItem ? 'Event updated.' : 'Event created.');
      closeForm();
    },
    onError: () => toast.error('Failed to save event.'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/cms/events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-events'] });
      toast.success('Event deleted.');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete event.'),
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ is_public: true, category: 'Event', color: '#3b82f6' });
    setFormOpen(true);
  };

  const openEdit = (ev: CmsEvent) => {
    setEditItem(ev);
    reset({
      title:       ev.title,
      description: ev.description ?? '',
      start_date:  ev.start_date,
      end_date:    ev.end_date ?? '',
      location:    ev.location ?? '',
      category:    ev.category,
      color:       ev.color,
      is_public:   ev.is_public,
    });
    setFormOpen(true);
  };

  const closeForm = () => { setFormOpen(false); setEditItem(null); reset(); };

  const watchedCategory = watch('category');
  const watchedPublic   = watch('is_public');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar Events</h1>
          <p className="text-sm text-muted-foreground">Manage events shown on the public school calendar.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <CalendarDays className="h-10 w-10 opacity-30" />
          <p>No events yet. Click "Add Event" to create the first one.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Event</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Visibility</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: ev.color }} />
                      <div>
                        <p className="font-medium">{ev.title}</p>
                        {ev.location && <p className="text-xs text-muted-foreground">{ev.location}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(ev.start_date).toLocaleDateString()}
                    {ev.end_date && ev.end_date !== ev.start_date && ` – ${new Date(ev.end_date).toLocaleDateString()}`}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{ev.category}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {ev.is_public
                      ? <Badge variant="default">Public</Badge>
                      : <Badge variant="secondary">Private</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(ev)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(ev.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={o => !o && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Event' : 'New Event'}</DialogTitle>
          </DialogHeader>
          <form id="event-form" onSubmit={handleSubmit(v => upsert.mutate(v))} className="space-y-4">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input {...register('title')} placeholder="Event title" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Start Date</Label>
                <Input type="date" {...register('start_date')} />
                {errors.start_date && <p className="text-xs text-destructive">{errors.start_date.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>End Date <span className="text-muted-foreground">(optional)</span></Label>
                <Input type="date" {...register('end_date')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={watchedCategory}
                  onValueChange={v => {
                    setValue('category', v);
                    setValue('color', CATEGORY_COLORS[v] ?? '#6b7280');
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" {...register('color')} className="h-9 w-12 cursor-pointer rounded border" />
                  <Input {...register('color')} className="font-mono text-xs" />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Location <span className="text-muted-foreground">(optional)</span></Label>
              <Input {...register('location')} placeholder="e.g. Gymnasium, Online" />
            </div>
            <div className="space-y-1">
              <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea {...register('description')} rows={2} />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="is_public"
                checked={watchedPublic}
                onCheckedChange={v => setValue('is_public', v)}
              />
              <Label htmlFor="is_public">
                {watchedPublic ? 'Visible on public calendar' : 'Hidden from public'}
              </Label>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button type="submit" form="event-form" disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editItem ? 'Save Changes' : 'Create Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the event from the calendar.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
              onClick={() => deleteId !== null && remove.mutate(deleteId)}
            >
              {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
