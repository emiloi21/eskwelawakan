import { useQuery } from '@tanstack/react-query';
import type { SchoolInfo } from '@/types';

async function fetchSchoolInfo(): Promise<SchoolInfo | null> {
  const res = await fetch('/api/school-info');
  const json = await res.json();
  return json.data;
}

export function useSchoolInfo() {
  return useQuery<SchoolInfo | null>({
    queryKey: ['school-info'],
    queryFn: fetchSchoolInfo,
    staleTime: 5 * 60 * 1000, // cache 5 minutes
  });
}
