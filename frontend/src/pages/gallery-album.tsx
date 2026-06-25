import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Container } from '@/components/public/container';
import { Wrapper } from '@/components/public/wrapper';
import { ArrowLeft, Loader2, X, ChevronLeft, ChevronRight, Calendar, Images } from 'lucide-react';

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

export default function GalleryAlbumPage() {
  const { slug } = useParams<{ slug: string }>();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: album, isLoading } = useQuery<AlbumDetail>({
    queryKey: ['public-album', slug],
    queryFn: () => api.get(`/public/gallery/${slug}`).then(r => r.data),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  const closeLightbox = () => setLightboxIndex(null);
  const prevPhoto = () => {
    if (lightboxIndex === null || !album) return;
    setLightboxIndex((lightboxIndex - 1 + album.photos.length) % album.photos.length);
  };
  const nextPhoto = () => {
    if (lightboxIndex === null || !album) return;
    setLightboxIndex((lightboxIndex + 1) % album.photos.length);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Album not found.</p>
      </div>
    );
  }

  const currentPhoto = lightboxIndex !== null ? album.photos[lightboxIndex] : null;

  return (
    <section className="flex w-full flex-col items-center justify-center">
      {/* Banner */}
      <div className="w-full bg-gradient-to-br from-primary/10 to-primary/5 py-12">
        <Wrapper>
          <Container>
            <Link to="/gallery" className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to Gallery
            </Link>
            <h1 className="text-3xl font-bold lg:text-4xl">{album.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {album.event_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {new Date(album.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Images className="h-4 w-4" />
                {album.photos.length} photo{album.photos.length !== 1 ? 's' : ''}
              </span>
            </div>
            {album.description && (
              <p className="mt-3 max-w-2xl text-muted-foreground">{album.description}</p>
            )}
          </Container>
        </Wrapper>
      </div>

      {/* Photo Grid */}
      <Wrapper className="py-10">
        <Container>
          {album.photos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Images className="h-10 w-10 opacity-30" />
              <p>No photos in this album yet.</p>
            </div>
          ) : (
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
              {album.photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="mb-3 cursor-pointer break-inside-avoid overflow-hidden rounded-lg shadow-sm transition-all hover:shadow-md"
                  onClick={() => setLightboxIndex(index)}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption ?? album.title}
                    className="w-full object-cover transition-transform hover:scale-105"
                    loading="lazy"
                  />
                  {photo.caption && (
                    <div className="bg-card px-3 py-2 text-xs text-muted-foreground">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Container>
      </Wrapper>

      {/* Lightbox */}
      {currentPhoto !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Prev */}
          {album.photos.length > 1 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Image */}
          <div className="max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={currentPhoto.url}
              alt={currentPhoto.caption ?? album.title}
              className="max-h-[85vh] max-w-[88vw] rounded-lg object-contain shadow-2xl"
            />
            {currentPhoto.caption && (
              <p className="mt-2 text-center text-sm text-white/70">{currentPhoto.caption}</p>
            )}
            <p className="mt-1 text-center text-xs text-white/40">
              {(lightboxIndex ?? 0) + 1} / {album.photos.length}
            </p>
          </div>

          {/* Next */}
          {album.photos.length > 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
