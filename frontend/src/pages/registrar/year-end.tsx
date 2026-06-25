import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert, AlertDescription, AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, RefreshCw, GraduationCap, AlertTriangle } from 'lucide-react';
import { DEPARTMENTS, GRADE_LEVELS } from '@/lib/constants';

// ── Types ──────────────────────────────────────────────────────────
type PreviewStudent = {
  reg_id: string;
  student_id: string;
  name: string;
  current_grade: string;
  next_grade: string;
  current_dept: string;
  next_dept: string;
  strand: string;
};

type GraduatedStudent = {
  reg_id: string;
  student_id: string;
  name: string;
  gradeLevel: string;
  dept: string;
};

type PreviewSummary = {
  will_promote: number;
  graduated: number;
  already_done: number;
  total_enrolled: number;
};

type PreviewResult = {
  to_promote: PreviewStudent[];
  graduated: GraduatedStudent[];
  already_done: { reg_id: string; name: string; gradeLevel: string }[];
  summary: PreviewSummary;
};

type PromoteResult = {
  message: string;
  promoted: number;
  graduated: number;
  skipped: number;
};

// ── Helpers ────────────────────────────────────────────────────────
function buildNextSY(sy: string): string {
  // Try to auto-suggest next SY, e.g. "2024-2025" → "2025-2026"
  const match = sy.match(/^(\d{4})-(\d{4})$/);
  if (match) {
    const y1 = parseInt(match[1]) + 1;
    const y2 = parseInt(match[2]) + 1;
    return `${y1}-${y2}`;
  }
  return '';
}

