import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
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
import { Loader2, ArrowLeft, Upload, Trash2, ImagePlus } from 'lucide-react';

interface Photo {
  id: number;
  url: string;
  caption: string | null;
  sort_order: number;
}

interface AlbumDetail {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  event_date: string | null;
  photos: Photo[];
}

export default function CmsGalleryAlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [deletePhotoId, setDeletePhotoId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: album, isLoading } = useQuery<AlbumDetail>({
    queryKey: ['cms-album', albumId],
    queryFn: () => api.get(`/admin/cms/albums/${albumId}`).then(r => r.data),
    enabled: !!albumId,
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach((f, i) => fd.append(`photos[${i}]`, f));

    try {
      await api.post(`/admin/cms/albums/${albumId}/photos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.invalidateQueries({ queryKey: ['cms-album', albumId] });
      qc.invalidateQueries({ queryKey: ['cms-albums'] });
      toast.success(`${files.length} photo${files.length !== 1 ? 's' : ''} uploaded.`);
    } catch {
      toast.error('Upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = useMutation({
    mutationFn: (photoId: number) => api.delete(`/admin/cms/albums/${albumId}/photos/${photoId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-album', albumId] });
      qc.invalidateQueries({ queryKey: ['cms-albums'] });
      toast.success('Photo deleted.');
      setDeletePhotoId(null);
    },
    onError: () => toast.error('Failed to delete photo.'),
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!album) {
    return <div className="p-6 text-muted-foreground">Album not found.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/admin/cms/gallery" className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Albums
          </Link>
          <h1 className="text-2xl font-bold">{album.title}</h1>
          <p className="text-sm text-muted-foreground">
            {album.photos.length} photo{album.photos.length !== 1 ? 's' : ''}
            {album.event_date && ` · ${new Date(album.event_date).toLocaleDateString()}`}
          </p>
          {album.description && <p className="mt-1 text-sm text-muted-foreground">{album.description}</p>}
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload Photos
          </Button>
        </div>
      </div>

      {/* Photo Grid */}
      {album.photos.length === 0 ? (
        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-16 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="h-12 w-12 opacity-40" />
          <p>Click to upload photos to this album</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {album.photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
              <img src={photo.url} alt={photo.caption ?? ''} className="h-full w-full object-cover" />
              {/* Overlay on hover */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={() => setDeletePhotoId(photo.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {photo.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
          {/* Upload tile */}
          <div
            className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="h-8 w-8" />
            <span className="mt-1 text-xs">Add more</span>
          </div>
        </div>
      )}

      {/* Delete Photo Confirmation */}
      <AlertDialog open={deletePhotoId !== null} onOpenChange={o => !o && setDeletePhotoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete photo?</AlertDialogTitle>
            <AlertDialogDescription>This photo will be permanently removed from the album.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
              onClick={() => deletePhotoId !== null && removePhoto.mutate(deletePhotoId)}
            >
              {removePhoto.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
