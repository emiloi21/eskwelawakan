import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ChevronLeft, Image as ImageIcon, Loader2, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';

interface KioskSlide {
  id: number;
  image_path: string | null;
  title: string | null;
  subtitle: string | null;
  bg_color: string;
  sort_order: number;
  is_active: boolean;
}

const schema = z.object({
  title:      z.string().optional(),
  subtitle:   z.string().optional(),
  bg_color:   z.string().min(1, 'Required'),
  sort_order: z.number().int().min(0),
  is_active:  z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

function slideImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE}/storage/${path.replace(/^\/+/, '')}`;
}

export default function AdminKioskSlidesPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formOpen, setFormOpen]     = useState(false);
  const [editItem, setEditItem]     = useState<KioskSlide | null>(null);
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const { data: slides = [], isLoading } = useQuery<KioskSlide[]>({
    queryKey: ['kiosk-slides-admin'],
    queryFn:  () => api.get('/admin/kiosk-management/slides').then(r => r.data),
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { bg_color: '#1e3a5f', sort_order: 0, is_active: true },
  });

  const upsert = useMutation({
    mutationFn: (values: FormValues) =>
      editItem
        ? api.put(`/admin/kiosk-management/slides/${editItem.id}`, values).then(r => r.data)
        : api.post('/admin/kiosk-management/slides', values).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kiosk-slides-admin'] });
      toast.success(editItem ? 'Slide updated.' : 'Slide created.');
      setFormOpen(false);
      setEditItem(null);
      reset();
    },
    onError: () => toast.error('Failed to save slide.'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/kiosk-management/slides/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kiosk-slides-admin'] });
      toast.success('Slide deleted.');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete slide.'),
  });

  const uploadImage = async (slideId: number, file: File) => {
    setUploadingId(slideId);
    const fd = new FormData();
    fd.append('image', file);
    try {
      await api.post(`/admin/kiosk-management/slides/${slideId}/image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['kiosk-slides-admin'] });
      toast.success('Image uploaded.');
    } catch {
      toast.error('Image upload failed.');
    } finally {
      setUploadingId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openCreate = () => {
    setEditItem(null);
    reset({ title: '', subtitle: '', bg_color: '#1e3a5f', sort_order: slides.length, is_active: true });
    setFormOpen(true);
  };

  const openEdit = (s: KioskSlide) => {
    setEditItem(s);
    reset({
      title:      s.title ?? '',
      subtitle:   s.subtitle ?? '',
      bg_color:   s.bg_color,
      sort_order: s.sort_order,
      is_active:  s.is_active,
    });
    setFormOpen(true);
  };

  const isActive = watch('is_active');
  const bgColor  = watch('bg_color');

  return (
    <div className="space-y-6 p-6">
      {/* Back nav */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/admin/kiosk" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' -ml-2'}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to Kiosks
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kiosk Slideshow</h1>
          <p className="text-sm text-muted-foreground">
            These slides appear on kiosk screens after 10 seconds of inactivity.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Slide</Button>
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file && uploadingId !== null) uploadImage(uploadingId, file);
        }}
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : slides.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <ImageIcon className="h-10 w-10 opacity-30" />
          <p>No slides yet. Add your first slide to enable the idle slideshow.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slides.map(slide => {
            const imgUrl = slideImageUrl(slide.image_path);
            return (
              <div key={slide.id} className="overflow-hidden rounded-lg border shadow-sm">
                {/* Preview */}
                <div
                  className="relative flex h-48 items-end justify-start p-4"
                  style={{ backgroundColor: slide.bg_color ?? '#1e3a5f' }}
                >
                  {imgUrl && (
                    <img
                      src={imgUrl}
                      alt={slide.title ?? 'Slide'}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <div className="relative z-10 space-y-0.5">
                    {slide.title && (
                      <p className="text-base font-bold leading-tight text-white drop-shadow">{slide.title}</p>
                    )}
                    {slide.subtitle && (
                      <p className="text-xs text-white/80 drop-shadow">{slide.subtitle}</p>
                    )}
                  </div>
                </div>

                {/* Card footer */}
                <div className="flex items-center justify-between bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">#{slide.sort_order}</span>
                    {slide.is_active
                      ? <Badge variant="default" className="text-xs">Active</Badge>
                      : <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Upload image"
                      disabled={uploadingId === slide.id}
                      onClick={() => {
                        setUploadingId(slide.id);
                        fileInputRef.current?.click();
                      }}
                    >
                      {uploadingId === slide.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Upload className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(slide)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(slide.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={o => { setFormOpen(o); if (!o) { setEditItem(null); reset(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Slide' : 'New Slide'}</DialogTitle>
          </DialogHeader>
          <form id="slide-form" onSubmit={handleSubmit(v => upsert.mutate(v))} className="space-y-4">
            <div className="space-y-1">
              <Label>Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input {...register('title')} placeholder="e.g. SVHS Attendance Kiosk" />
            </div>
            <div className="space-y-1">
              <Label>Subtitle <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea {...register('subtitle')} rows={2} placeholder="e.g. Tap your ID card to log attendance" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Background Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={e => setValue('bg_color', e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border bg-transparent p-0.5"
                  />
                  <Input {...register('bg_color')} className="font-mono text-sm" />
                </div>
                {errors.bg_color && <p className="text-xs text-destructive">{errors.bg_color.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Sort Order</Label>
                <Input type="number" {...register('sort_order', { valueAsNumber: true })} min={0} />
                {errors.sort_order && <p className="text-xs text-destructive">{errors.sort_order.message}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <p className="text-sm font-medium">Active</p>
              <Switch checked={isActive} onCheckedChange={v => setValue('is_active', v)} />
            </div>
            {editItem && (
              <p className="text-xs text-muted-foreground">
                To change the image, close this dialog and use the <Upload className="inline h-3 w-3" /> button on the slide card.
              </p>
            )}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" form="slide-form" disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Slide?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the slide and its image from the slideshow.
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
