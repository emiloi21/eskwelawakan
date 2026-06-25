import { useAuthStore } from '@/stores/auth-store';
import { useNavigate } from 'react-router-dom';
import { getHomePathForRole } from '@/lib/role-utils';
import { ArrowRight, X } from 'lucide-react';

export function ImpersonationBanner() {
  const { isImpersonating, user, originalUser, impersonatedRole, stopImpersonation } = useAuthStore();
  const navigate = useNavigate();

  if (!isImpersonating || !originalUser) return null;

  const displayName =
    user?.full_name ||
    [user?.fname, user?.lname].filter(Boolean).join(' ') ||
    'Unknown User';
  const roleLabel = impersonatedRole ?? user?.access ?? '';

  const handleStop = () => {
    stopImpersonation();
    const adminHome = getHomePathForRole(originalUser.access);
    navigate(adminHome);
  };

  return (
    <div
      className="sticky top-0 z-[100] flex items-center justify-between gap-2 bg-amber-500 px-4 py-2 text-amber-950 text-sm font-medium shadow-sm"
      role="alert"
    >
      <span className="flex items-center gap-1.5">
        <span className="opacity-75">Viewing as</span>
        <strong>{displayName}</strong>
        {roleLabel && (
          <span className="rounded-full border border-amber-700/40 bg-amber-400/50 px-2 py-0.5 text-xs">
            {roleLabel}
          </span>
        )}
      </span>
      <button
        onClick={handleStop}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors hover:bg-amber-600/30 active:bg-amber-700/30"
      >
        Back to {originalUser.full_name}
        <ArrowRight className="h-3.5 w-3.5" />
        <X className="h-3.5 w-3.5 ml-0.5 opacity-60" />
      </button>
    </div>
  );
}
