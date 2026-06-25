import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Container } from '@/components/public/container';
import { Wrapper } from '@/components/public/wrapper';
import { SectionBadge } from '@/components/public/section-badge';
import { Image as ImageIcon, Loader2, Calendar, Images } from 'lucide-react';

interface Album {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  event_date: string | null;
  photos_count: number;
}

export default function GalleryPage() {
  const { data: albums = [], isLoading } = useQuery<Album[]>({
    queryKey: ['public-gallery'],
    queryFn: () => api.get('/public/gallery').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section className="flex w-full flex-col items-center justify-center">
      {/* Banner */}
      <div className="w-full bg-gradient-to-br from-primary/10 to-primary/5 py-16">
        <Wrapper>
          <Container>
            <div className="text-center">
              <SectionBadge title="Campus Life" />
              <h1 className="mt-4 text-4xl font-bold lg:text-5xl">Photo Gallery</h1>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                A glimpse into school life — events, activities, and campus moments.
              </p>
            </div>
          </Container>
        </Wrapper>
      </div>

      {/* Album Grid */}
      <Wrapper className="py-12">
        <Container>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : albums.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Images className="h-10 w-10 opacity-30" />
              <p>No albums yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {albums.map((album) => (
                <Link
                  key={album.id}
                  to={`/gallery/${album.slug}`}
                  className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md"
                >
                  <div className="relative h-48 overflow-hidden bg-muted">
                    {album.cover_image ? (
                      <img
                        src={album.cover_image}
                        alt={album.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold leading-tight group-hover:text-primary">{album.title}</p>
                    {album.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{album.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      {album.event_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(album.event_date).toLocaleDateString()}
                        </span>
                      )}
                      <span>{album.photos_count} photo{album.photos_count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </Wrapper>
    </section>
  );
}
