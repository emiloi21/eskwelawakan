import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface SubjectGrade {
  grade_id: number;
  subject: string;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  final_grade: number | null;
  remarks: string | null;
}

interface SemesterData {
  subjects: SubjectGrade[];
  general_average: number | null;
}

interface ReportCardData {
  student: {
    name: string;
    student_id: string;
    grade_level: string;
    strand: string;
    section: string;
    school_year: string;
  };
  semesters: Record<string, SemesterData>;
  overall_average: number | null;
}

const SCHOOL_YEARS = ['2024-2025', '2025-2026', '2026-2027'];

function fmt(v: number | null) {
  if (v === null || v === undefined) return '—';
  return Number(v).toFixed(2);
}

function gradeColor(grade: number | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (grade === null) return 'secondary';
  if (grade >= 90) return 'default';
  if (grade >= 75) return 'outline';
  return 'destructive';
}

export default function StudentReportCardPage() {
  const [schoolYear, setSchoolYear] = useState(SCHOOL_YEARS[1]);
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const response = await api.get('/student/report-card/pdf', {
        params: { schoolYear },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Form138_${schoolYear}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  const { data, isLoading } = useQuery<ReportCardData>({
    queryKey: ['student-report-card', schoolYear],
    queryFn: async () => {
      const { data } = await api.get('/student/report-card', { params: { schoolYear } });
      return data;
    },
  });

  const student = data?.student;
  const semesters = data?.semesters ?? {};
  const semesterEntries = Object.entries(semesters);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-2 flex-wrap print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Report Card</h1>
          <p className="text-muted-foreground">Academic performance by subject and quarter</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
          >
            {SCHOOL_YEARS.map(sy => (
              <option key={sy} value={sy}>{sy}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" disabled={downloading} onClick={handleDownloadPdf}>
            {downloading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
            Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" />
            Print
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : !student ? (
        <p className="text-sm text-muted-foreground italic py-8">No report card data found for {schoolYear}.</p>
      ) : (
        <div className="space-y-6">
          {/* Student header */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Student</p>
                  <p className="font-semibold">{student.name}</p>
                  <p className="text-sm text-muted-foreground">{student.student_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Grade & Section</p>
                  <p className="font-semibold">
                    {student.grade_level}
                    {student.strand && student.strand !== '-' ? ` — ${student.strand}` : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">Section {student.section}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">School Year</p>
                  <p className="font-semibold">{student.school_year}</p>
                  {data?.overall_average !== null && data?.overall_average !== undefined && (
                    <p className={`text-sm font-bold mt-0.5 ${data.overall_average >= 75 ? 'text-green-600' : 'text-destructive'}`}>
                      GWA: {fmt(data.overall_average)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {semesterEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No grade entries for this school year.</p>
          ) : (
            semesterEntries.map(([semester, semData]) => (
              <Card key={semester}>
                <div className="px-4 pt-4 pb-2 border-b flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {semester}
                  </h2>
                  {semData.general_average !== null && (
                    <span className={`text-sm font-bold ${semData.general_average >= 75 ? 'text-green-600' : 'text-destructive'}`}>
                      Sem Average: {fmt(semData.general_average)}
                    </span>
                  )}
                </div>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                          <th className="px-4 py-2 text-left font-medium">Subject</th>
                          <th className="px-4 py-2 text-center font-medium">Q1</th>
                          <th className="px-4 py-2 text-center font-medium">Q2</th>
                          <th className="px-4 py-2 text-center font-medium">Q3</th>
                          <th className="px-4 py-2 text-center font-medium">Q4</th>
                          <th className="px-4 py-2 text-center font-medium">Final Grade</th>
                          <th className="px-4 py-2 text-center font-medium">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semData.subjects.map((row) => (
                          <tr key={row.grade_id} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-2.5 font-medium">{row.subject}</td>
                            <td className="px-4 py-2.5 text-center font-mono">{fmt(row.q1)}</td>
                            <td className="px-4 py-2.5 text-center font-mono">{fmt(row.q2)}</td>
                            <td className="px-4 py-2.5 text-center font-mono">{fmt(row.q3)}</td>
                            <td className="px-4 py-2.5 text-center font-mono">{fmt(row.q4)}</td>
                            <td className="px-4 py-2.5 text-center">
                              <Badge variant={gradeColor(row.final_grade)} className="font-mono">
                                {fmt(row.final_grade)}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {row.remarks ? (
                                <Badge
                                  variant={
                                    row.remarks === 'Passed'
                                      ? 'default'
                                      : row.remarks === 'Failed'
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                >
                                  {row.remarks}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {semData.general_average !== null && (
                        <tfoot>
                          <tr className="bg-muted/40 font-semibold">
                            <td colSpan={5} className="px-4 py-2 text-right text-sm">General Average</td>
                            <td className="px-4 py-2 text-center">
                              <Badge variant={gradeColor(semData.general_average)} className="font-mono text-sm">
                                {fmt(semData.general_average)}
                              </Badge>
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
