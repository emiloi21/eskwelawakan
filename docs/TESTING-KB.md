# SVHS-MIS Automated Testing Knowledge Base

> **Status:** ✅ 127 tests passing, 0 failures  
> **Stack:** Laravel 12 + PHPUnit 11 + SQLite in-memory  
> **Last updated:** 2025

---

## 1. Quick Start

```bash
cd svhs-api
php artisan test
```

Run a single test file:
```bash
php artisan test --filter AuthTest
php artisan test tests/Feature/Hrms/PayrollTest.php
```

Run with verbose output:
```bash
php artisan test --verbose
```

---

## 2. Test Infrastructure

### 2.1 Configuration (`phpunit.xml`)

| Key | Value |
|-----|-------|
| `DB_CONNECTION` | `sqlite` |
| `DB_DATABASE` | `:memory:` |
| `APP_ENV` | `testing` |
| `APP_KEY` | Hardcoded test key (already set) |
| `BCRYPT_ROUNDS` | `4` (fast hashing for tests) |

Each test class using `RefreshDatabase` gets a completely fresh schema on every run — no test pollution.

### 2.2 Base TestCase (`tests/TestCase.php`)

All feature test classes extend `Tests\TestCase` which provides:

| Helper | Signature | Purpose |
|--------|-----------|---------|
| `makeUser()` | `makeUser(role, extra)` | Create a User with the given role |
| `actAs()` | `actAs(role, extra)` | Create + authenticate user via Sanctum |
| `makeSchoolYear()` | `makeSchoolYear(extra)` | Create a SchoolYear record |
| `makeDepartment()` | `makeDepartment(extra)` | Create an HrmsDepartment |
| `makePosition()` | `makePosition(deptId, extra)` | Create an HrmsPosition |
| `makePersonnel()` | `makePersonnel(deptId, posId, extra)` | Create an HrmsPersonnel |
| `seedStatutoryData()` | `seedStatutoryData()` | Insert minimal SSS/PhilHealth/PagIBIG/Tax rows required for payroll computation |

### 2.3 Authentication

Tests use `actingAs($user, 'sanctum')` via the `actAs()` helper. This sets up stateful auth that bypasses real token issuance.

> ⚠️ **Known behavior:** `$request->user()->currentAccessToken()` returns `null` inside tests using `actingAs()` because no real token is issued. The `AuthController::logout()` was patched with a null check to handle this gracefully.

---

## 3. Module Test Coverage Matrix

### 3.1 Auth Module (`tests/Feature/Auth/AuthTest.php`)

| Workflow | Endpoint | Test | Status |
|----------|----------|------|--------|
| Valid login returns token | `POST /api/auth/login` | `test_login_with_valid_credentials_returns_token` | ✅ |
| Wrong password → 422 | `POST /api/auth/login` | `test_login_with_wrong_password_returns_422` | ✅ |
| Unknown user → 422 | `POST /api/auth/login` | `test_login_with_unknown_username_returns_422` | ✅ |
| Missing fields → 422 | `POST /api/auth/login` | `test_login_missing_fields_returns_422` | ✅ |
| Authenticated /me | `GET /api/auth/me` | `test_me_returns_authenticated_user` | ✅ |
| No token → 401 | `GET /api/auth/me` | `test_protected_route_without_token_returns_401` | ✅ |
| Logout | `POST /api/auth/logout` | `test_logout_revokes_token` | ✅ |
| Update profile | `PUT /api/auth/profile` | `test_update_profile_persists_changes` | ✅ |
| Change password | `PUT /api/auth/password` | `test_change_password_succeeds_with_correct_current_password` | ✅ |
| Wrong current password | `PUT /api/auth/password` | `test_change_password_fails_with_wrong_current_password` | ✅ |

> **Important:** Laravel throws `ValidationException` (HTTP 422) on invalid login credentials, NOT 401.

---

### 3.2 Admin — School Year (`tests/Feature/Admin/SchoolYearTest.php`)

| Workflow | Endpoint | Test | Status |
|----------|----------|------|--------|
| List school years | `GET /api/admin/school-years` | `test_admin_can_list_school_years` | ✅ |
| Create school year | `POST /api/admin/school-years` | `test_admin_can_create_school_year` | ✅ |
| Duplicate → 422 | `POST /api/admin/school-years` | `test_duplicate_school_year_returns_422` | ✅ |
| Required fields | `POST /api/admin/school-years` | `test_create_school_year_requires_fields` | ✅ |
| Show single | `GET /api/admin/school-years/{public_id}` | `test_admin_can_show_school_year` | ✅ |
| Update | `PUT /api/admin/school-years/{public_id}` | `test_admin_can_update_school_year` | ✅ |
| Activate (deactivates others) | `POST /api/admin/school-years/{public_id}/activate` | `test_activating_school_year_deactivates_others` | ✅ |
| Non-admin rejected | `POST /api/admin/school-years` | `test_non_admin_cannot_create_school_year` | ✅ |
| Unauthenticated rejected | `GET /api/admin/school-years` | `test_unauthenticated_request_is_rejected` | ✅ |

