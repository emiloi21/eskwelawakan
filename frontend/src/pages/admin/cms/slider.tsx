import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  LayoutPanelTop,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Slider {
  id: number;
  title: string;
  subtitle: string | null;
  bg_image: string | null;
  bg_image_url?: string | null;
  bg_color: string;
  bg_overlay_color: string;
  bg_overlay_opacity: number;
  btn1_label: string | null;
  btn1_link: string | null;
  btn1_variant: string;
  btn2_label: string | null;
  btn2_link: string | null;
  btn2_variant: string;
  text_align: 'left' | 'center' | 'right';
  sort_order: number;
  is_active: boolean;
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const sliderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  subtitle: z.string().max(500).optional().or(z.literal('')),
  bg_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color'),
  bg_overlay_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color'),
  bg_overlay_opacity: z.string(),
  btn1_label: z.string().max(100).optional().or(z.literal('')),
  btn1_link: z.string().max(500).optional().or(z.literal('')),
  btn1_variant: z.enum(['primary', 'secondary', 'outline', 'ghost']),
  btn2_label: z.string().max(100).optional().or(z.literal('')),
  btn2_link: z.string().max(500).optional().or(z.literal('')),
  btn2_variant: z.enum(['primary', 'secondary', 'outline', 'ghost']),
  text_align: z.enum(['left', 'center', 'right']),
  sort_order: z.string(),
  is_active: z.boolean(),
});

type SliderForm = z.infer<typeof sliderSchema>;

// ─── Alignment icon map ───────────────────────────────────────────────────────

const alignIcons = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
} as const;

// ─── Preview mini-card ────────────────────────────────────────────────────────

