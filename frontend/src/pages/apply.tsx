import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Loader2, ChevronRight, ChevronLeft, CheckCircle2, Copy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const DEPTS = [
  { value: 'Preschool',          label: 'Preschool' },
  { value: 'Grade School',       label: 'Grade School' },
  { value: 'Junior High School', label: 'Junior High School' },
  { value: 'Senior High School', label: 'Senior High School' },
];

const GRADE_LEVELS: Record<string, string[]> = {
  'Preschool':          ['Prekinder', 'Kinder', 'Preparatory'],
  'Grade School':       ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
  'Junior High School': ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
  'Senior High School': ['Grade 11', 'Grade 12'],
};

const STRANDS = ['STEM', 'ABM', 'HUMSS', 'HE', 'ICT', 'TVL'];
const CLASSIFICATIONS = ['New', 'Transferee', 'Returnee'];
const LAST_SCHOOL_TYPES = ['Public', 'Private', 'International'];
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const DAYS   = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const YEARS  = Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() - i));

type FormData = {
  lname: string; fname: string; mname: string; suffix: string; lrn: string;
  bdMM: string; bdDD: string; bdYYYY: string; sex: string;
  guardian_lname: string; guardian_fname: string; guardian_contact: string; guardian_relation: string;
  last_school: string; last_school_sy: string; last_school_type: string;
  dept: string; gradeLevel: string; strand: string; classification: string;
  email: string; password: string; password_confirmation: string;
};

const INITIAL: FormData = {
  lname: '', fname: '', mname: '', suffix: '', lrn: '',
  bdMM: '', bdDD: '', bdYYYY: '', sex: '',
  guardian_lname: '', guardian_fname: '', guardian_contact: '', guardian_relation: '',
  last_school: '', last_school_sy: '', last_school_type: '',
  dept: '', gradeLevel: '', strand: '', classification: '',
  email: '', password: '', password_confirmation: '',
};

type SuccessData = { username: string; student: { name: string; grade_level: string; school_year: string } };

const STEPS = ['Personal Info', 'Guardian', 'Previous School', 'Enrollment Details', 'Account'];

