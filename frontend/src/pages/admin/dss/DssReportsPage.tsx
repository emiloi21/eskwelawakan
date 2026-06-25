import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Download, FileText } from 'lucide-react';

type SchoolYear = { id: number; school_year: string; status: string };

interface ReportCard {
  key: string;
  title: string;
  description: string;
  endpoint: string;
  filename: string;
  hasCsv?: boolean;
  csvEndpoint?: string;
  csvFilename?: string;
  showGradeFilter?: boolean;
}

const REPORTS: ReportCard[] = [
  {
    key: 'enrollment',
    title: 'Enrollment Report',
    description: 'Enrollment trends, grade-level breakdown, section fill rates, and projections.',
    endpoint: '/admin/dss/reports/enrollment',
    filename: 'enrollment-report.pdf',
  },
  {
    key: 'promotion-retention',
    title: 'Promotion & Retention Report',
    description: 'Promotion and retention rates by grade level for the selected school year.',
    endpoint: '/admin/dss/reports/promotion-retention',
    filename: 'promotion-retention-report.pdf',
  },
  {
    key: 'at-risk',
    title: 'At-Risk Students Report',
    description: 'Flagged students with multiple failing subjects or grade retention.',
    endpoint: '/admin/dss/reports/at-risk',
    filename: 'at-risk-students-report.pdf',
    hasCsv: true,
    csvEndpoint: '/admin/dss/academic-health/at-risk/export',
    csvFilename: 'at-risk-students.csv',
  },
  {
    key: 'faculty-load',
    title: 'Faculty Load Report',
    description: 'Faculty subject assignments and load status (overloaded / optimal / underloaded).',
    endpoint: '/admin/dss/reports/faculty-load',
    filename: 'faculty-load-report.pdf',
  },
  {
    key: 'classroom-utilization',
    title: 'Classroom Utilization Report',
    description: 'Room assignments, capacity, and utilization percentages.',
    endpoint: '/admin/dss/reports/classroom-utilization',
    filename: 'classroom-utilization-report.pdf',
  },
  {
    key: 'materials-inventory',
    title: 'Materials Inventory Report',
    description: 'Consumable items inventory with shortage flags.',
    endpoint: '/admin/dss/reports/materials-inventory',
    filename: 'materials-inventory-report.pdf',
  },
  {
    key: 'warnings-log',
    title: 'Warnings Log Report',
    description: 'All early warning records with acknowledgement status.',
    endpoint: '/admin/dss/reports/warnings-log',
    filename: 'warnings-log-report.pdf',
  },
  {
    key: 'recommendations-log',
    title: 'Recommendations Log Report',
    description: 'All generated recommendations with actioned status.',
    endpoint: '/admin/dss/reports/recommendations-log',
    filename: 'recommendations-log-report.pdf',
  },
];

async function downloadBlob(
  endpoint: string,
  filename: string,
  params?: Record<string, string>,
): Promise<void> {
  const res = await api.get(endpoint, {
    params,
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function DssReportsPage() {
  const [schoolYearId, setSchoolYearId] = useState<string>('');
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});

  const { data: schoolYears } = useQuery<{ data: SchoolYear[] }>({
    queryKey: ['school-years-list'],
    queryFn: () => api.get('/admin/school-years').then(r => r.data),
  });

  const syParam = schoolYearId ? { school_year_id: schoolYearId } : {};

  async function handleDownload(report: ReportCard, type: 'pdf' | 'csv') {
    const key = `${report.key}-${type}`;
    setDownloading(prev => ({ ...prev, [key]: true }));
    try {
      if (type === 'csv' && report.csvEndpoint) {
        await downloadBlob(report.csvEndpoint, report.csvFilename!, syParam);
      } else {
        await downloadBlob(report.endpoint, report.filename, syParam);
      }
    } catch {
      toast.error(`Failed to download ${report.title}`);
    } finally {
      setDownloading(prev => ({ ...prev, [key]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Report Center</h1>
          <p className="text-sm text-muted-foreground">Export DSS data as PDF or CSV</p>
        </div>
        <Select value={schoolYearId} onValueChange={setSchoolYearId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Active School Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Active</SelectItem>
            {(schoolYears?.data ?? []).map(sy => (
              <SelectItem key={sy.id} value={String(sy.id)}>{sy.school_year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map(report => (
          <Card key={report.key}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">{report.title}</CardTitle>
              </div>
              <CardDescription className="text-xs">{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="gap-2 h-8 text-xs"
                  disabled={!!downloading[`${report.key}-pdf`]}
                  onClick={() => handleDownload(report, 'pdf')}
                >
                  <Download className="h-3 w-3" />
                  {downloading[`${report.key}-pdf`] ? 'Exporting...' : 'Export PDF'}
                </Button>
                {report.hasCsv && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 h-8 text-xs"
                    disabled={!!downloading[`${report.key}-csv`]}
                    onClick={() => handleDownload(report, 'csv')}
                  >
                    <Download className="h-3 w-3" />
                    {downloading[`${report.key}-csv`] ? 'Exporting...' : 'Export CSV'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
