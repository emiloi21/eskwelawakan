# 🤖 AI Coding Agent Prompt
## Decision Support System (DSS) Module
## Target System: Eskwelawakan — Smart School System by Aqura
## Target Model: Claude Sonnet 4.6

---

## ▶ AGENT ROLE

You are an expert full-stack engineer deeply familiar with **Laravel 12**, **React 19 + TypeScript**, and data analytics systems. You are extending the **Eskwelawakan Smart School MIS** — a production-grade, 22-module school management platform currently deployed at St. Vincent High School (SVHS) — by adding a new **Decision Support System (DSS)** module.

You must integrate this feature as a **native, first-class module** of the existing codebase — not as a bolt-on. You follow every existing convention in this system without deviation. You reuse existing services, models, components, and patterns before ever creating anything new. You never introduce a new dependency unless the existing stack cannot satisfy the requirement.

---

## ▶ SYSTEM CONTEXT — READ THIS ENTIRELY BEFORE TOUCHING ANY FILE

### Stack (Do Not Deviate From These)

| Layer | Technology | Notes |
|---|---|---|
| Backend framework | Laravel 12 / PHP 8.2 | |
| Auth | Laravel Sanctum — Bearer token | Token stored in React Zustand auth store (`localStorage`) |
| RBAC | `spatie/laravel-permission` | `->middleware('role:RoleName')` on route groups |
| PDF generation | `barryvdh/laravel-dompdf` v3.1 | Already installed — use for all PDF exports |
| ORM | Eloquent | All models in `app/Models/` |
| Database | MySQL 8.0 | DB name: `sms_db` |
| Frontend framework | React 19.2 + TypeScript 5.9 (strict mode) | |
| Build tool | Vite 6 — all routes are `React.lazy()` in `App.tsx` | |
| Styling | Tailwind CSS v4 — uses `@import "tailwindcss"` syntax (no `tailwind.config.js`) | |
| Component library | `shadcn/ui` + `@base-ui/react` — components in `frontend/src/components/ui/` | |
| Tables | `@tanstack/react-table` v8.21 | |
| Data fetching | `@tanstack/react-query` v5 — `useQuery` / `useMutation` | |
| Forms | `react-hook-form` v7 + `zod` v4 | |
| Global state | Zustand v5 — `useAuthStore` in `stores/auth.ts` | |
| Charts | **Recharts v3** — already installed; use for all charts | |
| Routing | React Router DOM v7 | |
| HTTP client | Axios v1 — global instance with Sanctum interceptor in `frontend/src/lib/api.ts` | |

---

### Repository Structure (Mirror Exactly)

```
svhs-sms-revamped/
├── backend/
│   ├── app/
│   │   ├── Console/Commands/
│   │   ├── Http/
│   │   │   ├── Controllers/          ← Namespaced by module. DSS goes in Controllers/Admin/Dss/
│   │   │   ├── Requests/             ← Form request validation classes
│   │   │   └── Middleware/
│   │   ├── Models/                   ← All Eloquent models here (flat, no subdirectories)
│   │   ├── Services/                 ← Business logic services. DSS services go here.
│   │   └── Traits/
│   │       └── HasPublicId.php       ← Use this trait on every new model
│   ├── config/
│   │   └── school.php               ← School-specific constants (grade levels, strands)
│   ├── database/
│   │   └── migrations/              ← 107 existing migrations. New DSS migrations continue here.
│   └── routes/
│       └── api.php                  ← All ~350 routes in this single file. Add DSS routes here.
│
└── frontend/src/
    ├── App.tsx                      ← Full route tree. Register all new DSS routes here.
    ├── layouts/                     ← Per-role layout wrappers. DSS uses the existing admin layout.
    ├── pages/                       ← Pages by module. DSS pages go in pages/admin/dss/
    ├── components/                  ← Shared UI. Reuse existing; create in components/dss/ if new.
    ├── hooks/                       ← Custom React hooks
    ├── stores/                      ← Zustand stores (auth.ts, theme.ts)
    ├── types/                       ← TypeScript interfaces per module. Add types/dss.ts
    └── lib/
        ├── api.ts                   ← Axios instance — never instantiate Axios directly
        └── utils.ts
```

---

### Backend Conventions (Strictly Follow)

