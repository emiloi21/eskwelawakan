import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import type { SchoolPreference } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Loader2, Save, Upload, ImageIcon, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const schema = z.object({
  deped_id: z.string().max(20).optional(),
  region: z.string().max(100).optional(),
  division: z.string().max(100).optional(),
  schoolName: z.string().min(1, 'School name is required').max(255),
  address: z.string().max(500).optional(),
  emailAddress: z.string().email('Invalid email').max(255).or(z.literal('')).optional(),
  contactNumber: z.string().max(50).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function SchoolPreferencesPage() {
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery<SchoolPreference>({
    queryKey: ['school-preferences'],
    queryFn: async () => {
      const { data } = await api.get('/admin/school-preferences');
      return data.data;
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (prefs) {
      reset({
        deped_id: prefs.deped_id || '',
        region: prefs.region || '',
        division: prefs.division || '',
        schoolName: prefs.schoolName || '',
        address: prefs.address || '',
        emailAddress: prefs.emailAddress || '',
        contactNumber: prefs.contactNumber || '',
      });
    }
  }, [prefs, reset]);

  // ─── Logo upload ───
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (prefs?.logo) {
      setLogoPreview(`/storage/${prefs.logo}`);
    }
  }, [prefs?.logo]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2 MB.');
      return;
    }
    setSelectedFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const clearLogo = () => {
    setSelectedFile(null);
    if (prefs?.logo) {
      setLogoPreview(`/storage/${prefs.logo}`);
    } else {
      setLogoPreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const logoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      const { data } = await api.post('/admin/school-preferences/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['school-info'] });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('School logo updated.');
    },
    onError: () => {
      toast.error('Failed to upload logo.');
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data } = await api.put('/admin/school-preferences', values);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['school-info'] });
      toast.success('School preferences updated.');
    },
    onError: () => {
      toast.error('Failed to update preferences.');
    },
  });

  const onSubmit = (values: FormValues) => mutation.mutate(values);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">School Preferences</h1>
        <p className="text-muted-foreground">Manage your school's basic information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>School Logo</CardTitle>
          <CardDescription>Upload your school's logo (max 2 MB, displayed on the public website)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {logoPreview ? (
                <img src={logoPreview} alt="School logo" className="h-full w-full object-contain" />
              ) : (
                <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex flex-col gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose Image
                </Button>
                {selectedFile && (
                  <Button type="button" variant="ghost" onClick={clearLogo}>
                    <X className="mr-1 h-4 w-4" /> Cancel
                  </Button>
                )}
              </div>
              {selectedFile && (
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                  <Button
                    type="button"
                    onClick={() => logoMutation.mutate(selectedFile)}
                    disabled={logoMutation.isPending}
                  >
                    {logoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Upload Logo
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">PNG, JPG, or SVG. Recommended size: 200×200 px.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>School Information</CardTitle>
          <CardDescription>Update your school's profile and settings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name *</Label>
                <Input id="schoolName" {...register('schoolName')} />
                {errors.schoolName && (
                  <p className="text-sm text-destructive">{errors.schoolName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="deped_id">DepEd ID</Label>
                <Input id="deped_id" {...register('deped_id')} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Input id="region" {...register('region')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Input id="division" {...register('division')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register('address')} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emailAddress">Email Address</Label>
                <Input id="emailAddress" type="email" {...register('emailAddress')} />
                {errors.emailAddress && (
                  <p className="text-sm text-destructive">{errors.emailAddress.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input id="contactNumber" {...register('contactNumber')} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="activeSchoolYear">Active School Year</Label>
                <Input id="activeSchoolYear" value={prefs?.activeSchoolYear || '—'} readOnly className="bg-muted" />
                <p className="text-xs text-muted-foreground">Managed via School Year settings</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activeSemester">Active Semester</Label>
                <Input id="activeSemester" value={prefs?.activeSemester || '—'} readOnly className="bg-muted" />
                <p className="text-xs text-muted-foreground">Managed via School Year settings</p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={mutation.isPending || !isDirty}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
