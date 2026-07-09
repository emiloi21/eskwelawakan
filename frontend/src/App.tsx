import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { Loader2 } from 'lucide-react';

// Layouts — kept eager (small, always needed for their route group)
import PublicLayout from '@/layouts/public-layout';
import AdminLayout from '@/layouts/admin-layout';
import RegistrarLayout from '@/layouts/registrar-layout';
import AccountingLayout from '@/layouts/accounting-layout';
import TeacherLayout from '@/layouts/teacher-layout';
import StudentLayout from '@/layouts/student-layout';
import ParentLayout from '@/layouts/parent-layout';
import HrmsLayout from '@/layouts/hrms-layout';
import CustodianLayout from '@/layouts/custodian-layout';
import ClinicLayout from '@/layouts/clinic-layout';
import LibraryLayout from '@/layouts/library-layout';
import FrontOfficeLayout from '@/layouts/front-office-layout';

// ── Lazy-loaded pages (each becomes its own chunk) ──────────────────
const HomePage = lazy(() => import('@/pages/home'));
const NewsPage = lazy(() => import('@/pages/news'));
const CalendarPage = lazy(() => import('@/pages/calendar'));
const GalleryPage = lazy(() => import('@/pages/gallery'));
const ContactPage = lazy(() => import('@/pages/contact'));
const LoginPage = lazy(() => import('@/pages/login'));
const PortalLoginPage = lazy(() => import('@/pages/portal-login'));
const AdminDashboard = lazy(() => import('@/pages/admin/dashboard'));
const SetupPage = lazy(() => import('@/pages/admin/setup'));
const SchoolPreferencesPage = lazy(() => import('@/pages/admin/school-preferences'));
const SchoolYearsPage = lazy(() => import('@/pages/admin/school-years'));
const UsersPage = lazy(() => import('@/pages/admin/users'));
const PortalAccountsPage = lazy(() => import('@/pages/admin/portal-accounts'));
const BackupsPage = lazy(() => import('@/pages/admin/backups'));
const ActivityLogPage = lazy(() => import('@/pages/admin/activity-log'));
// Admin CMS pages
const CmsSliderPage = lazy(() => import('@/pages/admin/cms/slider'));
const CmsNewsPage = lazy(() => import('@/pages/admin/cms/news'));
const AdminKioskPage = lazy(() => import('@/pages/admin/kiosk/index'));
const AdminKioskSlidesPage = lazy(() => import('@/pages/admin/kiosk/slides'));
const CmsGalleryPage = lazy(() => import('@/pages/admin/cms/gallery'));
const CmsGalleryAlbumPage = lazy(() => import('@/pages/admin/cms/gallery-album'));
const CmsEventsPage = lazy(() => import('@/pages/admin/cms/events'));
const BankAccountsPage = lazy(() => import('@/pages/admin/bank-accounts'));
const BankTransfersPage = lazy(() => import('@/pages/accounting/bank-transfers'));
// Public gallery album detail
const GalleryAlbumPage = lazy(() => import('@/pages/gallery-album'));
const RegistrarDashboard = lazy(() => import('@/pages/registrar/dashboard'));
const StudentListPage = lazy(() => import('@/pages/registrar/students'));
const StudentDetailPage = lazy(() => import('@/pages/registrar/student-detail'));
const ClassListPage = lazy(() => import('@/pages/registrar/classes'));
const EnrollmentPage = lazy(() => import('@/pages/registrar/enrollment'));
const RequirementsPage = lazy(() => import('@/pages/registrar/requirements'));
const ApplicantsPage = lazy(() => import('@/pages/registrar/applicants'));
const DiscountsPage = lazy(() => import('@/pages/registrar/discounts'));
const YearEndPage = lazy(() => import('@/pages/registrar/year-end'));
const ReportsPage = lazy(() => import('@/pages/registrar/reports'));
const ImportPage = lazy(() => import('@/pages/registrar/import'));
const ExamSlotsPage = lazy(() => import('@/pages/registrar/exam-slots'));

