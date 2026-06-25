import { Suspense } from 'react';
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
  LogOut,
  ChevronUp,
  UserCircle,
  BookOpen,
  GraduationCap,
  Building2,
  MessageSquare,
} from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { SubNav, type NavCategory } from '@/components/sub-nav';
import { ModuleSwitcher } from '@/components/module-switcher';
import { ModuleGate } from '@/components/module-gate';
import { cn } from '@/lib/utils';

export const studentCategories: NavCategory[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/student', end: true, items: [] },
  {
    label: 'Academics',
    icon: GraduationCap,
    items: [
      { to: '/student/schedule', label: 'Schedule' },
      { to: '/student/grades', label: 'Grades' },
      { to: '/student/report-card', label: 'Report Card' },
      { to: '/student/academic-history', label: 'Academic History' },
      { to: '/student/attendance', label: 'Attendance' },
    ],
  },
  {
    label: 'LMS',
    icon: BookOpen,
    items: [
      { to: '/student/announcements', label: 'Announcements' },
      { to: '/student/materials', label: 'Materials' },
      { to: '/student/assignments', label: 'Assignments' },
      { to: '/student/discussions', label: 'Discussions' },
      { to: '/student/progress', label: 'My Progress' },
      { to: '/student/flashcards', label: 'Flashcards' },
    ],
  },
  {
    label: 'Student Services',
    icon: Building2,
    items: [
      { to: '/student/enrollment', label: 'Enrollment' },
      { to: '/student/ledger', label: 'Ledger / SOA' },
      { to: '/student/clearance', label: 'Clearance' },
    ],
  },
  { label: 'Messages', icon: MessageSquare, to: '/student/messages', end: true, items: [] },
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

export default function StudentLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

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
              <UserCircle className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold">Student Portal</span>
              <span className="text-xs text-muted-foreground">{user?.selected_sy}</span>
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
            {studentCategories.map((cat) => (
              <CategoryNavItem key={cat.label} cat={cat} />
            ))}
          </SidebarMenu>
          <ModuleSwitcher currentModule="/student" />
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
        <SubNav categories={studentCategories} />
        <div className="flex flex-1 flex-col min-h-0">
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 min-h-0">
            <Suspense fallback={<div className="flex items-center justify-center flex-1"><span className="text-muted-foreground">Loading...</span></div>}>
              <ModuleGate moduleKey="student" moduleLabel="Student">
                <Outlet />
              </ModuleGate>
            </Suspense>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
