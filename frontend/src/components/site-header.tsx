import React from 'react';
import { useLocation } from 'react-router-dom';
import { ColorSwitcher } from '@/components/color-switcher';
import { DataSourceSwitcher } from '@/components/data-source-switcher';
import { NotificationBell } from '@/components/notification-bell';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import { useThemeStore } from '@/stores/theme-store';

const breadcrumbMap: Record<string, string[]> = {
  // Admin
  '/admin': ['Dashboard'],
  '/admin/school-preferences': ['School Settings', 'School Preferences'],
  '/admin/school-years': ['School Settings', 'School Years'],
  '/admin/users': ['School Settings', 'User Management'],
  '/admin/backups': ['System', 'Database Backups'],
  '/admin/activity-log': ['System', 'Activity Log'],
  // Registrar
  '/registrar': ['Dashboard'],
  '/registrar/students': ['Students'],
  '/registrar/classes': ['Students', 'Classes'],
  '/registrar/enrollment': ['Students', 'Enrollment'],
  '/registrar/applicants': ['Students', 'Applications'],
  '/registrar/requirements': ['Academic', 'Requirements'],
  '/registrar/discounts': ['Academic', 'Discounts'],
  '/registrar/reports': ['Reports'],
  '/registrar/import': ['Students', 'CSV Import'],
  // Accounting
  '/accounting': ['Dashboard'],
  '/accounting/assessments': ['Fee Setup', 'Assessments'],
  '/accounting/categories': ['Fee Setup', 'Categories'],
  '/accounting/particulars': ['Fee Setup', 'Particulars'],
  '/accounting/discounts': ['Fee Setup', 'Discounts'],
  '/accounting/discount-codes': ['Fee Setup', 'Discount Codes'],
  '/accounting/payment-terms': ['Fee Setup', 'Payment Terms'],
  '/accounting/cashiering': ['Cashiering'],
  '/accounting/nsf-cashiering': ['Cashiering', 'NSF Cashiering'],
  '/accounting/mass-transactions': ['Cashiering', 'Mass Transactions'],
  '/accounting/books': ['Student Accounts', 'Books'],
  '/accounting/transactions': ['Student Accounts', 'Transactions'],
  '/accounting/ledger': ['Student Accounts', 'Student Ledger'],
  '/accounting/receivables': ['Student Accounts', 'Receivables'],
  '/accounting/payables': ['Student Accounts', 'Payables'],
  '/accounting/advance-payments': ['Student Accounts', 'Advance Payments'],
  '/accounting/refunds': ['Student Accounts', 'Refunds'],
  '/accounting/chart-of-accounts': ['General Ledger', 'Chart of Accounts'],
  '/accounting/journal-entries': ['General Ledger', 'Journal Entries'],
  '/accounting/trial-balance': ['General Ledger', 'Trial Balance'],
  '/accounting/financial-statements': ['General Ledger', 'Financial Statements'],
  '/accounting/gl-settings': ['General Ledger', 'GL Settings'],
  '/accounting/reports': ['Reports'],
  // Teacher portal
  '/teacher': ['Dashboard'],
  '/teacher/my-classes': ['My Classes'],
  '/teacher/advisees': ['Advisees'],
  // Student portal
  '/student': ['Dashboard'],
  '/student/ledger': ['Ledger / SOA'],
  '/student/schedule': ['Schedule'],
  '/student/grades': ['Grades'],
  '/student/report-card': ['Report Card'],
  '/student/academic-history': ['Academic History'],
  '/student/attendance': ['Attendance'],
  '/student/announcements': ['Announcements'],
  '/student/materials': ['Learning Materials'],
  '/student/assignments': ['Assignments'],
  '/student/discussions': ['Discussions'],
  '/student/progress':    ['My Progress'],
  '/student/quizzes': ['Quiz'],
  '/student/enrollment': ['Enrollment'],
  // Applicant portal
  '/applicant': ['My Application'],
  // Parent portal
  '/parent': ['Dashboard'],
};

export function SiteHeader() {
  const location = useLocation();
  const { mode, setMode } = useThemeStore();

  const getTitles = (pathname: string): string[] => {
    if (breadcrumbMap[pathname]) return breadcrumbMap[pathname];
    if (/^\/student\/flashcards\/[^/]+\/match$/.test(pathname)) return ['Flashcards', 'Match'];
    if (/^\/student\/flashcards\/[^/]+\/study$/.test(pathname)) return ['Flashcards', 'Study'];
    if (/^\/student\/flashcards\/[^/]+\/quiz$/.test(pathname)) return ['Flashcards', 'Quiz'];
    if (/^\/student\/flashcards\/[^/]+$/.test(pathname)) return ['Flashcards', 'Deck'];
    if (/^\/student\/quizzes\/[^/]+$/.test(pathname)) return ['Quiz'];
    if (/^\/teacher\/my-classes\/[^/]+/.test(pathname)) return ['My Classes', 'Class Detail'];
    return [];
  };

  const titles = getTitles(location.pathname);

  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {titles.map((title, index) => (
              <React.Fragment key={index}>
                <BreadcrumbItem>
                  <BreadcrumbLink>{title}</BreadcrumbLink>
                </BreadcrumbItem>
                {index !== titles.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-3">
          <DataSourceSwitcher />
          <NotificationBell />
          <Switch
            checked={mode === 'dark'}
            onCheckedChange={(checked) => setMode(checked ? 'dark' : 'light')}
          />
          <ColorSwitcher />
        </div>
      </div>
    </header>
  );
}
