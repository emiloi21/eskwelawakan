import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Megaphone, Pin } from 'lucide-react';

interface AnnouncementRow {
  id: number;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: { id: number; name: string };
}

export default function StudentAnnouncementsPage() {
  const { data, isLoading, isError } = useQuery<{ data: AnnouncementRow[] }>({
    queryKey: ['student-announcements'],
    queryFn: async () => {
      const { data } = await api.get('/student/announcements');
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading announcements…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        Failed to load announcements.
      </div>
    );
  }

  const announcements = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Megaphone className="h-6 w-6" /> Class Announcements
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Announcements from your class adviser.
        </p>
      </div>

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <Megaphone className="h-10 w-10" />
          <p className="text-sm">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className={a.pinned ? 'border-primary/40 bg-primary/5' : ''}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {a.pinned && (
                    <Badge variant="secondary" className="gap-1 shrink-0">
                      <Pin className="h-3 w-3" /> Pinned
                    </Badge>
                  )}
                  <CardTitle className="text-base leading-snug">{a.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <p className="text-sm whitespace-pre-wrap">{a.body}</p>
                <p className="text-xs text-muted-foreground">
                  {a.author?.name} ·{' '}
                  {new Date(a.created_at).toLocaleDateString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {a.updated_at !== a.created_at && ' (edited)'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
