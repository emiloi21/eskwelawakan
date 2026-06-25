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
  LogOut,
  ChevronUp,
  Receipt,
  CreditCard,
  FileBarChart,
  Settings,
  Users,
  BookText,
  BookOpenCheck,
  Briefcase,
} from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { SubNav, type NavCategory } from '@/components/sub-nav';
import { ModuleSwitcher } from '@/components/module-switcher';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';

// ── Category definitions ───────────────────────────────────────────
export const accountingCategories: NavCategory[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/accounting', end: true, items: [] },
  {
    label: 'Fee Setup',
    icon: Settings,
    items: [
      { to: '/accounting/particulars', label: 'Particulars' },
      { to: '/accounting/categories', label: 'Categories' },
      { to: '/accounting/assessments', label: 'Assessments' },
      { to: '/accounting/discounts', label: 'Discounts' },
      { to: '/accounting/discount-codes', label: 'Discount Codes' },
      { to: '/accounting/payment-terms', label: 'Payment Terms' },
    ],
  },
  {
    label: 'Cashiering',
    icon: CreditCard,
    items: [
      { to: '/accounting/cashiering', label: 'Cashiering' },
      { to: '/accounting/nsf-cashiering', label: 'NSF Cashiering' },
      { to: '/accounting/mass-transactions', label: 'Mass Transactions' },
      { to: '/accounting/bank-transfers', label: 'Bank Transfers' },
    ],
  },
  {
    label: 'Student Accounts',
    icon: BookText,
    items: [
      { to: '/accounting/books', label: 'Books' },
      { to: '/accounting/transactions', label: 'Transactions' },
      { to: '/accounting/ledger', label: 'Student Ledger' },
      { to: '/accounting/receivables', label: 'Receivables' },
      { to: '/accounting/payables', label: 'Payables' },
      { to: '/accounting/advance-payments', label: 'Advance Payments' },
      { to: '/accounting/refunds', label: 'Refunds' },
    ],
  },
  {
    label: 'General Ledger',
    icon: BookOpenCheck,
    items: [
      { to: '/accounting/chart-of-accounts', label: 'Chart of Accounts' },
      { to: '/accounting/journal-entries', label: 'Journal Entries' },
      { to: '/accounting/trial-balance', label: 'Trial Balance' },
      { to: '/accounting/financial-statements', label: 'Financial Statements' },
      { to: '/accounting/gl-settings', label: 'GL Settings' },
    ],
  },
  { label: 'Reports', icon: FileBarChart, to: '/accounting/reports', end: true, items: [] },
  {
    label: 'Operations',
    icon: Briefcase,
    items: [
      { to: '/accounting/supply-requests', label: 'Supply Requests' },
      { to: '/accounting/inventory-tasks', label: 'Inventory Tasks' },
      { to: '/accounting/clearance', label: 'Clearance' },
    ],
  },
];

// ── Sidebar category item ──────────────────────────────────────────
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

export default function AccountingLayout() {
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
              <Receipt className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold">SVHS Accounting</span>
              <span className="text-xs text-muted-foreground">Student Accounts</span>
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
            {accountingCategories.map((cat) => (
              <CategoryNavItem key={cat.label} cat={cat} />
            ))}
          </SidebarMenu>
          <ModuleSwitcher currentModule="/accounting" />
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
                  <DropdownMenuItem onClick={() => navigate('/accounting/profile')}>
                    <Users className="mr-2 h-4 w-4" />
                    My Profile
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
        <SubNav categories={accountingCategories} />
        <div className="flex flex-1 flex-col min-h-0">
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 min-h-0">
            <Suspense fallback={<div className="flex items-center justify-center flex-1"><span className="text-muted-foreground">Loading...</span></div>}>
              <ModuleGate moduleKey="accounting" moduleLabel="Accounting">
                <Outlet />
              </ModuleGate>
            </Suspense>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
