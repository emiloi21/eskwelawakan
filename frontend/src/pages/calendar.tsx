import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Container } from '@/components/public/container';
import { Wrapper } from '@/components/public/wrapper';
import { SectionBadge } from '@/components/public/section-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Loader2, CalendarDays } from 'lucide-react';

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

function groupByMonth(events: CmsEvent[]): { month: string; events: CmsEvent[] }[] {
  const map: Record<string, CmsEvent[]> = {};
  for (const ev of events) {
    const d    = new Date(ev.start_date);
    const key  = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    map[key] ??= [];
    map[key].push(ev);
  }
  return Object.entries(map).map(([month, events]) => ({ month, events }));
}

function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start);
  if (!end || end === start) return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const e = new Date(end);
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}\u2013${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export default function CalendarPage() {
  const { data: events = [], isLoading } = useQuery<CmsEvent[]>({
    queryKey: ['public-events'],
    queryFn: () => api.get('/public/events').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const months = groupByMonth(events);

  return (
    <section className="flex w-full flex-col items-center justify-center">
      {/* Banner */}
      <div className="w-full bg-gradient-to-br from-primary/10 to-primary/5 py-16">
        <Wrapper>
          <Container>
            <div className="text-center">
              <SectionBadge title="Academic Schedule" />
              <h1 className="mt-4 text-4xl font-bold lg:text-5xl">School Calendar</h1>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Stay up-to-date with important school dates, events, and academic milestones.
              </p>
            </div>
          </Container>
        </Wrapper>
      </div>

      {/* Calendar Timeline */}
      <Wrapper className="py-12">
        <Container>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : months.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <CalendarDays className="h-10 w-10 opacity-30" />
              <p>No upcoming events at this time.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {months.map((group) => (
                <div key={group.month}>
                  <div className="mb-4 flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">{group.month}</h2>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.events.map((ev) => (
                      <Card
                        key={ev.id}
                        className="border-none bg-gradient-to-br from-background to-muted/30 shadow-sm dark:to-muted/10"
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold" style={{ color: ev.color }}>
                              {formatDateRange(ev.start_date, ev.end_date)}
                            </span>
                            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: ev.color + '20', color: ev.color }}>
                              {ev.category}
                            </span>
                          </div>
                          <CardTitle className="text-sm leading-snug">{ev.title}</CardTitle>
                        </CardHeader>
                        {ev.location && (
                          <CardContent className="pt-0">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {ev.location}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Container>
      </Wrapper>
    </section>
  );
}
