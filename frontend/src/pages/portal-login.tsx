import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useSchoolInfo } from '@/hooks/use-school-info';
import { getHomePathForRole } from '@/lib/role-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const PORTAL_ROLES = ['Student', 'Teacher', 'Parent', 'Applicant'];

export default function PortalLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const { data: school } = useSchoolInfo();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const user = await login(username, password);

      // Portal login only accepts portal roles
      if (!PORTAL_ROLES.includes(user.access)) {
        setError('This login page is for students, teachers, and parents only. Please use the Staff login.');
        return;
      }

      const destination = from || getHomePathForRole(user.access);
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msg =
        axiosError.response?.data?.errors?.username?.[0] ||
        axiosError.response?.data?.message ||
        'Login failed. Please try again.';
      setError(msg);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {school?.logo ? (
            <img
              src={school.logo}
              alt={school.schoolName ?? 'School Logo'}
              className="mx-auto mb-4 h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
          )}
          <CardTitle className="text-2xl">{school?.schoolName ?? 'School Portal'}</CardTitle>
          <CardDescription>Student, Teacher &amp; Parent Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In to Portal
            </Button>
          </form>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <Link to="/" className="underline underline-offset-4 hover:text-foreground">
              ← Back to Website
            </Link>
            <Link to="/login" className="flex items-center gap-1 underline underline-offset-4 hover:text-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Staff Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
