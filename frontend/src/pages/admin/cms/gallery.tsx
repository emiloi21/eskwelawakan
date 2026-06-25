import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Loader2, Plus, Pencil, Trash2, Images, ChevronRight, Calendar } from 'lucide-react';

interface Album {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  event_date: string | null;
  sort_order: number;
  photos_count: number;
  created_at: string;
}

const schema = z.object({
  title:       z.string().min(1, 'Required'),
  description: z.string().optional().or(z.literal('')),
  event_date:  z.string().optional().or(z.literal('')),
  sort_order:  z.coerce.number().int().min(0).default(0),
});
type FormValues = z.infer<typeof schema>;

export default function CmsGalleryPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Album | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: albums = [], isLoading } = useQuery<Album[]>({
    queryKey: ['cms-albums'],
    queryFn: () => api.get('/admin/cms/albums').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sort_order: 0 },
  });

  const upsert = useMutation({
    mutationFn: (values: FormValues) =>
      editItem
        ? api.put(`/admin/cms/albums/${editItem.id}`, values).then(r => r.data)
        : api.post('/admin/cms/albums', values).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-albums'] });
      toast.success(editItem ? 'Album updated.' : 'Album created.');
      closeForm();
    },
    onError: () => toast.error('Failed to save album.'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/cms/albums/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-albums'] });
      toast.success('Album deleted.');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete album.'),
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ sort_order: 0, title: '', description: '', event_date: '' });
    setFormOpen(true);
  };

  const openEdit = (album: Album) => {
    setEditItem(album);
    reset({
      title:       album.title,
      description: album.description ?? '',
      event_date:  album.event_date ?? '',
      sort_order:  album.sort_order,
    });
    setFormOpen(true);
  };

  const closeForm = () => { setFormOpen(false); setEditItem(null); reset(); };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Photo Gallery</h1>
          <p className="text-sm text-muted-foreground">Manage photo albums for the public gallery.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Album
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <Images className="h-10 w-10 opacity-30" />
          <p>No albums yet. Click "New Album" to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {albums.map((album) => (
            <div key={album.id} className="group overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md">
              {/* Cover */}
              <div className="relative h-40 overflow-hidden bg-muted">
                {album.cover_image ? (
                  <img src={album.cover_image} alt={album.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Images className="h-12 w-12 text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(album)}>
                      <Pencil className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteId(album.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              {/* Info */}
              <div className="p-3">
                <p className="font-semibold leading-tight">{album.title}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  {album.event_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(album.event_date).toLocaleDateString()}
                    </span>
                  )}
                  <span>{album.photos_count} photo{album.photos_count !== 1 ? 's' : ''}</span>
                </div>
                <Link
                  to={`/admin/cms/gallery/${album.id}`}
                  className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View Photos <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={o => !o && closeForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Album' : 'New Album'}</DialogTitle>
          </DialogHeader>
          <form id="album-form" onSubmit={handleSubmit(v => upsert.mutate(v))} className="space-y-4">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input {...register('title')} placeholder="Album title" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea {...register('description')} rows={2} placeholder="Optional description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Event Date</Label>
                <Input type="date" {...register('event_date')} />
              </div>
              <div className="space-y-1">
                <Label>Sort Order</Label>
                <Input type="number" min={0} {...register('sort_order')} />
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button type="submit" form="album-form" disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editItem ? 'Save Changes' : 'Create Album'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete album?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the album and all its photos. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
              onClick={() => deleteId !== null && remove.mutate(deleteId)}
            >
              {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Album
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
