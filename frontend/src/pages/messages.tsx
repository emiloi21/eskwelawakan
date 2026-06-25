import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Inbox,
  Send,
  PenLine,
  Trash2,
  Mail,
  MailOpen,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, MessagesResponse, MessageContact } from '@/types';
import { toast } from 'sonner';

type Tab = 'inbox' | 'sent';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ── Compose Dialog ────────────────────────────────────────────────────────────
interface ComposeProps {
  open: boolean;
  onClose: () => void;
  replyTo?: Message | null;
}

function ComposeDialog({ open, onClose, replyTo }: ComposeProps) {
  const queryClient = useQueryClient();
  const [recipientId, setRecipientId] = useState<string>(
    replyTo ? String(replyTo.sender_id) : ''
  );
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : '');
  const [body, setBody] = useState('');

  const { data: contacts = [], isLoading: loadingContacts } = useQuery<MessageContact[]>({
    queryKey: ['message-contacts'],
    queryFn: async () => {
      const { data } = await api.get('/messages/contacts');
      return data;
    },
    enabled: open,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      await api.post('/messages', {
        recipient_id: Number(recipientId),
        subject,
        body,
      });
    },
    onSuccess: () => {
      toast.success('Message sent!');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setRecipientId('');
      setSubject('');
      setBody('');
      onClose();
    },
    onError: () => toast.error('Failed to send message.'),
  });

  const handleSend = () => {
    if (!recipientId || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all fields.');
      return;
    }
    sendMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{replyTo ? 'Reply' : 'New Message'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* To */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">To</label>
            {loadingContacts ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading contacts…
              </div>
            ) : (
                <Select value={recipientId} onValueChange={(v) => setRecipientId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient…" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                      <span className="ml-2 text-xs text-muted-foreground">({c.role})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Subject</label>
            <Input
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={255}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              placeholder="Write your message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              maxLength={5000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sendMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sendMutation.isPending}>
            {sendMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Message Detail Panel ──────────────────────────────────────────────────────
interface DetailProps {
  message: Message;
  tab: Tab;
  onBack: () => void;
  onReply: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function MessageDetail({ message, tab, onBack, onReply, onDelete, isDeleting }: DetailProps) {
  const other = tab === 'inbox' ? message.sender : message.recipient;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{message.subject}</h2>
          <p className="text-xs text-muted-foreground">
            {tab === 'inbox' ? 'From' : 'To'}:{' '}
            <span className="font-medium">{other?.name ?? `User #${tab === 'inbox' ? message.sender_id : message.recipient_id}`}</span>
            {other?.role && <span className="ml-1 text-muted-foreground">({other.role})</span>}
            <span className="ml-2">{new Date(message.created_at).toLocaleString()}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {tab === 'inbox' && (
            <Button size="sm" variant="outline" onClick={onReply}>
              Reply
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
      </ScrollArea>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('inbox');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // List query (inbox or sent)
  const listKey = ['messages', tab, page];
  const { data: list, isLoading: listLoading } = useQuery<MessagesResponse>({
    queryKey: listKey,
    queryFn: async () => {
      const { data } = await api.get(`/messages/${tab}`, { params: { page } });
      return data;
    },
  });

  // Detail query
  const { data: detail, isLoading: detailLoading } = useQuery<Message>({
    queryKey: ['messages', 'detail', selectedId],
    queryFn: async () => {
      const { data } = await api.get(`/messages/${selectedId}`);
      return data;
    },
    enabled: selectedId !== null,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/messages/${id}`);
    },
    onSuccess: () => {
      toast.success('Message deleted.');
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ['messages', tab] });
    },
    onError: () => toast.error('Failed to delete message.'),
  });

  const handleSelect = (id: number) => {
    setSelectedId(id);
  };

  const handleReply = () => {
    if (detail) {
      setReplyTo(detail);
      setComposeOpen(true);
    }
  };

  const handleComposeClose = () => {
    setComposeOpen(false);
    setReplyTo(null);
  };

  const filteredMessages = (list?.data ?? []).filter((m) =>
    search
      ? m.subject.toLowerCase().includes(search.toLowerCase()) ||
        (tab === 'inbox'
          ? m.sender?.name?.toLowerCase().includes(search.toLowerCase())
          : m.recipient?.name?.toLowerCase().includes(search.toLowerCase()))
      : true
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-muted-foreground">Send and receive messages</p>
        </div>
        <Button onClick={() => { setReplyTo(null); setComposeOpen(true); }}>
          <PenLine className="mr-2 h-4 w-4" />
          Compose
        </Button>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 min-h-[60vh]">
        {/* Left panel — list */}
        <Card className="flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => { setTab('inbox'); setPage(1); setSelectedId(null); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors',
                tab === 'inbox'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Inbox className="h-4 w-4" />
              Inbox
              {(list?.unread_count ?? 0) > 0 && tab === 'inbox' && (
                <Badge variant="destructive" className="h-4 px-1 text-xs">
                  {list!.unread_count}
                </Badge>
              )}
            </button>
            <button
              onClick={() => { setTab('sent'); setPage(1); setSelectedId(null); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors',
                tab === 'sent'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Send className="h-4 w-4" />
              Sent
            </button>
          </div>

          {/* Search */}
          <div className="border-b px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-7 h-8"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Message list */}
          <ScrollArea className="flex-1">
            {listLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <MailOpen className="h-8 w-8" />
                <p className="text-sm">No messages</p>
              </div>
            ) : (
              filteredMessages.map((m, i) => {
                const isUnread = tab === 'inbox' && !m.read_at;
                const other = tab === 'inbox' ? m.sender : m.recipient;
                return (
                  <div key={m.id}>
                    <button
                      onClick={() => handleSelect(m.id)}
                      className={cn(
                        'w-full text-left px-4 py-3 transition-colors hover:bg-muted/50',
                        selectedId === m.id && 'bg-muted',
                        isUnread && 'bg-blue-50 dark:bg-blue-950/20'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isUnread ? (
                            <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          ) : (
                            <MailOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className={cn('text-sm truncate', isUnread && 'font-semibold')}>
                            {other?.name ?? (tab === 'inbox' ? `#${m.sender_id}` : `#${m.recipient_id}`)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {relativeTime(m.created_at)}
                        </span>
                      </div>
                      <p className={cn('text-sm truncate mt-0.5', isUnread ? 'font-medium' : 'text-muted-foreground')}>
                        {m.subject}
                      </p>
                    </button>
                    {i < filteredMessages.length - 1 && <Separator />}
                  </div>
                );
              })
            )}
          </ScrollArea>

          {/* Pagination */}
          {list && list.meta.last_page > 1 && (
            <div className="flex items-center justify-between border-t px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {page} / {list.meta.last_page}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === list.meta.last_page}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>

        {/* Right panel — detail */}
        <Card className={cn('overflow-hidden', !selectedId && 'hidden md:flex md:flex-col')}>
          {selectedId === null ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <MailOpen className="h-10 w-10" />
              <p>Select a message to read</p>
            </div>
          ) : detailLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <MessageDetail
              message={detail}
              tab={tab}
              onBack={() => setSelectedId(null)}
              onReply={handleReply}
              onDelete={() => deleteMutation.mutate(detail.id)}
              isDeleting={deleteMutation.isPending}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <p>Message not found.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Compose dialog */}
      <ComposeDialog open={composeOpen} onClose={handleComposeClose} replyTo={replyTo} />
    </div>
  );
}