// Accounting pages
const AcctDashboard = lazy(() => import('@/pages/accounting/dashboard'));
const AssessmentsPage = lazy(() => import('@/pages/accounting/assessments'));
const AcctCategoriesPage = lazy(() => import('@/pages/accounting/categories'));
const ParticularsPage = lazy(() => import('@/pages/accounting/particulars'));
const AcctDiscountsPage = lazy(() => import('@/pages/accounting/discounts'));
const DiscountCodesPage = lazy(() => import('@/pages/accounting/discount-codes'));
const PaymentTermsPage = lazy(() => import('@/pages/accounting/payment-terms'));
const BooksPage = lazy(() => import('@/pages/accounting/books'));
const CashieringPage = lazy(() => import('@/pages/accounting/cashiering'));
const TransactionsPage = lazy(() => import('@/pages/accounting/transactions'));
const LedgerPage = lazy(() => import('@/pages/accounting/ledger'));
const RefundsPage = lazy(() => import('@/pages/accounting/refunds'));
const AcctReportsPage = lazy(() => import('@/pages/accounting/reports'));
const NsfCashieringPage = lazy(() => import('@/pages/accounting/nsf-cashiering'));
const MassTransactionsPage = lazy(() => import('@/pages/accounting/mass-transactions'));
const ReceivablesPage = lazy(() => import('@/pages/accounting/receivables'));
const PayablesPage = lazy(() => import('@/pages/accounting/payables'));
const AdvancePaymentsPage = lazy(() => import('@/pages/accounting/advance-payments'));
const ChartOfAccountsPage = lazy(() => import('@/pages/accounting/chart-of-accounts'));
const JournalEntriesPage = lazy(() => import('@/pages/accounting/journal-entries'));
const TrialBalancePage = lazy(() => import('@/pages/accounting/trial-balance'));
const FinancialStatementsPage = lazy(() => import('@/pages/accounting/financial-statements'));
const GlSettingsPage = lazy(() => import('@/pages/accounting/gl-settings'));
const ProfilePage = lazy(() => import('@/pages/profile'));

// Teacher portal pages
const TeacherDashboard = lazy(() => import('@/pages/teacher/dashboard'));
const MyClassesPage = lazy(() => import('@/pages/teacher/my-classes'));
const ClassDetailPage = lazy(() => import('@/pages/teacher/class-detail'));
const AdviseesPage = lazy(() => import('@/pages/teacher/advisees'));
const TeacherFlashcardsPage = lazy(() => import('@/pages/teacher/flashcards'));
const TeacherFlashcardNewPage = lazy(() => import('@/pages/teacher/flashcard-new'));
const TeacherFlashcardDetailPage = lazy(() => import('@/pages/teacher/flashcard-detail'));
const TeacherFlashcardResultsPage = lazy(() => import('@/pages/teacher/flashcard-results'));
const TeacherQuizBuilderPage = lazy(() => import('@/pages/teacher/quiz-builder'));
const TeacherLeavesPage = lazy(() => import('@/pages/teacher/leaves'));

// Student portal pages
const StudentDashboard = lazy(() => import('@/pages/student/dashboard'));
const StudentSchedulePage = lazy(() => import('@/pages/student/schedule'));
const StudentGradesPage = lazy(() => import('@/pages/student/grades'));
const StudentLedgerPage = lazy(() => import('@/pages/student/ledger'));
const StudentReportCardPage = lazy(() => import('@/pages/student/report-card'));
const StudentAcademicHistoryPage = lazy(() => import('@/pages/student/academic-history'));
const StudentAttendancePage = lazy(() => import('@/pages/student/attendance'));
const StudentAnnouncementsPage = lazy(() => import('@/pages/student/announcements'));
const StudentMaterialsPage = lazy(() => import('@/pages/student/materials'));
const StudentAssignmentsPage = lazy(() => import('@/pages/student/assignments'));
const StudentDiscussionsPage = lazy(() => import('@/pages/student/discussions'));
const StudentProgressPage    = lazy(() => import('@/pages/student/progress'));
const StudentQuizPage = lazy(() => import('@/pages/student/quiz'));
const StudentFlashcardsPage = lazy(() => import('@/pages/student/flashcards'));
const StudentFlashcardDeckPage = lazy(() => import('@/pages/student/flashcard-deck'));
const StudentFlashcardStudyPage = lazy(() => import('@/pages/student/flashcard-study'));
const StudentFlashcardQuizPage = lazy(() => import('@/pages/student/flashcard-quiz'));
const StudentFlashcardMatchPage = lazy(() => import('@/pages/student/flashcard-match'));
const StudentFlashcardReviewPage = lazy(() => import('@/pages/student/flashcard-review'));

// Parent portal pages
const ParentDashboard = lazy(() => import('@/pages/parent/dashboard'));
const ChildDetailPage = lazy(() => import('@/pages/parent/child-detail'));

