<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\LookupController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\SchoolPreferenceController;
use App\Http\Controllers\Admin\SchoolYearController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\PortalAccountController;
use App\Http\Controllers\Enrollment\EnrollmentApplicationController;
use App\Http\Controllers\Applicant\ApplicantPortalController;
use App\Http\Controllers\Student\StudentEnrollmentController;
use App\Http\Controllers\Admin\BackupController;
use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Registrar\StudentController;
use App\Http\Controllers\Registrar\ClassController;
use App\Http\Controllers\Registrar\RequirementController;
use App\Http\Controllers\Registrar\EnrollmentController;
use App\Http\Controllers\Registrar\DiscountController;
use App\Http\Controllers\Registrar\ReportController;
use App\Http\Controllers\Registrar\ImportController;
use App\Http\Controllers\Registrar\AnalyticsController;
use App\Http\Controllers\Registrar\EntranceExamController;
use App\Http\Controllers\Accounting\AssessmentController;
use App\Http\Controllers\Accounting\CategoryController;
use App\Http\Controllers\Accounting\ParticularController;
use App\Http\Controllers\Accounting\CatParticularController;
use App\Http\Controllers\Accounting\StudentAssessmentController;
use App\Http\Controllers\Accounting\PaymentController;
use App\Http\Controllers\Accounting\LedgerController;
use App\Http\Controllers\Accounting\PaymentTermController;
use App\Http\Controllers\Accounting\BookController;
use App\Http\Controllers\Accounting\RefundController;
use App\Http\Controllers\Accounting\DiscountController as AccountingDiscountController;
use App\Http\Controllers\Accounting\DiscountCodeController;
use App\Http\Controllers\Accounting\ReportController as AccountingReportController;
use App\Http\Controllers\Accounting\DashboardController as AccountingDashboardController;
use App\Http\Controllers\Accounting\NsfPaymentController;
use App\Http\Controllers\Accounting\MassTransactionController;
use App\Http\Controllers\Accounting\ReceivableController;
use App\Http\Controllers\Accounting\PayableController;
use App\Http\Controllers\Accounting\AdvancePaymentController;
use App\Http\Controllers\Accounting\ChartOfAccountController;
use App\Http\Controllers\Accounting\JournalEntryController;
use App\Http\Controllers\Teacher\TeacherPortalController;
use App\Http\Controllers\Teacher\LmsAssignmentController;
use App\Http\Controllers\Teacher\LmsQuizController;
use App\Http\Controllers\Teacher\LmsDiscussionController;
use App\Http\Controllers\Teacher\LmsAnalyticsController;
use App\Http\Controllers\Student\StudentPortalController;
use App\Http\Controllers\Student\LmsStudentController;
use App\Http\Controllers\Student\LmsQuizStudentController;
use App\Http\Controllers\Student\LmsDiscussionStudentController;
use App\Http\Controllers\Parent\ParentPortalController;
use App\Http\Controllers\Flashcard\FlashcardController;
use App\Http\Controllers\Flashcard\FlashcardStudentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\Payment\PaymentGatewayController;
use App\Http\Controllers\Payment\BankTransferController;
use App\Http\Controllers\Admin\BankAccountController;
use App\Http\Controllers\Hrms\HrmsController;
use App\Http\Controllers\Hrms\LeaveController;
use App\Http\Controllers\Kiosk\KioskController;
use App\Http\Controllers\Admin\KioskManagementController;
use App\Http\Controllers\Payroll\PayrollController;
use App\Http\Controllers\Custodian\CustodianController;
use App\Http\Controllers\Custodian\FacilityController;
use App\Http\Controllers\Custodian\SupplyRequestController;
use App\Http\Controllers\Custodian\InventoryCheckController;
use App\Http\Controllers\Clearance\ClearanceController;
use App\Http\Controllers\Admin\OnboardingController;
use App\Http\Controllers\Admin\DesignationController;
use App\Http\Controllers\Admin\CmsNewsController;
use App\Http\Controllers\Admin\CmsGalleryController;
use App\Http\Controllers\Admin\CmsEventController;
use App\Http\Controllers\Admin\CmsSliderController;
use App\Http\Controllers\Public\PublicCmsController;
use App\Http\Controllers\Library\LibraryController;
use App\Http\Controllers\FrontOffice\FrontOfficeController;
use App\Http\Controllers\Downloads\DownloadController;
use App\Http\Controllers\Clinic\ClinicController;

// Public PayMongo webhook (must be before auth middleware)
Route::post('/webhooks/paymongo', [PaymentGatewayController::class, 'webhook']);

// Public kiosk scan (no auth — kiosk machines are unauthenticated)
Route::post('/kiosk/scan', [KioskController::class, 'scan'])->middleware('throttle:120,1');
Route::get('/kiosk/slides', [KioskController::class, 'publicSlides']);
Route::get('/kiosk/recent-logs', [KioskController::class, 'recentLogs']);

// Public routes
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login')->name('login');
Route::get('/school-info', [SchoolPreferenceController::class, 'publicInfo']);

// Public CMS (read-only, no auth)
Route::prefix('public')->group(function () {
    Route::get('/news', [PublicCmsController::class, 'news']);
    Route::get('/news/{slug}', [PublicCmsController::class, 'newsArticle']);
    Route::get('/gallery', [PublicCmsController::class, 'albums']);
    Route::get('/gallery/{slug}', [PublicCmsController::class, 'albumPhotos']);
    Route::get('/events', [PublicCmsController::class, 'events']);
    Route::get('/sliders', [PublicCmsController::class, 'sliders']);
});

// Public Download Center (no auth — publicly visible files)
Route::get('/downloads/public', [DownloadController::class, 'publicList']);

// Secure File Downloads (signed URL)
Route::get('/files/requirements/{publicId}', [\App\Http\Controllers\FileDownloadController::class, 'downloadRequirement'])
    ->name('files.requirement.download')
    ->middleware('signed');

// Public enrollment application
Route::get('/apply-info', [EnrollmentApplicationController::class, 'info']);
Route::post('/apply', [EnrollmentApplicationController::class, 'apply'])->middleware('throttle:60,1');