1. **Controllers** — namespace: `App\Http\Controllers\Admin\Dss\`. One controller per DSS sub-module (e.g., `DssDashboardController`, `DssEnrollmentController`, `DssAcademicHealthController`, `DssResourceController`, `DssWarningsController`, `DssRecommendationsController`, `DssReportsController`).

2. **Services** — all business/computation logic goes in `app/Services/Dss/`. Never put business logic in controllers. Example: `DssEnrollmentService`, `DssAcademicHealthService`, `DssEarlyWarningService`, `DssRecommendationService`.

3. **Models** — flat in `app/Models/`. Use the `HasPublicId` trait on every new model. New models: `EarlyWarning`, `StudentIntervention`, `DssRecommendation`.

4. **public_id routing** — All URL path parameters use `public_id` (20-char lowercase alphanumeric). Integer PKs are used internally and in foreign keys only. Never expose integer PKs in routes.

5. **FormRequest validation** — All input validation in dedicated `app/Http/Requests/Dss/` classes.

6. **Route prefix** — DSS routes live under the `/admin/` prefix group (already protected by `auth:sanctum` + `role:Administrator`). Add a `/dss` sub-prefix:
   ```php
   Route::prefix('admin/dss')->middleware(['auth:sanctum', 'role:Administrator'])->group(function () {
       // DSS routes here
   });
   ```

7. **Activity logging** — Log significant admin actions using:
   ```php
   activity()->causedBy(auth()->user())->log('Description of action');
   ```

8. **PDF export** — Use `barryvdh/laravel-dompdf`. Follow the same pattern as existing receipt/payslip generation. Return a `PDF::loadView()` with a Blade template in `resources/views/dss/`.

9. **Migration naming** — Follow the existing chronological format:
   `YYYY_MM_DD_HHMMSS_create_[table]_table.php`

10. **Migrations must be reversible** — always implement both `up()` and `down()`.

---

### Frontend Conventions (Strictly Follow)

1. **All new pages** go under `frontend/src/pages/admin/dss/`. Examples:
   - `pages/admin/dss/DssDashboardPage.tsx`
   - `pages/admin/dss/DssEnrollmentPage.tsx`
   - `pages/admin/dss/DssAcademicHealthPage.tsx`
   - `pages/admin/dss/DssResourcesPage.tsx`
   - `pages/admin/dss/DssWarningsPage.tsx`
   - `pages/admin/dss/DssRecommendationsPage.tsx`
   - `pages/admin/dss/DssReportsPage.tsx`

2. **All routes are lazy-loaded** in `App.tsx`:
   ```tsx
   const DssDashboardPage = React.lazy(() => import('./pages/admin/dss/DssDashboardPage'));
   ```

3. **All API calls use TanStack Query** — `useQuery` for reads, `useMutation` for writes. Cache keys follow the existing `['dss-dashboard']`, `['dss-enrollment', schoolYearId]` pattern.

4. **All API calls go through `api.ts`** — never instantiate Axios directly:
   ```ts
   import api from '@/lib/api';
   const { data } = await api.get('/admin/dss/dashboard');
   ```

5. **All forms use react-hook-form + zod** with co-located Zod schemas.

6. **Charts use Recharts v3** — already installed. Use `LineChart`, `BarChart`, `PieChart`, `AreaChart` etc. from `recharts`.

7. **Tables use @tanstack/react-table** v8.21 — follow patterns from existing table implementations.

8. **shadcn/ui components** — use from `@/components/ui/`. Never install a new component library.

9. **All ID state variables are `string | null`** — never `number`. All API URL paths use `public_id`.

10. **TypeScript interfaces** — define all DSS types in `frontend/src/types/dss.ts`.

11. **DSS uses the existing Admin layout** — do NOT create a new layout. Add DSS navigation to the existing admin sidebar.

12. **Tailwind v4 syntax** — use `@import "tailwindcss"` convention; no `tailwind.config.js` entries needed.

---

### Existing Database Tables to Query for DSS

The DSS module must query these **existing tables** (do not re-create them):

| Table | DSS Use |
|---|---|
| `school_years` | Filter all reports by active/selected school year |
| `students` | Total student counts, demographics |
| `classes` | Sections: name, grade level, capacity, adviser, school year |
| `grades` | Academic performance per student per subject |
| `attendance` | Student and faculty attendance records |
| `faculty_staff` | Faculty roster for load analysis |
| `hrms_personnel` | Personnel details (linked to faculty_staff or used for staff counts) |
| `hrms_departments` | Department groupings for faculty |
| `accounts_assessments` | Grade-level fee assessments (used to infer grade level setup) |
| `custodian_consumable_items` | Instructional materials / consumables inventory |
| `custodian_property_items` | School assets/property |
| `facilities` | Classrooms and facility records |
| `facility_bookings` | Classroom scheduling / utilization |
| `school_preferences` | School name, logo — used in PDF report headers |

> **Important:** Inspect each table's actual column names via the migration files before writing any query. Do not assume column names. Check `database/migrations/` for the source of truth.

---

## ▶ NEW DATABASE TABLES TO CREATE

Generate Laravel migration files for these three new tables. Follow the existing migration timestamp format and use `HasPublicId` in the corresponding models.

### Table 1: `student_interventions`
```php
Schema::create('student_interventions', function (Blueprint $table) {
    $table->id();
    $table->string('public_id', 20)->unique();
    $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
    $table->foreignId('school_year_id')->constrained('school_years')->onDelete('cascade');
    $table->text('flagged_reason');
    $table->enum('intervention_status', ['flagged', 'under_intervention', 'resolved'])->default('flagged');
    $table->text('notes')->nullable();
    $table->foreignId('flagged_by')->constrained('users')->onDelete('cascade');
    $table->timestamp('flagged_at')->useCurrent();
    $table->timestamp('resolved_at')->nullable();
    $table->timestamps();

    $table->index(['student_id', 'school_year_id']);
    $table->index('intervention_status');
});
```

### Table 2: `early_warnings`
```php
Schema::create('early_warnings', function (Blueprint $table) {
    $table->id();
    $table->string('public_id', 20)->unique();
    $table->string('warning_type', 100);
    $table->enum('severity', ['critical', 'warning', 'info'])->default('info');
    $table->text('message');
    $table->string('related_entity_type', 100)->nullable(); // e.g. 'grade_level', 'faculty', 'section'
    $table->unsignedBigInteger('related_entity_id')->nullable();
    $table->boolean('is_acknowledged')->default(false);
    $table->foreignId('acknowledged_by')->nullable()->constrained('users')->onDelete('set null');
    $table->timestamp('acknowledged_at')->nullable();
    $table->timestamp('triggered_at')->useCurrent();
    $table->timestamps();

    $table->index(['is_acknowledged', 'severity']);
    $table->index('warning_type');
});
```

### Table 3: `dss_recommendations`
```php
Schema::create('dss_recommendations', function (Blueprint $table) {
    $table->id();
    $table->string('public_id', 20)->unique();
    $table->text('recommendation_text');
    $table->enum('category', ['enrollment', 'academic', 'faculty', 'resource', 'general'])->default('general');
    $table->enum('priority', ['high', 'medium', 'low'])->default('medium');
    $table->text('basis'); // Short explanation of triggering data
    $table->foreignId('related_warning_id')->nullable()->constrained('early_warnings')->onDelete('set null');
    $table->boolean('is_actioned')->default(false);
    $table->foreignId('actioned_by')->nullable()->constrained('users')->onDelete('set null');
    $table->timestamp('actioned_at')->nullable();
    $table->timestamp('generated_at')->useCurrent();
    $table->timestamps();

    $table->index(['is_actioned', 'priority']);
    $table->index('category');
});
```

---

## ▶ BACKEND SERVICES TO BUILD

### Service 1: `DssEnrollmentService`
**File:** `app/Services/Dss/DssEnrollmentService.php`

Methods required:
```php
// Total enrollment per school year (for trend chart, last 5 SYs)
public function enrollmentTrendByYear(): array

