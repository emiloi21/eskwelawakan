import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, XCircle, Clock, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface TemplateOffice {
  id: number;
  office_name: string;
  responsible_role: string;
  description: string | null;
  sort_order: number;
}

interface ClearanceTemplate {
  public_id: string;
  name: string;
  school_year: string;
  for_type: 'Student' | 'Personnel' | 'Both';
  offices: TemplateOffice[];
}

interface RecordOffice {
  id: number;
  office_name: string;
  status: 'Pending' | 'Cleared' | 'Returned';
  cleared_by?: { fname: string; lname: string };
  cleared_at: string | null;
  remarks: string | null;
}

interface ClearanceRecord {
  public_id: string;
  status: 'Applied' | 'In Progress' | 'Complete' | 'Rejected';
  notes: string | null;
  completed_at: string | null;
  template: ClearanceTemplate;
  office_statuses: RecordOffice[];
}

interface PendingOfficeItem {
  record_id: string;
  record_public_id: string;
  office_id: number;
  office_name: string;
  user: { fname: string; lname: string; username: string };
  applied_at: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function statusColor(status: RecordOffice['status'] | ClearanceRecord['status']) {
  switch (status) {
    case 'Cleared':
    case 'Complete':
      return 'default';
    case 'Returned':
    case 'Rejected':
      return 'destructive';
    case 'In Progress':
      return 'secondary';
    default:
      return 'outline';
  }
}

function StatusIcon({ status }: { status: RecordOffice['status'] }) {
  if (status === 'Cleared') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === 'Returned') return <XCircle className="h-4 w-4 text-destructive" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

function fmt(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

/* ─── Main page ──────────────────────────────────────────────────────────────── */
export default function ClearancePage() {
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<ClearanceTemplate | null>(null);
  const [record, setRecord] = useState<ClearanceRecord | null>(null);
  const [pending, setPending] = useState<PendingOfficeItem[]>([]);
  const [applying, setApplying] = useState(false);

  // Clear/Return dialogs
  const [clearDialog, setClearDialog] = useState<PendingOfficeItem | null>(null);
  const [returnDialog, setReturnDialog] = useState<PendingOfficeItem | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [tRes, rRes, pRes] = await Promise.all([
        api.get('/clearance/active-template').catch(() => ({ data: { data: null } })),
        api.get('/clearance/my-record').catch(() => ({ data: { data: null } })),
        api.get('/clearance/pending-for-office').catch(() => ({ data: { data: [] } })),
      ]);
      setTemplate(tRes.data.data);
      setRecord(rRes.data.data);
      setPending(pRes.data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApply = async () => {
    setApplying(true);
    try {
      await api.post('/clearance/apply');
      toast.success('Clearance application submitted.');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to apply.');
    } finally {
      setApplying(false);
    }
  };

  const handleClear = async () => {
    if (!clearDialog) return;
    setSubmitting(true);
    try {
      await api.post(`/clearance/records/${clearDialog.record_public_id}/offices/${clearDialog.office_id}/clear`, {
        remarks: actionRemarks || null,
      });
      toast.success('Office cleared.');
      setClearDialog(null);
      setActionRemarks('');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!returnDialog) return;
    if (!actionRemarks.trim()) {
      toast.error('Remarks are required when returning.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/clearance/records/${returnDialog.record_public_id}/offices/${returnDialog.office_id}/return`, {
        remarks: actionRemarks,
      });
      toast.success('Returned to applicant.');
      setReturnDialog(null);
      setActionRemarks('');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const clearedCount = record?.office_statuses.filter(o => o.status === 'Cleared').length ?? 0;
  const totalCount = record?.office_statuses.length ?? 0;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clearance</h1>
        <p className="text-muted-foreground">Digital clearance processing system</p>
      </div>

      <Tabs defaultValue="my-clearance">
        <TabsList>
          <TabsTrigger value="my-clearance">My Clearance</TabsTrigger>
          {pending.length > 0 && (
            <TabsTrigger value="sign-offs">
              Pending Sign-offs
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                {pending.length}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── My Clearance tab ─────────────────────────────────────────────── */}
        <TabsContent value="my-clearance" className="pt-4 space-y-4">
          {/* No active template */}
          {!template && !record && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No active clearance template</p>
                <p className="text-sm mt-1">
                  There is no active clearance template for your account type at this time.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Active template but no record yet */}
          {template && !record && (
            <Card>
              <CardHeader>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>
                  School Year {template.school_year} &bull; For: {template.for_type}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You have not yet applied for clearance this school year. The following offices
                  will need to sign off on your clearance:
                </p>
                <ul className="space-y-2">
                  {template.offices.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">{o.office_name}</p>
                        {o.description && (
                          <p className="text-muted-foreground">{o.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Managed by: {o.responsible_role}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button onClick={handleApply} disabled={applying}>
                  {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Apply for Clearance
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Has a record */}
          {record && (
            <div className="space-y-4">
              {/* Status card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{record.template.name}</CardTitle>
                    <Badge variant={statusColor(record.status)}>{record.status}</Badge>
                  </div>
                  <CardDescription>
                    School Year {record.template.school_year}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Progress</p>
                      <p className="font-semibold">
                        {clearedCount} / {totalCount} offices cleared
                      </p>
                    </div>
                    {record.completed_at && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Completed</p>
                        <p className="font-semibold">{fmt(record.completed_at)}</p>
                      </div>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: totalCount ? `${(clearedCount / totalCount) * 100}%` : '0%' }}
                    />
                  </div>
                  {record.notes && (
                    <p className="mt-3 text-sm text-muted-foreground">{record.notes}</p>
                  )}
                </CardContent>
              </Card>

              {/* Office statuses */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Office Sign-offs</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Office</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cleared By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {record.office_statuses.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-medium">{o.office_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <StatusIcon status={o.status} />
                              <Badge variant={statusColor(o.status)}>{o.status}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {o.cleared_by
                              ? `${o.cleared_by.fname} ${o.cleared_by.lname}`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {fmt(o.cleared_at)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {o.remarks ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── Pending Sign-offs tab ─────────────────────────────────────────── */}
        {pending.length > 0 && (
          <TabsContent value="sign-offs" className="pt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pending for Your Office</CardTitle>
                <CardDescription>
                  Applicants waiting for your office sign-off
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Office</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((p) => (
                      <TableRow key={`${p.record_public_id}-${p.office_id}`}>
                        <TableCell className="font-medium">
                          {p.user.fname} {p.user.lname}
                          <span className="block text-xs text-muted-foreground">
                            @{p.user.username}
                          </span>
                        </TableCell>
                        <TableCell>{p.office_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fmt(p.applied_at)}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setClearDialog(p);
                              setActionRemarks('');
                            }}
                          >
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReturnDialog(p);
                              setActionRemarks('');
                            }}
                          >
                            Return
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ── Clear Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={!!clearDialog} onOpenChange={(o) => !o && setClearDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Office Sign-off</DialogTitle>
            <DialogDescription>
              Clearing <strong>{clearDialog?.office_name}</strong> for{' '}
              <strong>
                {clearDialog?.user.fname} {clearDialog?.user.lname}
              </strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="clear-remarks">Remarks (optional)</Label>
            <Textarea
              id="clear-remarks"
              value={actionRemarks}
              onChange={(e) => setActionRemarks(e.target.value)}
              placeholder="Add any notes…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleClear} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Return Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={!!returnDialog} onOpenChange={(o) => !o && setReturnDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return for Correction</DialogTitle>
            <DialogDescription>
              Returning <strong>{returnDialog?.office_name}</strong> clearance for{' '}
              <strong>
                {returnDialog?.user.fname} {returnDialog?.user.lname}
              </strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="return-remarks">
              Remarks <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="return-remarks"
              value={actionRemarks}
              onChange={(e) => setActionRemarks(e.target.value)}
              placeholder="Explain why it is being returned…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReturn} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
