import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, FolderOpen } from 'lucide-react';

interface LibraryCategory {
  id: number;
  public_id: string;
  name: string;
  description: string | null;
  books_count?: number;
}

export default function LibraryCategoriesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<LibraryCategory | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['library-categories'],
    queryFn: () => api.get('/library/categories').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/library/categories', payload),
    onSuccess: () => {
      toast.success('Category created');
      qc.invalidateQueries({ queryKey: ['library-categories'] });
      setShowForm(false);
      setForm({ name: '', description: '' });
    },
    onError: () => toast.error('Failed to create category'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ publicId, data }: { publicId: string; data: any }) =>
      api.put(`/library/categories/${publicId}`, data),
    onSuccess: () => {
      toast.success('Category updated');
      qc.invalidateQueries({ queryKey: ['library-categories'] });
      setEditCat(null);
    },
    onError: () => toast.error('Failed to update category'),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => api.delete(`/library/categories/${publicId}`),
    onSuccess: () => {
      toast.success('Category deleted');
      qc.invalidateQueries({ queryKey: ['library-categories'] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? 'Failed to delete category';
      toast.error(msg);
    },
  });

  const categories: LibraryCategory[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Book Categories</h1>
          <p className="text-muted-foreground">Organize books by category</p>
        </div>
        <Button onClick={() => { setForm({ name: '', description: '' }); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />New Category
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No categories yet</p>
          ) : (
            <div className="divide-y">
              {categories.map((cat) => (
                <div key={cat.public_id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{cat.name}</p>
                      {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                    </div>
                    {cat.books_count !== undefined && (
                      <span className="text-xs text-muted-foreground">({cat.books_count} books)</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditCat(cat)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm('Delete this category?')) deleteMutation.mutate(cat.public_id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate({ name: form.name, description: form.description || null })} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCat} onOpenChange={(o) => !o && setEditCat(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
          {editCat && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={editCat.name} onChange={e => setEditCat(c => c ? { ...c, name: e.target.value } : c)} />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea rows={2} value={editCat.description ?? ''} onChange={e => setEditCat(c => c ? { ...c, description: e.target.value } : c)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCat(null)}>Cancel</Button>
            <Button
              onClick={() => editCat && updateMutation.mutate({ publicId: editCat.public_id, data: { name: editCat.name, description: editCat.description || null } })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