// Enrollment per grade level for a given school_year_id
public function enrollmentByGradeLevel(int $schoolYearId): array

// Section fill rates for a given school_year_id
// Returns: section_name, grade_level, enrolled_count, capacity, fill_rate_pct, status
public function sectionFillRates(int $schoolYearId): array

// Linear projection for next school year enrollment per grade level
// Based on last 5 years of data
public function enrollmentProjection(): array
```

### Service 2: `DssAcademicHealthService`
**File:** `app/Services/Dss/DssAcademicHealthService.php`

Methods required:
```php
// Promotion, retention, dropout counts and rates per grade level
public function promotionRetentionRates(int $schoolYearId): array

// Grade distribution: count of students per grade bracket
// Brackets: 90-100, 85-89, 80-84, 75-79, <75
public function gradeDistribution(int $schoolYearId, ?int $gradeLevel = null): array

// Subject-level average performance per grade level
public function subjectPerformance(int $schoolYearId): array

// Flag at-risk students based on configurable criteria:
// - Final grade below passing in 2+ subjects
// - Retained in same grade level more than once
// Returns collection of student data with flag reasons
public function flagAtRiskStudents(int $schoolYearId): \Illuminate\Support\Collection
```

> The `flagAtRiskStudents()` method must be reusable — it is called both from the Academic Health report endpoint AND from `DssEarlyWarningService`.

### Service 3: `DssResourceService`
**File:** `app/Services/Dss/DssResourceService.php`

Methods required:
```php
// Faculty load per faculty_staff member for a given school_year_id
// Returns: name, department, subject_count, total_units, load_status (overloaded/optimal/underloaded)
// Load thresholds: optimal = 18–24 units (make this configurable via school.php constant)
public function facultyLoadAnalysis(int $schoolYearId): array

