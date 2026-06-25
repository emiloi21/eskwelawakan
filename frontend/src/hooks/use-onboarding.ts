import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import api from '@/lib/api';

export type OnboardingStep = {
  key: string;
  label: string;
  description: string;
  done: boolean;
  action_url: string;
  blocking: string[];  // module keys that are blocked until this step is done
};

export type OnboardingStatus = {
  done_count: number;
  total_count: number;
  complete: boolean;
  blocked_modules: string[];  // e.g. ['accounting', 'registrar']
  steps: OnboardingStep[];
};

/**
 * Fetch onboarding/prerequisite status from the API.
 * Only runs for Administrator role — other roles get null.
 */
export function useOnboarding() {
  const { user } = useAuthStore();
  const isAdmin = user?.access === 'Administrator';

  return useQuery<OnboardingStatus>({
    queryKey: ['onboarding-status'],
    queryFn: () => api.get('/admin/onboarding-status').then(r => r.data),
    enabled: isAdmin,
    staleTime: 1000 * 60 * 2,  // re-check every 2 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Returns true if the given module key is blocked (setup incomplete).
 * Always returns false for non-admin users (they access via role guard).
 */
export function useModuleBlocked(moduleKey: string): boolean {
  const { data } = useOnboarding();
  if (!data) return false;
  return data.blocked_modules.includes(moduleKey);
}
