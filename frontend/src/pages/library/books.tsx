import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Search, BookOpen } from 'lucide-react';

interface LibraryCategory {
  id: number;
  public_id: string;
  name: string;
  description: string | null;
  books_count?: number;
}

interface LibraryBook {
  public_id: string;
  title: string;
  author: string;
  isbn: string | null;
  publisher: string | null;
  year_published: string | null;
  edition: string | null;
  category_id: number;
  total_copies: number;
  available_copies: number;
  location: string | null;
  call_number: string | null;
  description: string | null;
  status: string;
  category: { id: number; public_id: string; name: string } | null;
}

const statusColor: Record<string, string> = {
  Available: 'bg-green-100 text-green-700',
  'Out of Stock': 'bg-yellow-100 text-yellow-700',
  Removed: 'bg-gray-100 text-gray-500',
};

const emptyBookForm = {
  title: '',
  author: '',
  isbn: '',
  publisher: '',
  year_published: '',
  edition: '',
  category_id: '' as string | number,
  total_copies: '1',
  location: '',
  call_number: '',
  description: '',
};

export default function LibraryBooksPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editBook, setEditBook] = useState<LibraryBook | null>(null);
  const [form, setForm] = useState(emptyBookForm);

  const { data: categoriesData } = useQuery({
    queryKey: ['library-categories'],
    queryFn: () => api.get('/library/categories').then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['library-books', search, categoryFilter, statusFilter],
    queryFn: () => api.get('/library/books', {
      params: {
        search: search || undefined,
        category_id: categoryFilter || undefined,
        status: statusFilter || undefined,
      },
    }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/library/books', payload),
    onSuccess: () => {
      toast.success('Book added');
      qc.invalidateQueries({ queryKey: ['library-books'] });
      setShowForm(false);
      setForm(emptyBookForm);
    },
    onError: () => toast.error('Failed to add book'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ publicId, data }: { publicId: string; data: any }) =>
      api.put(`/library/books/${publicId}`, data),
    onSuccess: () => {
      toast.success('Book updated');
      qc.invalidateQueries({ queryKey: ['library-books'] });
      setEditBook(null);
    },
    onError: () => toast.error('Failed to update book'),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => api.delete(`/library/books/${publicId}`),
    onSuccess: () => {
      toast.success('Book removed');
      qc.invalidateQueries({ queryKey: ['library-books'] });
    },
    onError: () => toast.error('Failed to remove book'),
  });

  const openEdit = (book: LibraryBook) => {
    setEditBook(book);
  };

  const handleCreate = () => {
    if (!form.title.trim() || !form.author.trim()) { toast.error('Title and author are required'); return; }
    if (!form.category_id) { toast.error('Please select a category'); return; }
    createMutation.mutate({
      title: form.title,
      author: form.author,
      isbn: form.isbn || null,
      publisher: form.publisher || null,
      year_published: form.year_published || null,
      edition: form.edition || null,
      category_id: Number(form.category_id),
      total_copies: parseInt(form.total_copies) || 1,
      location: form.location || null,
      call_number: form.call_number || null,
      description: form.description || null,
    });
  };

  const handleUpdate = () => {
    if (!editBook) return;
    updateMutation.mutate({
      publicId: editBook.public_id,
      data: {
        title: editBook.title,
        author: editBook.author,
        isbn: editBook.isbn,
        publisher: editBook.publisher,
        year_published: editBook.year_published,
        edition: editBook.edition,
        category_id: editBook.category_id,
        total_copies: editBook.total_copies,
        location: editBook.location,
        call_number: editBook.call_number,
        description: editBook.description,
        status: editBook.status,
      },
    });
  };

  const categories: LibraryCategory[] = categoriesData?.data ?? [];
  const books: LibraryBook[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Books Catalog</h1>
          <p className="text-muted-foreground">Library book inventory</p>
        </div>
        <Button onClick={() => { setForm(emptyBookForm); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />Add Book
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search title, author, ISBN..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="Out of Stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : books.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No books found</p>
          ) : (
            <div className="divide-y">
              {books.map((book) => (
                <div key={book.public_id} className="flex items-start justify-between px-4 py-3 hover:bg-muted/30">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{book.title}</span>
                      <Badge className={`text-xs shrink-0 ${statusColor[book.status] ?? 'bg-gray-100 text-gray-600'}`} variant="outline">
                        {book.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">{book.author}</p>
                    <p className="text-xs text-muted-foreground pl-6">
                      {book.category?.name}
                      {book.isbn ? ` · ISBN: ${book.isbn}` : ''}
                      {book.call_number ? ` · Call#: ${book.call_number}` : ''}
                      {book.location ? ` · ${book.location}` : ''}
                      {` · Copies: ${book.available_copies}/${book.total_copies}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(book)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm('Remove this book from the catalog?')) deleteMutation.mutate(book.public_id); }}
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

      {/* Add Book Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Book</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Author *</Label>
              <Input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ISBN</Label>
                <Input value={form.isbn} onChange={e => setForm(f => ({ ...f, isbn: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Category *</Label>
                <Select value={String(form.category_id)} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Publisher</Label>
                <Input value={form.publisher} onChange={e => setForm(f => ({ ...f, publisher: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Year Published</Label>
                <Input value={form.year_published} onChange={e => setForm(f => ({ ...f, year_published: e.target.value }))} placeholder="2024" />
              </div>
              <div className="space-y-1">
                <Label>Edition</Label>
                <Input value={form.edition} onChange={e => setForm(f => ({ ...f, edition: e.target.value }))} placeholder="1st" />
              </div>
              <div className="space-y-1">
                <Label>Total Copies *</Label>
                <Input type="number" min="1" value={form.total_copies} onChange={e => setForm(f => ({ ...f, total_copies: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Call Number</Label>
                <Input value={form.call_number} onChange={e => setForm(f => ({ ...f, call_number: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Location</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Shelf A-1" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Book
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Book Dialog */}
      <Dialog open={!!editBook} onOpenChange={(o) => !o && setEditBook(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Book</DialogTitle></DialogHeader>
          {editBook && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={editBook.title} onChange={e => setEditBook(b => b ? { ...b, title: e.target.value } : b)} />
              </div>
              <div className="space-y-1">
                <Label>Author</Label>
                <Input value={editBook.author} onChange={e => setEditBook(b => b ? { ...b, author: e.target.value } : b)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>ISBN</Label>
                  <Input value={editBook.isbn ?? ''} onChange={e => setEditBook(b => b ? { ...b, isbn: e.target.value } : b)} />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={String(editBook.category_id)} onValueChange={v => setEditBook(b => b ? { ...b, category_id: Number(v) } : b)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Total Copies</Label>
                  <Input type="number" min="0" value={editBook.total_copies} onChange={e => setEditBook(b => b ? { ...b, total_copies: parseInt(e.target.value) || 0 } : b)} />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={editBook.status} onValueChange={v => setEditBook(b => b ? { ...b, status: v } : b)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                      <SelectItem value="Removed">Removed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Location</Label>
                  <Input value={editBook.location ?? ''} onChange={e => setEditBook(b => b ? { ...b, location: e.target.value } : b)} />
                </div>
                <div className="space-y-1">
                  <Label>Call Number</Label>
                  <Input value={editBook.call_number ?? ''} onChange={e => setEditBook(b => b ? { ...b, call_number: e.target.value } : b)} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBook(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