// Classroom utilization per facility
// Returns: room_name, capacity, sections_assigned, scheduled_hours_per_week, utilization_pct, status
public function classroomUtilization(int $schoolYearId): array

// Instructional materials inventory status
// Source: custodian_consumable_items
// Returns: item_name, category, quantity_on_hand, quantity_needed (based on enrollment), status
public function materialsInventory(int $schoolYearId): array
```

### Service 4: `DssEarlyWarningService`
**File:** `app/Services/Dss/DssEarlyWarningService.php`

This is the core evaluation engine. It must:
1. Evaluate all warning conditions against current data
2. Create `EarlyWarning` records only for conditions not already flagged and unacknowledged
3. Return a summary of new warnings created

Warning conditions to evaluate:

```php
private array $warningRules = [
    [
        'type'      => 'high_retention_rate',
        'severity'  => 'critical',
        'threshold' => 20, // percent
        'message'   => 'Retention rate for [Grade X] is [X]%, exceeding the 20% critical threshold.',
        'entity'    => 'grade_level',
    ],
    [
        'type'      => 'enrollment_drop',
        'severity'  => 'critical',
        'threshold' => 15, // percent drop vs previous year
        'message'   => 'Enrollment in [Grade X] dropped by [X]% compared to the previous school year.',
        'entity'    => 'grade_level',
    ],
    [
        'type'      => 'at_risk_student_surge',
        'severity'  => 'warning',
        'threshold' => 10, // percent increase in at-risk count
        'message'   => 'At-risk student count increased by [X]% compared to the previous school year.',
        'entity'    => 'institution',
    ],
    [
        'type'      => 'overloaded_faculty',
        'severity'  => 'warning',
        'message'   => '[Teacher Name] is carrying [X] units, exceeding the maximum load of [max] units.',
        'entity'    => 'faculty',
    ],
    [
        'type'      => 'section_overcapacity',
        'severity'  => 'warning',
        'message'   => 'Section [Name] has [X] students enrolled, exceeding its room capacity of [cap].',
        'entity'    => 'section',
    ],
    [
        'type'      => 'underutilized_section',
        'severity'  => 'info',
        'threshold' => 50, // below 50% fill rate
        'message'   => 'Section [Name] has a fill rate of [X]%, which is below the 50% minimum threshold.',
        'entity'    => 'section',
    ],
    [
        'type'      => 'materials_shortage',
        'severity'  => 'warning',
        'message'   => 'Consumable item "[Item]" is below minimum stock: [qty] available vs [needed] needed.',
        'entity'    => 'consumable',
    ],
    [
        'type'      => 'subject_failure_spike',
        'severity'  => 'warning',
        'message'   => 'Subject "[Subject]" in [Grade Level] has an average grade below passing for the current school year.',
        'entity'    => 'subject',
    ],
];

