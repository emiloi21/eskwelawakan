import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface GradeRow {
  grade_id: number;
  subject: string;
  semester: string;
  school_year: string;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  final_grade: number | null;
  remarks: string | null;
}

const SCHOOL_YEARS = ['2024-2025', '2025-2026', '2026-2027'];

function gradeColor(grade: number | null) {
  if (grade === null) return 'secondary';
  if (grade >= 90) return 'default';
  if (grade >= 75) return 'outline';
  return 'destructive';
}

function fmt(v: number | null) {
  if (v === null || v === undefined) return '—';
  return Number(v).toFixed(2);
}

export default function StudentGradesPage() {
  const [schoolYear, setSchoolYear] = useState(SCHOOL_YEARS[1]);

  const { data, isLoading } = useQuery<{ data: GradeRow[] }>({
    queryKey: ['student-grades', schoolYear],
    queryFn: async () => {
      const { data } = await api.get('/student/grades', { params: { schoolYear } });
      return data;
    },
  });

  const rows = data?.data ?? [];

  const bySemester = rows.reduce<Record<string, GradeRow[]>>((acc, row) => {
    const key = row.semester;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Grades</h1>
          <p className="text-muted-foreground">Academic performance per subject and quarter</p>
        </div>
        <Select value={schoolYear} onValueChange={(v) => setSchoolYear(v ?? schoolYear)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCHOOL_YEARS.map(sy => (
              <SelectItem key={sy} value={sy}>{sy}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-8">No grade records found for {schoolYear}.</p>
      ) : (
        Object.entries(bySemester).map(([semester, semRows]) => (
          <Card key={semester}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {semester}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-2 text-left font-medium">Subject</th>
                      <th className="px-4 py-2 text-center font-medium">Q1</th>
                      <th className="px-4 py-2 text-center font-medium">Q2</th>
                      <th className="px-4 py-2 text-center font-medium">Q3</th>
                      <th className="px-4 py-2 text-center font-medium">Q4</th>
                      <th className="px-4 py-2 text-center font-medium">Final</th>
                      <th className="px-4 py-2 text-center font-medium">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semRows.map(row => (
                      <tr key={row.grade_id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium">{row.subject}</td>
                        <td className="px-4 py-2 text-center">{fmt(row.q1)}</td>
                        <td className="px-4 py-2 text-center">{fmt(row.q2)}</td>
                        <td className="px-4 py-2 text-center">{fmt(row.q3)}</td>
                        <td className="px-4 py-2 text-center">{fmt(row.q4)}</td>
                        <td className="px-4 py-2 text-center">
                          <Badge variant={gradeColor(row.final_grade)}>
                            {fmt(row.final_grade)}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {row.remarks ? (
                            <Badge variant={row.remarks === 'Passed' ? 'default' : row.remarks === 'Failed' ? 'destructive' : 'secondary'}>
                              {row.remarks}
                            </Badge>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
