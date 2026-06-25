import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Newspaper } from 'lucide-react';

interface NewsArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  category: string;
  cover_image: string | null;
  is_published: boolean;
  published_at: string | null;
  author: { id: number; name: string } | null;
  created_at: string;
}

const NEWS_CATEGORIES = ['Achievements', 'Academics', 'Events', 'Announcements', 'Facilities', 'Partnerships', 'General'];

const schema = z.object({
  title:        z.string().min(1, 'Required'),
  excerpt:      z.string().max(500).optional().or(z.literal('')),
  body:         z.string().optional().or(z.literal('')),
  category:     z.string().min(1, 'Required'),
  is_published: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export default function CmsNewsPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen]   = useState(false);
  const [editItem, setEditItem]   = useState<NewsArticle | null>(null);
  const [deleteId, setDeleteId]   = useState<number | null>(null);

  const { data: articles = [], isLoading } = useQuery<NewsArticle[]>({
    queryKey: ['cms-news'],
    queryFn: () => api.get('/admin/cms/news').then(r => r.data),
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { is_published: false, category: 'General' },
  });

  const upsert = useMutation({
    mutationFn: (values: FormValues) =>
      editItem
        ? api.put(`/admin/cms/news/${editItem.id}`, values).then(r => r.data)
        : api.post('/admin/cms/news', values).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-news'] });
      toast.success(editItem ? 'Article updated.' : 'Article created.');
      setFormOpen(false);
      setEditItem(null);
      reset();
    },
    onError: () => toast.error('Failed to save article.'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/cms/news/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-news'] });
      toast.success('Article deleted.');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete article.'),
  });

  const openCreate = () => {
    setEditItem(null);
    reset({ is_published: false, category: 'General', title: '', excerpt: '', body: '' });
    setFormOpen(true);
  };

  const openEdit = (article: NewsArticle) => {
    setEditItem(article);
    reset({
      title:        article.title,
      excerpt:      article.excerpt ?? '',
      body:         article.body ?? '',
      category:     article.category,
      is_published: article.is_published,
    });
    setFormOpen(true);
  };

  const isPublished = watch('is_published');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">News Articles</h1>
          <p className="text-sm text-muted-foreground">Manage public news and announcements.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Article
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <Newspaper className="h-10 w-10 opacity-30" />
          <p>No articles yet. Click "Add Article" to create your first post.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Published</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {articles.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.title}</p>
                    {a.excerpt && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{a.excerpt}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.category}</td>
                  <td className="px-4 py-3">
                    {a.is_published
                      ? <Badge variant="default">Published</Badge>
                      : <Badge variant="secondary">Draft</Badge>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.published_at ? new Date(a.published_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(a)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(a.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) { setEditItem(null); reset(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Article' : 'New Article'}</DialogTitle>
          </DialogHeader>
          <form id="news-form" onSubmit={handleSubmit(v => upsert.mutate(v))} className="space-y-4">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input {...register('title')} placeholder="Article title" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={watch('category')} onValueChange={v => setValue('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NEWS_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  id="published"
                  checked={isPublished}
                  onCheckedChange={v => setValue('is_published', v)}
                />
                <Label htmlFor="published">{isPublished ? 'Published' : 'Draft'}</Label>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Excerpt <span className="text-muted-foreground">(shown in news list)</span></Label>
              <Textarea {...register('excerpt')} rows={2} placeholder="A short summary..." />
              {errors.excerpt && <p className="text-xs text-destructive">{errors.excerpt.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Body <span className="text-muted-foreground">(full article content)</span></Label>
              <Textarea {...register('body')} rows={8} placeholder="Write the full article here..." />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFormOpen(false); setEditItem(null); reset(); }}>Cancel</Button>
            <Button type="submit" form="news-form" disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editItem ? 'Save Changes' : 'Create Article'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete article?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The article will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
              onClick={() => deleteId !== null && remove.mutate(deleteId)}
            >
              {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