public function evaluate(int $schoolYearId): array  // returns ['created' => int, 'skipped' => int]
```

### Service 5: `DssRecommendationService`
**File:** `app/Services/Dss/DssRecommendationService.php`

Rule-based recommendation generator. Triggered after `DssEarlyWarningService::evaluate()`.
Maps each warning type to a plain-language recommendation template and creates `DssRecommendation` records.

```php
public function generate(int $schoolYearId): int  // returns count of recommendations created
```

---

## ▶ API ROUTES TO ADD

Add these routes to `backend/routes/api.php` inside the existing admin middleware group pattern. Add them at the end of the admin group, clearly sectioned:

```php
// ============================================================
// DECISION SUPPORT SYSTEM (DSS)
// ============================================================
Route::prefix('admin/dss')->middleware(['auth:sanctum', 'role:Administrator'])->group(function () {

    // Dashboard
    Route::get('dashboard', [DssDashboardController::class, 'index']);

    // Enrollment Analytics
    Route::get('enrollment/summary',          [DssEnrollmentController::class, 'summary']);
    Route::get('enrollment/trends',           [DssEnrollmentController::class, 'trends']);
    Route::get('enrollment/grade-breakdown',  [DssEnrollmentController::class, 'gradeBreakdown']);
    Route::get('enrollment/section-fill-rates', [DssEnrollmentController::class, 'sectionFillRates']);
    Route::get('enrollment/projection',       [DssEnrollmentController::class, 'projection']);

    // Academic Health
    Route::get('academic-health/summary',           [DssAcademicHealthController::class, 'summary']);
    Route::get('academic-health/promotion-rates',   [DssAcademicHealthController::class, 'promotionRates']);
    Route::get('academic-health/grade-distribution', [DssAcademicHealthController::class, 'gradeDistribution']);
    Route::get('academic-health/at-risk',           [DssAcademicHealthController::class, 'atRiskStudents']);
    Route::get('academic-health/subject-performance', [DssAcademicHealthController::class, 'subjectPerformance']);
    Route::post('academic-health/interventions',    [DssAcademicHealthController::class, 'storeIntervention']);
    Route::patch('academic-health/interventions/{public_id}', [DssAcademicHealthController::class, 'updateIntervention']);
    Route::get('academic-health/at-risk/export',    [DssAcademicHealthController::class, 'exportAtRisk']);

    // Resource Utilization
    Route::get('resources/faculty-load',        [DssResourceController::class, 'facultyLoad']);
    Route::get('resources/classroom-utilization', [DssResourceController::class, 'classroomUtilization']);
    Route::get('resources/materials-inventory', [DssResourceController::class, 'materialsInventory']);

    // Early Warnings
    Route::get('warnings',                      [DssWarningsController::class, 'index']);
    Route::post('warnings/evaluate',            [DssWarningsController::class, 'evaluate']);
    Route::patch('warnings/{public_id}/acknowledge', [DssWarningsController::class, 'acknowledge']);

    // Recommendations
    Route::get('recommendations',               [DssRecommendationsController::class, 'index']);
    Route::post('recommendations/generate',     [DssRecommendationsController::class, 'generate']);
    Route::patch('recommendations/{public_id}/action', [DssRecommendationsController::class, 'markActioned']);

    // Report Export Center
    Route::get('reports/enrollment',            [DssReportsController::class, 'enrollmentReport']);
    Route::get('reports/promotion-retention',   [DssReportsController::class, 'promotionRetentionReport']);
    Route::get('reports/at-risk',               [DssReportsController::class, 'atRiskReport']);
    Route::get('reports/faculty-load',          [DssReportsController::class, 'facultyLoadReport']);
    Route::get('reports/classroom-utilization', [DssReportsController::class, 'classroomUtilizationReport']);
    Route::get('reports/materials-inventory',   [DssReportsController::class, 'materialsInventoryReport']);
    Route::get('reports/warnings-log',          [DssReportsController::class, 'warningsLogReport']);
    Route::get('reports/recommendations-log',   [DssReportsController::class, 'recommendationsLogReport']);
});
```

---

## ▶ FRONTEND PAGES TO BUILD

### DSS Dashboard — `pages/admin/dss/DssDashboardPage.tsx`

Layout:
1. **KPI Cards Row** (using shadcn/ui `Card`):
   - Total Enrolled (current SY + delta vs prev year with up/down arrow indicator)
   - Promotion Rate %
   - Retention Rate %
   - At-Risk Students (count + link to Academic Health)
   - Faculty Load Compliance % (% within optimal range)
   - Classroom Utilization %

2. **Charts Row** (3 columns using Recharts):
   - Enrollment Trend: `<LineChart>` — last 5 school years
   - Grade Distribution: `<BarChart>` — count per grade bracket for current SY
   - Resource Utilization: `<PieChart>` — faculty/rooms/materials status split

3. **Active Alerts Panel** — list of unacknowledged `early_warnings`, color-coded by severity (red = critical, yellow = warning, blue = info). Each row has an "Acknowledge" button.

4. **Recent Recommendations Panel** — last 5 `dss_recommendations`, with priority badge and "Mark Actioned" button.

5. **"Refresh Warnings & Recommendations" button** — calls `POST /admin/dss/warnings/evaluate` then `POST /admin/dss/recommendations/generate` via `useMutation`; shows loading spinner and success toast.

---

### Enrollment Analytics — `pages/admin/dss/DssEnrollmentPage.tsx`

- School Year selector (dropdown, populated from `/lookups`)
- **Enrollment Trend Chart:** `<LineChart>` with grade-level filter tabs
- **Grade Level Breakdown:** `<BarChart>` stacked (SHS: per strand)
- **Section Fill Rates Table:** using `@tanstack/react-table` with sortable columns and status badge (color-coded: green ≥70%, yellow 50-69%, red <50% or >100%)
- **Enrollment Projection Card:** per grade level linear forecast for next SY with "Estimate" label

---

### Academic Health Monitor — `pages/admin/dss/DssAcademicHealthPage.tsx`

- School Year selector
- **Summary Cards:** promoted count/rate, retained count/rate, dropped count/rate
- **Trend Sparklines:** promotion rate over 5 years (use Recharts `<Sparkline>` or small `<LineChart>`)
- **Grade Distribution Histogram:** `<BarChart>` per grade bracket, filterable by grade level/subject
- **At-Risk Student Table:** `@tanstack/react-table` with columns: Name, Grade Level, Section, Flag Reason(s), Status Badge, Action buttons (Mark Intervention / Resolve)
  - Inline "Add Notes" form using react-hook-form + zod
  - CSV export button calling `/admin/dss/academic-health/at-risk/export`
- **Subject Performance Table:** subject name, grade level, average grade, status badge (pass/fail)

---

### Resource Utilization — `pages/admin/dss/DssResourcesPage.tsx`

- School Year selector
- **Faculty Load Table:** @tanstack/react-table — Name, Dept, Subjects, Units, Status Badge (Overloaded/Optimal/Underloaded), color-coded rows
- **Faculty Load Bar Chart:** `<BarChart>` — units per faculty member with threshold reference lines
- **Classroom Utilization Table:** Room, Capacity, Sections Assigned, Utilization %, Status
- **Materials Inventory Table:** Item, Category, On Hand, Needed, Surplus/Shortage, Status Badge

---

### Early Warnings — `pages/admin/dss/DssWarningsPage.tsx`

- Filter tabs: All | Critical | Warning | Info | Acknowledged
- Warnings table: Warning Type, Severity Badge, Message, Related Entity, Triggered At, Status
- "Acknowledge" button per row — calls `PATCH /admin/dss/warnings/{public_id}/acknowledge`
- "Re-evaluate All Warnings" button — triggers the evaluation job
- Empty state: "No active warnings — your school is looking healthy 🎉"

---

### Recommendations — `pages/admin/dss/DssRecommendationsPage.tsx`

- Filter tabs: All | Pending | Actioned | by Category
- Recommendations table: Priority Badge, Category Badge, Recommendation Text, Basis, Generated At, Status
- "Mark as Actioned" button per row
- "Generate Recommendations" button

---

### Report Export Center — `pages/admin/dss/DssReportsPage.tsx`

For each report type, render a Card with:
- Report name and description
- Filter form (school year, grade level, date range where applicable)
- "Export PDF" and "Export CSV" buttons (where applicable)
- PDF opens in new tab; CSV triggers file download

Use this exact pattern for PDF (mirrors existing receipt download pattern):
```ts
const response = await api.get('/admin/dss/reports/enrollment', {
  params: filters,
  responseType: 'blob',
});
const url = window.URL.createObjectURL(new Blob([response.data]));
const link = document.createElement('a');
link.href = url;
link.setAttribute('download', `enrollment-report-${schoolYear}.pdf`);
document.body.appendChild(link);
link.click();
link.remove();
```

---

## ▶ NAVIGATION INTEGRATION

### Backend: No change needed (role is already Administrator)

### Frontend: Add to existing Admin sidebar

Locate the admin layout file (e.g., `frontend/src/layouts/admin-layout.tsx` or similar). Add a new navigation group:

```tsx
{
  label: 'Decision Support',
  icon: <ChartBarIcon />,   // Use whichever icon library is already in use
  children: [
    { label: 'DSS Dashboard',        href: '/admin/dss/dashboard' },
    { label: 'Enrollment Analytics', href: '/admin/dss/enrollment' },
    { label: 'Academic Health',      href: '/admin/dss/academic-health' },
    { label: 'Resource Utilization', href: '/admin/dss/resources' },
    { label: 'Early Warnings',       href: '/admin/dss/warnings' },
    { label: 'Recommendations',      href: '/admin/dss/recommendations' },
    { label: 'Report Center',        href: '/admin/dss/reports' },
  ]
}
```

Add a **notification badge** on the sidebar "Early Warnings" item showing the count of unacknowledged critical warnings. Fetch this count from a lightweight polling query (every 5 minutes via TanStack Query `refetchInterval`).

### App.tsx route registration:
```tsx
// Under the Administrator protected route group:
<Route path="dss/dashboard"       element={<Suspense fallback={<Spinner/>}><DssDashboardPage/></Suspense>} />
<Route path="dss/enrollment"      element={<Suspense fallback={<Spinner/>}><DssEnrollmentPage/></Suspense>} />
<Route path="dss/academic-health" element={<Suspense fallback={<Spinner/>}><DssAcademicHealthPage/></Suspense>} />
<Route path="dss/resources"       element={<Suspense fallback={<Spinner/>}><DssResourcesPage/></Suspense>} />
<Route path="dss/warnings"        element={<Suspense fallback={<Spinner/>}><DssWarningsPage/></Suspense>} />
<Route path="dss/recommendations" element={<Suspense fallback={<Spinner/>}><DssRecommendationsPage/></Suspense>} />
<Route path="dss/reports"         element={<Suspense fallback={<Spinner/>}><DssReportsPage/></Suspense>} />
```

---

## ▶ PDF REPORT STRUCTURE (Blade Templates)

All PDF reports use `barryvdh/laravel-dompdf`. Create Blade view files in `backend/resources/views/dss/reports/`.

Every PDF report must include:
1. **Header:** School name + logo (from `school_preferences`), Report Title, Date Generated, Filters Applied
2. **Summary Stats Block:** key numbers at a glance
3. **Data Table:** main report data, properly formatted
4. **Footer:** "Generated by Eskwelawakan Smart School System by Aqura" + page number

Example controller pattern for PDF export:
```php
public function enrollmentReport(Request $request): \Illuminate\Http\Response
{
    $schoolYearId = $request->query('school_year_id');
    $data = $this->enrollmentService->enrollmentByGradeLevel($schoolYearId);
    $school = SchoolPreference::first();

    $pdf = PDF::loadView('dss.reports.enrollment', compact('data', 'school'))
              ->setPaper('a4', 'portrait');

    return $pdf->download("enrollment-report-{$schoolYearId}.pdf");
}
```

---

## ▶ TYPESCRIPT TYPE DEFINITIONS

Create `frontend/src/types/dss.ts` with all DSS type interfaces:

```typescript
export interface DssDashboardKpi {
  total_enrolled: number;
  enrolled_delta: number;
  enrolled_delta_pct: number;
  promotion_rate: number;
  retention_rate: number;
  at_risk_count: number;
  faculty_load_compliance_pct: number;
  classroom_utilization_pct: number;
}

