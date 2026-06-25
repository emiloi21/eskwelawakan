import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface LookupData {
  school_years: string[];
  active_school_year: string | null;
  active_semester: string | null;
}

export function useLookups() {
  return useQuery<LookupData>({
    queryKey: ['lookups'],
    queryFn: async () => {
      const { data } = await api.get('/lookups');
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
