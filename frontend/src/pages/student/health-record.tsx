import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, HeartPulse, Stethoscope } from 'lucide-react';

interface HealthRecord {
  blood_type: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  vision_left: string | null;
  vision_right: string | null;
  hearing_left: string | null;
  hearing_right: string | null;
  medical_conditions: string | null;
  allergies: string | null;
  current_medications: string | null;
  last_physical_exam: string | null;
  philhealth_no: string | null;
  notes: string | null;
}

function Row({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="grid grid-cols-2 gap-2 py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? '—'}</span>
    </div>
  );
}

export default function StudentHealthRecordPage() {
  const { data, isLoading, error } = useQuery<{ data: HealthRecord | null }>({
    queryKey: ['student-my-health-record'],
    queryFn: () => api.get('/clinic/my-health-record').then(r => r.data),
  });

  const record = data?.data;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HeartPulse className="h-6 w-6 text-rose-500" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Health Record</h1>
          <p className="text-muted-foreground">Your clinic health information on file</p>
        </div>
      </div>

      {!record ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <Stethoscope className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No health record on file</p>
            <p className="text-sm mt-1">Your health record has not been created yet. Please visit the school clinic.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Health Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label="Blood Type" value={record.blood_type ? <Badge variant="outline">{record.blood_type}</Badge> as any : null} />
              <Row label="Height" value={record.height_cm ? `${record.height_cm} cm` : null} />
              <Row label="Weight" value={record.weight_kg ? `${record.weight_kg} kg` : null} />
              <Row label="Last Physical Exam"
                value={record.last_physical_exam
                  ? new Date(record.last_physical_exam).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
                  : null}
              />
              <Row label="PhilHealth No." value={record.philhealth_no} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vision &amp; Hearing</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label="Vision — Left Eye" value={record.vision_left} />
              <Row label="Vision — Right Eye" value={record.vision_right} />
              <Row label="Hearing — Left" value={record.hearing_left} />
              <Row label="Hearing — Right" value={record.hearing_right} />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Medical History</CardTitle>
            </CardHeader>
            <CardContent>
              <Row label="Medical Conditions" value={record.medical_conditions} />
              <Row label="Allergies" value={record.allergies} />
              <Row label="Current Medications" value={record.current_medications} />
              {record.notes && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{record.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
