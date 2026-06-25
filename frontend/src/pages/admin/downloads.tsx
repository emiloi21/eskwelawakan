import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, FolderOpen, FileText, Download, Eye, EyeOff } from 'lucide-react';

interface DownloadCategory {
  id: number;
  public_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  files_count: number;
}

interface DownloadFile {
  id: number;
  public_id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  visibility: 'Public' | 'Authenticated' | 'Staff Only' | 'Admin Only';
  school_year: string | null;
  is_active: boolean;
  download_count: number;
  category: { id: number; public_id: string; name: string } | null;
}

const visibilityOptions = ['Public', 'Authenticated', 'Staff Only', 'Admin Only'];

const visibilityColor: Record<string, string> = {
  Public: 'bg-green-100 text-green-700',
  Authenticated: 'bg-blue-100 text-blue-700',
  'Staff Only': 'bg-orange-100 text-orange-700',
  'Admin Only': 'bg-red-100 text-red-700',
};

// ─── Categories Tab ─────────────────────────────────────────────────────────

function CategoriesTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<DownloadCategory | null>(null);
  const [form, setForm] = useState({ name: '', description: '', sort_order: '0' });

  const { data, isLoading } = useQuery({
    queryKey: ['dl-categories'],
    queryFn: () => api.get('/admin/downloads/categories').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (p: any) => api.post('/admin/downloads/categories', p),
    onSuccess: () => { toast.success('Category created'); qc.invalidateQueries({ queryKey: ['dl-categories'] }); setShowCreate(false); setForm({ name: '', description: '', sort_order: '0' }); },
    onError: () => toast.error('Failed to create category'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ pid, p }: { pid: string; p: any }) => api.put(`/admin/downloads/categories/${pid}`, p),
    onSuccess: () => { toast.success('Category updated'); qc.invalidateQueries({ queryKey: ['dl-categories'] }); setEditItem(null); },
    onError: () => toast.error('Failed to update category'),
  });

  const deleteMutation = useMutation({
    mutationFn: (pid: string) => api.delete(`/admin/downloads/categories/${pid}`),
    onSuccess: () => { toast.success('Category deleted'); qc.invalidateQueries({ queryKey: ['dl-categories'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to delete category'),
  });

  const cats: DownloadCategory[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setForm({ name: '', description: '', sort_order: '0' }); setShowCreate(true); }}>
          <Plus className="mr-2 h-4 w-4" />Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map(c => (
            <Card key={c.public_id}>
              <CardContent className="flex items-start justify-between pt-4">
                <div className="flex items-start gap-3">
                  <FolderOpen className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{c.files_count} file{c.files_count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditItem(c); setForm({ name: c.name, description: c.description ?? '', sort_order: String(c.sort_order) }); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm('Delete category?')) deleteMutation.mutate(c.public_id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => !o && setShowCreate(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate({ name: form.name, description: form.description || null, sort_order: Number(form.sort_order) })} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={() => editItem && updateMutation.mutate({ pid: editItem.public_id, p: { name: form.name, description: form.description || null, sort_order: Number(form.sort_order) } })} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Files Tab ───────────────────────────────────────────────────────────────

function FilesTab() {
  const qc = useQueryClient();
  const [catFilter, setCatFilter] = useState('');
  const [visFilter, setVisFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<DownloadFile | null>(null);

  const emptyFileForm = {
    title: '', description: '', file_path: '', file_name: '', file_type: '',
    visibility: 'Authenticated' as string, school_year: '', category_id: '', is_active: true,
  };
  const [form, setForm] = useState(emptyFileForm);
  const [editForm, setEditForm] = useState({ title: '', description: '', visibility: '', school_year: '', is_active: true, category_id: '' });

  const { data: catData } = useQuery({
    queryKey: ['dl-categories'],
    queryFn: () => api.get('/admin/downloads/categories').then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['dl-files', catFilter, visFilter],
    queryFn: () => api.get('/admin/downloads/files', { params: { category_id: catFilter || undefined, visibility: visFilter || undefined } }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (p: any) => api.post('/admin/downloads/files', p),
    onSuccess: () => { toast.success('File added'); qc.invalidateQueries({ queryKey: ['dl-files'] }); setShowCreate(false); setForm(emptyFileForm); },
    onError: () => toast.error('Failed to add file'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ pid, p }: { pid: string; p: any }) => api.put(`/admin/downloads/files/${pid}`, p),
    onSuccess: () => { toast.success('File updated'); qc.invalidateQueries({ queryKey: ['dl-files'] }); setEditItem(null); },
    onError: () => toast.error('Failed to update file'),
  });

  const deleteMutation = useMutation({
    mutationFn: (pid: string) => api.delete(`/admin/downloads/files/${pid}`),
    onSuccess: () => { toast.success('File entry deleted'); qc.invalidateQueries({ queryKey: ['dl-files'] }); },
    onError: () => toast.error('Failed to delete'),
  });

  const openEdit = (f: DownloadFile) => {
    setEditItem(f);
    setEditForm({ title: f.title, description: f.description ?? '', visibility: f.visibility, school_year: f.school_year ?? '', is_active: f.is_active, category_id: f.category ? String(f.category.id) : '' });
  };

  const cats: DownloadCategory[] = catData?.data ?? [];
  const files: DownloadFile[] = data?.data ?? [];

  const handleCreate = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.file_path.trim()) { toast.error('File URL/path is required'); return; }
    if (!form.file_name.trim()) { toast.error('File name is required'); return; }
    if (!form.category_id) { toast.error('Category is required'); return; }
    createMutation.mutate({
      title: form.title,
      description: form.description || null,
      file_path: form.file_path,
      file_name: form.file_name,
      file_type: form.file_type || null,
      visibility: form.visibility,
      school_year: form.school_year || null,
      category_id: Number(form.category_id),
      is_active: form.is_active,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {cats.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={visFilter} onValueChange={setVisFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Visibility" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Visibility</SelectItem>
            {visibilityOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" onClick={() => { setForm(emptyFileForm); setShowCreate(true); }}>
          <Plus className="mr-2 h-4 w-4" />Add File
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : files.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No files found</p>
          ) : (
            <div className="divide-y">
              {files.map(f => (
                <div key={f.public_id} className="flex items-start justify-between px-4 py-3 hover:bg-muted/30">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{f.title}</span>
                        <Badge className={`text-xs ${visibilityColor[f.visibility]}`} variant="outline">{f.visibility}</Badge>
                        {!f.is_active && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{f.category?.name} {f.school_year ? `· ${f.school_year}` : ''} · {f.file_name}</p>
                      {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
                      <p className="text-xs text-muted-foreground"><Download className="inline h-3 w-3 mr-0.5" />{f.download_count} downloads</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm('Delete this file record?')) deleteMutation.mutate(f.public_id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => !o && setShowCreate(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Download File</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Category *</Label>
              <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category…" /></SelectTrigger>
                <SelectContent>{cats.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>File URL / Path *</Label><Input value={form.file_path} onChange={e => setForm(f => ({ ...f, file_path: e.target.value }))} placeholder="https://... or /storage/..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>File Name *</Label><Input value={form.file_name} onChange={e => setForm(f => ({ ...f, file_name: e.target.value }))} placeholder="document.pdf" /></div>
              <div className="space-y-1"><Label>File Type</Label><Input value={form.file_type} onChange={e => setForm(f => ({ ...f, file_type: e.target.value }))} placeholder="pdf, docx…" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Visibility *</Label>
                <Select value={form.visibility} onValueChange={v => setForm(f => ({ ...f, visibility: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{visibilityOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>School Year</Label><Input value={form.school_year} onChange={e => setForm(f => ({ ...f, school_year: e.target.value }))} placeholder="2025-2026" /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} id="is-active" />
              <Label htmlFor="is-active">Active (visible to users)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit File Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Title</Label><Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea rows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={editForm.category_id} onValueChange={v => setEditForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{cats.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Visibility</Label>
                <Select value={editForm.visibility} onValueChange={v => setEditForm(f => ({ ...f, visibility: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{visibilityOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>School Year</Label><Input value={editForm.school_year} onChange={e => setEditForm(f => ({ ...f, school_year: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editForm.is_active} onCheckedChange={v => setEditForm(f => ({ ...f, is_active: v }))} id="edit-active" />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={() => editItem && updateMutation.mutate({ pid: editItem.public_id, p: { title: editForm.title, description: editForm.description || null, visibility: editForm.visibility, school_year: editForm.school_year || null, is_active: editForm.is_active, category_id: editForm.category_id ? Number(editForm.category_id) : undefined } })} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminDownloadsPage() {
  const { data: statsData } = useQuery({
    queryKey: ['dl-files-all'],
    queryFn: () => api.get('/admin/downloads/files').then(r => r.data),
  });

  const files: DownloadFile[] = statsData?.data ?? [];
  const totalDownloads = files.reduce((s, f) => s + f.download_count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Download Center — Admin</h1>
        <p className="text-muted-foreground">Manage downloadable files for students, parents, and staff</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Files', value: files.length, icon: FileText, color: 'text-blue-500' },
          { label: 'Active Files', value: files.filter(f => f.is_active).length, icon: Eye, color: 'text-green-500' },
          { label: 'Inactive', value: files.filter(f => !f.is_active).length, icon: EyeOff, color: 'text-muted-foreground' },
          { label: 'Total Downloads', value: totalDownloads, icon: Download, color: 'text-purple-500' },
        ].map(s => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="files">
        <TabsList>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="files" className="mt-4"><FilesTab /></TabsContent>
        <TabsContent value="categories" className="mt-4"><CategoriesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