// Authenticated routes
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {

    // Auth
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::put('/auth/password', [AuthController::class, 'changePassword']);

    // Shared lookups (all authenticated users)
    Route::get('/lookups', [LookupController::class, 'index']);

    // In-app notifications (all authenticated users)
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::post('/{id}/read', [NotificationController::class, 'markRead']);
        Route::post('/read-all', [NotificationController::class, 'markAllRead']);
    });

    // Messaging (all authenticated users)
    Route::prefix('messages')->group(function () {
        Route::get('/contacts', [MessageController::class, 'contacts']);
        Route::get('/inbox',    [MessageController::class, 'inbox']);
        Route::get('/sent',     [MessageController::class, 'sent']);
        Route::get('/{id}',     [MessageController::class, 'show']);
        Route::post('/',        [MessageController::class, 'store']);
        Route::post('/{id}/read',  [MessageController::class, 'markRead']);
        Route::delete('/{id}', [MessageController::class, 'destroy']);
    });

    // Admin routes (Administrator only)
    Route::middleware('role:Administrator')->prefix('admin')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->middleware('throttle:60,1');
        Route::get('/onboarding-status', [OnboardingController::class, 'status']);

        // School Preferences
        Route::get('/school-preferences', [SchoolPreferenceController::class, 'show']);
        Route::put('/school-preferences', [SchoolPreferenceController::class, 'update']);
        Route::post('/school-preferences/logo', [SchoolPreferenceController::class, 'uploadLogo']);
        Route::put('/school-preferences/gl-accounts', [SchoolPreferenceController::class, 'updateGlAccounts']);

        // School Years
        Route::post('/school-years/set-active-semester', [SchoolYearController::class, 'setActiveSemester']);
        Route::apiResource('school-years', SchoolYearController::class);
        Route::post('/school-years/{school_year}/activate', [SchoolYearController::class, 'activate']);
        Route::get('/school-years/{school_year}/fiscal-year-preview', [SchoolYearController::class, 'fiscalYearPreview']);
        Route::post('/school-years/{school_year}/fiscal-year-closing', [SchoolYearController::class, 'processFiscalYearClosing']);

        // Users (staff accounts)
        Route::apiResource('users', UserController::class);
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);
        Route::get('/personnel-search', [UserController::class, 'personnelSearch']);

        // User Designations
        Route::get('/users/{userId}/designations',           [DesignationController::class, 'index']);
        Route::post('/users/{userId}/designations',          [DesignationController::class, 'store']);
        Route::put('/users/{userId}/designations/{id}',      [DesignationController::class, 'update']);
        Route::delete('/users/{userId}/designations/{id}',   [DesignationController::class, 'destroy']);

        // Portal Accounts (Student / Teacher / Parent)
        Route::get('/portal-accounts/search-students', [PortalAccountController::class, 'searchStudents']);
        Route::get('/portal-accounts/search-faculty', [PortalAccountController::class, 'searchFaculty']);
        Route::get('/portal-accounts', [PortalAccountController::class, 'index']);
        Route::post('/portal-accounts', [PortalAccountController::class, 'store']);
        Route::put('/portal-accounts/{user}', [PortalAccountController::class, 'update']);
        Route::post('/portal-accounts/{user}/reset-password', [PortalAccountController::class, 'resetPassword']);
        Route::post('/portal-accounts/{user}/toggle-status', [PortalAccountController::class, 'toggleStatus']);

        // Database Backups
        Route::get('/backups', [BackupController::class, 'index']);
        Route::post('/backups', [BackupController::class, 'store']);
        Route::get('/backups/{name}/download', [BackupController::class, 'download']);
        Route::delete('/backups/{name}', [BackupController::class, 'destroy']);

        // Activity Log
        Route::get('/activity-log', [ActivityLogController::class, 'index']);
        Route::get('/activity-log/events', [ActivityLogController::class, 'events']);

        // CMS — News
        Route::get('/cms/news', [CmsNewsController::class, 'index']);
        Route::post('/cms/news', [CmsNewsController::class, 'store']);
        Route::get('/cms/news/{cmsNews}', [CmsNewsController::class, 'show']);
        Route::put('/cms/news/{cmsNews}', [CmsNewsController::class, 'update']);
        Route::delete('/cms/news/{cmsNews}', [CmsNewsController::class, 'destroy']);
        Route::post('/cms/news/{cmsNews}/cover', [CmsNewsController::class, 'uploadCover']);

        // CMS — Gallery Albums
        Route::get('/cms/albums', [CmsGalleryController::class, 'index']);
        Route::post('/cms/albums', [CmsGalleryController::class, 'storeAlbum']);
        Route::get('/cms/albums/{album}', [CmsGalleryController::class, 'showAlbum']);
        Route::put('/cms/albums/{album}', [CmsGalleryController::class, 'updateAlbum']);
        Route::delete('/cms/albums/{album}', [CmsGalleryController::class, 'destroyAlbum']);
        Route::post('/cms/albums/{album}/cover', [CmsGalleryController::class, 'uploadAlbumCover']);
        Route::post('/cms/albums/{album}/photos', [CmsGalleryController::class, 'uploadPhoto']);
        Route::delete('/cms/albums/{album}/photos/{photo}', [CmsGalleryController::class, 'destroyPhoto']);

        // CMS — Events
        Route::get('/cms/events', [CmsEventController::class, 'index']);
        Route::post('/cms/events', [CmsEventController::class, 'store']);
        Route::get('/cms/events/{cmsEvent}', [CmsEventController::class, 'show']);
        Route::put('/cms/events/{cmsEvent}', [CmsEventController::class, 'update']);
        Route::delete('/cms/events/{cmsEvent}', [CmsEventController::class, 'destroy']);

        // CMS — Sliders
        Route::get('/cms/sliders', [CmsSliderController::class, 'index']);
        Route::post('/cms/sliders', [CmsSliderController::class, 'store']);
        Route::get('/cms/sliders/{cmsSlider}', [CmsSliderController::class, 'show']);
        Route::put('/cms/sliders/{cmsSlider}', [CmsSliderController::class, 'update']);
        Route::delete('/cms/sliders/{cmsSlider}', [CmsSliderController::class, 'destroy']);
        Route::post('/cms/sliders/{cmsSlider}/bg', [CmsSliderController::class, 'uploadBg']);
        Route::post('/cms/sliders/reorder', [CmsSliderController::class, 'reorder']);

        // Kiosk Management
        Route::get('/kiosk-management', [KioskManagementController::class, 'index']);
        Route::get('/kiosk-management/stats', [KioskManagementController::class, 'stats']);
        Route::post('/kiosk-management', [KioskManagementController::class, 'store']);
        Route::post('/kiosk-management/device-register', [KioskManagementController::class, 'deviceRegister']);
        Route::put('/kiosk-management/{kiosk}', [KioskManagementController::class, 'update']);
        Route::delete('/kiosk-management/{kiosk}', [KioskManagementController::class, 'destroy']);
        Route::get('/kiosk-management/slides', [KioskManagementController::class, 'slides']);
        Route::post('/kiosk-management/slides', [KioskManagementController::class, 'storeSlide']);
        Route::put('/kiosk-management/slides/{slide}', [KioskManagementController::class, 'updateSlide']);
        Route::post('/kiosk-management/slides/{slide}/image', [KioskManagementController::class, 'uploadSlideImage']);
        Route::delete('/kiosk-management/slides/{slide}', [KioskManagementController::class, 'destroySlide']);

        // Bank / E-Wallet Accounts (payment channels configuration)
        Route::get('/bank-accounts', [BankAccountController::class, 'index']);
        Route::post('/bank-accounts', [BankAccountController::class, 'store']);
        Route::put('/bank-accounts/{bankAccount}', [BankAccountController::class, 'update']);
        Route::delete('/bank-accounts/{bankAccount}', [BankAccountController::class, 'destroy']);
        Route::post('/bank-accounts/{bankAccount}/qr', [BankAccountController::class, 'uploadQr']);
        Route::delete('/bank-accounts/{bankAccount}/qr', [BankAccountController::class, 'removeQr']);
    });

    // Registrar routes (Administrator + Registrar + Encoder)
    Route::middleware('role:Administrator,Registrar,Encoder')->prefix('registrar')->group(function () {
        // Students
        Route::get('/students/counts', [StudentController::class, 'counts']);
        Route::get('/students/export', [StudentController::class, 'export']);
        Route::post('/students/{reg_id}/photo', [StudentController::class, 'uploadPhoto']);
        Route::apiResource('students', StudentController::class)
            ->parameters(['students' => 'reg_id']);

        // Classes
        Route::get('/classes/advisers', [ClassController::class, 'advisers']);
        Route::post('/classes/copy-from-year', [ClassController::class, 'copyFromYear']);
        Route::post('/classes/{class_id}/assign-students', [ClassController::class, 'assignStudents']);
        Route::apiResource('classes', ClassController::class)
            ->parameters(['classes' => 'class_id']);

        // Requirements
        Route::get('/requirements/student/{student_id}', [RequirementController::class, 'studentChecklist']);
        Route::post('/requirements/student/{student_id}/{require_id}', [RequirementController::class, 'toggleStudentRequirement']);
        Route::post('/requirements/upload/{stud_reqs_id}', [RequirementController::class, 'uploadFile']);
        Route::post('/requirements/approve/{stud_reqs_id}', [RequirementController::class, 'approveRequirement']);
        Route::post('/requirements/disapprove/{stud_reqs_id}', [RequirementController::class, 'disapproveRequirement']);
        Route::apiResource('requirements', RequirementController::class)
            ->parameters(['requirements' => 'require_id']);

        // Enrollment pipeline
        Route::get('/enrollment/pipeline', [EnrollmentController::class, 'pipeline']);
        Route::get('/enrollment/bulk-promote/preview', [EnrollmentController::class, 'previewBulkPromote']);
        Route::post('/enrollment/bulk-promote', [EnrollmentController::class, 'bulkPromote']);
        Route::post('/enrollment/bulk-transition', [EnrollmentController::class, 'bulkTransition']);
        Route::post('/enrollment/auto-assign-assessments', [EnrollmentController::class, 'autoAssignAssessments']);
        Route::get('/enrollment/{reg_id}/assessments', [EnrollmentController::class, 'assessmentsForStudent']);
        Route::post('/enrollment/{reg_id}/transition', [EnrollmentController::class, 'transition']);
        Route::post('/enrollment/{reg_id}/promote', [EnrollmentController::class, 'promote']);

        // Discounts
        Route::post('/discounts/bulk-assign', [DiscountController::class, 'bulkAssign']);
        Route::apiResource('discounts', DiscountController::class)
            ->parameters(['discounts' => 'acct_discount_id']);

        // CSV Import
        Route::get('/import/template', [ImportController::class, 'template']);
        Route::post('/import/preview', [ImportController::class, 'preview']);
        Route::post('/import', [ImportController::class, 'import']);

        // Analytics (throttled — heavy aggregation queries; cache layer handles most load)
        Route::prefix('analytics')->middleware('throttle:60,1')->group(function () {
            Route::get('/enrollment-trend',  [AnalyticsController::class, 'enrollmentTrend']);
            Route::get('/payment-by-month',  [AnalyticsController::class, 'paymentByMonth']);
            Route::get('/balance-summary',   [AnalyticsController::class, 'balanceSummary']);
            Route::get('/status-breakdown',  [AnalyticsController::class, 'statusBreakdown']);
        });

        // Reports
        Route::prefix('reports')->group(function () {
            Route::get('/class-roster/{class_id}', [ReportController::class, 'classRoster']);
            Route::get('/grade-sheet/{class_id}', [ReportController::class, 'gradeSheet']);
            Route::get('/attendance-sheet/{class_id}', [ReportController::class, 'attendanceSheet']);
            Route::get('/by-grade-level', [ReportController::class, 'byGradeLevel']);
            Route::get('/by-grade-level-contact', [ReportController::class, 'byGradeLevelContact']);
            Route::get('/enrollment-summary', [ReportController::class, 'enrollmentSummary']);
            Route::get('/students/{reg_id}/form-137', [ReportController::class, 'form137']);
        });

        // Entrance Exam Slots
        Route::get('/exam-slots', [EntranceExamController::class, 'index']);
        Route::post('/exam-slots', [EntranceExamController::class, 'store']);
        Route::put('/exam-slots/{publicId}', [EntranceExamController::class, 'update']);
        Route::delete('/exam-slots/{publicId}', [EntranceExamController::class, 'destroy']);
        Route::get('/exam-slots/{publicId}/bookings', [EntranceExamController::class, 'bookings']);
        Route::post('/exam-slots/{publicId}/book', [EntranceExamController::class, 'book']);
        Route::delete('/exam-slots/{publicId}/book/{applicantPublicId}', [EntranceExamController::class, 'unbook']);
        Route::put('/exam-slots/{publicId}/result/{applicantPublicId}', [EntranceExamController::class, 'recordResult']);
        Route::get('/applicants/{applicantPublicId}/exam-booking', [EntranceExamController::class, 'applicantBooking']);
    });

    // Authenticated payment channels (used by students/parents to see where to transfer)
    Route::get('/payment/channels', [BankTransferController::class, 'channels']);

    // Accounting routes (Administrator + Accounting Staff + Cashier)
    Route::middleware('role:Administrator,Accounting Staff,Cashier')->prefix('accounting')->group(function () {
        // Dashboard
        Route::get('/dashboard', [AccountingDashboardController::class, 'index'])->middleware('throttle:60,1');

        // Assessments
        Route::get('/assessments/{assessment_id}/settings', [AssessmentController::class, 'settings']);
        Route::post('/assessments/{assessment_id}/settings', [AssessmentController::class, 'saveSettings']);
        Route::delete('/assessments/{assessment_id}/payables/{payable_id}', [AssessmentController::class, 'removePayable']);
        Route::apiResource('assessments', AssessmentController::class)
            ->parameters(['assessments' => 'assessment_id']);

        // Categories
        Route::get('/categories/{category_id}/particulars', [CategoryController::class, 'particulars']);
        Route::apiResource('categories', CategoryController::class)
            ->parameters(['categories' => 'category_id']);

        // Particulars
        Route::apiResource('particulars', ParticularController::class)
            ->parameters(['particulars' => 'particular_id']);

        // Category-Particular linking
        Route::post('cat-particulars/bulk', [CatParticularController::class, 'bulkStore']);
        Route::apiResource('cat-particulars', CatParticularController::class)
            ->parameters(['cat-particulars' => 'cat_particular_id'])
            ->except(['show']);

        // Student Assessments (billing)
        Route::get('/students/{reg_id}/assessments', [StudentAssessmentController::class, 'show']);
        Route::post('/students/{reg_id}/assessments', [StudentAssessmentController::class, 'assign']);
        Route::post('/students/{reg_id}/assessments/change', [StudentAssessmentController::class, 'changeAssessment']);
        Route::put('/student-assessments/{stud_assess_id}', [StudentAssessmentController::class, 'update']);

        // Cashiering / Payments
        Route::post('/cashiering/load-particulars', [PaymentController::class, 'loadParticulars']);
        Route::post('/cashiering/complete', [PaymentController::class, 'complete']);
        Route::post('/cashiering/reset', [PaymentController::class, 'reset']);
        Route::get('/cashiering/receipt/{receipt_num}', [PaymentController::class, 'receipt']);
        Route::post('/cashiering/transactions/{pay_data_id}/void', [PaymentController::class, 'void']);
        Route::get('/cashiering/transactions', [PaymentController::class, 'index']);
        Route::get('/cashiering/transactions/{pay_data_id}', [PaymentController::class, 'show']);

        // Ledger
        Route::get('/ledger/search', [LedgerController::class, 'search']);
        Route::get('/ledger/students/{reg_id}', [LedgerController::class, 'show']);
        Route::get('/ledger/students/{reg_id}/other-fees', [LedgerController::class, 'otherFees']);
        Route::post('/ledger/students/{reg_id}/other-fees', [LedgerController::class, 'storeOtherFee']);
        Route::delete('/ledger/other-fees/{id}', [LedgerController::class, 'destroyOtherFee']);

        // Payment Terms
        Route::apiResource('payment-terms', PaymentTermController::class)
            ->parameters(['payment-terms' => 'pterm_id']);

        // Books
        Route::apiResource('books', BookController::class)
            ->parameters(['books' => 'book_id']);

        // Refunds
        Route::apiResource('refunds', RefundController::class)
            ->parameters(['refunds' => 'refund_id'])
            ->except(['destroy']);

        // Discounts (Accounting side)
        Route::post('/discounts/bulk-assign', [AccountingDiscountController::class, 'bulkAssign']);
        Route::apiResource('discounts', AccountingDiscountController::class)
            ->parameters(['discounts' => 'acct_discount_id']);

        // Discount Codes
        Route::get('/discount-codes/{id}/redemptions', [DiscountCodeController::class, 'redemptions']);
        Route::apiResource('discount-codes', DiscountCodeController::class)
            ->parameters(['discount-codes' => 'id']);

        // Financial Reports
        Route::prefix('reports')->group(function () {
            Route::get('/collection-summary', [AccountingReportController::class, 'collectionSummary']);
            Route::get('/category-summary', [AccountingReportController::class, 'categorySummary']);
            Route::get('/particular-summary', [AccountingReportController::class, 'particularSummary']);
            Route::get('/eosy-summary', [AccountingReportController::class, 'eosySummary']);
            Route::get('/exam-permits', [AccountingReportController::class, 'examPermits']);
            Route::get('/exam-assessment', [AccountingReportController::class, 'examAssessment']);
            Route::get('/transaction-list', [AccountingReportController::class, 'transactionList']);
            Route::get('/ns-collection-summary', [AccountingReportController::class, 'nsCollectionSummary']);
            Route::get('/monthly-assessment', [AccountingReportController::class, 'monthlyAssessment']);
            Route::get('/students-by-assessment', [AccountingReportController::class, 'studentsByAssessment']);
            Route::get('/balance-aging', [AccountingReportController::class, 'balanceAging']);
            Route::get('/collection-trend', [AccountingReportController::class, 'collectionTrend']);
        });

        // Bank Transfer / E-Wallet Validation Queue
        Route::get('/bank-transfers', [BankTransferController::class, 'cashierList']);
        Route::post('/bank-transfers/{publicId}/approve', [BankTransferController::class, 'approve']);
        Route::post('/bank-transfers/{publicId}/reject', [BankTransferController::class, 'reject']);

        // Non-Student Fee (NSF) Cashiering
        Route::get('/nsf/particulars', [NsfPaymentController::class, 'loadParticulars']);
        Route::post('/nsf', [NsfPaymentController::class, 'store']);
        Route::get('/nsf/{receipt_num}/receipt', [NsfPaymentController::class, 'receipt']);
        Route::get('/nsf', [NsfPaymentController::class, 'index']);

        // Mass Transactions
        Route::get('/mass-transactions', [MassTransactionController::class, 'index']);
        Route::post('/mass-transactions/select', [MassTransactionController::class, 'select']);
        Route::get('/mass-transactions/{code}/review', [MassTransactionController::class, 'review']);
        Route::put('/mass-transactions/{code}/settings', [MassTransactionController::class, 'updateSettings']);
        Route::post('/mass-transactions/{code}/complete', [MassTransactionController::class, 'complete']);

        // Receivables (A/R)
        Route::get('/receivables', [ReceivableController::class, 'index']);
        Route::get('/receivables/summary', [ReceivableController::class, 'summary']);

        // Payables (A/P)
        Route::get('/payables', [PayableController::class, 'index']);
        Route::get('/payables/summary', [PayableController::class, 'summary']);

        // Book Assignments
        Route::post('/books/assign', [BookController::class, 'assignToStudent']);
        Route::get('/books/student/{reg_id}', [BookController::class, 'studentBooks']);
        Route::delete('/books/assignment/{id}', [BookController::class, 'removeAssignment']);

        // Advance Payments
        Route::get('/advance-payments', [AdvancePaymentController::class, 'index']);
        Route::post('/advance-payments', [AdvancePaymentController::class, 'store']);
        Route::post('/advance-payments/{id}/apply', [AdvancePaymentController::class, 'apply']);
        Route::delete('/advance-payments/{id}', [AdvancePaymentController::class, 'destroy']);

        // Chart of Accounts
        Route::get('/chart-of-accounts', [ChartOfAccountController::class, 'index']);
        Route::post('/chart-of-accounts', [ChartOfAccountController::class, 'store']);
        Route::get('/chart-of-accounts/trial-balance', [ChartOfAccountController::class, 'trialBalance']);
        Route::get('/chart-of-accounts/financial-statements', [ChartOfAccountController::class, 'financialStatements']);
        Route::get('/chart-of-accounts/{id}', [ChartOfAccountController::class, 'show']);
        Route::put('/chart-of-accounts/{id}', [ChartOfAccountController::class, 'update']);
        Route::delete('/chart-of-accounts/{id}', [ChartOfAccountController::class, 'destroy']);

        // Journal Entries
        Route::get('/journal-entries', [JournalEntryController::class, 'index']);
        Route::post('/journal-entries', [JournalEntryController::class, 'store']);
        Route::get('/journal-entries/{id}', [JournalEntryController::class, 'show']);
        Route::put('/journal-entries/{id}', [JournalEntryController::class, 'update']);
        Route::post('/journal-entries/{id}/post', [JournalEntryController::class, 'post']);
        Route::post('/journal-entries/{id}/void', [JournalEntryController::class, 'void']);
        Route::delete('/journal-entries/{id}', [JournalEntryController::class, 'destroy']);
    });

    // ── Teacher Portal ────────────────────────────────────────────────────────
    Route::middleware('role:Administrator,Teacher')->prefix('teacher')->group(function () {
        Route::get('/dashboard', [TeacherPortalController::class, 'dashboard']);
        Route::get('/my-classes', [TeacherPortalController::class, 'myClasses']);
        Route::get('/advisees', [TeacherPortalController::class, 'advisees']);
        Route::get('/classes/{classId}/students', [TeacherPortalController::class, 'classStudents']);
        Route::get('/classes/{classId}/grades', [TeacherPortalController::class, 'grades']);
        Route::post('/classes/{classId}/grades', [TeacherPortalController::class, 'saveGrades']);
        Route::get('/classes/{classId}/attendance', [TeacherPortalController::class, 'attendance']);
        Route::post('/classes/{classId}/attendance', [TeacherPortalController::class, 'saveAttendance']);

        // Announcements
        Route::get('/classes/{classId}/announcements', [TeacherPortalController::class, 'announcements']);
        Route::post('/classes/{classId}/announcements', [TeacherPortalController::class, 'storeAnnouncement']);
        Route::put('/classes/{classId}/announcements/{announcementId}', [TeacherPortalController::class, 'updateAnnouncement']);
        Route::delete('/classes/{classId}/announcements/{announcementId}', [TeacherPortalController::class, 'deleteAnnouncement']);

        // Learning Materials
        Route::get('/classes/{classId}/materials', [TeacherPortalController::class, 'materials']);
        Route::post('/classes/{classId}/materials', [TeacherPortalController::class, 'storeMaterial']);
        Route::delete('/classes/{classId}/materials/{materialId}', [TeacherPortalController::class, 'deleteMaterial']);

        // LMS Assignments (teacher)
        Route::prefix('classes/{classId}/assignments')->group(function () {
            Route::get('/', [LmsAssignmentController::class, 'index']);
            Route::post('/', [LmsAssignmentController::class, 'store']);
            Route::get('/gradebook', [LmsAssignmentController::class, 'gradebook']);
            Route::get('/{publicId}', [LmsAssignmentController::class, 'show']);
            Route::put('/{publicId}', [LmsAssignmentController::class, 'update']);
            Route::delete('/{publicId}', [LmsAssignmentController::class, 'destroy']);
            Route::post('/{publicId}/submissions/{submissionId}/grade', [LmsAssignmentController::class, 'grade']);
        });

        // LMS Quiz Builder (teacher)
        Route::prefix('classes/{classId}/assignments/{publicId}/quiz')->group(function () {
            Route::get('/questions', [LmsQuizController::class, 'index']);
            Route::post('/questions', [LmsQuizController::class, 'sync']);
            Route::get('/results', [LmsQuizController::class, 'results']);
            Route::get('/results/{attemptId}', [LmsQuizController::class, 'attemptDetail']);
            Route::post('/results/{attemptId}/grade-short', [LmsQuizController::class, 'gradeShortAnswers']);
        });

        // LMS Analytics (teacher)
        Route::get('/classes/{classId}/analytics', [LmsAnalyticsController::class, 'index']);

        // LMS Discussion Board (teacher)
        Route::prefix('classes/{classId}/discussions')->group(function () {
            Route::get('/', [LmsDiscussionController::class, 'index']);
            Route::post('/', [LmsDiscussionController::class, 'store']);
            Route::put('/{publicId}', [LmsDiscussionController::class, 'update']);
            Route::delete('/{publicId}', [LmsDiscussionController::class, 'destroy']);
            Route::get('/{publicId}/replies', [LmsDiscussionController::class, 'replies']);
            Route::post('/{publicId}/replies', [LmsDiscussionController::class, 'storeReply']);
            Route::delete('/{publicId}/replies/{replyPublicId}', [LmsDiscussionController::class, 'destroyReply']);
        });

        // Flashcards (teacher)
        Route::prefix('flashcards')->group(function () {
            Route::get('/', [FlashcardController::class, 'index']);
            Route::post('/', [FlashcardController::class, 'store']);
            Route::get('/{publicId}', [FlashcardController::class, 'show']);
            Route::put('/{publicId}', [FlashcardController::class, 'update']);
            Route::delete('/{publicId}', [FlashcardController::class, 'destroy']);
            Route::post('/{publicId}/assign', [FlashcardController::class, 'assign']);
            Route::delete('/{publicId}/assign/{classId}', [FlashcardController::class, 'unassign']);
            Route::get('/{publicId}/export', [FlashcardController::class, 'export']);
            Route::get('/{publicId}/results', [FlashcardController::class, 'results']);
            Route::post('/import/json', [FlashcardController::class, 'importJson']);
            Route::post('/import/csv', [FlashcardController::class, 'importCsv']);
            Route::post('/import/pdf', [FlashcardController::class, 'importPdf']);
            Route::post('/generate-ai', [FlashcardController::class, 'generateAi']);
        });
    });

    // ── Applicant Portal ──────────────────────────────────────────────────────
    Route::middleware('role:Applicant')->prefix('applicant')->group(function () {
        Route::get('/status', [ApplicantPortalController::class, 'status']);
        Route::get('/requirements', [ApplicantPortalController::class, 'requirements']);
        Route::post('/requirements/{requirePublicId}/submit', [ApplicantPortalController::class, 'submitRequirement']);
        Route::post('/requirements/{studReqPublicId}/upload', [ApplicantPortalController::class, 'uploadRequirement']);
        Route::get('/exam-schedule', [ApplicantPortalController::class, 'examSchedule']);
    });

    // ── Student Portal ────────────────────────────────────────────────────────
    Route::middleware('role:Administrator,Student')->prefix('student')->group(function () {
        Route::get('/dashboard', [StudentPortalController::class, 'dashboard']);
        Route::get('/balance', [StudentPortalController::class, 'balance']);
        Route::get('/payments', [StudentPortalController::class, 'payments']);
        Route::get('/schedule', [StudentPortalController::class, 'schedule']);
        Route::get('/grades', [StudentPortalController::class, 'grades']);
        Route::get('/ledger', [StudentPortalController::class, 'ledger']);
        Route::get('/ledger/pdf', [StudentPortalController::class, 'ledgerPdf']);
        Route::get('/report-card', [StudentPortalController::class, 'reportCard']);
        Route::get('/report-card/pdf', [StudentPortalController::class, 'reportCardPdf']);
        Route::get('/enrollment-certificate/pdf', [StudentPortalController::class, 'enrollmentCertificatePdf']);

        // Online payment (PayMongo)
        Route::post('/payment/checkout', [PaymentGatewayController::class, 'createStudentCheckout']);
        Route::get('/payment/session/{sessionId}', [PaymentGatewayController::class, 'sessionStatus']);

        // Bank / E-Wallet transfer requests
        Route::get('/bank-transfers', [BankTransferController::class, 'studentList']);
        Route::post('/bank-transfers', [BankTransferController::class, 'studentSubmit']);
        Route::post('/bank-transfers/{publicId}/resubmit', [BankTransferController::class, 'studentResubmit']);
        Route::delete('/bank-transfers/{publicId}', [BankTransferController::class, 'studentCancel']);

        Route::get('/academic-history', [StudentPortalController::class, 'academicHistory']);
        Route::get('/attendance', [StudentPortalController::class, 'attendance']);
        Route::get('/kiosk-logs', [StudentPortalController::class, 'kioskLogs']);

        // Discount code redemption
        Route::get('/discount-code/preview', [DiscountCodeController::class, 'preview']);
        Route::post('/discount-code/redeem', [DiscountCodeController::class, 'redeem']);

        // Enrollment & Requirements (self-service)
        Route::get('/enrollment', [StudentEnrollmentController::class, 'status']);
        Route::get('/enrollment/requirements', [StudentEnrollmentController::class, 'requirements']);
        Route::post('/enrollment/requirements/{requirePublicId}/submit', [StudentEnrollmentController::class, 'submitRequirement']);
        Route::post('/enrollment/requirements/{studReqPublicId}/upload', [StudentEnrollmentController::class, 'uploadRequirement']);
        Route::post('/enrollment/re-enroll', [StudentEnrollmentController::class, 'reEnroll']);

        // LMS Assignments (student)
        Route::prefix('assignments')->group(function () {
            Route::get('/', [LmsStudentController::class, 'index']);
            Route::get('/{publicId}', [LmsStudentController::class, 'show']);
            Route::post('/{publicId}/submit', [LmsStudentController::class, 'submit']);
            Route::delete('/{publicId}/unsubmit', [LmsStudentController::class, 'unsubmit']);
            Route::delete('/files/{fileId}', [LmsStudentController::class, 'destroyFile']);
        });

        // LMS Quizzes (student)
        Route::prefix('quizzes')->group(function () {
            Route::get('/{publicId}', [LmsQuizStudentController::class, 'show']);
            Route::post('/{publicId}/start', [LmsQuizStudentController::class, 'start']);
            Route::put('/{publicId}/attempt/{attemptId}/answer', [LmsQuizStudentController::class, 'saveAnswer']);
            Route::post('/{publicId}/attempt/{attemptId}/submit', [LmsQuizStudentController::class, 'submit']);
            Route::get('/{publicId}/result', [LmsQuizStudentController::class, 'result']);
        });

        // LMS Progress Dashboard (student)
        Route::get('/progress', [LmsStudentController::class, 'progress']);

        // LMS Discussion Board (student)
        Route::prefix('discussions')->group(function () {
            Route::get('/', [LmsDiscussionStudentController::class, 'index']);
            Route::get('/{publicId}', [LmsDiscussionStudentController::class, 'show']);
            Route::post('/{publicId}/replies', [LmsDiscussionStudentController::class, 'storeReply']);
            Route::delete('/{publicId}/replies/{replyPublicId}', [LmsDiscussionStudentController::class, 'destroyReply']);
        });

        // Flashcards (student)
        Route::prefix('flashcards')->group(function () {
            Route::get('/', [FlashcardStudentController::class, 'index']);
            Route::get('/review', [FlashcardStudentController::class, 'reviewQueue']);
            Route::post('/import', [FlashcardStudentController::class, 'importShared']);
            Route::get('/{publicId}', [FlashcardStudentController::class, 'show']);
            Route::post('/{publicId}/quiz', [FlashcardStudentController::class, 'startQuiz']);
            Route::post('/quiz/{sessionPublicId}/submit', [FlashcardStudentController::class, 'submitQuiz']);
            Route::post('/cards/{cardPublicId}/sr', [FlashcardStudentController::class, 'updateSr']);
        });

        // Announcements (read-only)
        Route::get('/announcements', [StudentPortalController::class, 'announcements']);

        // Learning Materials (read-only)
        Route::get('/materials', [StudentPortalController::class, 'materials']);
    });

    // ── Parent Portal ─────────────────────────────────────────────────────────
    Route::middleware('role:Administrator,Parent')->prefix('parent')->group(function () {        Route::get('/dashboard', [ParentPortalController::class, 'dashboard']);
        Route::get('/children/{publicId}', [ParentPortalController::class, 'childDetail']);
        Route::get('/children/{publicId}/grades', [ParentPortalController::class, 'childGrades']);
        Route::get('/children/{publicId}/balance', [ParentPortalController::class, 'childBalance']);
        Route::get('/children/{publicId}/payments', [ParentPortalController::class, 'childPayments']);
        Route::get('/children/{publicId}/ledger', [ParentPortalController::class, 'childLedger']);
        Route::get('/children/{publicId}/report-card', [ParentPortalController::class, 'childReportCard']);
        Route::get('/children/{publicId}/academic-history', [ParentPortalController::class, 'childAcademicHistory']);
        Route::get('/children/{publicId}/attendance', [ParentPortalController::class, 'childAttendance']);
        Route::get('/children/{publicId}/kiosk-logs', [ParentPortalController::class, 'childKioskLogs']);
        Route::get('/children/{publicId}/lms-progress', [ParentPortalController::class, 'childLmsProgress']);

        // Re-enrollment for child
        Route::get('/children/{publicId}/enrollment-status', [ParentPortalController::class, 'childEnrollmentStatus']);
        Route::post('/children/{publicId}/re-enroll', [ParentPortalController::class, 'childReEnroll']);

        // Online payment for child (PayMongo)
        Route::post('/children/{publicId}/payment/checkout', [PaymentGatewayController::class, 'createParentCheckout']);
        Route::get('/payment/session/{sessionId}', [PaymentGatewayController::class, 'sessionStatus']);

        // Bank / E-Wallet transfer requests for child
        Route::get('/children/{publicId}/bank-transfers', [BankTransferController::class, 'parentList']);
        Route::post('/children/{publicId}/bank-transfers', [BankTransferController::class, 'parentSubmit']);
        Route::post('/children/{publicId}/bank-transfers/{requestPublicId}/resubmit', [BankTransferController::class, 'parentResubmit']);
        Route::delete('/children/{publicId}/bank-transfers/{requestPublicId}', [BankTransferController::class, 'parentCancel']);

        // Discount code redemption for child
        Route::get('/children/{publicId}/discount-code/preview', [DiscountCodeController::class, 'previewForChild']);
        Route::post('/children/{publicId}/discount-code/redeem', [DiscountCodeController::class, 'redeemForChild']);
    });

    // ── HRMS Portal ───────────────────────────────────────────────────────────
    Route::middleware('role:Administrator,HR')->prefix('hrms')->group(function () {
        Route::get('/dashboard', [HrmsController::class, 'dashboard']);

        // Departments
        Route::get('/departments',              [HrmsController::class, 'departments']);
        Route::post('/departments',             [HrmsController::class, 'storeDepartment']);
        Route::put('/departments/{publicId}',   [HrmsController::class, 'updateDepartment']);
        Route::delete('/departments/{publicId}',[HrmsController::class, 'destroyDepartment']);

        // Positions
        Route::get('/positions',              [HrmsController::class, 'positions']);
        Route::post('/positions',             [HrmsController::class, 'storePosition']);
        Route::put('/positions/{publicId}',   [HrmsController::class, 'updatePosition']);
        Route::delete('/positions/{publicId}',[HrmsController::class, 'destroyPosition']);

        // Personnel
        Route::get('/personnel',                                    [HrmsController::class, 'personnel']);
        Route::post('/personnel',                                   [HrmsController::class, 'storePersonnel']);
        Route::get('/personnel/{publicId}',                         [HrmsController::class, 'showPersonnel']);
        Route::put('/personnel/{publicId}',                         [HrmsController::class, 'updatePersonnel']);
        Route::delete('/personnel/{publicId}',                      [HrmsController::class, 'destroyPersonnel']);
        Route::post('/personnel/{publicId}/photo',                  [HrmsController::class, 'uploadPersonnelPhoto']);
        Route::post('/personnel/{publicId}/grant-access',           [HrmsController::class, 'grantAccess']);
        Route::patch('/personnel/{publicId}/department',             [HrmsController::class, 'assignDepartment']);

        // Leave types
        Route::get('/leave-types',              [LeaveController::class, 'leaveTypes']);
        Route::post('/leave-types',             [LeaveController::class, 'storeLeaveType']);
        Route::put('/leave-types/{publicId}',   [LeaveController::class, 'updateLeaveType']);
        Route::delete('/leave-types/{publicId}',[LeaveController::class, 'destroyLeaveType']);

        // Leave applications
        Route::get('/leaves',                       [LeaveController::class, 'applications']);
        Route::post('/leaves',                      [LeaveController::class, 'apply']);
        Route::post('/leaves/{publicId}/approve',   [LeaveController::class, 'approve']);
        Route::post('/leaves/{publicId}/reject',    [LeaveController::class, 'reject']);
        Route::delete('/leaves/{publicId}',         [LeaveController::class, 'cancelApplication']);

        // Attendance logs & summary
        Route::get('/attendance',         [HrmsController::class, 'attendanceLogs']);
        Route::get('/attendance/summary', [HrmsController::class, 'attendanceSummary']);

        // Manual kiosk log (authenticated)
        Route::post('/attendance/manual', [KioskController::class, 'manual']);

        // ── Payroll ───────────────────────────────────────────────────────
        Route::prefix('payroll')->group(function () {
            // Templates
            Route::get('/templates',               [PayrollController::class, 'templates']);
            Route::post('/templates',              [PayrollController::class, 'storeTemplate']);
            Route::put('/templates/{publicId}',    [PayrollController::class, 'updateTemplate']);
            Route::delete('/templates/{publicId}', [PayrollController::class, 'destroyTemplate']);

            // Salary settings
            Route::get('/settings/positions',              [PayrollController::class, 'positionRates']);
            Route::post('/settings/positions/{positionId}',[PayrollController::class, 'savePositionRate']);
            Route::get('/settings/personnel/{publicId}',   [PayrollController::class, 'salarySetting']);
            Route::post('/settings/personnel/{publicId}',  [PayrollController::class, 'saveSalarySetting']);
            Route::get('/settings/coa-map',                [PayrollController::class, 'coaMap']);
            Route::post('/settings/coa-map',               [PayrollController::class, 'saveCoaMap']);

            // Periods
            Route::get('/periods',                             [PayrollController::class, 'periods']);
            Route::post('/periods',                            [PayrollController::class, 'storePeriod']);
            Route::get('/periods/{publicId}',                  [PayrollController::class, 'showPeriod']);
            Route::put('/periods/{publicId}',                  [PayrollController::class, 'updatePeriod']);
            Route::delete('/periods/{publicId}',               [PayrollController::class, 'destroyPeriod']);
            Route::post('/periods/{publicId}/regenerate',      [PayrollController::class, 'regenerateItems']);
            Route::post('/periods/{publicId}/submit',          [PayrollController::class, 'submitForApproval']);
            Route::post('/periods/{publicId}/approve',         [PayrollController::class, 'approve']);
            Route::post('/periods/{publicId}/post',            [PayrollController::class, 'post']);
            Route::get('/periods/{publicId}/items',            [PayrollController::class, 'periodItems']);
            Route::put('/periods/{periodId}/items/{itemId}',   [PayrollController::class, 'updateItem']);
            Route::get('/periods/{periodId}/payslip/{personnelId}', [PayrollController::class, 'payslip']);

            // Preview salary for a personnel
            Route::get('/personnel/{publicId}/preview', [PayrollController::class, 'previewSalary']);
        });
    });

    // ── Facilities (all authenticated users — browse + request bookings) ─────
    Route::prefix('facilities')->group(function () {
        Route::get('/public',                         [FacilityController::class, 'publicList']);
        Route::get('/{publicId}/booked-slots',        [FacilityController::class, 'bookedSlots']);
        Route::post('/bookings',                      [FacilityController::class, 'requestBooking']);
        Route::delete('/bookings/{publicId}/cancel',  [FacilityController::class, 'cancelBooking']);
    });

    // ── Custodian Portal ──────────────────────────────────────────────────────
    Route::middleware('role:Administrator,Custodian')->prefix('custodian')->group(function () {
        Route::get('/dashboard', [CustodianController::class, 'dashboard']);

        // Read-only Chart of Accounts (for GL account selectors in category forms)
        Route::get('/chart-of-accounts', [ChartOfAccountController::class, 'index']);

        // Property Categories
        Route::get('/property-categories',              [CustodianController::class, 'propertyCategories']);
        Route::post('/property-categories',             [CustodianController::class, 'storePropertyCategory']);
        Route::put('/property-categories/{publicId}',   [CustodianController::class, 'updatePropertyCategory']);
        Route::delete('/property-categories/{publicId}',[CustodianController::class, 'destroyPropertyCategory']);

        // Property Items
        Route::get('/property',                           [CustodianController::class, 'propertyItems']);
        Route::post('/property',                          [CustodianController::class, 'storePropertyItem']);
        Route::get('/property/{publicId}',                [CustodianController::class, 'showPropertyItem']);
        Route::put('/property/{publicId}',                [CustodianController::class, 'updatePropertyItem']);
        Route::delete('/property/{publicId}',             [CustodianController::class, 'destroyPropertyItem']);
        Route::post('/property/{publicId}/depreciate',    [CustodianController::class, 'depreciate']);

        // Consumable Categories
        Route::get('/consumable-categories',              [CustodianController::class, 'consumableCategories']);
        Route::post('/consumable-categories',             [CustodianController::class, 'storeConsumableCategory']);
        Route::put('/consumable-categories/{publicId}',   [CustodianController::class, 'updateConsumableCategory']);
        Route::delete('/consumable-categories/{publicId}',[CustodianController::class, 'destroyConsumableCategory']);

        // Consumable Items + Stock
        Route::get('/consumables',                             [CustodianController::class, 'consumableItems']);
        Route::post('/consumables',                            [CustodianController::class, 'storeConsumableItem']);
        Route::put('/consumables/{publicId}',                  [CustodianController::class, 'updateConsumableItem']);
        Route::delete('/consumables/{publicId}',               [CustodianController::class, 'destroyConsumableItem']);
        Route::post('/consumables/{publicId}/stock-in',        [CustodianController::class, 'stockIn']);
        Route::post('/consumables/{publicId}/stock-out',       [CustodianController::class, 'stockOut']);
        Route::get('/consumables/{publicId}/transactions',     [CustodianController::class, 'stockTransactions']);

        // Facilities management (CRUD + booking approvals)
        Route::get('/facilities',              [FacilityController::class, 'index']);
        Route::post('/facilities',             [FacilityController::class, 'store']);
        Route::put('/facilities/{publicId}',   [FacilityController::class, 'update']);
        Route::delete('/facilities/{publicId}',[FacilityController::class, 'destroy']);

        Route::get('/bookings',                           [FacilityController::class, 'bookings']);
        Route::get('/bookings/{publicId}',                [FacilityController::class, 'showBooking']);
        Route::post('/bookings/{publicId}/approve',       [FacilityController::class, 'approveBooking']);
        Route::post('/bookings/{publicId}/reject',        [FacilityController::class, 'rejectBooking']);
        Route::delete('/bookings/{publicId}/cancel',      [FacilityController::class, 'cancelBooking']);

        // Supply Requests — management
        Route::get('/supply-requests',                        [SupplyRequestController::class, 'allRequests']);
        Route::post('/supply-requests/{publicId}/approve',    [SupplyRequestController::class, 'approve']);
        Route::post('/supply-requests/{publicId}/reject',     [SupplyRequestController::class, 'reject']);
        Route::post('/supply-requests/{publicId}/fulfill',    [SupplyRequestController::class, 'fulfill']);

        // Inventory Checks — management
        Route::get('/inventory',                              [InventoryCheckController::class, 'index']);
        Route::post('/inventory',                             [InventoryCheckController::class, 'store']);
        Route::get('/inventory/{publicId}',                   [InventoryCheckController::class, 'show']);
        Route::put('/inventory/{publicId}',                   [InventoryCheckController::class, 'update']);
        Route::delete('/inventory/{publicId}',                [InventoryCheckController::class, 'destroy']);
        Route::post('/inventory/{publicId}/items',            [InventoryCheckController::class, 'addItem']);
        Route::delete('/inventory/{publicId}/items/{itemId}', [InventoryCheckController::class, 'removeItem']);
        Route::post('/inventory/{publicId}/review',           [InventoryCheckController::class, 'review']);

        // Clearance — template management
        Route::get('/clearance-templates',                    [ClearanceController::class, 'templates']);
        Route::post('/clearance-templates',                   [ClearanceController::class, 'storeTemplate']);
        Route::put('/clearance-templates/{publicId}',         [ClearanceController::class, 'updateTemplate']);
        Route::delete('/clearance-templates/{publicId}',      [ClearanceController::class, 'destroyTemplate']);
        Route::get('/clearance-records',                      [ClearanceController::class, 'allRecords']);
    });

    // ── Supply Requests — all authenticated staff/users ──────────────────────
    Route::prefix('supply-requests')->group(function () {
        Route::get('/my',                [SupplyRequestController::class, 'myRequests']);
        Route::post('/',                 [SupplyRequestController::class, 'store']);
        Route::delete('/{publicId}/cancel', [SupplyRequestController::class, 'cancel']);
    });

    // ── Inventory Tasks — assignee access (all authenticated) ────────────────
    Route::get('/inventory-tasks',              [InventoryCheckController::class, 'myTasks']);
    Route::get('/inventory-tasks/{publicId}',   [InventoryCheckController::class, 'showTask']);
    Route::post('/inventory-tasks/{publicId}/submit', [InventoryCheckController::class, 'submitCount']);

    // ── Clearance — all authenticated users ──────────────────────────────────
    Route::prefix('clearance')->group(function () {
        Route::get('/active-template',                                    [ClearanceController::class, 'activeTemplate']);
        Route::get('/my-record',                                          [ClearanceController::class, 'myRecord']);
        Route::post('/apply',                                             [ClearanceController::class, 'apply']);
        Route::get('/pending-for-office',                                 [ClearanceController::class, 'pendingForOffice']);
        Route::post('/records/{recordPublicId}/offices/{id}/clear',       [ClearanceController::class, 'clearOffice']);
        Route::post('/records/{recordPublicId}/offices/{id}/return',      [ClearanceController::class, 'returnOffice']);
    });

    // ── Downloads — visible to all authenticated users ────────────────────────
    Route::get('/downloads', [DownloadController::class, 'index']);
    Route::post('/downloads/{publicId}/download', [DownloadController::class, 'incrementDownload']);

    // ── Library — Librarian + Admin ───────────────────────────────────────────
    Route::middleware('role:Administrator,Librarian')->prefix('library')->group(function () {
        Route::get('/categories',                   [LibraryController::class, 'categories']);
        Route::post('/categories',                  [LibraryController::class, 'storeCategory']);
        Route::put('/categories/{publicId}',        [LibraryController::class, 'updateCategory']);
        Route::delete('/categories/{publicId}',     [LibraryController::class, 'destroyCategory']);
        Route::get('/books',                        [LibraryController::class, 'books']);
        Route::get('/books/{publicId}',             [LibraryController::class, 'showBook']);
        Route::post('/books',                       [LibraryController::class, 'storeBook']);
        Route::put('/books/{publicId}',             [LibraryController::class, 'updateBook']);
        Route::delete('/books/{publicId}',          [LibraryController::class, 'destroyBook']);
        Route::get('/borrowings',                   [LibraryController::class, 'borrowings']);
        Route::post('/borrowings',                  [LibraryController::class, 'borrow']);
        Route::post('/borrowings/{publicId}/return',[LibraryController::class, 'returnBook']);
        Route::get('/overdue',                      [LibraryController::class, 'overdueList']);
    });

    // ── Front Office — Front Desk + Admin ─────────────────────────────────────
    Route::middleware('role:Administrator,Front Desk')->prefix('front-office')->group(function () {
        Route::get('/visitors',                         [FrontOfficeController::class, 'visitors']);
        Route::post('/visitors/check-in',               [FrontOfficeController::class, 'checkIn']);
        Route::post('/visitors/{publicId}/check-out',   [FrontOfficeController::class, 'checkOut']);
        Route::delete('/visitors/{publicId}',           [FrontOfficeController::class, 'destroyVisitor']);
        Route::get('/gate-passes',                      [FrontOfficeController::class, 'gatePasses']);
        Route::post('/gate-passes',                     [FrontOfficeController::class, 'issueGatePass']);
        Route::post('/gate-passes/{publicId}/return',   [FrontOfficeController::class, 'returnGatePass']);
        Route::delete('/gate-passes/{publicId}',        [FrontOfficeController::class, 'destroyGatePass']);
        Route::get('/correspondence',                   [FrontOfficeController::class, 'correspondence']);
        Route::post('/correspondence',                  [FrontOfficeController::class, 'storeCorrespondence']);
        Route::put('/correspondence/{publicId}',        [FrontOfficeController::class, 'updateCorrespondence']);
        Route::delete('/correspondence/{publicId}',     [FrontOfficeController::class, 'destroyCorrespondence']);
    });

    // ── Download Center — Admin only (CRUD) ───────────────────────────────────
    Route::middleware('role:Administrator')->prefix('admin/downloads')->group(function () {
        Route::get('/categories',               [DownloadController::class, 'categories']);
        Route::post('/categories',              [DownloadController::class, 'storeCategory']);
        Route::put('/categories/{publicId}',    [DownloadController::class, 'updateCategory']);
        Route::delete('/categories/{publicId}', [DownloadController::class, 'destroyCategory']);
        Route::get('/files',                    [DownloadController::class, 'files']);
        Route::post('/files',                   [DownloadController::class, 'storeFile']);
        Route::put('/files/{publicId}',         [DownloadController::class, 'updateFile']);
        Route::delete('/files/{publicId}',      [DownloadController::class, 'destroyFile']);
    });

    // ── Clinic — School Nurse + Admin ─────────────────────────────────────────
    Route::middleware('role:Administrator,School Nurse')->prefix('clinic')->group(function () {
        Route::get('/health-records',                   [ClinicController::class, 'healthRecords']);
        Route::get('/health-records/{publicId}',        [ClinicController::class, 'showHealthRecord']);
        Route::post('/health-records',                  [ClinicController::class, 'saveHealthRecord']);
        Route::get('/visits',                           [ClinicController::class, 'visits']);
        Route::post('/visits',                          [ClinicController::class, 'storeVisit']);
        Route::put('/visits/{publicId}',                [ClinicController::class, 'updateVisit']);
        Route::delete('/visits/{publicId}',             [ClinicController::class, 'destroyVisit']);
        Route::get('/incidents',                        [ClinicController::class, 'incidents']);
        Route::post('/incidents',                       [ClinicController::class, 'storeIncident']);
        Route::put('/incidents/{publicId}',             [ClinicController::class, 'updateIncident']);
        Route::delete('/incidents/{publicId}',          [ClinicController::class, 'destroyIncident']);
    });
    Route::get('/clinic/my-health-record', [ClinicController::class, 'myHealthRecord']);

    // ============================================================
    // DECISION SUPPORT SYSTEM (DSS) AI ROUTE
    // ============================================================
    Route::get('/dss/ai-analysis', [\App\Http\Controllers\DssController::class, 'getAiAnalysisSummary']);

    // ============================================================
    // DECISION SUPPORT SYSTEM (DSS)
    // ============================================================
    Route::prefix('admin/dss')->middleware('role:Administrator')->group(function () {

        // Dashboard
        Route::get('dashboard', [\App\Http\Controllers\Admin\Dss\DssDashboardController::class, 'index']);

        // Enrollment Analytics
        Route::get('enrollment/summary',           [\App\Http\Controllers\Admin\Dss\DssEnrollmentController::class, 'summary']);
        Route::get('enrollment/trends',            [\App\Http\Controllers\Admin\Dss\DssEnrollmentController::class, 'trends']);
        Route::get('enrollment/grade-breakdown',   [\App\Http\Controllers\Admin\Dss\DssEnrollmentController::class, 'gradeBreakdown']);
        Route::get('enrollment/section-fill-rates',[\App\Http\Controllers\Admin\Dss\DssEnrollmentController::class, 'sectionFillRates']);
        Route::get('enrollment/projection',        [\App\Http\Controllers\Admin\Dss\DssEnrollmentController::class, 'projection']);

        // Academic Health
        Route::get('academic-health/summary',              [\App\Http\Controllers\Admin\Dss\DssAcademicHealthController::class, 'summary']);
        Route::get('academic-health/promotion-rates',      [\App\Http\Controllers\Admin\Dss\DssAcademicHealthController::class, 'promotionRates']);
        Route::get('academic-health/grade-distribution',   [\App\Http\Controllers\Admin\Dss\DssAcademicHealthController::class, 'gradeDistribution']);
        Route::get('academic-health/at-risk',              [\App\Http\Controllers\Admin\Dss\DssAcademicHealthController::class, 'atRiskStudents']);
        Route::get('academic-health/subject-performance',  [\App\Http\Controllers\Admin\Dss\DssAcademicHealthController::class, 'subjectPerformance']);
        Route::post('academic-health/interventions',       [\App\Http\Controllers\Admin\Dss\DssAcademicHealthController::class, 'storeIntervention']);
        Route::patch('academic-health/interventions/{public_id}', [\App\Http\Controllers\Admin\Dss\DssAcademicHealthController::class, 'updateIntervention']);
        Route::get('academic-health/at-risk/export',       [\App\Http\Controllers\Admin\Dss\DssAcademicHealthController::class, 'exportAtRisk']);

        // Resource Utilization
        Route::get('resources/faculty-load',         [\App\Http\Controllers\Admin\Dss\DssResourceController::class, 'facultyLoad']);
        Route::get('resources/classroom-utilization',[\App\Http\Controllers\Admin\Dss\DssResourceController::class, 'classroomUtilization']);
        Route::get('resources/materials-inventory',  [\App\Http\Controllers\Admin\Dss\DssResourceController::class, 'materialsInventory']);

        // Early Warnings
        Route::get('warnings',                       [\App\Http\Controllers\Admin\Dss\DssWarningsController::class, 'index']);
        Route::post('warnings/evaluate',             [\App\Http\Controllers\Admin\Dss\DssWarningsController::class, 'evaluate']);
        Route::patch('warnings/{public_id}/acknowledge', [\App\Http\Controllers\Admin\Dss\DssWarningsController::class, 'acknowledge']);

        // Recommendations
        Route::get('recommendations',                [\App\Http\Controllers\Admin\Dss\DssRecommendationsController::class, 'index']);
        Route::post('recommendations/generate',      [\App\Http\Controllers\Admin\Dss\DssRecommendationsController::class, 'generate']);
        Route::patch('recommendations/{public_id}/action', [\App\Http\Controllers\Admin\Dss\DssRecommendationsController::class, 'markActioned']);

        // Report Export Center
        Route::get('reports/enrollment',             [\App\Http\Controllers\Admin\Dss\DssReportsController::class, 'enrollmentReport']);
        Route::get('reports/promotion-retention',    [\App\Http\Controllers\Admin\Dss\DssReportsController::class, 'promotionRetentionReport']);
        Route::get('reports/at-risk',                [\App\Http\Controllers\Admin\Dss\DssReportsController::class, 'atRiskReport']);
        Route::get('reports/faculty-load',           [\App\Http\Controllers\Admin\Dss\DssReportsController::class, 'facultyLoadReport']);
        Route::get('reports/classroom-utilization',  [\App\Http\Controllers\Admin\Dss\DssReportsController::class, 'classroomUtilizationReport']);
        Route::get('reports/materials-inventory',    [\App\Http\Controllers\Admin\Dss\DssReportsController::class, 'materialsInventoryReport']);
        Route::get('reports/warnings-log',           [\App\Http\Controllers\Admin\Dss\DssReportsController::class, 'warningsLogReport']);
        Route::get('reports/recommendations-log',    [\App\Http\Controllers\Admin\Dss\DssReportsController::class, 'recommendationsLogReport']);
    });

    // ─── Guidance Office ─────────────────────────────────────────────────────
    Route::prefix('admin/guidance')->middleware('role:Administrator,Guidance Counselor')->group(function () {
        // Dashboard
        Route::get('dashboard', [\App\Http\Controllers\Admin\Guidance\GuidanceDashboardController::class, 'index']);

        // Cases
        Route::get('cases',                    [\App\Http\Controllers\Admin\Guidance\GuidanceCaseController::class, 'index']);
        Route::post('cases',                   [\App\Http\Controllers\Admin\Guidance\GuidanceCaseController::class, 'store']);
        Route::get('cases/{publicId}',         [\App\Http\Controllers\Admin\Guidance\GuidanceCaseController::class, 'show']);
        Route::patch('cases/{publicId}',       [\App\Http\Controllers\Admin\Guidance\GuidanceCaseController::class, 'update']);
        Route::post('cases/{publicId}/close',  [\App\Http\Controllers\Admin\Guidance\GuidanceCaseController::class, 'close']);

        // Sessions & SOAP notes
        Route::get('cases/{caseId}/sessions',                       [\App\Http\Controllers\Admin\Guidance\GuidanceSessionController::class, 'index']);
        Route::post('cases/{caseId}/sessions',                      [\App\Http\Controllers\Admin\Guidance\GuidanceSessionController::class, 'store']);
        Route::patch('cases/{caseId}/sessions/{sessionId}',         [\App\Http\Controllers\Admin\Guidance\GuidanceSessionController::class, 'update']);

        // Psychological tests
        Route::get('cases/{caseId}/psych-tests',                    [\App\Http\Controllers\Admin\Guidance\GuidancePsychTestController::class, 'index']);
        Route::post('cases/{caseId}/psych-tests',                   [\App\Http\Controllers\Admin\Guidance\GuidancePsychTestController::class, 'store']);
        Route::patch('cases/{caseId}/psych-tests/{testId}',         [\App\Http\Controllers\Admin\Guidance\GuidancePsychTestController::class, 'update']);

        // External referrals
        Route::post('cases/{caseId}/external-referrals',            [\App\Http\Controllers\Admin\Guidance\GuidanceExternalReferralController::class, 'store']);
        Route::patch('cases/{caseId}/external-referrals/{extId}',   [\App\Http\Controllers\Admin\Guidance\GuidanceExternalReferralController::class, 'update']);

        // Intake referrals queue
        Route::get('referrals',                      [\App\Http\Controllers\Admin\Guidance\GuidanceReferralController::class, 'index']);
        Route::post('referrals',                     [\App\Http\Controllers\Admin\Guidance\GuidanceReferralController::class, 'store']);
        Route::post('referrals/{publicId}/acknowledge', [\App\Http\Controllers\Admin\Guidance\GuidanceReferralController::class, 'acknowledge']);
        Route::post('referrals/{publicId}/decline',     [\App\Http\Controllers\Admin\Guidance\GuidanceReferralController::class, 'decline']);

        // Anecdotal records
        Route::get('anecdotals',   [\App\Http\Controllers\Admin\Guidance\GuidanceAnecdotalController::class, 'index']);
        Route::post('anecdotals',  [\App\Http\Controllers\Admin\Guidance\GuidanceAnecdotalController::class, 'store']);

        // Group sessions / psychoeducational activities
        Route::get('group-sessions',               [\App\Http\Controllers\Admin\Guidance\GuidanceGroupSessionController::class, 'index']);
        Route::post('group-sessions',              [\App\Http\Controllers\Admin\Guidance\GuidanceGroupSessionController::class, 'store']);
        Route::patch('group-sessions/{publicId}',  [\App\Http\Controllers\Admin\Guidance\GuidanceGroupSessionController::class, 'update']);

        // Student profiles (individual inventory)
        Route::get('student-profiles/{regId}',  [\App\Http\Controllers\Admin\Guidance\GuidanceStudentProfileController::class, 'show']);
        Route::put('student-profiles/{regId}',  [\App\Http\Controllers\Admin\Guidance\GuidanceStudentProfileController::class, 'upsert']);

        // PDF Reports
        Route::get('reports/cases-summary',     [\App\Http\Controllers\Admin\Guidance\GuidanceReportsController::class, 'casesSummary']);
        Route::get('reports/referral-log',      [\App\Http\Controllers\Admin\Guidance\GuidanceReportsController::class, 'referralLog']);
        Route::get('reports/anecdotal-log',     [\App\Http\Controllers\Admin\Guidance\GuidanceReportsController::class, 'anecdotalLog']);
        Route::get('reports/group-sessions',    [\App\Http\Controllers\Admin\Guidance\GuidanceReportsController::class, 'groupSessionsLog']);
    });
});