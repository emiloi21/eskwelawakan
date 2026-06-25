import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Plus, Trash2, Loader2, Download, Share2, X, BarChart2, GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';

interface CardRow {
  public_id?: string;
  front: string;
  back: string;
  category_tag: string;
  has_cloze: boolean;
  _key: number;
}

interface ClassItem {
  class_id: number;
  gradeLevel: string;
  strand: string;
  section: string;
  schoolYear: string;
}

interface DeckShare {
  class_id: number;
  class: ClassItem;
}

interface Deck {
  public_id: string;
  title: string;
  description: string | null;
  tags: string[];
  is_graded: boolean;
  is_pinned: boolean;
  cards: { public_id: string; front: string; back: string; category_tag: string; has_cloze: boolean; sort_order: number }[];
  shares: DeckShare[];
}

let _seq = 1000;
const toRow = (c: Deck['cards'][0]): CardRow => ({
  public_id: c.public_id,
  front: c.front,
  back: c.back ?? '',
  category_tag: c.category_tag ?? '',
  has_cloze: c.has_cloze,
  _key: _seq++,
});
const newRow = (): CardRow => ({ front: '', back: '', category_tag: '', has_cloze: false, _key: _seq++ });

export default function TeacherFlashcardDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isGraded, setIsGraded] = useState(false);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);

  const { data, isLoading } = useQuery<{ data: Deck }>({
    queryKey: ['teacher-flashcard', deckId],
    queryFn: async () => {
      const { data } = await api.get(`/teacher/flashcards/${deckId}`);
      return data;
    },
    enabled: !!deckId,
    select: (data) => data,
    // Populate local form state on first load
    refetchOnWindowFocus: false,
  });

  // Sync state when data arrives
  const deck = data?.data;
  const [initialised, setInitialised] = useState(false);
  if (deck && !initialised) {
    setTitle(deck.title);
    setDescription(deck.description ?? '');
    setIsGraded(deck.is_graded);
    setCards(deck.cards.map(toRow));
    setInitialised(true);
  }

  // Classes for assignment
  const { data: classData } = useQuery<{ data: ClassItem[] }>({
    queryKey: ['teacher-my-classes'],
    queryFn: async () => {
      const { data } = await api.get('/teacher/my-classes');
      return data;
    },
    enabled: assignOpen,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: object) => api.put(`/teacher/flashcards/${deckId}`, payload),
    onSuccess: () => {
      toast.success('Deck saved.');
      qc.invalidateQueries({ queryKey: ['teacher-flashcard', deckId] });
      setDirty(false);
    },
    onError: () => toast.error('Failed to save deck.'),
  });

  const assignMutation = useMutation({
    mutationFn: (classIds: number[]) => api.post(`/teacher/flashcards/${deckId}/assign`, { class_ids: classIds }),
    onSuccess: () => {
      toast.success('Deck assigned.');
      qc.invalidateQueries({ queryKey: ['teacher-flashcard', deckId] });
      setAssignOpen(false);
    },
    onError: () => toast.error('Failed to assign deck.'),
  });

  const unassignMutation = useMutation({
    mutationFn: (classId: number) => api.delete(`/teacher/flashcards/${deckId}/assign/${classId}`),
    onSuccess: () => {
      toast.success('Assignment removed.');
      qc.invalidateQueries({ queryKey: ['teacher-flashcard', deckId] });
    },
  });

  const handleDownload = async () => {
    const res = await api.get(`/teacher/flashcards/${deckId}/export`);
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `${title}.json` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateCard = (key: number, field: keyof CardRow, value: string | boolean) => {
    setDirty(true);
    setCards((prev) =>
      prev.map((c) => {
        if (c._key !== key) return c;
        const updated = { ...c, [field]: value };
        if (field === 'front' && typeof value === 'string') {
          updated.has_cloze = value.includes('{{');
        }
        return updated;
      })
    );
  };

  const handleSave = () => {
    if (!title.trim()) return toast.error('Deck title is required.');
    const validCards = cards.filter((c) => c.front.trim());
    if (validCards.length === 0) return toast.error('Add at least one card.');
    saveMutation.mutate({
      title, description: description || undefined, is_graded: isGraded,
      cards: validCards.map(({ public_id, front, back, category_tag, has_cloze }) => ({
        public_id, front, back: back || undefined, category_tag: category_tag || undefined, has_cloze,
      })),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const assignedClassIds = deck?.shares.map((s) => s.class_id) ?? [];

  return (
    <div className="space-y-6 max-w-3xl pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/flashcards')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{deck?.title}</h1>
          <p className="text-muted-foreground">{deck?.cards.length ?? 0} cards</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
            <Share2 className="mr-1.5 h-3.5 w-3.5" /> Assign
          </Button>
          {deck?.is_graded && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/teacher/flashcards/${deckId}/results`)}>
              <BarChart2 className="mr-1.5 h-3.5 w-3.5" /> Results
            </Button>
          )}
        </div>
      </div>

      {/* Assigned classes */}
      {assignedClassIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {deck?.shares.map((s) => (
            <Badge key={s.class_id} variant="secondary" className="gap-1.5 pl-2">
              {s.class.gradeLevel} {s.class.strand} — {s.class.section}
              <button
                className="ml-0.5 opacity-60 hover:opacity-100"
                onClick={() => unassignMutation.mutate(s.class_id)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Edit Deck</TabsTrigger>
          <TabsTrigger value="preview">Preview Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-6 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1">
                <Label>Deck Name *</Label>
                <Input value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => { setDescription(e.target.value); setDirty(true); }} rows={2} />
              </div>
              <div className="flex items-center gap-3">
                <Switch id="graded" checked={isGraded} onCheckedChange={(v) => { setIsGraded(v); setDirty(true); }} />
                <Label htmlFor="graded" className="cursor-pointer">
                  Graded quiz <span className="text-xs text-muted-foreground">(scores visible to teacher)</span>
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Cards ({cards.filter((c) => c.front.trim()).length})</CardTitle>
              <Button size="sm" variant="outline" onClick={() => { setCards((p) => [...p, newRow()]); setDirty(true); }}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Card
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {cards.map((card, idx) => (
                <div key={card._key} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                      Card {idx + 1}
                      {card.has_cloze && <Badge variant="outline" className="text-xs ml-1">Cloze</Badge>}
                    </div>
                    <Button
                      size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground"
                      onClick={() => { setCards((p) => p.filter((c) => c._key !== card._key)); setDirty(true); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Front</Label>
                      <Textarea value={card.front} onChange={(e) => updateCard(card._key, 'front', e.target.value)} rows={2} className="text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Back</Label>
                      <Textarea value={card.back} onChange={(e) => updateCard(card._key, 'back', e.target.value)} rows={2} className="text-sm" />
                    </div>
                  </div>
                  <Input
                    placeholder="Category tag (optional)"
                    value={card.category_tag}
                    onChange={(e) => updateCard(card._key, 'category_tag', e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saveMutation.isPending || !dirty}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
            {dirty && (
              <Button variant="outline" onClick={() => {
                if (deck) {
                  setTitle(deck.title); setDescription(deck.description ?? '');
                  setIsGraded(deck.is_graded); setCards(deck.cards.map(toRow)); setDirty(false);
                }
              }}>
                Discard
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div className="grid sm:grid-cols-2 gap-3">
            {cards.filter((c) => c.front.trim()).map((card) => (
              <Card key={card._key} className="text-sm">
                <CardContent className="pt-4 space-y-2">
                  <div className="font-medium">{card.front}</div>
                  {card.back && <div className="text-muted-foreground border-t pt-2">{card.back}</div>}
                  {card.category_tag && (
                    <Badge variant="outline" className="text-xs">{card.category_tag}</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Classes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Select classes to give access to this deck.</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(classData?.data ?? []).map((cls) => (
              <label key={cls.class_id} className="flex items-center gap-3 rounded-md border p-2 cursor-pointer hover:bg-muted/50">
                <Checkbox
                  checked={selectedClasses.includes(cls.class_id) || assignedClassIds.includes(cls.class_id)}
                  disabled={assignedClassIds.includes(cls.class_id)}
                  onCheckedChange={(checked) =>
                    setSelectedClasses((prev) =>
                      checked ? [...prev, cls.class_id] : prev.filter((id) => id !== cls.class_id)
                    )
                  }
                />
                <span className="text-sm">
                  {cls.gradeLevel} {cls.strand} — {cls.section}
                  {assignedClassIds.includes(cls.class_id) && (
                    <span className="ml-2 text-xs text-muted-foreground">(already assigned)</span>
                  )}
                </span>
              </label>
            ))}
            {(classData?.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No classes found.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button
              onClick={() => assignMutation.mutate(selectedClasses)}
              disabled={assignMutation.isPending || selectedClasses.length === 0}
            >
              {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