> **Important:** Routes use `public_id` for model binding (all models using `HasPublicId` trait override `getRouteKeyName()` to return `'public_id'`). Always use `$model->public_id` in test URLs, never `$model->id`.  
> **Important:** `activate()` requires a `semester` field in the request body (e.g., `'semester' => '1st Semester'`).  
> **Important:** `update()` does NOT accept or modify the `status` field — use `activate()` to change status.

---

### 3.3 Admin — User Management (`tests/Feature/Admin/UserManagementTest.php`)

| Workflow | Endpoint | Test | Status |
|----------|----------|------|--------|
| List users | `GET /api/admin/users` | `test_admin_can_list_users` | ✅ |
| Create user | `POST /api/admin/users` | `test_admin_can_create_user` | ✅ |
| Duplicate username → 422 | `POST /api/admin/users` | `test_duplicate_username_returns_422` | ✅ |
| Required fields | `POST /api/admin/users` | `test_create_user_requires_mandatory_fields` | ✅ |
| View user detail | `GET /api/admin/users/{public_id}` | `test_admin_can_view_user_detail` | ✅ |
| Update user | `PUT /api/admin/users/{public_id}` | `test_admin_can_update_user` | ✅ |
| Deactivate user | `DELETE /api/admin/users/{public_id}` | `test_admin_can_deactivate_user` | ✅ |
| Reset password | `POST /api/admin/users/{public_id}/reset-password` | `test_admin_can_reset_user_password` | ✅ |
| Non-admin list rejected | `GET /api/admin/users` | `test_non_admin_cannot_list_users` | ✅ |
| Non-admin create rejected | `POST /api/admin/users` | `test_non_admin_cannot_create_user` | ✅ |

> **Important:** There is no `PATCH /users/{id}/status` endpoint. Deactivation uses `DELETE /api/admin/users/{public_id}`, which sets `status = 'Inactive'` (soft deactivation, not hard delete).  
> **Important:** `reset-password` auto-generates a random 8-char password (no user input needed). Response body: `{'message': '...', 'data': {'new_password': '...'}}`

---

### 3.4 Registrar — Student (`tests/Feature/Registrar/StudentTest.php`)

| Workflow | Endpoint | Test | Status |
|----------|----------|------|--------|
| List students | `GET /api/registrar/students` | ✅ | ✅ |
| Create student | `POST /api/registrar/students` | ✅ | ✅ |
| Read student by public_id | `GET /api/registrar/students/{reg_id}` | ✅ | ✅ |
| Update student name | `PUT /api/registrar/students/{reg_id}` | ✅ | ✅ |
| Status transitions | `POST /api/registrar/enrollment/{id}/transition` | ✅ | ✅ |
| Cashier cannot create | `POST /api/registrar/students` | ✅ | ✅ |

---

### 3.5 Accounting — Assessment Setup (`tests/Feature/Accounting/AssessmentSetupTest.php`)

| Workflow | Endpoint | Test | Status |
|----------|----------|------|--------|
| Create category (single GL) | `POST /api/accounting/categories` | `test_can_create_accounts_category` | ✅ |
| Create category (multi GL) | `POST /api/accounting/categories` | `test_can_create_category_for_multiple_grade_levels` | ✅ |
| Required fields | `POST /api/accounting/categories` | `test_create_category_requires_schoolYear_and_description` | ✅ |
| Grade level required | `POST /api/accounting/categories` | `test_create_category_requires_grade_level` | ✅ |
| List categories | `GET /api/accounting/categories` | `test_can_list_categories` | ✅ |
| Create particular | `POST /api/accounting/particulars` | `test_can_create_particular` | ✅ |
| Particular required fields | `POST /api/accounting/particulars` | `test_create_particular_requires_description` | ✅ |
| Non-accounting role rejected | `POST /api/accounting/categories` | `test_registrar_cannot_access_categories` | ✅ |

> **Important:** `POST /api/accounting/particulars` requires: `gradeLevel` (or `gradeLevels`), `schoolYear`, `account_group`, `account_code`, `description`, `amount`. Simply passing `description` and `amount` will return 422.

---