export interface EnrollmentTrend {
  school_year: string;
  total_enrolled: number;
  grade_level?: string;
}

export interface SectionFillRate {
  section_name: string;
  grade_level: string;
  enrolled_count: number;
  capacity: number;
  fill_rate_pct: number;
  status: 'full' | 'available' | 'underutilized' | 'overcapacity';
}

export interface AtRiskStudent {
  public_id: string;
  student_name: string;
  grade_level: string;
  section: string;
  flag_reasons: string[];
  intervention_status: 'flagged' | 'under_intervention' | 'resolved';
  notes: string | null;
}

export interface EarlyWarning {
  public_id: string;
  warning_type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  related_entity_type: string | null;
  related_entity_id: number | null;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  triggered_at: string;
}

export interface DssRecommendation {
  public_id: string;
  recommendation_text: string;
  category: 'enrollment' | 'academic' | 'faculty' | 'resource' | 'general';
  priority: 'high' | 'medium' | 'low';
  basis: string;
  is_actioned: boolean;
  actioned_at: string | null;
  generated_at: string;
}

export interface FacultyLoad {
  faculty_name: string;
  department: string;
  subject_count: number;
  total_units: number;
  load_status: 'overloaded' | 'optimal' | 'underloaded';
}

export interface ClassroomUtilization {
  room_name: string;
  capacity: number;
  sections_assigned: number;
  scheduled_hours_per_week: number;
  utilization_pct: number;
  status: 'optimal' | 'underutilized' | 'overcapacity';
}
```

---

## ▶ IMPLEMENTATION PHASES — EXECUTE IN ORDER

### PHASE 1 — Schema & Foundation
```
1.1  Inspect existing migration files to confirm exact column names in:
     students, classes, grades, faculty_staff, facilities, 
     facility_bookings, custodian_consumable_items, school_years

