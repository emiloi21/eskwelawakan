import { useState } from 'react';
import { toast } from 'sonner';
import { Download, FileBarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface ReportCard {
  key: string;
  title: string;
  description: string;
  endpoint: string;
  filename: string;
}

const REPORTS: ReportCard[] = [
  {
    key: 'cases-summary',
    title: 'Cases Summary',
    description: 'All guidance case records with status, type, urgency, and counselor.',
    endpoint: '/admin/guidance/reports/cases-summary',
    filename: 'guidance-cases-summary.pdf',
  },
  {
    key: 'referral-log',
    title: 'Referral Log',
    description: 'All intake referrals with referrer, urgency, and disposition.',
    endpoint: '/admin/guidance/reports/referral-log',
    filename: 'guidance-referral-log.pdf',
  },
  {
    key: 'anecdotal-log',
    title: 'Anecdotal Records Log',
    description: 'Behavioral observations logged by teachers and staff.',
    endpoint: '/admin/guidance/reports/anecdotal-log',
    filename: 'guidance-anecdotal-log.pdf',
  },
  {
    key: 'group-sessions',
    title: 'Group Sessions Log',
    description: 'Psychoeducational sessions, career guidance activities, and homeroom sessions.',
    endpoint: '/admin/guidance/reports/group-sessions',
    filename: 'guidance-group-sessions.pdf',
  },
];

export default function GuidanceReportsPage() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [syFilter, setSyFilter] = useState('');

  const { data: syData } = useQuery<{ id: number; school_year: string }[]>({
    queryKey: ['school-years'],
    queryFn: () => api.get('/admin/school-years').then(r => r.data),
  });

  const downloadReport = async (report: ReportCard) => {
    setLoading(prev => ({ ...prev, [report.key]: true }));
    try {
      const params = syFilter ? { school_year_id: syFilter } : {};
      const response = await api.get(report.endpoint, {
        responseType: 'blob',
        params,
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = report.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${report.title} downloaded.`);
    } catch {
      toast.error(`Failed to download ${report.title}.`);
    } finally {
      setLoading(prev => ({ ...prev, [report.key]: false }));
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileBarChart className="h-5 w-5 text-emerald-600" />
          <div>
            <h1 className="text-xl font-bold">Guidance Reports</h1>
            <p className="text-xs text-muted-foreground">
              All reports are strictly confidential — RA 9258 &amp; RA 10173
            </p>
          </div>
        </div>
        <Select value={syFilter} onValueChange={setSyFilter}>
          <SelectTrigger className="w-48 h-8 text-sm">
            <SelectValue placeholder="All School Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All School Years</SelectItem>
            {syData?.map(sy => (
              <SelectItem key={sy.id} value={String(sy.id)}>{sy.school_year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {REPORTS.map(report => (
          <Card key={report.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{report.title}</CardTitle>
              <CardDescription className="text-xs">{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                variant="outline"
                disabled={loading[report.key]}
                onClick={() => downloadReport(report)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {loading[report.key] ? 'Generating…' : 'Download PDF'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
