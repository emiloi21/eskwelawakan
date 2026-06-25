import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, Plus, Search, MoreHorizontal, Pencil, Trash2, BarChart2, Pin } from 'lucide-react';
import { toast } from 'sonner';

interface Deck {
  public_id: string;
  title: string;
  description: string | null;
  tags: string[];
  is_graded: boolean;
  is_pinned: boolean;
  cards_count: number;
  shares: { class_id: number; class: { gradeLevel: string; section: string; strand: string } }[];
  updated_at: string;
}

export default function TeacherFlashcardsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<{ data: Deck[] }>({
    queryKey: ['teacher-flashcards', search],
    queryFn: async () => {
      const { data } = await api.get('/teacher/flashcards', { params: { search } });
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => api.delete(`/teacher/flashcards/${publicId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-flashcards'] });
      toast.success('Deck deleted.');
    },
    onError: () => toast.error('Failed to delete deck.'),
  });

  const pinMutation = useMutation({
    mutationFn: ({ publicId, pinned }: { publicId: string; pinned: boolean }) =>
      api.put(`/teacher/flashcards/${publicId}`, { is_pinned: !pinned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teacher-flashcards'] }),
  });

  const decks = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flashcards</h1>
          <p className="text-muted-foreground">Create and manage decks for your classes.</p>
        </div>
        <Button onClick={() => navigate('/teacher/flashcards/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Deck
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder="Search decks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : decks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <p>No decks yet.</p>
          <Button variant="outline" onClick={() => navigate('/teacher/flashcards/new')}>
            <Plus className="mr-2 h-4 w-4" /> Create your first deck
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <Card
              key={deck.public_id}
              className="relative cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/teacher/flashcards/${deck.public_id}`)}
            >
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate leading-snug">{deck.title}</CardTitle>
                  {deck.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{deck.description}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" />} onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => navigate(`/teacher/flashcards/${deck.public_id}`)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => pinMutation.mutate({ publicId: deck.public_id, pinned: deck.is_pinned })}
                    >
                      <Pin className="mr-2 h-4 w-4" /> {deck.is_pinned ? 'Unpin' : 'Pin'}
                    </DropdownMenuItem>
                    {deck.is_graded && (
                      <DropdownMenuItem onClick={() => navigate(`/teacher/flashcards/${deck.public_id}/results`)}>
                        <BarChart2 className="mr-2 h-4 w-4" /> Results
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        if (confirm('Delete this deck? This cannot be undone.')) {
                          deleteMutation.mutate(deck.public_id);
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {(deck.tags ?? []).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                  {deck.is_graded && <Badge className="text-xs bg-amber-500">Graded</Badge>}
                  {deck.is_pinned && <Badge variant="outline" className="text-xs">Pinned</Badge>}
                </div>
                <div className="text-sm text-muted-foreground">
                  {deck.cards_count} card{deck.cards_count !== 1 ? 's' : ''}
                  {deck.shares?.length > 0 && (
                    <span> · assigned to {deck.shares.length} class{deck.shares.length !== 1 ? 'es' : ''}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
