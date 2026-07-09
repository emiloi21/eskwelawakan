import { useParams, useNavigate } from 'react-router-dom';
import { useRef, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import type { Student, RequirementChecklist, AccountAssessment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Save, Upload, CheckCircle2, XCircle, FileText, Camera, FileDown,
} from 'lucide-react';
import { DEPARTMENTS, CLASSIFICATIONS, STUDENT_STATUSES, SEMESTERS } from '@/lib/constants';
import { useLookups } from '@/hooks/use-lookups';

const editSchema = z.object({
  lrn: z.string().min(1).max(12),
  esc_id: z.string().max(8).optional(),
  student_id: z.string().min(1).max(25),
  lname: z.string().min(1),
  fname: z.string().min(1),
  mname: z.string().optional(),
  suffix: z.string().optional(),
  bdMM: z.string().min(1).max(2),
  bdDD: z.string().min(1).max(2),
  bdYYYY: z.string().min(1).max(4),
  sex: z.enum(['Male', 'Female']),
  age: z.coerce.number().min(0).max(99).optional() as unknown as z.ZodOptional<z.ZodNumber>,
  address_street: z.string().optional(),
  address_brgy: z.string().optional(),
  address_city_mun: z.string().optional(),
  address_province: z.string().optional(),
  guardian_lname: z.string().optional(),
  guardian_fname: z.string().optional(),
  guardian_contact: z.string().min(1),
  guardian_relation: z.string().min(1),
  g_address_street: z.string().optional(),
  g_address_brgy: z.string().optional(),
  g_address_city_mun: z.string().optional(),
  g_address_province: z.string().optional(),
  last_school: z.string().min(1),
  last_school_sy: z.string().min(1).max(9),
  last_school_type: z.string().min(1),
  gen_average: z.coerce.number().min(0).max(100).optional() as unknown as z.ZodOptional<z.ZodNumber>,
  dept: z.string().min(1),
  gradeLevel: z.string().min(1),
  strand: z.string().optional(),
  classification: z.string().min(1),
  schoolYear: z.string().min(1),
  sem: z.string().optional(),
  status: z.string().min(1),
  remarks: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

const statusVariant = (status: string) => {
  switch (status) {
    case 'Enrolled': return 'default';
    case 'For Payment': return 'secondary';
    case 'For Accounts Assessment': return 'outline';
    default: return 'destructive';
  }
};

export default function StudentDetailPage() {
  const { regId } = useParams<{ regId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: lookups } = useLookups();

  const GRADE_LEVELS_BY_DEPT: Record<string, string[]> = {
    'Grade School': ['Nursery', 'Preparatory', 'Kinder', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
    'Junior High': ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
    'Senior High': ['Grade 11', 'Grade 12'],
  };

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data } = await api.get('/registrar/classes?per_page=100');
      return data.data || [];
    },
  });
  const classes = classesData || [];

  // Assessment dialog state
  const [assessDialogOpen, setAssessDialogOpen] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
  const [pendingFormValues, setPendingFormValues] = useState<EditFormValues | null>(null);

  const { data: student, isLoading } = useQuery<Student>({
    queryKey: ['student', regId],
    queryFn: async () => {
      const { data } = await api.get(`/registrar/students/${regId}`);
      return data.data;
    },
    enabled: !!regId,
  });

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    values: student ? {
      lrn: student.lrn,
      esc_id: student.esc_id || '',
      student_id: student.student_id,
      lname: student.lname,
      fname: student.fname,
      mname: student.mname || '',
      suffix: student.suffix === '-' ? '' : student.suffix || '',
      bdMM: student.bdMM,
      bdDD: student.bdDD,
      bdYYYY: student.bdYYYY,
      sex: student.sex,
      age: student.age || 0,
      address_street: student.address_street || '',
      address_brgy: student.address_brgy || '',
      address_city_mun: student.address_city_mun || '',
      address_province: student.address_province || '',
      guardian_lname: student.guardian_lname || '',
      guardian_fname: student.guardian_fname || '',
      guardian_contact: student.guardian_contact,
      guardian_relation: student.guardian_relation,
      g_address_street: student.g_address_street || '',
      g_address_brgy: student.g_address_brgy || '',
      g_address_city_mun: student.g_address_city_mun || '',
      g_address_province: student.g_address_province || '',
      last_school: student.last_school,
      last_school_sy: student.last_school_sy,
      last_school_type: student.last_school_type,
      gen_average: student.gen_average,
      dept: student.dept,
      gradeLevel: student.gradeLevel,
      strand: student.strand || 'N/A',
      classification: student.classification,
      schoolYear: student.schoolYear,
      sem: student.sem || '',
      status: student.status,
      remarks: student.remarks || '',
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (values: EditFormValues & { assessment_id?: number }) => {
      const { data } = await api.put(`/registrar/students/${regId}`, values);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', regId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student updated.');
    },
    onError: (err: { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      const errors = err.response?.data?.errors;
      if (errors) {
        Object.values(errors).flat().forEach((m) => toast.error(m));
      } else {
        toast.error(err.response?.data?.message || 'Failed to update student.');
      }
    },
  });

  // Fetch matching assessments when the assessment dialog is open
  const { data: assessments, isLoading: assessmentsLoading } = useQuery<AccountAssessment[]>({
    queryKey: ['student-assessments', regId],
    queryFn: async () => {
      const { data } = await api.get(`/registrar/enrollment/${regId}/assessments`);
      return data.data;
    },
    enabled: assessDialogOpen,
  });

  // Requirements checklist
  const { data: requirements, isLoading: reqsLoading } = useQuery<RequirementChecklist[]>({
    queryKey: ['student-requirements', student?.student_id, student?.schoolYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (student?.schoolYear) params.set('schoolYear', student.schoolYear);
      if (student?.reg_id) params.set('reg_id', String(student.reg_id));
      const { data } = await api.get(`/registrar/requirements/student/${student!.student_id}?${params}`);
      return data.data;
    },
    enabled: !!student?.student_id,
  });

  const watchedDept = form.watch('dept');
  const watchedGradeLevel = form.watch('gradeLevel');
  const isSHS = ['Grade 11', 'Grade 12'].includes(watchedGradeLevel ?? '');

  const strandsForGradeLevel = useMemo(() => {
    if (!watchedGradeLevel) return [];
    const strands = [...new Set(
      classes
        .filter((c: { gradeLevel: string }) => c.gradeLevel === watchedGradeLevel)
        .map((c: { strand: string }) => c.strand)
        .filter((s: string | null) => s && s !== '-' && s !== 'N/A')
    )] as string[];
    return strands.sort();
  }, [classes, watchedGradeLevel]);

  const photoRef = useRef<HTMLInputElement>(null);

  const photoMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('photo', file);
      const { data } = await api.post(`/registrar/students/${regId}/photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', regId] });
      toast.success('Photo uploaded.');
    },
    onError: () => toast.error('Failed to upload photo.'),
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ studReqId, file }: { studReqId: string; file: File }) => {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post(`/registrar/requirements/upload/${studReqId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-requirements'] });
      toast.success('File uploaded.');
    },
    onError: () => toast.error('Failed to upload file.'),
  });

  const approveMutation = useMutation({
    mutationFn: async (studReqId: string) => {
      const { data } = await api.post(`/registrar/requirements/approve/${studReqId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['student', regId] });
      toast.success('Requirement approved.');
    },
    onError: () => toast.error('Failed to approve requirement.'),
  });

  const disapproveMutation = useMutation({
    mutationFn: async (studReqId: string) => {
      const { data } = await api.post(`/registrar/requirements/disapprove/${studReqId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-requirements'] });
      toast.success('Requirement disapproved.');
    },
    onError: () => toast.error('Failed to disapprove requirement.'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ requireId, submitted }: { requireId: string; submitted: boolean }) => {
      await api.post(`/registrar/requirements/student/${student!.student_id}/${requireId}`, {
        submitted,
        schoolYear: student!.schoolYear,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-requirements'] });
    },
    onError: () => toast.error('Failed to update requirement.'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/registrar/students')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Students
        </Button>
        <p className="text-muted-foreground">Student not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/registrar/students')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="relative group cursor-pointer" onClick={() => photoRef.current?.click()}>
          <Avatar className="h-14 w-14">
            {student.img && <AvatarImage src={`/storage/${student.img}`} alt="Photo" />}
            <AvatarFallback className="text-lg">
              {student.lname[0]}{student.fname[0]}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition">
            <Camera className="h-5 w-5 text-white" />
          </div>
          <input
            ref={photoRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) photoMutation.mutate(file);
            }}
          />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {student.lname}, {student.fname} {student.mname && student.mname !== '-' ? student.mname : ''}
            {student.suffix && student.suffix !== '-' ? ` ${student.suffix}` : ''}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{student.student_id}</span>
            <span>·</span>
            <span>{student.dept} — {student.gradeLevel}</span>
            <Badge variant={statusVariant(student.status)} className="ml-2">{student.status}</Badge>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              const res = await api.get(`/registrar/reports/students/${student.public_id}/form-137`, { responseType: 'blob' });
              const url = URL.createObjectURL(res.data as Blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Form137_${student.lname}_${student.fname}.pdf`;
              a.click();
              URL.revokeObjectURL(url);
            } catch {
              toast.error('Failed to generate Form 137.');
            }
          }}
        >
          <FileDown className="h-4 w-4 mr-1" /> Form 137
        </Button>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="info">Student Info</TabsTrigger>
          <TabsTrigger value="guardian">Guardian</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
        </TabsList>

        <form onSubmit={form.handleSubmit((v) => {
          // Intercept: if moving from "For Accounts Assessment" to "For Payment", show assessment picker
          if (student.status === 'For Accounts Assessment' && v.status === 'For Payment') {
            setPendingFormValues(v);
            setSelectedAssessmentId(null);
            setAssessDialogOpen(true);
            return;
          }
          updateMutation.mutate(v as EditFormValues);
        })}>
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Student identity and contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  <div className="space-y-1"><Label>Last Name</Label><Input {...form.register('lname')} /></div>
                  <div className="space-y-1"><Label>First Name</Label><Input {...form.register('fname')} /></div>
                  <div className="space-y-1"><Label>Middle Name</Label><Input {...form.register('mname')} /></div>
                  <div className="space-y-1"><Label>Suffix</Label><Input {...form.register('suffix')} /></div>
                </div>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-5">
                  <div className="space-y-1"><Label>Birth Month</Label><Input maxLength={2} {...form.register('bdMM')} /></div>
                  <div className="space-y-1"><Label>Birth Day</Label><Input maxLength={2} {...form.register('bdDD')} /></div>
                  <div className="space-y-1"><Label>Birth Year</Label><Input maxLength={4} {...form.register('bdYYYY')} /></div>
                  <div className="space-y-1">
                    <Label>Sex</Label>
                    <Select value={form.watch('sex')} onValueChange={(v) => form.setValue('sex', v as 'Male' | 'Female', { shouldDirty: true })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Age</Label><Input type="number" {...form.register('age')} /></div>
                </div>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  <div className="space-y-1"><Label>Street</Label><Input {...form.register('address_street')} /></div>
                  <div className="space-y-1"><Label>Barangay</Label><Input {...form.register('address_brgy')} /></div>
                  <div className="space-y-1"><Label>City/Municipality</Label><Input {...form.register('address_city_mun')} /></div>
                  <div className="space-y-1"><Label>Province</Label><Input {...form.register('address_province')} /></div>
                </div>
                <div className="grid gap-4 grid-cols-3">
                  <div className="space-y-1"><Label>Student ID</Label><Input {...form.register('student_id')} /></div>
                  <div className="space-y-1"><Label>LRN</Label><Input maxLength={12} {...form.register('lrn')} /></div>
                  <div className="space-y-1"><Label>ESC ID</Label><Input maxLength={8} {...form.register('esc_id')} /></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guardian">
            <Card>
              <CardHeader>
                <CardTitle>Guardian Information</CardTitle>
                <CardDescription>Parent or guardian contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  <div className="space-y-1"><Label>Last Name</Label><Input {...form.register('guardian_lname')} /></div>
                  <div className="space-y-1"><Label>First Name</Label><Input {...form.register('guardian_fname')} /></div>
                  <div className="space-y-1"><Label>Contact #</Label><Input {...form.register('guardian_contact')} /></div>
                  <div className="space-y-1"><Label>Relation</Label><Input {...form.register('guardian_relation')} /></div>
                </div>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  <div className="space-y-1"><Label>Street</Label><Input {...form.register('g_address_street')} /></div>
                  <div className="space-y-1"><Label>Barangay</Label><Input {...form.register('g_address_brgy')} /></div>
                  <div className="space-y-1"><Label>City/Municipality</Label><Input {...form.register('g_address_city_mun')} /></div>
                  <div className="space-y-1"><Label>Province</Label><Input {...form.register('g_address_province')} /></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academic">
            <Card>
              <CardHeader>
                <CardTitle>Academic Details</CardTitle>
                <CardDescription>Enrollment and academic information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Department</Label>
                    <Select value={watchedDept} onValueChange={(v) => {
                      form.setValue('dept', v ?? '', { shouldDirty: true });
                      form.setValue('gradeLevel', '', { shouldDirty: true });
                      form.setValue('strand', 'N/A', { shouldDirty: true });
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Grade Level</Label>
                    <Select value={watchedGradeLevel || ''} onValueChange={(v) => {
                      form.setValue('gradeLevel', v ?? '', { shouldDirty: true });
                      const shs = ['Grade 11', 'Grade 12'].includes(v ?? '');
                      form.setValue('strand', shs ? '' : 'N/A', { shouldDirty: true });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select grade level" /></SelectTrigger>
                      <SelectContent>
                        {(GRADE_LEVELS_BY_DEPT[watchedDept] ?? []).map((level: string) => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Strand</Label>
                    <Select
                      value={form.watch('strand') || ''}
                      onValueChange={(v) => form.setValue('strand', v ?? '', { shouldDirty: true })}
                      disabled={!isSHS}
                    >
                      <SelectTrigger><SelectValue placeholder={isSHS ? 'Select strand' : 'N/A'} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="N/A">N/A</SelectItem>
                        {strandsForGradeLevel.map((s: string) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Classification</Label>
                    <Select value={form.watch('classification')} onValueChange={(v) => form.setValue('classification', v ?? '', { shouldDirty: true })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CLASSIFICATIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>School Year</Label>
                    <Select value={form.watch('schoolYear')} onValueChange={(v) => form.setValue('schoolYear', v ?? '', { shouldDirty: true })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {(lookups?.school_years ?? []).map((sy) => <SelectItem key={sy} value={sy}>{sy}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Semester</Label>
                    <Select value={form.watch('sem') || ''} onValueChange={(v) => form.setValue('sem', v ?? '', { shouldDirty: true })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {SEMESTERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Gen. Average</Label><Input type="number" {...form.register('gen_average')} /></div>
                </div>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v ?? '', { shouldDirty: true })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STUDENT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1"><Label>Remarks</Label><Input {...form.register('remarks')} /></div>
                </div>
                <fieldset className="space-y-4 pt-4 border-t">
                  <legend className="text-sm font-semibold text-muted-foreground">Previous School</legend>
                  <div className="grid gap-4 grid-cols-3">
                    <div className="space-y-1"><Label>School Name</Label><Input {...form.register('last_school')} /></div>
                    <div className="space-y-1">
                      <Label>School Year</Label>
                      <Select value={form.watch('last_school_sy') || ''} onValueChange={(v) => form.setValue('last_school_sy', v ?? '', { shouldDirty: true })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {(lookups?.school_years ?? []).map((sy) => <SelectItem key={sy} value={sy}>{sy}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>Type</Label><Input {...form.register('last_school_type')} /></div>
                  </div>
                </fieldset>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={updateMutation.isPending || !form.formState.isDirty}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </div>
        </form>

        {/* Requirements tab — outside form */}
        <TabsContent value="requirements">
          <Card>
            <CardHeader>
              <CardTitle>Admission Requirements</CardTitle>
              <CardDescription>Upload, review, and approve student requirements.</CardDescription>
            </CardHeader>
            <CardContent>
              {reqsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !requirements?.length ? (
                <p className="text-muted-foreground text-sm">No requirements configured for this student's level.</p>
              ) : (
                <div className="divide-y">
                  {requirements.map((req) => {
                    const hasRecord = req.stud_reqs_id !== null;
                    const statusColor: Record<string, string> = {
                      Approved: 'bg-green-100 text-green-800',
                      Disapproved: 'bg-red-100 text-red-800',
                      'For Validation': 'bg-yellow-100 text-yellow-800',
                    };
                    return (
                      <div key={req.public_id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={hasRecord}
                            onChange={(e) =>
                              toggleMutation.mutate({ requireId: req.public_id, submitted: e.target.checked })
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{req.requirement_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-xs">{req.purpose}</Badge>
                              {hasRecord && (
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[req.req_status] ?? 'bg-gray-100 text-gray-600'}`}>
                                  {req.req_status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {hasRecord && (
                          <div className="flex items-center gap-2 flex-shrink-0 ml-7 sm:ml-0">
                            {req.file_url ? (
                              <a
                                href={req.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                              >
                                <FileText className="h-3.5 w-3.5" /> View
                              </a>
                            ) : null}

                            <label className="inline-flex items-center gap-1 text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                              <Upload className="h-3.5 w-3.5" />
                              <span>Upload</span>
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                className="sr-only"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file && req.stud_req_public_id) {
                                    uploadFileMutation.mutate({ studReqId: req.stud_req_public_id, file });
                                  }
                                  e.target.value = '';
                                }}
                              />
                            </label>

                            {req.req_status !== 'Approved' && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-green-600 hover:text-green-700"
                                disabled={approveMutation.isPending}
                                onClick={() => req.stud_req_public_id && approveMutation.mutate(req.stud_req_public_id)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                            )}
                            {req.req_status !== 'Disapproved' && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-red-600 hover:text-red-700"
                                disabled={disapproveMutation.isPending}
                                onClick={() => req.stud_req_public_id && disapproveMutation.mutate(req.stud_req_public_id)}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Disapprove
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assessment Selection Dialog — triggered when status changes to "For Payment" */}
      <Dialog open={assessDialogOpen} onOpenChange={setAssessDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Assessment</DialogTitle>
            <DialogDescription>
              Assign an assessment for {student.lname}, {student.fname} ({student.gradeLevel}) before moving to &quot;For Payment&quot;.
            </DialogDescription>
          </DialogHeader>

          {assessmentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading assessments...</span>
            </div>
          ) : !assessments || assessments.length === 0 ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
              <p className="font-medium text-destructive">No assessments available</p>
              <p className="text-sm text-muted-foreground mt-1">
                No assessment templates match this student&apos;s grade level, strand, and school year.
                Please contact Accounting to create one.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {assessments.map((assess) => {
                const isSelected = selectedAssessmentId === assess.assessment_id;
                const totalPayable = assess.payables?.reduce((sum, p) => sum + (p.category?.totalAmount ?? p.total_amt_payable ?? 0), 0) ?? 0;
                return (
                  <button
                    key={assess.assessment_id}
                    type="button"
                    className={`text-left rounded-lg border-2 p-0 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedAssessmentId(assess.assessment_id)}
                  >
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-t-md ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-primary-foreground' : 'border-muted-foreground'
                      }`}>
                        {isSelected && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                      </div>
                      <span className="font-semibold text-sm">{assess.description}</span>
                      {isSelected && <Badge variant="outline" className="ml-auto text-[10px] border-primary-foreground/50 text-primary-foreground">Selected</Badge>}
                    </div>
                    <div className="px-3 py-2">
                      <table className="w-full text-sm">
                        <tbody>
                          {assess.payables?.map((p) => (
                            <tr key={p.assess_payable_id} className="border-b border-border/50 last:border-0">
                              <td className="py-1 text-muted-foreground">{p.category?.description ?? '—'}</td>
                              <td className="py-1 text-right tabular-nums font-medium">
                                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(p.category?.totalAmount ?? p.total_amt_payable ?? 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border">
                            <td className="py-1 font-semibold">Total</td>
                            <td className="py-1 text-right tabular-nums font-bold">
                              {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(totalPayable)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssessDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!selectedAssessmentId || updateMutation.isPending}
              onClick={() => {
                if (!selectedAssessmentId || !pendingFormValues) return;
                updateMutation.mutate(
                  { ...pendingFormValues, assessment_id: selectedAssessmentId },
                  {
                    onSuccess: () => {
                      setAssessDialogOpen(false);
                      setPendingFormValues(null);
                    },
                  },
                );
              }}
            >
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign & Move to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
