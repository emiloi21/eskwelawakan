import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Container } from '@/components/public/container';
import { Wrapper } from '@/components/public/wrapper';
import { SectionBadge } from '@/components/public/section-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Newspaper, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewsArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string;
  cover_image: string | null;
  published_at: string | null;
}

export default function NewsPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const { data: articles = [], isLoading } = useQuery<NewsArticle[]>({
    queryKey: ['public-news'],
    queryFn: () => api.get('/public/news').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const categories = ['All', ...Array.from(new Set(articles.map(a => a.category)))];
  const filtered = activeCategory === 'All' ? articles : articles.filter(a => a.category === activeCategory);

  return (
    <section className="flex w-full flex-col items-center justify-center">
      {/* Banner */}
      <div className="w-full bg-gradient-to-br from-primary/10 to-primary/5 py-16">
        <Wrapper>
          <Container>
            <div className="text-center">
              <SectionBadge title="Stay Informed" />
              <h1 className="mt-4 text-4xl font-bold lg:text-5xl">News &amp; Updates</h1>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                The latest news, announcements, and stories from our school.
              </p>
            </div>
          </Container>
        </Wrapper>
      </div>

      {/* Categories */}
      {categories.length > 1 && (
        <Wrapper className="py-6">
          <Container>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                    cat === activeCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </Container>
        </Wrapper>
      )}

      {/* News Grid */}
      <Wrapper className="pb-16">
        <Container>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Newspaper className="h-10 w-10 opacity-30" />
              <p>No articles available yet.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((article) => (
                <Card
                  key={article.id}
                  className="border-none bg-gradient-to-br from-background to-muted/30 shadow-sm transition-all hover:shadow-md dark:to-muted/10"
                >
                  <div className="flex h-40 items-center justify-center overflow-hidden rounded-t-lg bg-gradient-to-br from-muted to-muted/50">
                    {article.cover_image ? (
                      <img src={article.cover_image} alt={article.title} className="h-full w-full object-cover" />
                    ) : (
                      <Newspaper className="h-10 w-10 text-muted-foreground/40" />
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{article.published_at ? new Date(article.published_at).toLocaleDateString() : ''}</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{article.category}</span>
                    </div>
                    <CardTitle className="mt-1 text-base leading-snug">{article.title}</CardTitle>
                  </CardHeader>
                  {article.excerpt && (
                    <CardContent className="pt-0">
                      <p className="line-clamp-3 text-sm text-muted-foreground">{article.excerpt}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </Container>
      </Wrapper>
    </section>
  );
}
