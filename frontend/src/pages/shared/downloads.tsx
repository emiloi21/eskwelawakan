import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, FileText, Download, Search } from 'lucide-react';

interface DownloadFile {
  public_id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  visibility: string;
  school_year: string | null;
  download_count: number;
  category: { public_id: string; name: string } | null;
}

const fileTypeIcon: Record<string, string> = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  ppt: '📑', pptx: '📑', zip: '📦', rar: '📦',
};

function fileIcon(type: string | null): string {
  if (!type) return '📁';
  return fileTypeIcon[type.toLowerCase()] ?? '📁';
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DownloadsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['downloads-list'],
    queryFn: () => api.get('/downloads').then(r => r.data),
  });

  const downloadMutation = useMutation({
    mutationFn: async (file: DownloadFile) => {
      await api.post(`/downloads/${file.public_id}/download`);
      return file;
    },
    onSuccess: (file) => {
      // Open file in new tab
      window.open(file.file_path, '_blank', 'noopener,noreferrer');
    },
    onError: () => toast.error('Failed to initiate download'),
  });

  const files: DownloadFile[] = data?.data ?? [];

  // Build category list for filter
  const categories = Array.from(
    new Map(files.filter(f => f.category).map(f => [f.category!.public_id, f.category!])).values()
  );

  const filtered = files.filter(f => {
    const matchSearch = !search ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      (f.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (f.file_name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || f.category?.public_id === categoryFilter;
    return matchSearch && matchCat;
  });

  // Group by category
  const grouped: Record<string, DownloadFile[]> = {};
  for (const f of filtered) {
    const key = f.category?.name ?? 'Uncategorized';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Download Center</h1>
        <p className="text-muted-foreground">Access forms, guidelines, and downloadable resources</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.public_id} value={c.public_id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No files found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catFiles]) => (
            <div key={category}>
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <span>{category}</span>
                <Badge variant="secondary" className="text-xs">{catFiles.length}</Badge>
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {catFiles.map(f => (
                  <Card key={f.public_id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="flex items-start gap-3 pt-4">
                      <span className="text-2xl leading-none mt-0.5 select-none">{fileIcon(f.file_type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{f.title}</p>
                        {f.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{f.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {f.file_name}
                          {f.file_size ? ` · ${formatSize(f.file_size)}` : ''}
                          {f.school_year ? ` · ${f.school_year}` : ''}
                        </p>
                        <Button
                          size="sm" variant="outline" className="mt-2 h-7 text-xs gap-1"
                          onClick={() => downloadMutation.mutate(f)}
                          disabled={downloadMutation.isPending}
                        >
                          <Download className="h-3 w-3" />Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
