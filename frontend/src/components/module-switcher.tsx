import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Settings, Users, Receipt, Briefcase, Package, GraduationCap, BookOpen, Heart, HeartPulse, Library, MonitorCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllRoles } from '@/lib/role-utils';

const modules = [
  { to: '/admin',         icon: Settings,      label: 'Admin',         roles: ['Administrator'] },
  { to: '/registrar',     icon: Users,         label: 'Registrar',     roles: ['Administrator', 'Registrar', 'Encoder'] },
  { to: '/accounting',    icon: Receipt,       label: 'Accounting',    roles: ['Administrator', 'Accounting Staff', 'Cashier'] },
  { to: '/teacher',       icon: BookOpen,      label: 'Teacher',       roles: ['Administrator', 'Teacher'] },
  { to: '/student',       icon: GraduationCap, label: 'Student',       roles: ['Administrator', 'Student'] },
  { to: '/parent',        icon: Heart,         label: 'Parent',        roles: ['Administrator', 'Parent'] },
  { to: '/hrms',          icon: Briefcase,     label: 'HRMS',          roles: ['Administrator', 'HR'] },
  { to: '/custodian',     icon: Package,       label: 'Custodian',     roles: ['Administrator', 'Custodian'] },
  { to: '/clinic',        icon: HeartPulse,    label: 'Clinic',        roles: ['Administrator', 'School Nurse'] },
  { to: '/library',       icon: Library,       label: 'Library',       roles: ['Administrator', 'Librarian'] },
  { to: '/front-office',  icon: MonitorCog,    label: 'Front Office',  roles: ['Administrator', 'Front Desk'] },
] as const;

interface ModuleSwitcherProps {
  /** The base path of the current module (e.g. '/admin') to exclude from the list */
  currentModule: string;
}

export function ModuleSwitcher({ currentModule }: ModuleSwitcherProps) {
  const { user, isImpersonating, originalUser } = useAuthStore();

  if (!user) return null;

  // Administrators use "Login As" instead — hide the switcher for them
  // Also hide during impersonation (the banner handles navigation back)
  const effectiveOriginalRole = isImpersonating ? originalUser?.access : user.access;
  if (effectiveOriginalRole === 'Administrator') return null;

  const allRoles = getAllRoles(user);

  // Show modules the user has access to, minus the current one
  const otherModules = modules.filter(
    (m) => m.to !== currentModule && m.roles.some((r) => allRoles.includes(r))
  );

  if (otherModules.length === 0) return null;

  return (
    <>
      <div className="px-3 pt-4 pb-1 group-data-[collapsible=icon]:hidden">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Switch Module
        </span>
      </div>
      <SidebarMenu>
        {otherModules.map((item) => (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton
              render={
                <NavLink
                  to={item.to}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                />
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </>
  );
}