function SliderPreview({ slide }: { slide: Slider }) {
  const overlay = `${slide.bg_overlay_color}${Math.round((slide.bg_overlay_opacity / 100) * 255)
    .toString(16)
    .padStart(2, '0')}`;
  const AlignIcon = alignIcons[slide.text_align];

  return (
    <div
      className="relative flex h-28 w-full items-center overflow-hidden rounded-lg"
      style={{ background: slide.bg_color }}
    >
      {slide.bg_image_url && (
        <img
          src={slide.bg_image_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: overlay }}
      />
      <div
        className={`relative z-10 w-full px-4 ${
          slide.text_align === 'center'
            ? 'text-center'
            : slide.text_align === 'right'
            ? 'text-right'
            : 'text-left'
        }`}
      >
        <p className="text-sm font-bold text-white leading-tight line-clamp-1">{slide.title}</p>
        {slide.subtitle && (
          <p className="mt-0.5 text-xs text-white/70 line-clamp-1">{slide.subtitle}</p>
        )}
        <div
          className={`mt-1.5 flex flex-wrap gap-1 ${
            slide.text_align === 'center'
              ? 'justify-center'
              : slide.text_align === 'right'
              ? 'justify-end'
              : 'justify-start'
          }`}
        >
          {slide.btn1_label && (
            <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] text-white">
              {slide.btn1_label}
            </span>
          )}
          {slide.btn2_label && (
            <span className="rounded border border-white/30 px-2 py-0.5 text-[10px] text-white">
              {slide.btn2_label}
            </span>
          )}
        </div>
      </div>
      <div className="absolute right-2 top-2 z-20">
        <AlignIcon className="h-3.5 w-3.5 text-white/60" />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CmsSliderPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Slider | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Slider | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: sliders = [], isLoading } = useQuery<Slider[]>({
    queryKey: ['admin-sliders'],
    queryFn: () => api.get('/admin/cms/sliders').then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SliderForm>({
    resolver: zodResolver(sliderSchema),
    defaultValues: {
      bg_color: '#1e40af',
      bg_overlay_color: '#000000',
      bg_overlay_opacity: '50',
      btn1_variant: 'secondary' as const,
      btn2_variant: 'outline' as const,
      text_align: 'center' as const,
      sort_order: '0',
      is_active: true,
    },
  });

  function openCreate() {
    setEditing(null);
    reset({
      title: '',
      subtitle: '',
      bg_color: '#1e40af',
      bg_overlay_color: '#000000',
      bg_overlay_opacity: '50',
      btn1_label: '',
      btn1_link: '',
      btn1_variant: 'secondary' as const,
      btn2_label: '',
      btn2_link: '',
      btn2_variant: 'outline' as const,
      text_align: 'center' as const,
      sort_order: String(sliders.length),
      is_active: true,
    });
    setDialogOpen(true);
  }

  function openEdit(s: Slider) {
    setEditing(s);
    reset({
      title: s.title,
      subtitle: s.subtitle ?? '',
      bg_color: s.bg_color,
      bg_overlay_color: s.bg_overlay_color,
      bg_overlay_opacity: String(s.bg_overlay_opacity),
      btn1_label: s.btn1_label ?? '',
      btn1_link: s.btn1_link ?? '',
      btn1_variant: s.btn1_variant as SliderForm['btn1_variant'],
      btn2_label: s.btn2_label ?? '',
      btn2_link: s.btn2_link ?? '',
      btn2_variant: s.btn2_variant as SliderForm['btn2_variant'],
      text_align: s.text_align,
      sort_order: String(s.sort_order),
      is_active: s.is_active,
    });
    setDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (data: SliderForm) => {
      const payload = {
        ...data,
        bg_overlay_opacity: Number(data.bg_overlay_opacity),
        sort_order: Number(data.sort_order),
      };
      return editing
        ? api.put(`/admin/cms/sliders/${editing.id}`, payload)
        : api.post('/admin/cms/sliders', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sliders'] });
      toast.success(editing ? 'Slide updated' : 'Slide created');
      setDialogOpen(false);
    },
    onError: () => toast.error('Failed to save slide'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/cms/sliders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sliders'] });
      toast.success('Slide deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete slide'),
  });

  async function handleBgUpload(slider: Slider, file: File) {
    setUploadingId(slider.id);
    const fd = new FormData();
    fd.append('image', file);
    try {
      await api.post(`/admin/cms/sliders/${slider.id}/bg`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['admin-sliders'] });
      toast.success('Background image updated');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingId(null);
    }
  }

  const onSubmit = (data: SliderForm) => saveMutation.mutate(data);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutPanelTop className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Hero Slider</h1>
            <p className="text-sm text-muted-foreground">
              Manage homepage hero slides — background, text, overlay, and CTA buttons.
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Slide
        </Button>
      </div>

      {/* Slide cards */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sliders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center text-muted-foreground">
          <LayoutPanelTop className="mb-3 h-10 w-10 opacity-30" />
          <p className="font-medium">No slides yet</p>
          <p className="text-sm">Click "Add Slide" to create the first hero slide.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sliders.map((slide) => (
            <div
              key={slide.id}
              className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Preview */}
              <SliderPreview slide={slide} />

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{slide.title}</p>
                    {slide.subtitle && (
                      <p className="truncate text-sm text-muted-foreground">{slide.subtitle}</p>
                    )}
                  </div>
                  <Badge variant={slide.is_active ? 'default' : 'secondary'} className="shrink-0">
                    {slide.is_active ? 'Active' : 'Hidden'}
                  </Badge>
                </div>

                {/* Meta row */}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {slide.text_align === 'left' ? (
                      <AlignLeft className="h-3 w-3" />
                    ) : slide.text_align === 'right' ? (
                      <AlignRight className="h-3 w-3" />
                    ) : (
                      <AlignCenter className="h-3 w-3" />
                    )}
                    {slide.text_align}
                  </span>
                  <span>Order: {slide.sort_order}</span>
                  <span className="flex items-center gap-1">
                    <span
                      className="inline-block h-3 w-3 rounded-full border"
                      style={{ backgroundColor: slide.bg_color }}
                    />
                    BG
                  </span>
                  <span className="flex items-center gap-1">
                    <span
                      className="inline-block h-3 w-3 rounded-full border"
                      style={{
                        backgroundColor: slide.bg_overlay_color,
                        opacity: slide.bg_overlay_opacity / 100,
                      }}
                    />
                    Overlay {slide.bg_overlay_opacity}%
                  </span>
                </div>

                {/* CTA buttons info */}
                {(slide.btn1_label || slide.btn2_label) && (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {slide.btn1_label && (
                      <span className="rounded bg-muted px-2 py-0.5 font-medium">
                        {slide.btn1_label} ({slide.btn1_variant})
                      </span>
                    )}
                    {slide.btn2_label && (
                      <span className="rounded bg-muted px-2 py-0.5 font-medium">
                        {slide.btn2_label} ({slide.btn2_variant})
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(slide)} className="flex-1">
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>

                  {/* BG image upload */}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={uploadingId === slide.id}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleBgUpload(slide, file);
                      };
                      input.click();
                    }}
                  >
                    {uploadingId === slide.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTarget(slide)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Slide' : 'New Slide'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
            {/* ── Content ── */}
            <fieldset className="space-y-3 rounded-lg border p-4">
              <legend className="px-1 text-sm font-semibold text-muted-foreground">Content</legend>

              <div className="space-y-1">
                <Label>Header *</Label>
                <Input placeholder="e.g. Welcome to St. Vincent High School" {...register('title')} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-1">
                <Label>Sub-header</Label>
                <Textarea
                  placeholder="Supporting tagline shown below the header"
                  rows={2}
                  {...register('subtitle')}
                />
              </div>
            </fieldset>

            {/* ── Background ── */}
            <fieldset className="space-y-3 rounded-lg border p-4">
              <legend className="px-1 text-sm font-semibold text-muted-foreground">Background</legend>
              <p className="text-xs text-muted-foreground">
                Upload a background image from the slide card. Here you set the fallback color and overlay.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fallback BG Color</Label>
                  <div className="flex gap-2">
                    <Controller
                      name="bg_color"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="color"
                          value={field.value}
                          onChange={field.onChange}
                          className="h-9 w-10 cursor-pointer rounded border bg-transparent p-0.5"
                        />
                      )}
                    />
                    <Input placeholder="#1e40af" {...register('bg_color')} className="font-mono" />
                  </div>
                  {errors.bg_color && <p className="text-xs text-destructive">{errors.bg_color.message}</p>}
                </div>

                <div className="space-y-1">
                  <Label>Overlay Color</Label>
                  <div className="flex gap-2">
                    <Controller
                      name="bg_overlay_color"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="color"
                          value={field.value}
                          onChange={field.onChange}
                          className="h-9 w-10 cursor-pointer rounded border bg-transparent p-0.5"
                        />
                      )}
                    />
                    <Input placeholder="#000000" {...register('bg_overlay_color')} className="font-mono" />
                  </div>
                  {errors.bg_overlay_color && (
                    <p className="text-xs text-destructive">{errors.bg_overlay_color.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Overlay Opacity (0–100)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="range"
                    min={0}
                    max={100}
                    className="flex-1"
                    {...register('bg_overlay_opacity')}
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="w-20"
                    {...register('bg_overlay_opacity')}
                  />
                </div>
              </div>
            </fieldset>

            {/* ── Text Alignment ── */}
            <fieldset className="space-y-3 rounded-lg border p-4">
              <legend className="px-1 text-sm font-semibold text-muted-foreground">Layout</legend>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Text & Button Alignment</Label>
                  <Controller
                    name="text_align"
                    control={control}
                    render={({ field }) => (
                      <div className="flex gap-2">
                        {(['left', 'center', 'right'] as const).map((align) => {
                          const Icon = alignIcons[align];
                          return (
                            <button
                              key={align}
                              type="button"
                              onClick={() => field.onChange(align)}
                              className={`flex flex-1 items-center justify-center gap-1 rounded-md border p-2 text-sm capitalize transition-colors ${
                                field.value === align
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border hover:bg-muted'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              {align}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Sort Order</Label>
                  <Input type="number" min={0} {...register('sort_order')} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <Label className="cursor-pointer">Active (visible on homepage)</Label>
              </div>
            </fieldset>

            {/* ── CTA Buttons ── */}
            <fieldset className="space-y-3 rounded-lg border p-4">
              <legend className="px-1 text-sm font-semibold text-muted-foreground">CTA Buttons</legend>

              {/* Button 1 */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Button 1</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Label</Label>
                    <Input placeholder="e.g. Enroll Now" {...register('btn1_label')} />
                  </div>
                  <div className="space-y-1">
                    <Label>Variant</Label>
                    <Controller
                      name="btn1_variant"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary">Primary</SelectItem>
                            <SelectItem value="secondary">Secondary</SelectItem>
                            <SelectItem value="outline">Outline</SelectItem>
                            <SelectItem value="ghost">Ghost</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Link / URL</Label>
                  <Input placeholder="e.g. /portal-login or https://…" {...register('btn1_link')} />
                </div>
              </div>

              <hr />

              {/* Button 2 */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Button 2 (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Label</Label>
                    <Input placeholder="e.g. Learn More" {...register('btn2_label')} />
                  </div>
                  <div className="space-y-1">
                    <Label>Variant</Label>
                    <Controller
                      name="btn2_variant"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary">Primary</SelectItem>
                            <SelectItem value="secondary">Secondary</SelectItem>
                            <SelectItem value="outline">Outline</SelectItem>
                            <SelectItem value="ghost">Ghost</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Link / URL</Label>
                  <Input placeholder="e.g. /news or /contact" {...register('btn2_link')} />
                </div>
              </div>
            </fieldset>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || saveMutation.isPending}>
                {(isSubmitting || saveMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editing ? 'Update Slide' : 'Create Slide'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete slide?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be permanently removed from the homepage slider.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* hidden ref input (fallback) */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" />
    </div>
  );
}