1.2  Generate 3 migration files for:
     - create_student_interventions_table
     - create_early_warnings_table
     - dss_recommendations_table (note: prefix 'dss_' to avoid conflict with existing tables)

1.3  Create Eloquent models:
     - StudentIntervention (with HasPublicId trait)
     - EarlyWarning (with HasPublicId trait)
     - DssRecommendation (with HasPublicId trait)
     Define $fillable, relationships, and $casts on each.

1.4  Run migrations and confirm schema.

DELIVERABLES: Migration files + Model files. Show full code.
```

### PHASE 2 — Backend Services
```
2.1  Create DssEnrollmentService — all 4 methods
2.2  Create DssAcademicHealthService — all 4 methods (flagAtRiskStudents must be standalone)
2.3  Create DssResourceService — all 3 methods
2.4  Create DssEarlyWarningService — evaluate() with all 8 warning rules
2.5  Create DssRecommendationService — generate() with rule-based templates
2.6  Bind services in a ServiceProvider or use constructor injection in controllers

DELIVERABLES: All 5 service files. Show full code.
```

### PHASE 3 — Backend Controllers & Routes
```
3.1  Create 7 controller classes under App\Http\Controllers\Admin\Dss\
3.2  Add all DSS routes to api.php
3.3  Create FormRequest validation classes in Http/Requests/Dss/
3.4  Create Blade PDF templates in resources/views/dss/reports/
3.5  Test all endpoints manually with Postman or tinker