### 3.6 Accounting — Journal Entries (`tests/Feature/Accounting/JournalEntryTest.php`)

| Workflow | Endpoint | Test | Status |
|----------|----------|------|--------|
| Create COA account | `POST /api/accounting/chart-of-accounts` | `test_admin_can_create_coa_account` | ✅ |
| Duplicate account code → 422 | `POST /api/accounting/chart-of-accounts` | `test_duplicate_account_code_returns_422` | ✅ |
| Create balanced JE | `POST /api/accounting/journal-entries` | `test_can_create_balanced_journal_entry` | ✅ |
| Unbalanced → 422 | `POST /api/accounting/journal-entries` | `test_unbalanced_journal_entry_returns_422` | ✅ |
| Zero line → 422 | `POST /api/accounting/journal-entries` | `test_entry_with_zero_debit_and_zero_credit_line_fails` | ✅ |
| Post draft JE | `POST /api/accounting/journal-entries/{id}/post` | `test_admin_can_post_draft_journal_entry` | ✅ |
| Void posted JE | `POST /api/accounting/journal-entries/{id}/void` | `test_admin_can_void_posted_journal_entry` | ✅ |
| Registrar rejected | `POST /api/accounting/journal-entries` | `test_registrar_cannot_create_journal_entry` | ✅ |

> **Important:** COA route is `/api/accounting/chart-of-accounts`, NOT `/api/accounting/coa`.  
> **Important:** Void status is `'Voided'` (not `'Void'`). Status lifecycle: `Draft` → `Posted` → `Voided`.

---

### 3.7 HRMS — Personnel (`tests/Feature/Hrms/PersonnelTest.php`)

| Workflow | Endpoint | Test | Status |
|----------|----------|------|--------|
| List departments | `GET /api/hrms/departments` | `test_hr_can_list_departments` | ✅ |
| Create department | `POST /api/hrms/departments` | `test_hr_can_create_department` | ✅ |
| Duplicate dept name → 422 | `POST /api/hrms/departments` | `test_duplicate_department_name_returns_422` | ✅ |
| Update department | `PUT /api/hrms/departments/{public_id}` | `test_hr_can_update_department` | ✅ |
| Delete with personnel → 422 | `DELETE /api/hrms/departments/{public_id}` | `test_cannot_delete_department_with_active_personnel` | ✅ |
| Create position | `POST /api/hrms/positions` | `test_hr_can_create_position` | ✅ |
| List positions | `GET /api/hrms/positions` | `test_hr_can_list_positions` | ✅ |
| Update position | `PUT /api/hrms/positions/{public_id}` | `test_hr_can_update_position` | ✅ |
| Create personnel | `POST /api/hrms/personnel` | `test_hr_can_create_personnel` | ✅ |
| Duplicate employee_id → 422 | `POST /api/hrms/personnel` | `test_duplicate_employee_id_returns_422` | ✅ |
| Update personnel | `PUT /api/hrms/personnel/{public_id}` | `test_hr_can_update_personnel` | ✅ |
| Assign department | `PATCH /api/hrms/personnel/{public_id}/department` | `test_hr_can_assign_department_to_personnel` | ✅ |
| Cashier rejected | `POST /api/hrms/personnel` | `test_cashier_cannot_create_personnel` | ✅ |