// ── Component ──────────────────────────────────────────────────────
export default function YearEndPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [sourceSY, setSourceSY] = useState(user?.selected_sy || '');
  const [nextSY, setNextSY] = useState(() => buildNextSY(user?.selected_sy || ''));
  const [filterDept, setFilterDept] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Mutations ──────────────────────────────────────────────────────

  const previewMutation = useMutation<{ data: PreviewResult }, Error>({
    mutationFn: () =>
      api
        .get('/registrar/enrollment/bulk-promote/preview', {
          params: {
            source_school_year: sourceSY,
            next_school_year: nextSY,
            ...(filterDept ? { dept: filterDept } : {}),
            ...(filterGrade ? { grade_level: filterGrade } : {}),
          },
        })
        .then((r) => r.data),
    onSuccess: (res) => {
      setPreview(res as unknown as PreviewResult);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Preview failed.');
    },
  });

  const promoteMutation = useMutation<{ data: PromoteResult }, Error>({
    mutationFn: () =>
      api
        .post('/registrar/enrollment/bulk-promote', {
          source_school_year: sourceSY,
          next_school_year: nextSY,
          ...(filterDept ? { dept: filterDept } : {}),
          ...(filterGrade ? { grade_level: filterGrade } : {}),
        })
        .then((r) => r.data),
    onSuccess: (res) => {
      const result = res as unknown as PromoteResult;
      toast.success(result.message);
      setConfirmOpen(false);
      setPreview(null);
      qc.invalidateQueries({ queryKey: ['enrollment-pipeline'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Promotion failed.');
      setConfirmOpen(false);
    },
  });

  // ── Validation ─────────────────────────────────────────────────────
  const formValid = sourceSY.trim().length > 0 && nextSY.trim().length > 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Page Title ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <GraduationCap className="h-6 w-6" />
          Year-End Promotion
        </h1>
        <p className="text-muted-foreground mt-1">
          Batch-promote all Enrolled students to the next grade level for the upcoming school year.
        </p>
      </div>

      <Separator />

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label htmlFor="sourceSY">Source School Year <span className="text-destructive">*</span></Label>
          <Input
            id="sourceSY"
            placeholder="e.g. 2024-2025"
            value={sourceSY}
            onChange={(e) => setSourceSY(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="nextSY">Next School Year <span className="text-destructive">*</span></Label>
          <Input
            id="nextSY"
            placeholder="e.g. 2025-2026"
            value={nextSY}
            onChange={(e) => setNextSY(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Department (optional)</Label>
          <Select value={filterDept || 'all'} onValueChange={(v) => setFilterDept(v === 'all' ? '' : (v ?? ''))}>
            <SelectTrigger>
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Grade Level (optional)</Label>
          <Select value={filterGrade || 'all'} onValueChange={(v) => setFilterGrade(v === 'all' ? '' : (v ?? ''))}>
            <SelectTrigger>
              <SelectValue placeholder="All grade levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All grade levels</SelectItem>
              {GRADE_LEVELS.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => previewMutation.mutate()}
          disabled={!formValid || previewMutation.isPending}
        >
          {previewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Preview
        </Button>
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={!preview || preview.summary.will_promote === 0 || previewMutation.isPending}
        >
          <GraduationCap className="h-4 w-4 mr-2" />
          Run Promotion
        </Button>
      </div>

      {/* ── Preview Results ──────────────────────────────────────── */}
      {preview && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Will Promote', value: preview.summary.will_promote, variant: 'default' as const },
              { label: 'Graduated (Grade 12)', value: preview.summary.graduated, variant: 'secondary' as const },
              { label: 'Already Promoted', value: preview.summary.already_done, variant: 'outline' as const },
              { label: 'Total Enrolled', value: preview.summary.total_enrolled, variant: 'outline' as const },
            ].map((card) => (
              <div key={card.label} className="rounded-lg border p-3 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{card.label}</span>
                <span className="text-2xl font-bold">{card.value}</span>
              </div>
            ))}
          </div>

          {preview.summary.will_promote === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Nothing to promote</AlertTitle>
              <AlertDescription>
                No eligible students found for the selected filters. They may already be promoted or none are currently Enrolled.
              </AlertDescription>
            </Alert>
          )}

          {/* Students to promote */}
          {preview.to_promote.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Students to Promote ({preview.to_promote.length})</h3>
              <div className="rounded-md border overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium">Name</th>
                      <th className="text-left px-3 py-2 font-medium">Student ID</th>
                      <th className="text-left px-3 py-2 font-medium">Current Grade</th>
                      <th className="text-left px-3 py-2 font-medium">→ Next Grade</th>
                      <th className="text-left px-3 py-2 font-medium">Dept Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.to_promote.map((s) => (
                      <tr key={s.reg_id} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-2">{s.name}</td>
                        <td className="px-3 py-2 font-mono text-xs">{s.student_id}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline">{s.current_grade}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge>{s.next_grade}</Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {s.current_dept !== s.next_dept
                            ? <span className="text-amber-600 font-medium">{s.current_dept} → {s.next_dept}</span>
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Graduated students */}
          {preview.graduated.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-muted-foreground">
                Graduated / Not Promoted ({preview.graduated.length})
              </h3>
              <div className="rounded-md border overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium">Name</th>
                      <th className="text-left px-3 py-2 font-medium">Student ID</th>
                      <th className="text-left px-3 py-2 font-medium">Grade Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.graduated.map((s) => (
                      <tr key={s.reg_id} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-2">{s.name}</td>
                        <td className="px-3 py-2 font-mono text-xs">{s.student_id}</td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary">{s.gradeLevel}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Confirm Dialog ───────────────────────────────────────── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Year-End Promotion</DialogTitle>
            <DialogDescription>
              This will create new enrollment records for{' '}
              <strong>{preview?.summary.will_promote ?? 0} student(s)</strong> in S.Y.{' '}
              <strong>{nextSY}</strong> with status <em>For Accounts Assessment</em>.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Source S.Y.: <strong>{sourceSY}</strong></div>
            <div>Target S.Y.: <strong>{nextSY}</strong></div>
            {filterDept && <div>Department filter: <strong>{filterDept}</strong></div>}
            {filterGrade && <div>Grade level filter: <strong>{filterGrade}</strong></div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={promoteMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => promoteMutation.mutate()} disabled={promoteMutation.isPending}>
              {promoteMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Promoting…</>
                : 'Confirm & Run'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