DELIVERABLES: All controller files, updated api.php section, Blade templates.
```

### PHASE 4 — Frontend Pages
```
4.1  Create types/dss.ts with all interfaces
4.2  Build DssDashboardPage.tsx
4.3  Build DssEnrollmentPage.tsx
4.4  Build DssAcademicHealthPage.tsx
4.5  Build DssResourcesPage.tsx
4.6  Build DssWarningsPage.tsx
4.7  Build DssRecommendationsPage.tsx
4.8  Build DssReportsPage.tsx

DELIVERABLES: All 7 page files, types file.
```

### PHASE 5 — Navigation & Route Integration
```
5.1  Update admin layout sidebar to add Decision Support group with badge
5.2  Register all 7 DSS routes in App.tsx with lazy imports + Suspense
5.3  Verify ProtectedRoute/ModuleGate wraps all DSS routes with 'Administrator' role
5.4  End-to-end smoke test: login as admin, navigate all 7 DSS pages

DELIVERABLES: Updated layout file, updated App.tsx section.
```

### PHASE 6 — Polish & Index Optimization
```
6.1  Add DB indexes to all FK columns in new DSS tables (already in migrations above)
6.2  Add compound indexes on most common query patterns:
     - (student_id, school_year_id) on student_interventions ✓ (already specified)
     - (is_acknowledged, severity) on early_warnings ✓ (already specified)
6.3  Add empty state components to all tables (zero data graceful states)
6.4  Add loading skeletons to all chart and table areas
6.5  Add error boundaries to DSS pages
6.6  Final code review pass

DELIVERABLES: Summary of all changes made, file tree of all new/modified files.
```

---

## ▶ PER-PHASE DELIVERABLE FORMAT

After completing each Phase, output:

1. **Phase Summary** — what was built in 3–5 sentences
2. **File Tree** — every file created or modified with full path
3. **Full Code** — complete content of every new or modified file (no truncation)
4. **Verification Steps** — exact commands or actions to confirm it works
5. **Assumptions Made** — list any column names or behavior you assumed because the migration was ambiguous
6. **Blockers / Questions** — anything needed before the next phase

---

## ▶ ABSOLUTE RULES

- ❌ **Never** install a new npm package or Composer package — use what is already installed
- ❌ **Never** create a new layout file — DSS lives in the existing admin layout
- ❌ **Never** use integer IDs in URL path parameters — always `public_id`
- ❌ **Never** put business logic in controllers — all computation goes in Service classes
- ❌ **Never** use `number` type for ID state in TypeScript — use `string | null`
- ❌ **Never** instantiate Axios directly — always import from `@/lib/api`
- ❌ **Never** hardcode school year IDs or grade level values — query from DB or reference `config/school.php`
- ✅ **Always** inspect the actual migration file before referencing a table's columns
- ✅ **Always** add a `public_id` column and use `HasPublicId` on every new model
- ✅ **Always** wrap DSS routes with `auth:sanctum` and `role:Administrator` middleware
- ✅ **Always** handle empty data states gracefully with informative UI (never blank or broken)
- ✅ **Always** add loading states and error handling to all async operations
- ✅ **Always** use `barryvdh/laravel-dompdf` for PDF exports (already installed)
- ✅ **Always** use Recharts for charts (already installed)
- ✅ **Always** use `@tanstack/react-table` for data tables (already installed)

---

## ▶ START INSTRUCTION

Begin with **Phase 1**.

Before writing any code, output a **System Context Acknowledgment** that confirms:
- The 5 backend services you will create and their file paths
- The 7 frontend pages you will create and their file paths
- The 3 existing tables most critical to DSS (confirm you will check their migrations first)
- The 3 new tables you will create with migration file names
- Any ambiguity you need to flag before proceeding

Then proceed immediately to generating the **3 migration files** for Phase 1.2.
