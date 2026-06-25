import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Plus, Trash2, Loader2, Upload, FileText, FileCog, Bot,
  GripVertical, AlertCircle, BookOpen, ChevronDown, ChevronUp, CheckCircle2, Lightbulb, Info,
  Sparkles, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type CardRow = { key: number; front: string; back: string; category_tag: string; has_cloze: boolean };

let _keySeq = 0;
const newCard = (): CardRow => ({ key: _keySeq++, front: '', back: '', category_tag: '', has_cloze: false });

export default function TeacherFlashcardNewPage() {
  const navigate = useNavigate();

  const [guideOpen, setGuideOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isGraded, setIsGraded] = useState(false);
  const [cards, setCards] = useState<CardRow[]>([newCard(), newCard()]);

  // Import tab state
  const [importMode, setImportMode] = useState<'manual' | 'csv' | 'json' | 'pdf' | 'ai'>('manual');
  const [importTitle, setImportTitle] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [aiTopic, setAiTopic] = useState('');
  const [aiFile, setAiFile] = useState<File | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: object) => api.post('/teacher/flashcards', payload),
    onSuccess: (res) => {
      toast.success('Deck created!');
      navigate(`/teacher/flashcards/${res.data.data.public_id}`);
    },
    onError: () => toast.error('Failed to create deck.'),
  });

  const importMutation = useMutation({
    mutationFn: ({ url, form }: { url: string; form: FormData }) =>
      api.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: (res) => {
      toast.success('Deck imported!');
      navigate(`/teacher/flashcards/${res.data.data.public_id}`);
    },
    onError: () => toast.error('Import failed. Check the file format.'),
  });

  const aiMutation = useMutation({
    mutationFn: (payload: object) => api.post('/teacher/flashcards/generate-ai', payload),
    onSuccess: () => toast.info('AI generation is not yet configured.'),
    onError: (err: any) => toast.info(err?.response?.data?.message ?? 'AI generation not available yet.'),
  });

  // ── Card editing helpers ──────────────────────────────────────────────────

  const updateCard = (key: number, field: keyof CardRow, value: string | boolean) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c;
        const updated = { ...c, [field]: value };
        if (field === 'front' && typeof value === 'string') {
          updated.has_cloze = value.includes('{{');
        }
        return updated;
      })
    );
  };

  const removeCard = (key: number) => {
    setCards((prev) => prev.filter((c) => c.key !== key));
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!title.trim()) return toast.error('Deck title is required.');
    const validCards = cards.filter((c) => c.front.trim());
    if (validCards.length === 0) return toast.error('Add at least one card.');

    createMutation.mutate({
      title,
      description: description || undefined,
      tags,
      is_graded: isGraded,
      cards: validCards.map(({ front, back, category_tag, has_cloze }) => ({
        front,
        back: back || undefined,
        category_tag: category_tag || undefined,
        has_cloze,
      })),
    });
  };

  const handleFileImport = () => {
    const file = importFile;
    if (!file) return toast.error('Select a file first.');
    const form = new FormData();
    form.append('file', file);
    if (importMode !== 'json') form.append('title', importTitle || file.name.replace(/\.kwek\.json$|\.\w+$/, ''));

    const urls: Record<string, string> = {
      csv:  '/teacher/flashcards/import/csv',
      json: '/teacher/flashcards/import/json',
      pdf:  '/teacher/flashcards/import/pdf',
    };
    importMutation.mutate({ url: urls[importMode], form });
  };

  const downloadCsvTemplate = () => {
    const rows = [
      'front,back,category',
      '"What is photosynthesis?","Process by which plants use sunlight to produce food",Biology',
      '"What is the capital of France?",Paris,Geography',
      '"A cloze card {{example}} blank",,General',
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'flashcard-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 3) {
      setTags((p) => [...p, t]);
      setTagInput('');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl pb-12">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/flashcards')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Deck</h1>
          <p className="text-muted-foreground">Create a flashcard deck for your class.</p>
        </div>
      </div>

      <FlashcardGuide open={guideOpen} onToggle={() => setGuideOpen((v) => !v)} />

      <Tabs value={importMode} onValueChange={(v) => { setImportMode(v as typeof importMode); setImportFile(null); setAiFile(null); }}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="manual"><FileCog className="mr-1.5 h-3.5 w-3.5" />Manual</TabsTrigger>
          <TabsTrigger value="csv"><Upload className="mr-1.5 h-3.5 w-3.5" />CSV</TabsTrigger>
          <TabsTrigger value="json"><FileText className="mr-1.5 h-3.5 w-3.5" />JSON</TabsTrigger>
          <TabsTrigger value="pdf"><FileText className="mr-1.5 h-3.5 w-3.5" />PDF</TabsTrigger>
          <TabsTrigger value="ai"><Bot className="mr-1.5 h-3.5 w-3.5" />AI</TabsTrigger>
        </TabsList>

        {/* ── Manual ── */}
        <TabsContent value="manual" className="space-y-6 mt-6">
          <DeckMetaFields
            title={title} setTitle={setTitle}
            description={description} setDescription={setDescription}
            tagInput={tagInput} setTagInput={setTagInput}
            tags={tags} setTags={setTags}
            addTag={addTag}
            isGraded={isGraded} setIsGraded={setIsGraded}
          />

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Cards ({cards.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setCards((p) => [...p, newCard()])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Card
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {cards.map((card, idx) => (
                <CardEditor key={card.key} card={card} index={idx} onChange={updateCard} onRemove={removeCard} />
              ))}
            </CardContent>
          </Card>

          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Deck
          </Button>
        </TabsContent>

        {/* ── CSV / JSON / PDF ── */}
        {(['csv', 'json', 'pdf'] as const).map((mode) => (
          <TabsContent key={mode} value={mode} className="space-y-4 mt-6">
            <ImportHint mode={mode} />
            {mode !== 'json' && (
              <div className="space-y-1">
                <Label>Deck Title</Label>
                <Input
                  placeholder="Name for this deck…"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                />
              </div>
            )}
            <DragDropZone
              accept={mode === 'csv' ? '.csv' : mode === 'json' ? '.json,.kwek.json' : '.pdf'}
              label={
                mode === 'csv'  ? '.csv — one card per row  (front, back, category)' :
                mode === 'json' ? '.json or .kwek.json — exported deck file' :
                                  '.pdf — odd lines → front, even lines → back'
              }
              file={importFile}
              onFile={setImportFile}
            />
            {mode === 'csv' && (
              <button
                type="button"
                onClick={downloadCsvTemplate}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="h-3 w-3" /> Download CSV template
              </button>
            )}
            <DeckGradedSwitch isGraded={isGraded} setIsGraded={setIsGraded} />
            <Button onClick={handleFileImport} disabled={importMutation.isPending || !importFile}>
              {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {mode === 'json' ? 'JSON / kwek' : mode.toUpperCase()}
            </Button>
          </TabsContent>
        ))}

        {/* ── AI ── */}
        <TabsContent value="ai" className="space-y-5 mt-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
              <Sparkles className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">Generate with AI</h2>
              <p className="text-sm text-muted-foreground">Describe a topic, paste notes, or drop a PDF — AI builds your deck</p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">Coming Soon</Badge>
          </div>

          <DeckMetaFields
            title={title} setTitle={setTitle}
            description={description} setDescription={setDescription}
            tagInput={tagInput} setTagInput={setTagInput}
            tags={tags} setTags={setTags}
            addTag={addTag}
            isGraded={isGraded} setIsGraded={setIsGraded}
          />

          {/* PDF drop zone */}
          <DragDropZone
            accept=".pdf,.txt"
            label="Drop a PDF — AI extracts cards from lecture slides or notes"
            file={aiFile}
            onFile={setAiFile}
          />

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span>OR PASTE TOPIC / NOTES</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-1">
            <Label>Topic or Notes</Label>
            <Textarea
              placeholder="e.g. 'The French Revolution — causes, key events, and effects' or paste your study notes here…"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              rows={5}
            />
          </div>

          <div className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>Requires an OpenAI or Gemini API key configured on the server. Contact your school admin to enable this feature.</span>
          </div>

          <Button
            onClick={() => aiMutation.mutate({ topic: aiTopic, count: 20 })}
            disabled={aiMutation.isPending || (!aiTopic.trim() && !aiFile)}
          >
            {aiMutation.isPending
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Deck with AI
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DeckMetaFields({ title, setTitle, description, setDescription, tagInput, setTagInput, tags, setTags, addTag, isGraded, setIsGraded }: any) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-1">
          <Label>Deck Name *</Label>
          <Input placeholder="e.g. Science Quarter 3" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Description</Label>
          <Textarea placeholder="Optional description…" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1">
          <Label>Tags <span className="text-xs text-muted-foreground">(max 3)</span></Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add tag…"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="h-8"
            />
            <Button size="sm" variant="outline" onClick={addTag} disabled={tags.length >= 3}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.map((t: string) => (
              <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => setTags((p: string[]) => p.filter((x) => x !== t))}>
                {t} ×
              </Badge>
            ))}
          </div>
        </div>
        <DeckGradedSwitch isGraded={isGraded} setIsGraded={setIsGraded} />
      </CardContent>
    </Card>
  );
}

function DeckGradedSwitch({ isGraded, setIsGraded }: { isGraded: boolean; setIsGraded: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <Switch id="graded" checked={isGraded} onCheckedChange={setIsGraded} />
      <Label htmlFor="graded" className="cursor-pointer">
        Graded quiz <span className="text-xs text-muted-foreground">(scores saved &amp; visible to teacher)</span>
      </Label>
    </div>
  );
}

function CardEditor({ card, index, onChange, onRemove }: {
  card: CardRow; index: number;
  onChange: (key: number, field: keyof CardRow, value: string | boolean) => void;
  onRemove: (key: number) => void;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <GripVertical className="h-4 w-4" />
          Card {index + 1}
          {card.has_cloze && <Badge variant="outline" className="text-xs ml-1">Cloze</Badge>}
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => onRemove(card.key)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Front (Question)</Label>
          <Textarea
            placeholder="What is…? Or use {{blank}} for cloze."
            value={card.front}
            onChange={(e) => onChange(card.key, 'front', e.target.value)}
            rows={2}
            className="text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Back (Answer)</Label>
          <Textarea
            placeholder="Answer…"
            value={card.back}
            onChange={(e) => onChange(card.key, 'back', e.target.value)}
            rows={2}
            className="text-sm"
          />
        </div>
      </div>
      <div>
        <Input
          placeholder="Category tag (optional)"
          value={card.category_tag}
          onChange={(e) => onChange(card.key, 'category_tag', e.target.value)}
          className="h-7 text-xs"
        />
      </div>
    </div>
  );
}

// ── DragDropZone ─────────────────────────────────────────────────────────────

function DragDropZone({
  accept, label, file, onFile,
}: {
  accept: string;
  label: string;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); };
  const handleDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  };

  return (
    <div
      role="button" tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer select-none transition-colors',
        dragging ? 'border-primary bg-primary/5'
          : file  ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                  : 'border-border hover:border-primary/50 hover:bg-muted/20',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <>
          <FileText className="h-7 w-7 text-green-600 dark:text-green-400" />
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-300">{file.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024).toFixed(0)} KB · click to change</p>
          </div>
        </>
      ) : (
        <>
          <Upload className="h-7 w-7 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Drag &amp; drop or click to upload</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        </>
      )}
    </div>
  );
}

