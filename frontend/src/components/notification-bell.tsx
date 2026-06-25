import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, BellDot, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import type { AppNotification, NotificationsResponse } from '@/types';

const TYPE_COLORS: Record<string, string> = {
  enrollment_status: 'bg-blue-500',
  grade_posted:      'bg-green-500',
  payment_due:       'bg-amber-500',
};

/** Simple relative-time formatter â€” no extra dependency needed */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data;
    },
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = data?.unread_count ?? 0;
  const notifications = data?.data ?? [];

  function handleClick(n: AppNotification) {
    if (!n.read_at) markReadMutation.mutate(n.id);
    if (n.data.url) navigate(n.data.url as string);
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'relative inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium',
          'ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
        aria-label="Notifications"
      >
        {unread > 0 ? (
          <>
            <BellDot className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          </>
        ) : (
          <Bell className="h-4 w-4" />
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              disabled={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              {markAllMutation.isPending
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <CheckCheck className="h-3 w-3" />
              }
              Mark all read
            </Button>
          )}
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <div className="divide-y">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                    !n.read_at && 'bg-muted/30',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      n.read_at ? 'bg-muted-foreground/30' : (TYPE_COLORS[n.data.type] ?? 'bg-primary'),
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{n.data.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.data.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                  {!n.read_at && (
                    <Badge variant="secondary" className="mt-0.5 shrink-0 px-1.5 py-0 text-[10px]">
                      New
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
