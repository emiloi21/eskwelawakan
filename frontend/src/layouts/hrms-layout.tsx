import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ModuleGate } from '@/components/module-gate';
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
  Users,
  CalendarClock,
  LogOut,
  ChevronUp,
  FileBarChart,
  Settings,
  Banknote,
  Briefcase,
} from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { SubNav, type NavCategory } from '@/components/sub-nav';
import { ModuleSwitcher } from '@/components/module-switcher';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';

export const hrmsCategories: NavCategory[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/hrms', end: true, items: [] },
  {
    label: 'Personnel',
    icon: Users,
    items: [
      { to: '/hrms/personnel', label: 'Staff Directory' },
      { to: '/hrms/departments', label: 'Departments' },
    ],
  },
  {
    label: 'Leave',
    icon: CalendarClock,
    items: [
      { to: '/hrms/leaves', label: 'Leave Applications' },
      { to: '/hrms/leave-types', label: 'Leave Types' },
    ],
  },
  { label: 'Attendance', icon: FileBarChart, to: '/hrms/attendance', end: true, items: [] },
  {
    label: 'Payroll',
    icon: Banknote,
    items: [
      { to: '/hrms/payroll', label: 'Payroll Periods' },
      { to: '/hrms/payroll-settings', label: 'Payroll Settings' },
    ],
  },
  {
    label: 'Operations',
    icon: Briefcase,
    items: [
      { to: '/hrms/supply-requests', label: 'Supply Requests' },
      { to: '/hrms/inventory-tasks', label: 'Inventory Tasks' },
      { to: '/hrms/clearance', label: 'Clearance' },
    ],
  },
  { label: 'Settings', icon: Settings, to: '/hrms/profile', end: true, items: [] },
];

function CategoryNavItem({ cat }: { cat: NavCategory }) {
  const { pathname } = useLocation();
  const isActive = cat.to
    ? cat.end ? pathname === cat.to : pathname.startsWith(cat.to)
    : cat.items.some((i) => pathname === i.to || pathname.startsWith(i.to + '/'));
  const linkTo = cat.to || cat.items[0]?.to || '#';
  const Icon = cat.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={isActive} render={<NavLink to={linkTo} />}>
        <Icon className="h-4 w-4" />
        <span>{cat.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export default function HrmsLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const initials = user
    ? `${user.fname?.[0] ?? ''}${user.lname?.[0] ?? ''}`.toUpperCase()
    : '?';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Briefcase className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold">SVHS HRMS</span>
              <span className="text-xs text-muted-foreground">Human Resources</span>
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
            {hrmsCategories.map((cat) => (
              <CategoryNavItem key={cat.label} cat={cat} />
            ))}
          </SidebarMenu>
          <ModuleSwitcher currentModule="/hrms" />
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
                  <DropdownMenuItem onClick={() => navigate('/hrms/profile')}>
                    <Users className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
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
        <SubNav categories={hrmsCategories} />
        <div className="flex flex-1 flex-col min-h-0">
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 min-h-0">
            <Suspense fallback={<div className="flex items-center justify-center flex-1"><span className="text-muted-foreground">Loading...</span></div>}>
              <ModuleGate moduleKey="hrms" moduleLabel="HRMS">
                <Outlet />
              </ModuleGate>
            </Suspense>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
