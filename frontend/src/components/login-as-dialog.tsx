import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import api from '@/lib/api';
import type { User } from '@/types';
import { getAllRoles, getHomePathForRole } from '@/lib/role-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Access types that are NOT staff (used for the initial "staff overview" load)
const NON_STAFF_ACCESS = 'Student,Parent,Teacher,Applicant';

interface LoginAsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_COLORS: Record<string, string> = {
  Administrator: 'bg-red-100 text-red-700 border-red-200',
  Registrar: 'bg-blue-100 text-blue-700 border-blue-200',
  Encoder: 'bg-sky-100 text-sky-700 border-sky-200',
  'Accounting Staff': 'bg-green-100 text-green-700 border-green-200',
  Cashier: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Teacher: 'bg-purple-100 text-purple-700 border-purple-200',
  Student: 'bg-orange-100 text-orange-700 border-orange-200',
  Parent: 'bg-pink-100 text-pink-700 border-pink-200',
  HR: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Custodian: 'bg-teal-100 text-teal-700 border-teal-200',
};

export function LoginAsDialog({ open, onOpenChange }: LoginAsDialogProps) {
  const { user: currentUser, startImpersonation } = useAuthStore();
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(
    (search: string) => {
      setLoading(true);
      const params: Record<string, string> = { status: 'Active', per_page: '50' };
      if (search.trim()) {
        params.search = search.trim();
      } else {
        // No query: show only staff accounts (exclude Student/Parent/Teacher/Applicant)
        params.access_not_in = NON_STAFF_ACCESS;
        params.per_page = '200';
      }
      api
        .get('/admin/users', { params })
        .then((r) => {
          const data: User[] = r.data?.data ?? r.data ?? [];
          setUsers(data.filter((u) => u.id !== currentUser?.id));
        })
        .catch(() => setUsers([]))
        .finally(() => setLoading(false));
    },
    [currentUser?.id],
  );

  // Load staff users when dialog opens
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelectedUser(null);
    fetchUsers('');
  }, [open, fetchUsers]);

  // Auto-focus search input
  useEffect(() => {
    if (open && !selectedUser) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, selectedUser]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(value), 300);
  };

  const handleSelectUser = (u: User) => {
    const roles = getAllRoles(u).filter((r) => r !== 'Administrator');
    if (roles.length > 1) {
      // Multi-role: show role picker
      setSelectedUser(u);
    } else {
      // Single role: impersonate directly
      impersonate(u, roles[0] ?? u.access);
    }
  };

  const impersonate = (u: User, role: string) => {
    startImpersonation(u, role);
    onOpenChange(false);
    navigate(getHomePathForRole(role));
  };

  const initials = (u: User) => {
    if (u.fname || u.lname) {
      return `${u.fname?.[0] ?? ''}${u.lname?.[0] ?? ''}`.toUpperCase() || '?';
    }
    const parts = (u.name ?? '').split(' ');
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || '?';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          {selectedUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded p-1 hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <DialogTitle className="text-base">Select Role for {selectedUser.fname}</DialogTitle>
            </div>
          ) : (
            <DialogTitle className="text-base">Login As — Select a User</DialogTitle>
          )}
        </DialogHeader>

        {!selectedUser ? (
          <>
            {/* Search */}
            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search by name, username, or role…"
                  className="pl-9"
                />
              </div>
            </div>

            {/* User list */}
            <div className="overflow-y-auto max-h-80 border-t">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              )}
              {!loading && users.length === 0 && (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  {query.trim() ? 'No users found' : 'No staff accounts found'}
                </div>
              )}
              {!loading &&
                users.map((u) => {
                  const roles = getAllRoles(u).filter((r) => r !== 'Administrator');
                  const isMultiRole = roles.length > 1;
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left',
                        'hover:bg-accent transition-colors',
                        'border-b border-border/50 last:border-0',
                      )}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs">{initials(u)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.name ?? u.full_name}</p>
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs px-1.5 py-0',
                            ROLE_COLORS[u.access] ?? '',
                          )}
                        >
                          {u.access}
                        </Badge>
                        {isMultiRole && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </>
        ) : (
          /* Role picker for multi-role users */
          <div className="overflow-y-auto max-h-80 border-t">
            <div className="px-4 py-3 text-xs text-muted-foreground border-b">
              {selectedUser.full_name} has multiple roles. Choose which access to load:
            </div>
            {getAllRoles(selectedUser)
              .filter((r) => r !== 'Administrator')
              .map((role) => (
                <button
                  key={role}
                  onClick={() => impersonate(selectedUser, role)}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-3 text-left',
                    'hover:bg-accent transition-colors border-b border-border/50 last:border-0',
                  )}
                >
                  <span className="text-sm font-medium">{role}</span>
                  <Badge
                    variant="outline"
                    className={cn('text-xs px-1.5 py-0', ROLE_COLORS[role] ?? '')}
                  >
                    {getHomePathForRole(role)}
                  </Badge>
                </button>
              ))}
          </div>
        )}

        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          Your admin session is preserved. Click the banner to return.
        </div>
      </DialogContent>
    </Dialog>
  );
}