// Applicant portal pages
const ApplyPage = lazy(() => import('@/pages/apply'));
const ApplicantLayout = lazy(() => import('@/layouts/applicant-layout'));
const ApplicantDashboard = lazy(() => import('@/pages/applicant/dashboard'));
const StudentEnrollmentPage = lazy(() => import('@/pages/student/enrollment'));

// HRMS portal pages
const KioskPage = lazy(() => import('@/pages/kiosk/index'));
const HrmsDashboard = lazy(() => import('@/pages/hrms/dashboard'));
const HrmsPersonnelPage = lazy(() => import('@/pages/hrms/personnel'));
const HrmsDepartmentsPage = lazy(() => import('@/pages/hrms/departments'));
const HrmsLeaveTypesPage = lazy(() => import('@/pages/hrms/leave-types'));
const HrmsLeavesPage = lazy(() => import('@/pages/hrms/leaves'));
const HrmsAttendancePage = lazy(() => import('@/pages/hrms/attendance'));
const HrmsPayrollPage = lazy(() => import('@/pages/hrms/payroll'));
const HrmsPayrollPeriodPage = lazy(() => import('@/pages/hrms/payroll-period'));
const HrmsPayrollSettingsPage = lazy(() => import('@/pages/hrms/payroll-settings'));

// Custodian portal pages
const CustodianDashboard = lazy(() => import('@/pages/custodian/dashboard'));
const CustodianPropertyPage = lazy(() => import('@/pages/custodian/property'));
const CustodianConsumablesPage = lazy(() => import('@/pages/custodian/consumables'));
const CustodianFacilitiesPage = lazy(() => import('@/pages/custodian/facilities'));
const CustodianBookingsPage = lazy(() => import('@/pages/custodian/bookings'));
const CustodianSupplyRequestsPage = lazy(() => import('@/pages/custodian/supply-requests'));
const CustodianInventoryPage = lazy(() => import('@/pages/custodian/inventory'));

// Shared feature pages
const MySupplyRequestsPage = lazy(() => import('@/pages/shared/my-supply-requests'));
const MyInventoryTasksPage = lazy(() => import('@/pages/shared/my-inventory-tasks'));
const ClearancePage = lazy(() => import('@/pages/clearance/index'));
const ClearanceTemplatesPage = lazy(() => import('@/pages/admin/clearance-templates'));

// Shared pages
const MessagesPage = lazy(() => import('@/pages/messages'));

// Clinic portal pages
const ClinicDashboard = lazy(() => import('@/pages/clinic/dashboard'));
const ClinicHealthRecordsPage = lazy(() => import('@/pages/clinic/health-records'));
const ClinicVisitsPage = lazy(() => import('@/pages/clinic/visits'));
const ClinicIncidentsPage = lazy(() => import('@/pages/clinic/incidents'));

// Library portal pages
const LibraryDashboard = lazy(() => import('@/pages/library/dashboard'));
const LibraryBooksPage = lazy(() => import('@/pages/library/books'));
const LibraryCategoriesPage = lazy(() => import('@/pages/library/categories'));
const LibraryBorrowingsPage = lazy(() => import('@/pages/library/borrowings'));
const LibraryOverduePage = lazy(() => import('@/pages/library/overdue'));

// Front Office portal pages
const FrontOfficeDashboard = lazy(() => import('@/pages/front-office/dashboard'));
const FrontOfficeVisitorsPage = lazy(() => import('@/pages/front-office/visitors'));
const FrontOfficeGatePassesPage = lazy(() => import('@/pages/front-office/gate-passes'));
const FrontOfficeCorrespondencePage = lazy(() => import('@/pages/front-office/correspondence'));

// Admin downloads
const AdminDownloadsPage = lazy(() => import('@/pages/admin/downloads'));

// Decision Support System (DSS)
const DssDashboardPage       = lazy(() => import('@/pages/admin/dss/DssDashboardPage'));
const DssEnrollmentPage      = lazy(() => import('@/pages/admin/dss/DssEnrollmentPage'));
const DssAcademicHealthPage  = lazy(() => import('@/pages/admin/dss/DssAcademicHealthPage'));
const DssResourcesPage       = lazy(() => import('@/pages/admin/dss/DssResourcesPage'));
const DssWarningsPage        = lazy(() => import('@/pages/admin/dss/DssWarningsPage'));
const DssRecommendationsPage = lazy(() => import('@/pages/admin/dss/DssRecommendationsPage'));
const DssReportsPage         = lazy(() => import('@/pages/admin/dss/DssReportsPage'));

