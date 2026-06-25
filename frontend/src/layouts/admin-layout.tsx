import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Settings,
  Users,
  GraduationCap,
  LogOut,
  ChevronUp,
  Database,
  BadgeCheck,
  Globe,
  Monitor,
  UserCheck,
  BarChart2,
  HeartHandshake,
} from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SubNav, type NavCategory } from '@/components/sub-nav';
import { SetupBanner } from '@/components/setup-banner';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { LoginAsDialog } from '@/components/login-as-dialog';
import { useOnboarding } from '@/hooks/use-onboarding';
import { cn } from '@/lib/utils';
import { Suspense, useState } from 'react';

// ── Category definitions ───────────────────────────────────────────
export const adminCategories: NavCategory[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/admin', end: true, items: [] },
  {
    label: 'School Settings',
    icon: Settings,
    items: [
      { to: '/admin/school-preferences', label: 'School Preferences' },
      { to: '/admin/school-years', label: 'School Years' },
      { to: '/admin/users', label: 'User Management' },
      { to: '/admin/portal-accounts', label: 'Portal Accounts' },
      { to: '/admin/bank-accounts', label: 'Payment Channels' },
    ],
  },
  {
    label: 'System',
    icon: Database,
    items: [
      { to: '/admin/setup', label: 'System Setup' },
      { to: '/admin/backups', label: 'Database Backups' },
      { to: '/admin/activity-log', label: 'Activity Log' },
    ],
  },
  {
    label: 'Website CMS',
    icon: Globe,
    items: [
      { to: '/admin/cms/slider', label: 'Hero Slider' },
      { to: '/admin/cms/news', label: 'News Articles' },
      { to: '/admin/cms/gallery', label: 'Photo Gallery' },
      { to: '/admin/cms/events', label: 'Calendar Events' },
    ],
  },
  {
    label: 'Kiosk Management',
    icon: Monitor,
    items: [
      { to: '/admin/kiosk', label: 'Kiosks' },
      { to: '/admin/kiosk/slides', label: 'Slideshow' },
    ],
  },
  { label: 'Clearance Templates', icon: BadgeCheck, to: '/admin/clearance-templates', end: true, items: [] },
  {
    label: 'Decision Support',
    icon: BarChart2,
    items: [
      { to: '/admin/dss/dashboard',       label: 'DSS Dashboard' },
      { to: '/admin/dss/enrollment',      label: 'Enrollment Analytics' },
      { to: '/admin/dss/academic-health', label: 'Academic Health' },
      { to: '/admin/dss/resources',       label: 'Resource Utilization' },
      { to: '/admin/dss/warnings',        label: 'Early Warnings' },
      { to: '/admin/dss/recommendations', label: 'Recommendations' },
      { to: '/admin/dss/reports',         label: 'Report Center' },
    ],
  },
  {
    label: 'Guidance Office',
    icon: HeartHandshake,
    items: [
      { to: '/admin/guidance/dashboard',      label: 'Guidance Dashboard' },
      { to: '/admin/guidance/referrals',      label: 'Referral Queue' },
      { to: '/admin/guidance/cases',          label: 'Case Records' },
      { to: '/admin/guidance/anecdotals',     label: 'Anecdotal Records' },
      { to: '/admin/guidance/group-sessions', label: 'Group Sessions' },
      { to: '/admin/guidance/reports',        label: 'Reports' },
    ],
  },
];

// ── Sidebar category item ──────────────────────────────────────────
function CategoryNavItem({ cat }: { cat: NavCategory }) {
  const { pathname } = useLocation();
  const { data: onboarding } = useOnboarding();
  const isActive = cat.to
    ? cat.end ? pathname === cat.to : pathname.startsWith(cat.to)
    : cat.items.some((i) => pathname === i.to || pathname.startsWith(i.to + '/'));
  const linkTo = cat.to || cat.items[0]?.to || '#';
  const Icon = cat.icon;

  // Show warning dot on the System category if setup is incomplete
  const showSetupDot = cat.label === 'System' && onboarding && !onboarding.complete;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={isActive} render={<NavLink to={linkTo} />}>
        <Icon className="h-4 w-4" />
        <span className="flex-1">{cat.label}</span>
        {showSetupDot && (
          <span className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0" title="Setup required" />
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loginAsOpen, setLoginAsOpen] = useState(false);

  const isGuidanceCounselor = user?.access === 'Guidance Counselor';

  // Guidance Counselors see only their own section; Admins see everything.
  const visibleCategories = isGuidanceCounselor
    ? adminCategories.filter((c) => c.label === 'Guidance Office')
    : adminCategories;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user ? `${user.fname?.[0] || ''}${user.lname?.[0] || ''}`.toUpperCase() : '?';

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold">SVHS Admin</span>
              <span className="text-xs text-muted-foreground">Management System</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent
          className={cn(
            'flex-1 overflow-y-auto p-2',
            'scrollbar-thin scrollbar-track-transparent',
            'scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40',
            'scrollbar-thumb-rounded-full',
          )}
        >
          <SidebarMenu>
            {visibleCategories.map((cat) => (
              <CategoryNavItem key={cat.label} cat={cat} />
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger render={<SidebarMenuButton className="w-full" />}>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-left text-sm group-data-[collapsible=icon]:hidden">
                      {user?.full_name}
                    </span>
                    <ChevronUp className="h-4 w-4 group-data-[collapsible=icon]:hidden" />
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user?.access}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/admin/profile')}>
                    <Users className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLoginAsOpen(true)}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Login As…
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <ImpersonationBanner />
        <SiteHeader />
        <SubNav categories={visibleCategories} />
        <div className="flex flex-1 flex-col min-h-0">
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 min-h-0">
            <SetupBanner />
            <Suspense fallback={<div className="flex items-center justify-center flex-1"><span className="text-muted-foreground">Loading...</span></div>}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </SidebarInset>
      <LoginAsDialog open={loginAsOpen} onOpenChange={setLoginAsOpen} />
    </SidebarProvider>
  );
}
