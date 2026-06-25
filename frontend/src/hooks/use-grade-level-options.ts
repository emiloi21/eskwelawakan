import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { ClassSection, PaginatedResponse } from '@/types';
import { GRADE_LEVELS_BY_DEPT } from '@/lib/constants';

const REGISTRAR_ROLES = ['Administrator', 'Registrar', 'Encoder'];

/**
 * Returns grade levels grouped by department.
 * For Senior High School, dynamically derives options from encoded classes
 * (distinct gradeLevel + strand combos), falling back to the static list.
 * Only fetches from the API if the current user has registrar-level access.
 */
export function useGradeLevelOptions(schoolYear?: string) {
  const { user } = useAuthStore();
  const hasRegistrarAccess = user ? REGISTRAR_ROLES.includes(user.access) : false;

  const { data: classesData } = useQuery<PaginatedResponse<ClassSection>>({
    queryKey: ['shs-class-grade-options', schoolYear],
    queryFn: async () => {
      const params = new URLSearchParams({ dept: 'Senior High School', per_page: '500' });
      if (schoolYear) params.set('schoolYear', schoolYear);
      const { data } = await api.get(`/registrar/classes?${params}`);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: hasRegistrarAccess,
  });

  const shsGrades = new Set<string>();
  (classesData?.data ?? []).forEach((c) => {
    const label =
      c.strand && c.strand !== 'N/A'
        ? `${c.gradeLevel} - ${c.strand}`
        : c.gradeLevel;
    shsGrades.add(label);
  });

  const sorted = Array.from(shsGrades).sort();

  return {
    ...GRADE_LEVELS_BY_DEPT,
    'Senior High School':
      sorted.length > 0 ? sorted : GRADE_LEVELS_BY_DEPT['Senior High School'],
  } as Record<string, readonly string[]>;
}
