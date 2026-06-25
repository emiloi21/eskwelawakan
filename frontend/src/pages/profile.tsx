import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const profileSchema = z.object({
  fname: z.string().min(1, 'Required'),
  lname: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_number: z.string().optional(),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Required'),
  password: z.string().min(6, 'At least 6 characters'),
  password_confirmation: z.string().min(1, 'Required'),
}).refine((v) => v.password === v.password_confirmation, {
  message: 'Passwords do not match',
  path: ['password_confirmation'],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [showPwForm, setShowPwForm] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fname: user?.fname || '',
      lname: user?.lname || '',
      email: user?.email || '',
      contact_number: user?.contact_number || '',
    },
  });

  const pwForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const profileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const { data } = await api.put('/auth/profile', values);
      return data;
    },
    onSuccess: (data) => {
      setUser(data.user);
      toast.success('Profile updated.');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      const { data } = await api.put('/auth/password', values);
      return data;
    },
    onSuccess: () => {
      toast.success('Password changed.');
      pwForm.reset();
      setShowPwForm(false);
    },
    onError: (err: { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }) => {
      const errors = err.response?.data?.errors;
      if (errors) {
        Object.values(errors).flat().forEach((m) => toast.error(m));
      } else {
        toast.error(err.response?.data?.message || 'Failed to change password.');
      }
    },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">Update your personal information and password</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your name, email, and contact details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit((v) => profileMutation.mutate(v))} className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input {...profileForm.register('fname')} />
                {profileForm.formState.errors.fname && (
                  <p className="text-xs text-destructive">{profileForm.formState.errors.fname.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input {...profileForm.register('lname')} />
                {profileForm.formState.errors.lname && (
                  <p className="text-xs text-destructive">{profileForm.formState.errors.lname.message}</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" {...profileForm.register('email')} />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input {...profileForm.register('contact_number')} />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={user?.username || ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Contact an administrator to change your username</p>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={user?.access || ''} disabled className="bg-muted" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={profileMutation.isPending}>
                {profileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          {!showPwForm ? (
            <Button variant="outline" onClick={() => setShowPwForm(true)}>
              Change Password
            </Button>
          ) : (
            <form onSubmit={pwForm.handleSubmit((v) => passwordMutation.mutate(v))} className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" {...pwForm.register('current_password')} />
                {pwForm.formState.errors.current_password && (
                  <p className="text-xs text-destructive">{pwForm.formState.errors.current_password.message}</p>
                )}
              </div>
              <Separator />
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" {...pwForm.register('password')} />
                  {pwForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{pwForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input type="password" {...pwForm.register('password_confirmation')} />
                  {pwForm.formState.errors.password_confirmation && (
                    <p className="text-xs text-destructive">{pwForm.formState.errors.password_confirmation.message}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowPwForm(false); pwForm.reset(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
