import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, MessageSquare, ArrowLeft, Pin, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface DiscussionAuthor {
  id: number;
  fname: string;
  lname: string;
}

interface DiscussionReply {
  id: number;
  public_id: string;
  user_id: number;
  body: string;
  created_at: string;
  author: DiscussionAuthor;
}

interface DiscussionRow {
  id: number;
  public_id: string;
  user_id: number;
  title: string;
  body: string;
  is_pinned: boolean;
  replies_count: number;
  created_at: string;
  updated_at: string;
  author: DiscussionAuthor;
}

export default function StudentDiscussionsPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [view, setView] = useState<DiscussionRow | null>(null);
  const [replyBody, setReplyBody] = useState('');

  const { data, isLoading } = useQuery<{ data: DiscussionRow[] }>({
    queryKey: ['student-discussions'],
    queryFn: async () => {
      const { data } = await api.get('/student/discussions');
      return data;
    },
  });

  const { data: detail, isLoading: detailLoading } = useQuery<{ discussion: DiscussionRow; replies: DiscussionReply[] }>({
    queryKey: ['student-discussion-detail', view?.public_id],
    queryFn: async () => {
      const { data } = await api.get(`/student/discussions/${view!.public_id}`);
      return data;
    },
    enabled: !!view,
  });

  const storeReplyMutation = useMutation({
    mutationFn: async () => {
      if (!view) return;
      await api.post(`/student/discussions/${view.public_id}/replies`, { body: replyBody });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-discussion-detail', view?.public_id] });
      qc.invalidateQueries({ queryKey: ['student-discussions'] });
      setReplyBody('');
      toast.success('Reply posted.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to post reply.'),
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (replyPublicId: string) => {
      if (!view) return;
      await api.delete(`/student/discussions/${view.public_id}/replies/${replyPublicId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-discussion-detail', view?.public_id] });
      qc.invalidateQueries({ queryKey: ['student-discussions'] });
      toast.success('Reply deleted.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete reply.'),
  });

  const discussions = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading discussions…
      </div>
    );
  }

  // ── Thread detail view ──────────────────────────────────────────────────────
  if (view) {
    const replies = detail?.replies ?? [];
    const discussion = detail?.discussion ?? view;

    return (
      <div className="space-y-5 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView(null)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </div>

        {/* Opening post */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start gap-2">
              {discussion.is_pinned && <Pin className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base leading-snug">{discussion.title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {discussion.author.fname} {discussion.author.lname} · {new Date(discussion.created_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{discussion.body}</p>
          </CardContent>
        </Card>

        {/* Replies */}
        {detailLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading replies…</div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
            </p>
            {replies.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No replies yet.</p>
            )}
            {replies.map((r) => (
              <Card key={r.id} className="border-muted">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">
                        {r.author.fname} {r.author.lname}
                        {r.user_id === user?.id && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">You</Badge>}
                        {' · '}{new Date(r.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                    </div>
                    {r.user_id === user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm('Delete your reply?')) deleteReplyMutation.mutate(r.public_id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Reply form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Add Reply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Share your thoughts…"
              rows={3}
              maxLength={10000}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => storeReplyMutation.mutate()}
                disabled={storeReplyMutation.isPending || !replyBody.trim()}
              >
                {storeReplyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Post Reply
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Discussions</h1>
        <p className="text-muted-foreground">Class discussion board</p>
      </div>

      {discussions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <MessageSquare className="h-10 w-10" />
          <p className="text-sm">No discussions yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {discussions.map((d) => (
            <Card
              key={d.id}
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => { setView(d); setReplyBody(''); }}
            >
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <MessageSquare className={`h-5 w-5 shrink-0 ${d.is_pinned ? 'text-amber-500' : 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {d.is_pinned && <Pin className="h-3 w-3 text-amber-500 shrink-0" />}
                    <p className="font-medium text-sm truncate">{d.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {d.author.fname} {d.author.lname} · {d.replies_count} {d.replies_count === 1 ? 'reply' : 'replies'} · {new Date(d.updated_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
