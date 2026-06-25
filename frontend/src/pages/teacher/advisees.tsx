import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useLookups } from '@/hooks/use-lookups';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, Users } from 'lucide-react';

interface AdviseeRow {
  reg_id: number;
  student_id: string;
  lname: string;
  fname: string;
  mname: string;
  suffix: string;
  sex: string;
  gradeLevel: string;
  strand: string;
  section: string;
  class_id: number;
  status: string;
}

export default function AdviseesPage() {
  const { user } = useAuthStore();
  const { data: lookups } = useLookups();
  const sy = user?.selected_sy || lookups?.active_school_year || '';
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<{ data: AdviseeRow[] }>({
    queryKey: ['teacher-advisees', sy],
    queryFn: async () => {
      const { data } = await api.get('/teacher/advisees', { params: { schoolYear: sy } });
      return data;
    },
  });

  const advisees = data?.data ?? [];

  const filtered = search.trim()
    ? advisees.filter((s) => {
        const q = search.toLowerCase();
        return (
          s.lname.toLowerCase().includes(q) ||
          s.fname.toLowerCase().includes(q) ||
          s.student_id.toLowerCase().includes(q) ||
          s.gradeLevel.toLowerCase().includes(q) ||
          s.section.toLowerCase().includes(q)
        );
      })
    : advisees;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Advisees</h1>
          <p className="text-muted-foreground">Students in your advisory classes for {sy}</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Users className="mr-1 h-3.5 w-3.5" />
          {advisees.length} students
        </Badge>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, ID, grade…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-8">
          {search ? 'No students match your search.' : `No advisees found for ${sy}.`}
        </p>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Student ID</th>
                  <th className="pb-2">Grade / Section</th>
                  <th className="pb-2">Sex</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.reg_id} className="border-b hover:bg-muted/30">
                    <td className="py-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 font-medium">
                      {s.lname}, {s.fname}{s.mname ? ' ' + s.mname[0] + '.' : ''}
                      {s.suffix ? ` ${s.suffix}` : ''}
                    </td>
                    <td className="py-2 font-mono text-xs">{s.student_id}</td>
                    <td className="py-2">
                      {s.gradeLevel}
                      {s.strand && s.strand !== '-' ? ` — ${s.strand}` : ''} · {s.section}
                    </td>
                    <td className="py-2">{s.sex}</td>
                    <td className="py-2">
                      <Badge variant={s.status === 'Enrolled' ? 'default' : 'secondary'} className="text-xs">
                        {s.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