> **Important:** `updatePersonnel()` requires `employee_id` in the payload (it's required with unique-ignore rule). Always include it with the personnel's existing `employee_id`.  
> **Important:** Assign department uses `PATCH /api/hrms/personnel/{public_id}/department`, NOT `POST .../assign-department`.

---

### 3.8 HRMS — Leave (`tests/Feature/Hrms/LeaveTest.php`)

| Workflow | Endpoint | Test | Status |
|----------|----------|------|--------|
| Create leave type | `POST /api/hrms/leave-types` | `test_hr_can_create_leave_type` | ✅ |
| Duplicate name → 422 | `POST /api/hrms/leave-types` | `test_duplicate_leave_type_name_returns_422` | ✅ |
| List leave types | `GET /api/hrms/leave-types` | `test_hr_can_list_leave_types` | ✅ |
| Delete unused type | `DELETE /api/hrms/leave-types/{public_id}` | `test_can_delete_leave_type_with_no_applications` | ✅ |
| Apply for leave | `POST /api/hrms/leaves` | `test_hr_can_apply_leave_for_personnel` | ✅ |
| Start date must be future | `POST /api/hrms/leaves` | `test_leave_application_requires_start_date_in_future` | ✅ |
| Approve leave | `POST /api/hrms/leaves/{public_id}/approve` | `test_hr_can_approve_leave_application` | ✅ |
| Reject with remarks | `POST /api/hrms/leaves/{public_id}/reject` | `test_hr_can_reject_leave_application_with_remarks` | ✅ |
| Reject without remarks → 422 | `POST /api/hrms/leaves/{public_id}/reject` | `test_reject_without_remarks_returns_422` | ✅ |
| Cancel pending leave | `DELETE /api/hrms/leaves/{public_id}` | `test_hr_can_cancel_pending_leave_application` | ✅ |
| Cannot cancel approved | `DELETE /api/hrms/leaves/{public_id}` | `test_cannot_cancel_approved_leave` | ✅ |
| Registrar rejected | `POST /api/hrms/leave-types` | `test_registrar_cannot_manage_leave_types` | ✅ |

> **Important:** Apply leave endpoint is `POST /api/hrms/leaves`, NOT `POST /api/hrms/leaves/apply`.  
> **Important:** Cancel leave uses `DELETE /api/hrms/leaves/{public_id}` (no `/cancel` suffix).

---

### 3.9 HRMS — Payroll (`tests/Feature/Hrms/PayrollTest.php`)

| Workflow | Endpoint | Test | Status |
|----------|----------|------|--------|
| Full lifecycle: create → compute → submit → approve → post GL | Multiple | `test_full_payroll_lifecycle` | ✅ |
| Cannot post draft period | `POST /api/hrms/payroll/periods/{id}/post` | `test_cannot_post_draft_period` | ✅ |

> **Setup required:** `seedStatutoryData()` must be called before payroll tests — it inserts SSS/PhilHealth/PagIBIG/Tax rows needed by computation.  
> **Important:** Payroll posting creates a `JournalEntry` in GL with `entry_no` format `PR-YYYYMMDD-NNNN`, status `'Posted'`.

---

### 3.10 Kiosk — Attendance Scan (`tests/Feature/Kiosk/KioskScanTest.php`)

| Workflow | Endpoint | Test | Status |
|----------|----------|------|--------|
| Scan employee_id (first = in) | `POST /api/kiosk/scan` | `test_scanning_employee_id_returns_in_on_first_scan` | ✅ |
| Second scan same day (= out) | `POST /api/kiosk/scan` | `test_scanning_same_employee_twice_toggles_to_out` | ✅ |
| Scan by PIN code | `POST /api/kiosk/scan` | `test_scanning_by_pin_code_identifies_personnel` | ✅ |
| Inactive personnel → 404 | `POST /api/kiosk/scan` | `test_inactive_personnel_is_not_recognized` | ✅ |
| Unknown code → 404 | `POST /api/kiosk/scan` | `test_unknown_scan_code_returns_404` | ✅ |
| Missing code field → 422 | `POST /api/kiosk/scan` | `test_scan_requires_code_field` | ✅ |
| Manual log (HR auth) | `POST /api/hrms/attendance/manual` | `test_authenticated_user_can_create_manual_log` | ✅ |
| Manual log required fields | `POST /api/hrms/attendance/manual` | `test_manual_log_requires_mandatory_fields` | ✅ |
| Manual log requires auth | `POST /api/hrms/attendance/manual` | `test_manual_log_requires_authentication` | ✅ |

> **Important:** Public scan endpoint is `POST /api/kiosk/scan` (no auth).  
> **Important:** Manual log endpoint is `POST /api/hrms/attendance/manual` (requires role: Administrator or HR), NOT `/api/kiosk/manual`.

---

### 3.11 Custodian — Inventory (`tests/Feature/Custodian/InventoryTest.php`)

| Workflow | Endpoint | Test | Status |
|----------|----------|------|--------|
| Create property category | `POST /api/custodian/property-categories` | ✅ | ✅ |
| Create property item | `POST /api/custodian/property` | ✅ | ✅ |
| Create consumable category | `POST /api/custodian/consumable-categories` | ✅ | ✅ |
| Create consumable | `POST /api/custodian/consumables` | ✅ | ✅ |
| Stock in / stock out | `POST /api/custodian/consumables/{id}/stock-in` | ✅ | ✅ |
| Role guard | Multiple | ✅ | ✅ |

---

### 3.12 Clearance (`tests/Feature/Clearance/ClearanceTest.php`)

| Workflow | Endpoint | Test | Status |
|----------|----------|------|--------|
| Create clearance template | `POST /api/custodian/clearance-templates` | ✅ | ✅ |
| Apply for clearance | `POST /api/clearance/apply` | ✅ | ✅ |
| View my clearance record | `GET /api/clearance/my-record` | ✅ | ✅ |
| Clear an office items | `POST /api/clearance/records/{id}/offices/{id}/clear` | ✅ | ✅ |
| Return clearance | `POST /api/clearance/records/{id}/offices/{id}/return` | ✅ | ✅ |

---

## 4. Bugs Discovered During Testing

| # | Severity | Location | Bug | Fix Applied |
|---|----------|----------|-----|-------------|
| 1 | Medium | `CategoryController::store()` line 53 | `$validated['gradeLevel']` throws `Undefined array key` when grade level is absent → 500 instead of 422 | Changed to `($validated['gradeLevel'] ?? null)` ✅ |
| 2 | Low | `AuthController::logout()` | `currentAccessToken()` returns `null` when using `actingAs()` in tests → 500 | Added null check before calling `->delete()` ✅ |
| 3 | Medium | `PayrollComputeService::postToGl()` | Creates `JournalEntry` without `entry_no` field (NOT NULL constraint violation) → 500 on payroll post | Added `PR-YYYYMMDD-NNNN` entry_no generation ✅ |
| 4 | Low | `PayrollComputeService::postToGl()` | Used `'status' => 'posted'` (lowercase) instead of `'Posted'` → CHECK constraint violation | Changed to `'Posted'` ✅ |

---

## 5. Key API Conventions

### Route Binding
All major models use the `HasPublicId` trait which overrides `getRouteKeyName()` to return `'public_id'`. Always use `$model->public_id` in test URLs, not `$model->id`.

Affected models: `SchoolYear`, `User`, `HrmsDepartment`, `HrmsPosition`, `HrmsPersonnel`, `LeaveType`, `LeaveApplication`, `PayrollPeriod`, `ChartOfAccount`, etc.

### Role Middleware
The `role:X,Y` middleware checks `$request->user()->access`. Available roles:
- `Administrator`
- `Registrar`, `Encoder`
- `Accounting Staff`, `Cashier`
- `HR`
- `Custodian`
- `Teacher`
- `Student`, `Parent`, `Applicant`

### HTTP Status Codes
| Scenario | Code |
|----------|------|
| Invalid credentials (login) | 422 (ValidationException) — NOT 401 |
| Unauthorized (no token) | 401 |
| Forbidden (wrong role) | 403 |
| Validation errors | 422 |
| Created | 201 |
| Success (no body needed) | 200 |

---

## 6. UI/UX Improvement Recommendations

Based on findings from automated testing and workflow analysis:

| Priority | Module | Recommendation |
|----------|--------|----------------|
| High | Auth | Change `/api/auth/login` to return HTTP 401 (not 422) on invalid credentials — current 422 response is unintuitive for API consumers and front-end error handling |
| High | Payroll | Show active school year as default in payroll period creation dialog |
| Medium | Payroll | Add bulk payslip ZIP download for a pay period |
| Medium | HRMS Personnel | CSV bulk import for onboarding multiple employees at once |
| Medium | HRMS Leave | Leave balance tracker showing remaining days per leave type per employee |
| Medium | Admin | Dashboard notification banner for pending payroll approvals awaiting HR action |
| Low | Kiosk | Camera-based QR code scan support as mobile-friendly alternative to RFID |
| Low | Accounting | Quick "post all draft entries" batch action for month-end close workflow |
| Low | Clearance | Email/notification when all offices have cleared a student/employee |

---

## 7. Test File Locations

```
svhs-api/
└── tests/
    ├── TestCase.php                        ← Base class with helpers
    ├── Feature/
    │   ├── ExampleTest.php                 ← Basic API sanity check
    │   ├── Auth/
    │   │   └── AuthTest.php
    │   ├── Admin/
    │   │   ├── SchoolYearTest.php
    │   │   └── UserManagementTest.php
    │   ├── Registrar/
    │   │   └── StudentTest.php
    │   ├── Accounting/
    │   │   ├── AssessmentSetupTest.php
    │   │   └── JournalEntryTest.php
    │   ├── Hrms/
    │   │   ├── PersonnelTest.php
    │   │   ├── LeaveTest.php
    │   │   └── PayrollTest.php
    │   ├── Kiosk/
    │   │   └── KioskScanTest.php
    │   ├── Custodian/
    │   │   └── InventoryTest.php
    │   └── Clearance/
    │       └── ClearanceTest.php
    └── Unit/
        └── ExampleTest.php
```

---

## 8. Running Tests in CI

The test suite is fully self-contained (SQLite in-memory, no external services needed). No seeding or migrations need to be run manually — `RefreshDatabase` handles everything.

Minimum PHP extensions required: `pdo_sqlite`, `sqlite3`

```bash
# CI command
cd svhs-api && php artisan test --parallel
```
