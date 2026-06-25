import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, Trash2, GripVertical, Eye, Pencil } from 'lucide-react';
import { toast } from 'sonner';

/* ─── Constants ──────────────────────────────────────────────────────────────── */
const ROLES = [
  'Administrator',
  'Registrar',
  'Cashier',
  'Accounting Staff',
  'Teacher',
  'HR',
  'Custodian',
  'Encoder',
  'Librarian',
];

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface TemplateOfficeInput {
  key: string; // local key for list rendering
  office_name: string;
  responsible_role: string;
  description: string;
  sort_order: number;
}

interface TemplateOffice {
  id: number;
  office_name: string;
  responsible_role: string;
  description: string | null;
  sort_order: number;
}

interface ClearanceTemplate {
  id: number;
  public_id: string;
  name: string;
  school_year: string;
  for_type: 'Student' | 'Personnel' | 'Both';
  is_active: boolean;
  records_count: number;
  offices: TemplateOffice[];
  created_at: string;
}

function blankOffice(index: number): TemplateOfficeInput {
  return {
    key: `${Date.now()}-${index}`,
    office_name: '',
    responsible_role: '',
    description: '',
    sort_order: index + 1,
  };
}

/* ─── Main page ──────────────────────────────────────────────────────────────── */
export default function ClearanceTemplatesPage() {
  const [templates, setTemplates] = useState<ClearanceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create / edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClearanceTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // View detail sheet
  const [viewSheet, setViewSheet] = useState<ClearanceTemplate | null>(null);

  // Form state
  const [fName, setFName] = useState('');
  const [fSchoolYear, setFSchoolYear] = useState('');
  const [fForType, setFForType] = useState<'Student' | 'Personnel' | 'Both'>('Both');
  const [fIsActive, setFIsActive] = useState(false);
  const [fOffices, setFOffices] = useState<TemplateOfficeInput[]>([blankOffice(0)]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/custodian/clearance-templates');
      setTemplates(res.data.data ?? res.data);
    } catch {
      toast.error('Failed to load templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setFName('');
    setFSchoolYear('');
    setFForType('Both');
    setFIsActive(false);
    setFOffices([blankOffice(0)]);
    setDialogOpen(true);
  };

  const openEdit = (t: ClearanceTemplate) => {
    setEditing(t);
    setFName(t.name);
    setFSchoolYear(t.school_year);
    setFForType(t.for_type);
    setFIsActive(t.is_active);
    setFOffices(
      t.offices.map((o) => ({
        key: `existing-${o.id}`,
        office_name: o.office_name,
        responsible_role: o.responsible_role,
        description: o.description ?? '',
        sort_order: o.sort_order,
      }))
    );
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!fName.trim() || !fSchoolYear.trim()) {
      toast.error('Name and school year are required.');
      return;
    }
    for (const o of fOffices) {
      if (!o.office_name.trim() || !o.responsible_role) {
        toast.error('All offices must have a name and responsible role.');
        return;
      }
    }
    const payload = {
      name: fName.trim(),
      school_year: fSchoolYear.trim(),
      for_type: fForType,
      is_active: fIsActive,
      offices: fOffices.map((o, i) => ({
        office_name: o.office_name,
        responsible_role: o.responsible_role,
        description: o.description || null,
        sort_order: i + 1,
      })),
    };
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/custodian/clearance-templates/${editing.public_id}`, payload);
        toast.success('Template updated.');
      } else {
        await api.post('/custodian/clearance-templates', payload);
        toast.success('Template created.');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/custodian/clearance-templates/${deleteId}`);
      toast.success('Template deleted.');
      setDeleteId(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Cannot delete.');
    } finally {
      setDeleting(false);
    }
  };

  const addOffice = () => {
    setFOffices((prev) => [...prev, blankOffice(prev.length)]);
  };

  const removeOffice = (key: string) => {
    setFOffices((prev) => prev.filter((o) => o.key !== key));
  };

  const updateOffice = (key: string, field: keyof Omit<TemplateOfficeInput, 'key'>, value: string | number) => {
    setFOffices((prev) => prev.map((o) => (o.key === key ? { ...o, [field]: value } : o)));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clearance Templates</h1>
          <p className="text-muted-foreground text-sm">
            Manage digital clearance templates for students and personnel
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No clearance templates yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>School Year</TableHead>
                <TableHead>For</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Offices</TableHead>
                <TableHead>Records</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.public_id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.school_year}</TableCell>
                  <TableCell>{t.for_type}</TableCell>
                  <TableCell>
                    <Badge variant={t.is_active ? 'default' : 'outline'}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{t.offices?.length ?? 0}</TableCell>
                  <TableCell>{t.records_count ?? 0}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setViewSheet(t)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(t)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(t.public_id)}
                      disabled={(t.records_count ?? 0) > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Create / Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Template' : 'New Clearance Template'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the template details and offices.'
                : 'Define the template name, type, and required offices for sign-off.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-name">Template Name *</Label>
                <Input
                  id="tpl-name"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  placeholder="e.g., SY 2025-2026 Clearance"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-sy">School Year *</Label>
                <Input
                  id="tpl-sy"
                  value={fSchoolYear}
                  onChange={(e) => setFSchoolYear(e.target.value)}
                  placeholder="e.g., 2025-2026"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <Label>Applies To *</Label>
                <Select value={fForType} onValueChange={(v) => setFForType(v as typeof fForType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Personnel">Personnel</SelectItem>
                    <SelectItem value="Both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pb-0.5">
                <Switch
                  id="tpl-active"
                  checked={fIsActive}
                  onCheckedChange={setFIsActive}
                />
                <Label htmlFor="tpl-active">Set as Active Template</Label>
              </div>
            </div>

            <Separator />

            {/* Offices */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Offices / Sign-off Requirements</Label>
                <Button type="button" size="sm" variant="outline" onClick={addOffice}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Office
                </Button>
              </div>

              {fOffices.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No offices added yet.
                </p>
              )}

              <div className="space-y-3">
                {fOffices.map((o, idx) => (
                  <div
                    key={o.key}
                    className="rounded-lg border p-3 space-y-3 bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                        <span className="font-medium">Office {idx + 1}</span>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeOffice(o.key)}
                        disabled={fOffices.length === 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Office Name *</Label>
                        <Input
                          value={o.office_name}
                          onChange={(e) => updateOffice(o.key, 'office_name', e.target.value)}
                          placeholder="e.g., Registrar's Office"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Responsible Role *</Label>
                        <Select
                          value={o.responsible_role}
                          onValueChange={(v) => updateOffice(o.key, 'responsible_role', v ?? '')}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Description (optional)</Label>
                      <Input
                        value={o.description}
                        onChange={(e) => updateOffice(o.key, 'description', e.target.value)}
                        placeholder="What the applicant needs to settle here"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Detail Sheet ─────────────────────────────────────────────────── */}
      <Sheet open={!!viewSheet} onOpenChange={(o) => !o && setViewSheet(null)}>
        <SheetContent className="w-96">
          <SheetHeader>
            <SheetTitle>{viewSheet?.name}</SheetTitle>
            <SheetDescription>
              SY {viewSheet?.school_year} &bull; {viewSheet?.for_type} &bull;{' '}
              <Badge variant={viewSheet?.is_active ? 'default' : 'outline'} className="text-xs">
                {viewSheet?.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Required Offices ({viewSheet?.offices?.length ?? 0})
            </p>
            {viewSheet?.offices?.map((o, i) => (
              <div key={o.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="font-medium">{o.office_name}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground ml-7">
                  Role: {o.responsible_role}
                </p>
                {o.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground ml-7">{o.description}</p>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirm Dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this clearance template? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