// Guidance Office
const GuidanceDashboardPage    = lazy(() => import('@/pages/admin/guidance/GuidanceDashboardPage'));
const GuidanceCaseListPage     = lazy(() => import('@/pages/admin/guidance/GuidanceCaseListPage'));
const GuidanceCaseDetailPage   = lazy(() => import('@/pages/admin/guidance/GuidanceCaseDetailPage'));
const GuidanceReferralPage     = lazy(() => import('@/pages/admin/guidance/GuidanceReferralPage'));
const GuidanceAnecdotalPage    = lazy(() => import('@/pages/admin/guidance/GuidanceAnecdotalPage'));
const GuidanceGroupSessionPage = lazy(() => import('@/pages/admin/guidance/GuidanceGroupSessionPage'));
const GuidanceReportsPage      = lazy(() => import('@/pages/admin/guidance/GuidanceReportsPage'));

// Shared downloads
const SharedDownloadsPage = lazy(() => import('@/pages/shared/downloads'));

// Student additions
const StudentHealthRecordPage = lazy(() => import('@/pages/student/health-record'));
const StudentFacilitiesPage = lazy(() => import('@/pages/student/facilities'));

// Teacher analytics
const ClassAnalyticsPage = lazy(() => import('@/pages/teacher/class-analytics'));

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Unauthorized() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">403 — Unauthorized</h1>
        <p className="text-muted-foreground">You do not have permission to access this page.</p>
        <a href="/login" className="text-primary underline">Back to login</a>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public website */}
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="news" element={<NewsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="gallery/:slug" element={<GalleryAlbumPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="apply" element={<ApplyPage />} />
          </Route>

          <Route path="/login" element={<LoginPage />} />
          <Route path="/portal-login" element={<PortalLoginPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Kiosk — standalone, no auth */}
          <Route path="/kiosk" element={<KioskPage />} />

          {/* Admin portal */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['Administrator', 'Guidance Counselor']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="setup" element={<SetupPage />} />
            <Route path="school-preferences" element={<SchoolPreferencesPage />} />
            <Route path="school-years" element={<SchoolYearsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="portal-accounts" element={<PortalAccountsPage />} />
            <Route path="backups" element={<BackupsPage />} />
            <Route path="activity-log" element={<ActivityLogPage />} />
            <Route path="profile" element={<ProfilePage />} />
            {/* Website CMS */}
            <Route path="cms/slider" element={<CmsSliderPage />} />
            <Route path="cms/news" element={<CmsNewsPage />} />
            <Route path="cms/gallery" element={<CmsGalleryPage />} />
            <Route path="cms/gallery/:albumId" element={<CmsGalleryAlbumPage />} />
            <Route path="cms/events" element={<CmsEventsPage />} />
            <Route path="bank-accounts" element={<BankAccountsPage />} />
            {/* Kiosk Management */}
            <Route path="kiosk" element={<AdminKioskPage />} />
            <Route path="kiosk/slides" element={<AdminKioskSlidesPage />} />
            <Route path="clearance-templates" element={<ClearanceTemplatesPage />} />
            <Route path="downloads" element={<AdminDownloadsPage />} />
            {/* Decision Support System */}
            <Route path="dss/dashboard"       element={<DssDashboardPage />} />
            <Route path="dss/enrollment"      element={<DssEnrollmentPage />} />
            <Route path="dss/academic-health" element={<DssAcademicHealthPage />} />
            <Route path="dss/resources"       element={<DssResourcesPage />} />
            <Route path="dss/warnings"        element={<DssWarningsPage />} />
            <Route path="dss/recommendations" element={<DssRecommendationsPage />} />
            <Route path="dss/reports"         element={<DssReportsPage />} />
            {/* Guidance Office */}
            <Route path="guidance/dashboard"      element={<GuidanceDashboardPage />} />
            <Route path="guidance/referrals"      element={<GuidanceReferralPage />} />
            <Route path="guidance/cases"          element={<GuidanceCaseListPage />} />
            <Route path="guidance/cases/:publicId" element={<GuidanceCaseDetailPage />} />
            <Route path="guidance/anecdotals"     element={<GuidanceAnecdotalPage />} />
            <Route path="guidance/group-sessions" element={<GuidanceGroupSessionPage />} />
            <Route path="guidance/reports"        element={<GuidanceReportsPage />} />
          </Route>

          {/* Registrar / SIS portal */}
          <Route
            path="/registrar"
            element={
              <ProtectedRoute roles={['Administrator', 'Registrar', 'Encoder']}>
                <RegistrarLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RegistrarDashboard />} />
            <Route path="students" element={<StudentListPage />} />
            <Route path="students/:regId" element={<StudentDetailPage />} />
            <Route path="classes" element={<ClassListPage />} />
            <Route path="enrollment" element={<EnrollmentPage />} />
            <Route path="applicants" element={<ApplicantsPage />} />
            <Route path="requirements" element={<RequirementsPage />} />
            <Route path="discounts" element={<DiscountsPage />} />
            <Route path="year-end" element={<YearEndPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="exam-slots" element={<ExamSlotsPage />} />
            <Route path="supply-requests" element={<MySupplyRequestsPage />} />
            <Route path="inventory-tasks" element={<MyInventoryTasksPage />} />
            <Route path="clearance" element={<ClearancePage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Accounting portal */}
          <Route
            path="/accounting"
            element={
              <ProtectedRoute roles={['Administrator', 'Accounting Staff', 'Cashier']}>
                <AccountingLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AcctDashboard />} />
            <Route path="assessments" element={<AssessmentsPage />} />
            <Route path="categories" element={<AcctCategoriesPage />} />
            <Route path="particulars" element={<ParticularsPage />} />
            <Route path="discounts" element={<AcctDiscountsPage />} />
            <Route path="discount-codes" element={<DiscountCodesPage />} />
            <Route path="payment-terms" element={<PaymentTermsPage />} />
            <Route path="books" element={<BooksPage />} />
            <Route path="cashiering" element={<CashieringPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="ledger" element={<LedgerPage />} />
            <Route path="refunds" element={<RefundsPage />} />
            <Route path="reports" element={<AcctReportsPage />} />
            <Route path="nsf-cashiering" element={<NsfCashieringPage />} />
            <Route path="mass-transactions" element={<MassTransactionsPage />} />
            <Route path="receivables" element={<ReceivablesPage />} />
            <Route path="payables" element={<PayablesPage />} />
            <Route path="advance-payments" element={<AdvancePaymentsPage />} />
            <Route path="chart-of-accounts" element={<ChartOfAccountsPage />} />
            <Route path="journal-entries" element={<JournalEntriesPage />} />
            <Route path="trial-balance" element={<TrialBalancePage />} />
            <Route path="financial-statements" element={<FinancialStatementsPage />} />
            <Route path="gl-settings" element={<GlSettingsPage />} />
            <Route path="bank-transfers" element={<BankTransfersPage />} />
            <Route path="supply-requests" element={<MySupplyRequestsPage />} />
            <Route path="inventory-tasks" element={<MyInventoryTasksPage />} />
            <Route path="clearance" element={<ClearancePage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Teacher portal */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute roles={['Administrator', 'Teacher']}>
                <TeacherLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TeacherDashboard />} />
            <Route path="my-classes" element={<MyClassesPage />} />
            <Route path="my-classes/:classId" element={<ClassDetailPage />} />
            <Route path="my-classes/:classId/quiz/:publicId" element={<TeacherQuizBuilderPage />} />
            <Route path="advisees" element={<AdviseesPage />} />
            <Route path="flashcards" element={<TeacherFlashcardsPage />} />
            <Route path="flashcards/new" element={<TeacherFlashcardNewPage />} />
            <Route path="flashcards/:deckId" element={<TeacherFlashcardDetailPage />} />
            <Route path="flashcards/:deckId/results" element={<TeacherFlashcardResultsPage />} />
            <Route path="my-classes/:classId/analytics" element={<ClassAnalyticsPage />} />
            <Route path="supply-requests" element={<MySupplyRequestsPage />} />
            <Route path="inventory-tasks" element={<MyInventoryTasksPage />} />
            <Route path="clearance" element={<ClearancePage />} />
            <Route path="leaves" element={<TeacherLeavesPage />} />
            <Route path="downloads" element={<SharedDownloadsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Student portal */}
          <Route
            path="/student"
            element={
              <ProtectedRoute roles={['Administrator', 'Student']}>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="schedule" element={<StudentSchedulePage />} />
            <Route path="grades" element={<StudentGradesPage />} />
            <Route path="ledger" element={<StudentLedgerPage />} />
            <Route path="report-card" element={<StudentReportCardPage />} />
            <Route path="academic-history" element={<StudentAcademicHistoryPage />} />
            <Route path="attendance" element={<StudentAttendancePage />} />
            <Route path="announcements" element={<StudentAnnouncementsPage />} />
            <Route path="materials" element={<StudentMaterialsPage />} />
            <Route path="assignments" element={<StudentAssignmentsPage />} />
            <Route path="discussions" element={<StudentDiscussionsPage />} />
            <Route path="progress" element={<StudentProgressPage />} />
            <Route path="quizzes/:publicId" element={<StudentQuizPage />} />
            <Route path="flashcards" element={<StudentFlashcardsPage />} />
            <Route path="flashcards/review" element={<StudentFlashcardReviewPage />} />
            <Route path="flashcards/:deckId" element={<StudentFlashcardDeckPage />} />
            <Route path="flashcards/:deckId/study" element={<StudentFlashcardStudyPage />} />
            <Route path="flashcards/:deckId/quiz" element={<StudentFlashcardQuizPage />} />
            <Route path="flashcards/:deckId/match" element={<StudentFlashcardMatchPage />} />
            <Route path="enrollment" element={<StudentEnrollmentPage />} />
            <Route path="health-record" element={<StudentHealthRecordPage />} />
            <Route path="facilities" element={<StudentFacilitiesPage />} />
            <Route path="downloads" element={<SharedDownloadsPage />} />
            <Route path="clearance" element={<ClearancePage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Applicant portal */}
          <Route
            path="/applicant"
            element={
              <ProtectedRoute roles={['Applicant']}>
                <ApplicantLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ApplicantDashboard />} />
          </Route>

          {/* HRMS portal */}
          <Route
            path="/hrms"
            element={
              <ProtectedRoute roles={['Administrator', 'HR']}>
                <HrmsLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HrmsDashboard />} />
            <Route path="personnel" element={<HrmsPersonnelPage />} />
            <Route path="departments" element={<HrmsDepartmentsPage />} />
            <Route path="leave-types" element={<HrmsLeaveTypesPage />} />
            <Route path="leaves" element={<HrmsLeavesPage />} />
            <Route path="attendance" element={<HrmsAttendancePage />} />
            <Route path="payroll" element={<HrmsPayrollPage />} />
            <Route path="payroll/:periodId" element={<HrmsPayrollPeriodPage />} />
            <Route path="payroll-settings" element={<HrmsPayrollSettingsPage />} />
            <Route path="supply-requests" element={<MySupplyRequestsPage />} />
            <Route path="inventory-tasks" element={<MyInventoryTasksPage />} />
            <Route path="clearance" element={<ClearancePage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Custodian portal */}
          <Route
            path="/custodian"
            element={
              <ProtectedRoute roles={['Administrator', 'Custodian']}>
                <CustodianLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<CustodianDashboard />} />
            <Route path="property" element={<CustodianPropertyPage />} />
            <Route path="consumables" element={<CustodianConsumablesPage />} />
            <Route path="facilities" element={<CustodianFacilitiesPage />} />
            <Route path="bookings" element={<CustodianBookingsPage />} />
            <Route path="supply-requests" element={<CustodianSupplyRequestsPage />} />
            <Route path="inventory" element={<CustodianInventoryPage />} />
            <Route path="clearance-templates" element={<ClearanceTemplatesPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route path="/parent"
            element={
              <ProtectedRoute roles={['Administrator', 'Parent']}>
                <ParentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ParentDashboard />} />
            <Route path="children/:publicId" element={<ChildDetailPage />} />
            <Route path="downloads" element={<SharedDownloadsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Clinic portal */}
          <Route
            path="/clinic"
            element={
              <ProtectedRoute roles={['Administrator', 'School Nurse']}>
                <ClinicLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ClinicDashboard />} />
            <Route path="health-records" element={<ClinicHealthRecordsPage />} />
            <Route path="visits" element={<ClinicVisitsPage />} />
            <Route path="incidents" element={<ClinicIncidentsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Library portal */}
          <Route
            path="/library"
            element={
              <ProtectedRoute roles={['Administrator', 'Librarian']}>
                <LibraryLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<LibraryDashboard />} />
            <Route path="books" element={<LibraryBooksPage />} />
            <Route path="categories" element={<LibraryCategoriesPage />} />
            <Route path="borrowings" element={<LibraryBorrowingsPage />} />
            <Route path="overdue" element={<LibraryOverduePage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Front Office portal */}
          <Route
            path="/front-office"
            element={
              <ProtectedRoute roles={['Administrator', 'Front Desk']}>
                <FrontOfficeLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<FrontOfficeDashboard />} />
            <Route path="visitors" element={<FrontOfficeVisitorsPage />} />
            <Route path="gate-passes" element={<FrontOfficeGatePassesPage />} />
            <Route path="correspondence" element={<FrontOfficeCorrespondencePage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
