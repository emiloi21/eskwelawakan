import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { getHomePathForRole, hasAnyRole, getLoginPathForRole } from '@/lib/role-utils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, token } = useAuthStore();
  const location = useLocation();

  if (!token || !user) {
    // Portal users go to /portal-login; staff users go to /login
    const loginPath = user ? getLoginPathForRole(user.access) : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (roles && !hasAnyRole(user, roles)) {
    // Redirect to the user's primary module instead of a dead-end 403
    const homePath = getHomePathForRole(user.access);
    if (location.pathname !== homePath) {
      return <Navigate to={homePath} replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
