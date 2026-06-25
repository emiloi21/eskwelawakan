import { create } from 'zustand';
import type { User } from '@/types';
import api from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  filterBySem: boolean;
  // Impersonation state
  isImpersonating: boolean;
  originalUser: User | null;
  impersonatedRole: string | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setUser: (user: User) => void;
  setFilterBySem: (value: boolean) => void;
  startImpersonation: (targetUser: User, role?: string) => void;
  stopImpersonation: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isLoading: false,
  filterBySem: false,
  isImpersonating: localStorage.getItem('isImpersonating') === 'true',
  originalUser: JSON.parse(localStorage.getItem('originalUser') || 'null'),
  impersonatedRole: localStorage.getItem('impersonatedRole'),

  login: async (username: string, password: string) => {
    // Always start fresh — clear any stale impersonation state so the login
    // request never carries an X-Impersonate-User-Id header.
    localStorage.removeItem('isImpersonating');
    localStorage.removeItem('originalUser');
    localStorage.removeItem('impersonatedRole');
    set({ isImpersonating: false, originalUser: null, impersonatedRole: null });

    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });
      return data.user as User;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('isImpersonating');
      localStorage.removeItem('originalUser');
      localStorage.removeItem('impersonatedRole');
      set({ user: null, token: null, isImpersonating: false, originalUser: null, impersonatedRole: null });
    }
  },

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, isLoading: false });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null, isLoading: false });
    }
  },

  setUser: (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  setFilterBySem: (value: boolean) => set({ filterBySem: value }),

  startImpersonation: (targetUser: User, role?: string) => {
    const { user } = get();
    const effectiveAccess = (role ?? targetUser.access) as User['access'];
    const impersonatedUser: User = { ...targetUser, access: effectiveAccess };
    localStorage.setItem('isImpersonating', 'true');
    localStorage.setItem('originalUser', JSON.stringify(user));
    localStorage.setItem('impersonatedRole', effectiveAccess);
    localStorage.setItem('user', JSON.stringify(impersonatedUser));
    set({
      isImpersonating: true,
      originalUser: user,
      user: impersonatedUser,
      impersonatedRole: effectiveAccess,
    });
  },

  stopImpersonation: () => {
    const { originalUser } = get();
    if (originalUser) {
      localStorage.setItem('user', JSON.stringify(originalUser));
    }
    localStorage.removeItem('isImpersonating');
    localStorage.removeItem('originalUser');
    localStorage.removeItem('impersonatedRole');
    set({
      isImpersonating: false,
      user: originalUser,
      originalUser: null,
      impersonatedRole: null,
    });
  },
}));
