import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, BookOpen, FileText, FileImage, File, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MaterialRow {
  id: number;
  title: string;
  description: string | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  download_url: string;
  created_at: string;
  uploader?: { id: number; name: string };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <FileImage className="h-5 w-5 text-blue-500 shrink-0" />;
  if (mime === 'application/pdf') return <FileText className="h-5 w-5 text-red-500 shrink-0" />;
  return <File className="h-5 w-5 text-muted-foreground shrink-0" />;
}

export default function StudentMaterialsPage() {
  const { data, isLoading, isError } = useQuery<{ data: MaterialRow[] }>({
    queryKey: ['student-materials'],
    queryFn: async () => {
      const { data } = await api.get('/student/materials');
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading materials…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        Failed to load materials.
      </div>
    );
  }

  const materials = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> Learning Materials
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Files uploaded by your class adviser.
        </p>
      </div>

      {materials.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <BookOpen className="h-10 w-10" />
          <p className="text-sm">No materials available yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {materials.map((m) => (
            <Card key={m.id}>
              <CardContent className="py-3 px-4 flex items-start gap-3">
                <FileIcon mime={m.mime_type} />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="font-medium text-sm leading-snug">{m.title}</p>
                  {m.description && (
                    <p className="text-sm text-muted-foreground">{m.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {m.file_name} · {formatBytes(m.file_size)} · {m.uploader?.name} ·{' '}
                    {new Date(m.created_at).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <a href={m.download_url} target="_blank" rel="noreferrer" download={m.file_name}>
                  <Button variant="outline" size="sm" className="shrink-0">
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