export default function ApplyPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: info } = useQuery({
    queryKey: ['apply-info'],
    queryFn: () => api.get('/apply-info').then(r => r.data),
  });

  const set = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleCopy = () => {
    navigator.clipboard.writeText(success!.username);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/apply', form);
      setSuccess({ username: data.username, student: data.student });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msgs = e.response?.data?.errors
        ? Object.values(e.response.data.errors).flat().join(' ')
        : e.response?.data?.message || 'Submission failed. Please try again.';
      setError(msgs);
    } finally {
      setLoading(false);
    }
  };

  const isSHS = form.dept === 'Senior High School';

  if (success) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Application Submitted!</CardTitle>
            <CardDescription>
              Your application for <strong>{success.student.name}</strong> ({success.student.grade_level}, SY {success.student.school_year}) has been received.
              The registrar will review your documents and contact you about the next steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground mb-1">Your login username</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm border">
                  {success.username}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-3 w-3 mr-1" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Save this username — you need it to log in and track your application status.
              </p>
            </div>
            <Link to="/login" className={buttonVariants({ className: 'w-full' })}>Go to Login</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 py-10 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">{info?.school_name ?? 'Enrollment Application'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            School Year {info?.active_school_year} — New Student Registration
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-6 flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold border-2 transition-colors ${
                i < step ? 'bg-primary border-primary text-primary-foreground'
                : i === step ? 'border-primary text-primary bg-background'
                : 'border-muted-foreground/30 text-muted-foreground bg-background'
              }`}>
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-1 h-0.5 w-8 sm:w-12 transition-colors ${i < step ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{STEPS[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            {/* Step 0: Personal Info */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Last Name <span className="text-destructive">*</span></Label>
                    <Input value={form.lname} onChange={e => set('lname', e.target.value)} placeholder="DELA CRUZ" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>First Name <span className="text-destructive">*</span></Label>
                    <Input value={form.fname} onChange={e => set('fname', e.target.value)} placeholder="Juan" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Middle Name</Label>
                    <Input value={form.mname} onChange={e => set('mname', e.target.value)} placeholder="Santos" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Suffix</Label>
                    <Input value={form.suffix} onChange={e => set('suffix', e.target.value)} placeholder="Jr., Sr., III" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>LRN (Learner Reference Number)</Label>
                  <Input value={form.lrn} onChange={e => set('lrn', e.target.value)} placeholder="Leave blank if unknown" maxLength={12} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date of Birth <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={form.bdMM} onValueChange={v => set('bdMM', v)}>
                      <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                      <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={form.bdDD} onValueChange={v => set('bdDD', v)}>
                      <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                      <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={form.bdYYYY} onValueChange={v => set('bdYYYY', v)}>
                      <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                      <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Sex <span className="text-destructive">*</span></Label>
                  <Select value={form.sex} onValueChange={v => set('sex', v)}>
                    <SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 1: Guardian */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Guardian Last Name</Label>
                    <Input value={form.guardian_lname} onChange={e => set('guardian_lname', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Guardian First Name</Label>
                    <Input value={form.guardian_fname} onChange={e => set('guardian_fname', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Number <span className="text-destructive">*</span></Label>
                  <Input value={form.guardian_contact} onChange={e => set('guardian_contact', e.target.value)} placeholder="09XXXXXXXXX" />
                </div>
                <div className="space-y-1.5">
                  <Label>Relationship to Student <span className="text-destructive">*</span></Label>
                  <Input value={form.guardian_relation} onChange={e => set('guardian_relation', e.target.value)} placeholder="Mother, Father, Guardian..." />
                </div>
              </div>
            )}

            {/* Step 2: Previous School */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Previous School <span className="text-destructive">*</span></Label>
                  <Input value={form.last_school} onChange={e => set('last_school', e.target.value)} placeholder="School name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Last School Year <span className="text-destructive">*</span></Label>
                    <Input value={form.last_school_sy} onChange={e => set('last_school_sy', e.target.value)} placeholder="2024-2025" maxLength={9} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>School Type <span className="text-destructive">*</span></Label>
                    <Select value={form.last_school_type} onValueChange={v => set('last_school_type', v)}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>{LAST_SCHOOL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Enrollment Details */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Department <span className="text-destructive">*</span></Label>
                  <Select value={form.dept} onValueChange={v => { set('dept', v); set('gradeLevel', ''); }}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>{DEPTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Grade Level <span className="text-destructive">*</span></Label>
                  <Select value={form.gradeLevel} onValueChange={v => set('gradeLevel', v)} disabled={!form.dept}>
                    <SelectTrigger><SelectValue placeholder="Select grade level" /></SelectTrigger>
                    <SelectContent>
                      {(GRADE_LEVELS[form.dept] ?? []).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {isSHS && (
                  <div className="space-y-1.5">
                    <Label>Strand <span className="text-destructive">*</span></Label>
                    <Select value={form.strand} onValueChange={v => set('strand', v)}>
                      <SelectTrigger><SelectValue placeholder="Select strand" /></SelectTrigger>
                      <SelectContent>{STRANDS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Classification <span className="text-destructive">*</span></Label>
                  <Select value={form.classification} onValueChange={v => set('classification', v)}>
                    <SelectTrigger><SelectValue placeholder="Select classification" /></SelectTrigger>
                    <SelectContent>{CLASSIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 4: Account */}
            {step === 4 && (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Create a password to access your applicant portal. You will use this to track your application status and upload requirements.
                  </AlertDescription>
                </Alert>
                <div className="space-y-1.5">
                  <Label>Email Address <span className="text-destructive">*</span></Label>
                  <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" />
                  <p className="text-xs text-muted-foreground">A confirmation email with your login credentials will be sent here.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Password <span className="text-destructive">*</span></Label>
                  <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="At least 6 characters" />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm Password <span className="text-destructive">*</span></Label>
                  <Input type="password" value={form.password_confirmation} onChange={e => set('password_confirmation', e.target.value)} />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-2 pt-2">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(s => s - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button className="ml-auto" onClick={() => { setError(''); setStep(s => s + 1); }}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button className="ml-auto min-w-[120px]" onClick={handleSubmit} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Application'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/portal-login" className="text-primary underline underline-offset-4">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