function ImportHint({ mode }: { mode: string }) {
  const hints: Record<string, string> = {
    csv:  'CSV format: front, back, category (one card per row, first row can be a header). Download the template below.',
    json: 'Supports svhs-flashcard-v1 (exported from this system) and kwek format (.kwek.json from kwek.cards).',
    pdf:  'Text is extracted from the PDF. Odd lines become the front, even lines the back.',
  };
  return (
    <div className="rounded-md border p-3 text-sm text-muted-foreground">
      {hints[mode]}
    </div>
  );
}

// ── Deck Creation Guide ───────────────────────────────────────────────────────

function FlashcardGuide({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const cardTypes: { title: string; desc: string; front: string; back: string }[] = [
    {
      title: 'Q&A (Basic)',
      desc: 'The most common type. Write a question on the front and the answer on the back.',
      front: 'What is the powerhouse of the cell?',
      back: 'Mitochondria',
    },
    {
      title: 'Multiple Choice',
      desc: 'List choices (A–D) on the front. Mark the correct answer and a brief explanation on the back.',
      front: 'Which planet is called the Red Planet?\nA. Venus  B. Mars  C. Jupiter  D. Saturn',
      back: 'B. Mars — its surface is covered in iron oxide (rust).',
    },
    {
      title: 'True / False',
      desc: 'State a claim on the front. The back holds the verdict and a short reason.',
      front: 'The Great Wall of China is visible from space with the naked eye. True or False?',
      back: 'False — it is too narrow to be seen from orbit.',
    },
    {
      title: 'Cloze (Fill-in-the-Blank)',
      desc: 'Wrap the missing word in {{ double braces }}. The system auto-tags the card as Cloze.',
      front: 'Photosynthesis takes place in the {{chloroplast}} of a plant cell.',
      back: 'chloroplast',
    },
    {
      title: 'Definition / Vocabulary',
      desc: 'Put the term on the front, definition on the back. Great for science, Filipino, or history.',
      front: 'Osmosis',
      back: 'Movement of water through a semi-permeable membrane from high to low concentration.',
    },
    {
      title: 'Enumeration / List',
      desc: 'Ask students to recall a set of items. Use a numbered list on the back.',
      front: 'Name the 3 branches of the Philippine government.',
      back: '1. Executive  2. Legislative  3. Judicial',
    },
  ];

  const tips: { heading: string; body: string }[] = [
    { heading: 'One idea per card', body: 'Keep each card focused on a single concept. Avoid cramming multiple facts into one card.' },
    { heading: 'Use category tags', body: 'Group related cards with the same tag (e.g. "Chapter 3", "Vocabulary") so students can filter by topic during review.' },
    { heading: 'Graded vs. Study mode', body: 'Mark a deck Graded only for formal quizzes. Leave it ungraded for everyday self-study so students practice without score pressure.' },
    { heading: 'Mix card types', body: 'Combining Q&A, True/False, and Cloze cards in the same deck tests different recall skills and keeps students engaged.' },
    { heading: 'Keep answers concise', body: 'Short, scannable answers are retained more easily. Move lengthy explanations to the deck description, not the card back.' },
    { heading: 'Bulk entry via CSV', body: 'Build your cards in Google Sheets (Question → column A, Answer → column B, Tag → column C), then File → Download → CSV and import it here.' },
    { heading: 'Add at least 10 cards', body: 'Decks with fewer than 10 cards offer limited review benefit. Aim for 10–30 cards per topic or chapter.' },
  ];

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-blue-800 dark:text-blue-200"
        onClick={onToggle}
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Deck Creation Guide — Card types, import formats &amp; best practices
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="border-t border-blue-200 dark:border-blue-800 px-4 py-5 space-y-7 text-sm">

          {/* Overview */}
          <section className="space-y-1.5">
            <h2 className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100">
              <Info className="h-4 w-4 shrink-0" /> How the deck builder works
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              A deck is made of <strong>cards</strong>. Each card has a <strong>Front</strong> (question / prompt) and a <strong>Back</strong> (answer / explanation). Students flip through cards in study mode. If the deck is marked <em>Graded</em>, scores are saved and visible to you.
            </p>
          </section>

          {/* Card types */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> Card types &amp; how to write them
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {cardTypes.map((ct) => (
                <div
                  key={ct.title}
                  className="rounded-md border border-blue-200 dark:border-blue-700 bg-white dark:bg-blue-900/60 p-3 space-y-2"
                >
                  <p className="font-semibold text-blue-900 dark:text-blue-100">{ct.title}</p>
                  <p className="text-xs text-muted-foreground">{ct.desc}</p>
                  <div className="rounded bg-muted p-2 text-xs font-mono whitespace-pre-wrap leading-snug">
                    <span className="text-blue-600 dark:text-blue-300 not-italic font-semibold">Front: </span>{ct.front}{'\n'}
                    <span className="text-green-700 dark:text-green-400 not-italic font-semibold">Back:  </span>{ct.back}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Import formats */}
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100">
              <Upload className="h-4 w-4 shrink-0" /> Import methods
            </h2>
            <div className="overflow-x-auto rounded-md border border-blue-200 dark:border-blue-700">
              <table className="w-full text-xs">
                <thead className="bg-blue-100 dark:bg-blue-900/50">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-semibold text-blue-900 dark:text-blue-200">Method</th>
                    <th className="px-3 py-2 font-semibold text-blue-900 dark:text-blue-200">Best for</th>
                    <th className="px-3 py-2 font-semibold text-blue-900 dark:text-blue-200">Format</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100 dark:divide-blue-800">
                  {[
                    { method: 'CSV', best: 'Bulk entry via spreadsheet (Excel / Google Sheets)', fmt: 'front, back, category_tag — one row per card' },
                    { method: 'JSON / kwek', best: 'Re-importing an exported deck — native or kwek app', fmt: 'svhs-flashcard-v1 or kwekVersion:1 (.kwek.json)' },
                    { method: 'PDF', best: 'Converting a reviewer PDF into cards automatically', fmt: 'Odd lines → Front, Even lines → Back' },
                    { method: 'AI', best: 'Generating cards from a topic or pasted notes', fmt: 'Requires server API key — see your admin' },
                  ].map((row) => (
                    <tr key={row.method} className="bg-white dark:bg-blue-900/30">
                      <td className="px-3 py-2 font-medium text-blue-900 dark:text-blue-100">{row.method}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.best}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{row.fmt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              CSV tip: In Google Sheets put questions in column A, answers in B, optional tag in C, then <em>File → Download → Comma Separated Values (.csv)</em>.
            </p>
          </section>

          {/* Tips */}
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100">
              <Lightbulb className="h-4 w-4 shrink-0" /> Tips for effective flashcard decks
            </h2>
            <ul className="space-y-2">
              {tips.map((tip) => (
                <li key={tip.heading} className="flex gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-muted-foreground">
                    <strong className="text-blue-900 dark:text-blue-200">{tip.heading}:&nbsp;</strong>
                    {tip.body}
                  </span>
                </li>
              ))}
            </ul>
          </section>

        </div>
      )}
    </div>
  );
}
