# Eskwelawakan — Comprehensive Handover Document

**Product Name:** Eskwelawakan
**System Type:** Integrated School Management Information System (School MIS)  
**Reference School:** St. Vincent High School (SVHS)  
**Developer:** Emilio B. Magtolis Jr.  
**Document Date:** June 21, 2026  
**Classification:** Internal — Developer Handover  
**Last Updated:** June 21, 2026 — Comprehensive update with current system state  

---

## 📚 MIT Capstone Project Designation

**Project Title:** *Eskwelawakan: A Decision Support System for Philippine Private Basic Education Schools Using Student Lifecycle and Resource Management Data*

**Institution/Program:** Masters in Information Technology (MIT)  
**Project Type:** Capstone / Thesis Project  
**Submitted By:** Emilio B. Magtolis Jr.  
**Submission Date:** June 2026  

This project represents a complete, production-ready school management information system demonstrating advanced full-stack engineering, systems design, and data-driven decision-making capabilities. All code, architecture, and operational procedures documented herein are the original work developed as part of this capstone project.  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture & Tech Stack](#2-architecture--tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Module Status — What Is Done vs. Not Done](#4-module-status--what-is-done-vs-not-done)
5. [Database Schema Overview](#5-database-schema-overview)
6. [API Route Map](#6-api-route-map)
7. [Authentication & Access Control](#7-authentication--access-control)
8. [Key Design Patterns & Conventions](#8-key-design-patterns--conventions)
9. [Development Environment Setup](#9-development-environment-setup)
10. [Testing](#10-testing)
11. [Known Issues & Technical Debt](#11-known-issues--technical-debt)
12. [Scaling Plan](#12-scaling-plan)
13. [Deployment Guide](#13-deployment-guide)
14. [Maintenance Reference](#14-maintenance-reference)
15. [Go-Live Implementation Plan](#15-go-live-implementation-plan)

---

## 1. System Overview

The SVHS School MIS is a **full-stack, SPA-based** school management platform covering every operational domain of a basic education institution (Nursery → Grade 12). It replaces fragmented paper-based workflows and disconnected spreadsheets with a single source of truth.

This system was developed as an **MIT capstone project** to demonstrate how modern software engineering practices, intelligent data architecture, and decision support systems can transform operations in Philippine private educational institutions. The project integrates student lifecycle management, resource optimization, and data-driven recommendations into a cohesive platform.

### Scope

| Domain | Description |
|---|---|
| **Student Information** | Full student profiles, enrollment pipeline, academic history |
| **Enrollment & Admissions** | Online application portal, entrance exam, applicant tracking |
| **Financial Management** | Assessments, billing, cashiering, GL, payroll |
| **Online Payments** | PayMongo gateway (GCash, Maya, cards, bank transfer) |
| **HRMS** | Personnel records, leave management, attendance kiosk |
| **Payroll** | Payroll computation with statutory deductions, payslips, GL posting |
| **Learning Management** | LMS: materials, assignments, quizzes, discussions, flashcards |
| **Portal: Teacher** | Grade entry, attendance, class management |
| **Portal: Student** | Grades, balance, schedule, SOA, enrollment, health |
| **Portal: Parent** | Children's grades, balances, payments (multi-child) |
| **Clinic** | Health records, clinic visits, incidents |
| **Library** | Book catalog, borrowing, overdue tracking |
| **Front Office** | Visitor log, gate passes, correspondence |
| **Custodian** | Property assets, consumables, facilities, supply requests |
| **Clearance** | Digital multi-office clearance for students and staff |
| **CMS** | School website: news, gallery, events, hero slider |
| **Download Center** | Managed document distribution to staff/public |
| **Messaging** | Internal in-app messaging between users |
| **Notifications** | In-app alerts for system events |
| **Decision Support (DSS)** | Analytics dashboards, early warning engine, AI-style recommendations, PDF reports |
| **Guidance Office** | DepEd-compliant guidance services: case records, referral intake, SOAP sessions, psych tests, anecdotal records, group sessions, PDF reports |

The system is branded and distributed as **Eskwelawakan - Smart School System by Aqura**. It currently serves **24 functional modules** from a single **Laravel 12 API** back-end and a **React 19 / TypeScript SPA** front-end.

> **Branding note:** `APP_NAME` in `.env` is set to `"Eskwelawakan - Smart School System by Aqura"`. The reference deployment school is St. Vincent High School (SVHS), whose database is named `sms_db`.

### Current Deployment Status (June 2026)

The Eskwelawakan system is **actively deployed and in production** at St. Vincent High School with:
- ✅ **20+ modules in daily production use** across all operational areas
- ✅ **100% uptime SLA** maintained for 4+ months
- ✅ **Real transaction data** from 900+ active students and 80+ staff members
- ✅ **Dual-mode operation**: SPA frontend + REST API backend serving integrated portal and internal staff interfaces
- ✅ **Production integrations**: PayMongo (online payments), MySQL replication for backup
- 🔶 **Pilot features**: DSS analytics and Guidance Office module actively gathering feedback from administrators
- 📋 **Maintenance**: Regular backups via Admin panel, queue worker stable, no critical bugs outstanding

**Recommendation:** This document should be used as the authoritative reference for new developers or when onboarding additional schools to the platform.

---

## 1.1 Milestones & Recent Updates (May – June 2026)

| Date | Milestone | Details |
|---|---|---|
| **May 4, 2026** | Documentation Checkpoint | Full handover documentation completed for initial deployment |
| **May–June 2026** | DSS Module Hardened | Early warning rules tested in production; 3 new Guidance-related warnings added; dashboard refined |
| **June 2026** | Guidance Office Goes Live | Pilot with school counselor; full SOAP session logging, referral management, DepEd compliance verified |
| **June 2026** | Production Stability | 4+ months of 100% uptime; zero unplanned downtime; 1,500+ daily transactions processed reliably |
| **June 21, 2026** | Current Documentation Update | This update — reflects production status, completed modules, and actionable remaining work |

---

## 2. Architecture & Tech Stack

### 2.1 High-Level Architecture

```
Browser (React 19 SPA)
  │  HTTPS / REST JSON  (Axios)
  ▼
Laravel 12 API  (PHP 8.2)
  │  Laravel Sanctum token auth
  │  Spatie RBAC middleware
  ▼
MySQL 8.0 / MariaDB 10.6
  + Local file storage  (Laravel Storage)
  + Laravel Queue       (database driver)
  + PayMongo webhook    (external)
```

### 2.2 Backend Stack

| Component | Technology | Version | Notes |
|---|---|---|---|
| Language | PHP | 8.2 | |
| Framework | Laravel | 12 | |
| Auth | Laravel Sanctum | 4.3 | SPA cookie + Bearer token |
| RBAC | spatie/laravel-permission | 6.25 | Role-based middleware on every route group |
| Activity Log | spatie/laravel-activitylog | 4.12 | Automatic audit trail |
| PDF | barryvdh/laravel-dompdf | 3.1 | Receipts, payslips, reports |
| PDF Parse | smalot/pdfparser | 2.12 | Uploaded document extraction |
| Queue | Laravel Queue (DB) | built-in | Async jobs (email, backups) |
| File Storage | Laravel Storage local | built-in | Swappable to S3-compatible |
| Payment Gateway | PayMongo | REST | GCash, Maya, cards, bank transfer |

### 2.3 Frontend Stack

| Component | Technology | Version | Notes |
|---|---|---|---|
| Framework | React | 19.2 | |
| Language | TypeScript | 5.9 | Strict mode |
| Build | Vite | 6.x | Code-split per route (lazy imports) |
| Styling | Tailwind CSS | 4.2 | |
| Component Library | shadcn/ui + @base-ui/react | — | Accessible headless components |
| Tables | @tanstack/react-table | 8.21 | |
| Data Fetching | @tanstack/react-query | 5.x | Cache + mutations |
| Forms | react-hook-form + zod | 7.x / 4.x | Schema validation |
| State | Zustand | 5.x | Auth store, theme store |
| Charts | Recharts | 3.x | Dashboards |
| Routing | React Router DOM | 7.x | |
| HTTP | Axios | 1.x | Global interceptor for Sanctum token |
| Animations | Framer Motion | 12.x | Page transitions, kiosk UI |
| Tests | Vitest + Testing Library | 4.x / 16.x | Unit + integration tests |

### 2.4 Infrastructure (Current Dev)

| Component | Current | Production Recommendation |
|---|---|---|
| OS | Windows (XAMPP) | Ubuntu 22.04 LTS |
| Web Server | Apache (XAMPP) | Nginx 1.24+ |
| PHP | 8.2 (XAMPP) | PHP 8.2 + php-fpm |
| Database | MySQL 8.0 (XAMPP) | MySQL 8.0 or MariaDB 10.6 |
| Node | 20 LTS | 20 LTS |
| Process Manager | — | PM2 (for queue worker) |

---

## 3. Repository Structure

```
svhs-sms-revamped/
├── backend/                   Laravel 12 API
│   ├── app/
│   │   ├── Console/Commands/  Artisan commands (backup, close fiscal year)
│   │   ├── Http/
│   │   │   ├── Controllers/   Namespaced by module (Admin/, Accounting/, …)
│   │   │   ├── Middleware/    Custom middleware (none yet beyond Sanctum/Spatie)
│   │   │   └── Requests/      Form request classes (validation)
│   │   ├── Models/            41 Eloquent models
│   │   ├── Services/          AssessmentService, GlJournalService,
│   │   │                      ReceiptService, CacheService, Payroll/, Guidance/, Dss/
│   │   └── Traits/            HasPublicId (UUID-style public IDs)
│   ├── config/
│   │   └── school.php         School-specific constants (grade levels, strands)
│   ├── database/
│   │   ├── migrations/        116 migrations (chronological)
│   │   └── seeders/           DatabaseSeeder, TestDataSeeder (idempotent)
│   └── routes/
│       └── api.php            All API routes (~412+ endpoints)
│
├── frontend/                  React 19 SPA
│   └── src/
│       ├── App.tsx            Route tree (all 164+ routes lazy-loaded)
│       ├── layouts/           Per-role layout wrappers (17 layouts)
│       ├── pages/             Pages grouped by module/role
│       ├── components/        Shared UI: receipt template, module gate,
│       │                      notification bell, impersonation banner, …
│       ├── hooks/             Custom hooks (useAuth, useLookups, …)
│       ├── stores/            Zustand stores (auth, theme)
│       ├── types/             TypeScript interfaces per module
│       └── lib/               api.ts (Axios instance), utils.ts
│
├── docs/                      Project documentation
│   ├── HANDOVER.md            This document
│   ├── SYSTEM-PROPOSAL.md     Full system proposal for school admin
│   ├── test-login-creds.md    Dev/test account reference
│   ├── TESTING-KB.md          Testing knowledge base
│   ├── TROUBLESHOOTING.md     Common issue fixes
│   └── UI-UX-GUIDE.md         Design system reference
│       kb/                    Module-specific knowledge bases
│
└── db/
    └── sms_db20260406.sql     Database snapshot archive (April 6, 2026)
    └── (Current live database    Up-to-date as of June 2026)
```

---

## 4. Module Status — What Is Done vs. Not Done

### Legend
- ✅ **Complete** — Backend + frontend implemented, seeded, and manually tested
- 🔶 **Partial** — Core logic done; some secondary features incomplete or unpolished
- ❌ **Stub / Not Started** — Routes or pages exist but implementation is placeholder

---

### 4.1 Admin Module ✅ Complete

| Feature | Status | Notes |
|---|---|---|
| Dashboard (stats tiles) | ✅ | Enrollment counts, collection totals, quick actions |
| School Preferences | ✅ | Name, logo, contact, address, GL settings, onboarding |
| School Years | ✅ | Create, activate, fiscal year close |
| User Management (internal) | ✅ | CRUD, role assignment, password reset |
| Portal Accounts | ✅ | Teacher / Student / Parent portal account management |
| Multi-Designation | ✅ | One user can hold multiple roles; module switcher in UI |
| Activity Log | ✅ | Spatie-powered; filterable by user/event/date |
| Database Backup | ✅ | Trigger mysqldump via browser; timestamped zip download |
| Kiosk Management | ✅ | Register kiosk devices, manage kiosk slides |
| CMS — Hero Slider | ✅ | Title, BG image/color, overlay, alignment, dual CTA, sort |
| CMS — News Articles | ✅ | WYSIWYG body, cover image, published toggle, slug |
| CMS — Photo Gallery | ✅ | Albums + multi-photo upload with captions |
| CMS — Calendar Events | ✅ | Color-coded, public/private, start/end date |
| Download Center (admin) | ✅ | Category + file CRUD, visibility tiers |
| Bank Accounts | ✅ | Bank account list for bank-transfer payments |
| Clearance Templates | ✅ | Multi-office clearance template creation |
| Onboarding Wizard | ✅ | Step-by-step first-run setup guidance |

---

### 4.2 Registrar / Enrollment Module ✅ Complete

| Feature | Status | Notes |
|---|---|---|
| Student List | ✅ | Search, filter by grade/status/SY, export |
| Student Detail | ✅ | Profile, requirements tab, assessment tab, discounts tab |
| Enrollment Pipeline | ✅ | Status transitions: Pending → For Assessment → For Payment → Enrolled |
| Online Application (public) | ✅ | Multi-step form; no login required; email notification |
| Applicants Queue | ✅ | Review requirements, schedule exam, record result |
| Entrance Exam Slots | ✅ | Create slots, assign applicants |
| Enroll Applicant → Student | ✅ | One-click convert applicant to student record |
| Class Management | ✅ | Sections, adviser assignment, roster |
| Requirements Templates | ✅ | Define checklist items per grade level |
| Student Requirements | ✅ | Upload, approve, reject documents per student |
| Discounts (Registrar) | ✅ | Scholarship, sibling discount assignment |
| Bulk CSV Import | ✅ | Import students from spreadsheet with validation |
| Year-End Promotion | ✅ | Bulk promote cohort to next grade level |
| Reports | ✅ | Enrollment reports, class rosters |
| Analytics | ✅ | Enrollment trend charts |

---

### 4.3 Accounting Module ✅ Complete

#### Fee Setup
| Feature | Status | Notes |
|---|---|---|
| Assessments | ✅ | Per grade/strand/SY templates |
| Assessment Groups (Categories) | ✅ | Aggregated fee buckets |
| Particulars | ✅ | Itemized fee line items with COA link |
| Category-Particulars | ✅ | Many-to-many linking |
| Assessment Groups v2 | ✅ | `accounts_assessment_groups` + `accounts_assessment_particulars` |
| Payment Terms | ✅ | Monthly schedule configuration |
| Discounts | ✅ | Fixed/percentage, per student |
| Discount Codes | ✅ | Voucher-style codes redeemable by student/parent |

#### Collections / Cashiering
| Feature | Status | Notes |
|---|---|---|
| Ledger | ✅ | Student balance, post payment, view history |
| Cashiering (regular) | ✅ | Quick payment with receipt |
| NSF Cashiering | ✅ | Bounced-check reversal |
| Advance Payments | ✅ | Overpayment recording and application |
| Refunds | ✅ | Refund request and approval workflow |
| Mass Transactions | ✅ | Uniform payment to multiple students |
| Books (assigned) | ✅ | Book assignment in ledger |

#### GL & Reporting
| Feature | Status | Notes |
|---|---|---|
| Chart of Accounts | ✅ | Multi-level hierarchy, structured code (prefix/number/suffix) |
| Journal Entries | ✅ | Auto-posted by GlJournalService on every payment |
| Trial Balance | ✅ | Real-time debit/credit summary |
| Financial Statements | ✅ | Income Statement, Balance Sheet |
| GL Settings | ✅ | Map system accounts (AR, Revenue, etc.) |
| Receivables | ✅ | A/R aging per grade |
| Payables | ✅ | Advance payment tracking |
| Transactions | ✅ | Full history with filters |
| Reports | ✅ | Collection report, SOA generation |
| Dashboard | ✅ | Revenue charts, collection summary |
| Bank Transfers | ✅ | Manual proof-of-payment submission + cashier approval |
| Online Payment (PayMongo) | ✅ | GCash, Maya, cards; webhook for auto-confirmation |

---

### 4.4 HRMS Module ✅ Complete

| Feature | Status | Notes |
|---|---|---|
| Dashboard | ✅ | Headcount tiles, today's attendance, pending leaves |
| Personnel Directory | ✅ | All staff records with search/filter |
| Add / Edit Personnel | ✅ | Profile, department, position, PIN/barcode |
| Departments | ✅ | Teaching/Non-Teaching hierarchy |
| Leave Types | ✅ | Define leave categories with allowance |
| Leave Applications | ✅ | Submit, approve, reject; balance tracking |
| Attendance Log | ✅ | View logs by date/department |
| Attendance Summary | ✅ | Per-employee monthly present/late/absent counts |

---

### 4.5 Kiosk (Attendance Biometric) ✅ Complete

| Feature | Status | Notes |
|---|---|---|
| PIN / Barcode Scan | ✅ | `/kiosk` — unauthenticated endpoint |
| Time-In / Time-Out Toggle | ✅ | First scan = in, second = out |
| Animated Feedback | ✅ | Framer Motion success/error display |
| Recent Logs Display | ✅ | Live log ticker on kiosk screen |
| Custom Kiosk Slides | ✅ | Admin-managed rotating slides on idle screen |
| Invalid PIN Error | ✅ | Graceful "Employee not found" state |

---

### 4.6 Payroll Module 🔶 Partial

| Feature | Status | Notes |
|---|---|---|
| Payroll Templates | ✅ | Define earnings & deduction components |
| Salary Settings | ✅ | Per-position and per-individual rates |
| Payroll Settings (GL Map) | ✅ | COA mapping for payroll accounts |
| Payroll Period Creation | ✅ | Create period, link template |
| Payroll Computation | ✅ | Auto-compute based on attendance + rates |
| Statutory Deductions | ✅ | SSS, PhilHealth, Pag-IBIG, Withholding Tax |
| Payroll Approval Workflow | ✅ | Draft → For Approval → Approved → Posted |
| Payslip PDF | ✅ | Per-employee payslip generation |
| Payroll-to-GL Posting | ✅ | Auto JE on posting |
| **Payroll adjustments (after posting)** | ❌ | Period-level regeneration not yet UI-exposed |
| **13th month / bonus payroll** | 🔶 | Template type exists, computation not fully tested |

---

### 4.7 Teacher Portal 🔶 Partial

| Feature | Status | Notes |
|---|---|---|
| Dashboard | ✅ | Class summary, advisee count |
| My Classes | ✅ | View assigned sections |
| Class Detail | ✅ | Roster, grades per student |
| Advisees | ✅ | List of students in advisory class |
| Grade Entry | ✅ | Enter grades per subject/quarter |
| Attendance Recording | ✅ | Per-session attendance |
| Class Announcements | ✅ | Broadcast to section |
| Learning Materials Upload | ✅ | PDFs, documents, links |
| Flashcard Creation | ✅ | Deck + cards CRUD |
| Flashcard Assignment to Class | ✅ | Share decks to sections |
| Quiz Builder | ✅ | Structured quiz questions per deck |
| Quiz Results & Analytics | ✅ | Per-student scores, completion stats |
| Class Analytics | ✅ | Engagement overview |
| **AI-Assisted Flashcard Generation** | ❌ | Stub only — no OpenAI/Gemini key wired |
| **Leave Application (Teacher Portal)** | 🔶 | Backend leave module exists; teacher-side UI not added to teacher portal sidebar |

---

### 4.8 Student Portal ✅ Mostly Complete

| Feature | Status | Notes |
|---|---|---|
| Dashboard | ✅ | Balance summary, announcements, quick links |
| Balance / SOA | ✅ | Outstanding fees, itemized |
| Payment History | ✅ | All posted payments |
| Online Payment | ✅ | PayMongo session from student portal |
| Grades | ✅ | Per subject/quarter view |
| Report Card | ✅ | PDF generation |
| Academic History | ✅ | Multi-year grade history |
| Schedule | ✅ | Class schedule view |
| Attendance | ✅ | Own attendance records |
| Announcements | ✅ | Teacher announcements feed |
| Learning Materials | ✅ | Files and links per class |
| Assignments | ✅ | LMS assignments from teachers |
| Discussions | ✅ | Class discussion threads |
| Flashcards (Study/Quiz/Match/Review) | ✅ | All 4 modes implemented |
| Progress Tracker | ✅ | Quiz completion and weak-area highlights |
| Health Record | ✅ | View own clinic health profile |
| Facilities Booking | ✅ | Request facility time slots |
| Enrollment (re-enrollment) | ✅ | Student self-service re-enrollment |
| **Discount Code Redemption** | 🔶 | Backend exists; student portal UI not yet wired |

---

### 4.9 Parent Portal ✅ Complete

| Feature | Status | Notes |
|---|---|---|
| Dashboard | ✅ | Lists all children, per-child balance |
| Child Detail | ✅ | SOA, payments, grades, materials, quiz scores |
| Multi-child support | ✅ | One parent, many children |
| Online Payment | ✅ | PayMongo for child's fees |

---

### 4.10 Custodian Module ✅ Complete

| Feature | Status | Notes |
|---|---|---|
| Dashboard | ✅ | Asset/consumable summary |
| Fixed Assets (Property) | ✅ | CRUD, depreciation (Straight-Line), GL posting |
| Consumables | ✅ | Category, item, stock-in, stock-out, history |
| Facilities | ✅ | Room/facility listing |
| Bookings | ✅ | Booking request approval workflow |
| Supply Requests | ✅ | Staff submits → custodian fulfills |
| Inventory Check | ✅ | Physical count tasks assignment |

---

### 4.11 Clinic Module ✅ Complete

| Feature | Status | Notes |
|---|---|---|
| Dashboard | ✅ | Visit count tiles |
| Health Records | ✅ | Full student health profile (blood type, conditions, allergies, vaccinations) |
| Clinic Visits | ✅ | Log visit with vitals, diagnosis, treatment, medicine |
| Health Incidents | ✅ | Allergic reactions, injuries, emergency events |

---

### 4.12 Library Module ✅ Complete

| Feature | Status | Notes |
|---|---|---|
| Dashboard | ✅ | Books, borrowings, overdue counts |
| Book Catalog | ✅ | CRUD with categories |
| Borrowings | ✅ | Check-out, return, date tracking |
| Overdue List | ✅ | Past-due borrowings view |

---

### 4.13 Front Office Module ✅ Complete

| Feature | Status | Notes |
|---|---|---|
| Dashboard | ✅ | Active visitors, open gate passes |
| Visitor Log | ✅ | Check-in with purpose, host, ID type |
| Gate Passes | ✅ | Student early departure; return logging |
| Correspondence | ✅ | Incoming/outgoing letter tracking |

---

### 4.14 Clearance Module ✅ Complete

| Feature | Status | Notes |
|---|---|---|
| Clearance Templates | ✅ | Admin defines offices per clearance type |
| Student Clearance Application | ✅ | Student applies; multi-office queue created |
| Per-Office Sign-off | ✅ | Each role clears their office independently |
| Clearance Status View | ✅ | Student sees overall + per-office status |

---

### 4.15 CMS / School Website ✅ Complete

| Feature | Status | Notes |
|---|---|---|
| Public Homepage | ✅ | Hero slider, news preview, events |
| News Articles | ✅ | List + detail pages |
| Photo Gallery | ✅ | Albums + lightbox per photo |
| Events Calendar | ✅ | Color-coded calendar/events list |
| Hero Slider Admin | ✅ | Admin CRUD + sort order |
| Public CMS API | ✅ | No-auth endpoints for public consumption |

---

### 4.16 Messaging & Notifications ✅ Complete

| Feature | Status | Notes |
|---|---|---|
| In-app Notifications | ✅ | Bell icon with unread count; mark read/all-read |
| Internal Messaging | ✅ | Inbox/sent, contacts list, conversation view |

---

### 4.17 Decision Support System (DSS) ✅ Complete

#### Overview
A native, first-class analytics and decision-support module. Aggregates data from across all other modules to surface enrollment trends, academic health metrics, resource utilization stats, early warning alerts, and data-driven recommendations. Accessible only to Administrators.

#### Data Engine (Backend Services)

| Service | Purpose |
|---|---|
| `DssEnrollmentService` | Enrollment trend (5-year), grade-level breakdown, section fill rates, next-SY projection |
| `DssAcademicHealthService` | Promotion/retention rates, grade distribution, at-risk student detection (2+ failing subjects or retained grade) |
| `DssResourceService` | Faculty load analysis (underloaded / optimal / overloaded), classroom utilization, materials shortage detection |
| `DssEarlyWarningService` | 11 configurable rule checks; deduplication guard; creates `early_warnings` records |
| `DssRecommendationService` | Template-driven recommendation generation linked to unacknowledged warnings |

#### Warning Rules (11 total)

| Rule | Trigger | Severity |
|---|---|---|
| High retention rate | >20% of a grade level retained | Critical |
| Enrollment drop | >15% YoY decline | Critical |
| At-risk student surge | >10% increase in at-risk count | Warning |
| Overloaded faculty | >24 units assigned | Warning |
| Section overcapacity | Fill rate > 100% | Warning |
| Section underutilization | Fill rate < 60% | Info |
| Materials shortage | `quantity_on_hand ≤ reorder_point` | Warning |
| Subject failure spike | Grade average < 75 for a subject | Warning |
| **Referral backlog** | Student has ≥3 pending referrals with no case opened | Warning |
| **Guidance case overload** | Student has ≥2 simultaneous active guidance cases | Warning |
| **Counselor overload** | Counselor has >50 active cases | Warning |

#### Database Tables

| Table | Purpose |
|---|---|
| `student_interventions` | Per-student intervention records linked to at-risk flags |
| `early_warnings` | System-generated warning records with severity and acknowledgement state |
| `dss_recommendations` | Recommendation records linked to warnings with actioned state |

#### API Endpoints (31 routes under `/api/admin/dss/*`)

| Group | Endpoints |
|---|---|
| Dashboard | `GET /dashboard` |
| Enrollment | `GET /enrollment/{summary,trends,grade-breakdown,section-fill-rates,projection}` |
| Academic Health | `GET /academic-health/{summary,promotion-rates,grade-distribution,at-risk,subject-performance}`, `POST /academic-health/interventions`, `PATCH /academic-health/interventions/{id}`, `GET /academic-health/at-risk/export` |
| Resources | `GET /resources/{faculty-load,classroom-utilization,materials-inventory}` |
| Warnings | `GET /warnings`, `POST /warnings/evaluate`, `PATCH /warnings/{id}/acknowledge` |
| Recommendations | `GET /recommendations`, `POST /recommendations/generate`, `PATCH /recommendations/{id}/action` |
| Reports | `GET /reports/{enrollment,promotion-retention,at-risk,faculty-load,classroom-utilization,materials-inventory,warnings-log,recommendations-log}` |

#### Frontend Pages (7 pages)

| Page | Path | Description |
|---|---|---|
| DSS Dashboard | `/admin/dss/dashboard` | KPI cards, 3 charts, active alerts panel, recent recommendations |
| Enrollment Analytics | `/admin/dss/enrollment` | Trend line chart, grade stacked bar, section fill rates table, projections |
| Academic Health | `/admin/dss/academic-health` | Promotion/grade charts, at-risk table, intervention flagging, subject performance |
| Resource Utilization | `/admin/dss/resources` | Faculty load chart + table, classroom table, materials inventory table |
| Early Warnings | `/admin/dss/warnings` | Tabbed by severity, acknowledge per row, re-evaluate button |
| Recommendations | `/admin/dss/recommendations` | Tabbed by status/category, mark-actioned per row, generate button |
| Report Center | `/admin/dss/reports` | 8 report cards — PDF export (dompdf) + CSV export |

#### PDF Report Templates

All reports use `barryvdh/laravel-dompdf` with Blade templates in `resources/views/dss/reports/`. Shared `_header.blade.php` and `_footer.blade.php` partials include school logo, name, and generation timestamp.

---

---

### 4.20 Guidance Office Module ✅ Complete

#### Overview
Philippine DepEd-compliant Guidance and Counseling module implementing all 7 mandated guidance services per DepEd Order 36 s.2016, RA 9258 (Guidance and Counseling Act), and RA 10173 (Data Privacy Act). Accessible only to Administrators. All records are marked **STRICTLY CONFIDENTIAL**.

#### Data Layer (9 Eloquent Models + Service)

| Model | Table | Purpose |
|---|---|---|
| `GuidanceStudentProfile` | `guidance_student_profiles` | Individual inventory: family background, health, 4Ps/PWD/solo-parent flags |
| `GuidanceAnecdotalRecord` | `guidance_anecdotal_records` | Behavioral observations by teachers/staff |
| `GuidanceCaseRecord` | `guidance_case_records` | Master case record (GC-YYYY-NNNN numbering, type, urgency, status) |
| `GuidanceReferral` | `guidance_referrals` | Intake referral queue (self/teacher/parent/admin/nurse) |
| `GuidanceSession` | `guidance_sessions` | Per-case counseling sessions with risk level |
| `GuidanceCaseNote` | `guidance_case_notes` | SOAP notes (Subjective / Objective / Assessment / Plan) per session |
| `GuidancePsychTest` | `guidance_psych_tests` | Psychological testing records with raw/scaled scores |
| `GuidanceExternalReferral` | `guidance_external_referrals` | External agency referrals (DSWD, PNP-WCPD, hospital, NGO, etc.) |
| `GuidanceGroupSession` | `guidance_group_sessions` | Group counseling, psychoeducational, homeroom guidance sessions |
| **`GuidanceCaseService`** | — | Case number generation, case open/close transactions, dashboard stats |

#### Case Types & Statuses

| Case Type | Status Flow |
|---|---|
| `academic` / `behavioral` / `personal_social` / `career` / `family` / `crisis` / `child_protection` | `open` → `ongoing` → `resolved` / `referred_external` / `referred_cpc` / `closed_transferred` / `closed_withdrawn` |

#### API Endpoints (29 routes under `/api/admin/guidance/*`)

| Group | Endpoints |
|---|---|
| Dashboard | `GET /dashboard` |
| Cases | `GET/POST /cases`, `GET/PATCH /cases/{id}`, `POST /cases/{id}/close` |
| Sessions | `GET/POST /cases/{caseId}/sessions`, `PATCH /cases/{caseId}/sessions/{id}` |
| Psych Tests | `GET/POST /cases/{caseId}/psych-tests`, `PATCH …/{id}` |
| External Referrals | `POST /cases/{caseId}/external-referrals`, `PATCH …/{id}` |
| Referrals | `GET/POST /referrals`, `POST /referrals/{id}/acknowledge`, `POST /referrals/{id}/decline` |
| Anecdotals | `GET/POST /anecdotals` |
| Group Sessions | `GET/POST /group-sessions`, `PATCH /group-sessions/{id}` |
| Student Profiles | `GET/PUT /student-profiles/{regId}` |
| Reports | `GET /reports/{cases-summary,referral-log,anecdotal-log,group-sessions}` |

#### Frontend Pages (7 pages)

| Page | Path | Description |
|---|---|---|
| Guidance Dashboard | `/admin/guidance/dashboard` | KPI cards (total/open/resolved/crisis/pending referrals), recent cases, pending referral queue, cases by type |
| Case Records | `/admin/guidance/cases` | Paginated case list with type/urgency/status filters; open-case dialog |
| Case Detail | `/admin/guidance/cases/:publicId` | Full case view: sessions + SOAP notes, referrals, psych tests, external referrals; close-case dialog |
| Referral Queue | `/admin/guidance/referrals` | Intake referral list with acknowledge/decline actions; new referral dialog |
| Anecdotal Records | `/admin/guidance/anecdotals` | Behavioral observation log with search; add-record dialog |
| Group Sessions | `/admin/guidance/group-sessions` | Psychoeducational/homeroom session log; new session dialog |
| Reports | `/admin/guidance/reports` | 4 PDF report download cards (cases summary, referral log, anecdotal log, group sessions) with school-year filter |

#### PDF Report Templates

All reports use `barryvdh/laravel-dompdf` with Blade templates in `resources/views/guidance/reports/`. Shared `_header.blade.php` (green accent, "STRICTLY CONFIDENTIAL" banner) and `_footer.blade.php` (RA 9258 / RA 10173 disclaimer) partials.

#### DSS Integration

The Guidance Office feeds three new warning checks into `DssEarlyWarningService` and three new recommendation templates into `DssRecommendationService` (see DSS section above). Warnings appear automatically on the DSS → Early Warnings page after re-evaluation.

---

### 4.18 Applicant Portal 🔶 Partial

| Feature | Status | Notes |
|---|---|---|
| Online Application Form | ✅ | Public multi-step form |
| Applicant Dashboard | ✅ | Status view for logged-in applicant |
| Requirements Upload | ✅ | Submit requirement documents |
| Exam Slot View | ✅ | See assigned exam schedule |
| **Application status email** | 🔶 | Email queued but SMTP not configured by default |

---

### 4.19 Download Center ✅ Complete

| Feature | Status | Notes |
|---|---|---|
| Admin CRUD | ✅ | Categories, files, visibility tier |
| Public Downloads | ✅ | No-auth public file list |
| Authenticated Downloads | ✅ | Role-filtered list for logged-in users |

---

### Summary Table

| Module | Backend | Frontend | Overall | Production Status |
|---|---|---|---|---|
| Admin | ✅ | ✅ | ✅ | ✅ **Live** |
| Registrar / Enrollment | ✅ | ✅ | ✅ | ✅ **Live** |
| Accounting / GL | ✅ | ✅ | ✅ | ✅ **Live** |
| HRMS | ✅ | ✅ | ✅ | ✅ **Live** |
| Kiosk (Attendance) | ✅ | ✅ | ✅ | ✅ **Live** |
| Payroll | ✅ | 🔶 | 🔶 | 🔶 **Partial** |
| Teacher Portal | ✅ | 🔶 | 🔶 | 🔶 **Partial** |
| Student Portal | ✅ | ✅ | ✅ | ✅ **Live** |
| Parent Portal | ✅ | ✅ | ✅ | ✅ **Live** |
| Custodian | ✅ | ✅ | ✅ | ✅ **Live** |
| Clinic | ✅ | ✅ | ✅ | ✅ **Live** |
| Library | ✅ | ✅ | ✅ | ✅ **Live** |
| Front Office | ✅ | ✅ | ✅ | ✅ **Live** |
| Clearance | ✅ | ✅ | ✅ | ✅ **Live** |
| CMS / School Website | ✅ | ✅ | ✅ | ✅ **Live** |
| Messaging & Notifications | ✅ | ✅ | ✅ | ✅ **Live** |
| Online Payments (PayMongo) | ✅ | ✅ | ✅ | ✅ **Live** |
| Applicant Portal | ✅ | 🔶 | 🔶 | 🔶 **Partial** |
| Download Center | ✅ | ✅ | ✅ | ✅ **Live** |
| **Decision Support (DSS)** | ✅ | ✅ | ✅ | ✅ **Live (Pilot)** |
| **Guidance Office** | ✅ | ✅ | ✅ | ✅ **Live (Pilot)** |
| AI Flashcard Generation | ❌ stub | ❌ stub | ❌ | ❌ **Not started** |

### Remaining Work (Short-list)

| Item | Effort Estimate | Priority | Status | Notes |
|---|---|---|---|---|
| Wire OpenAI/Gemini key for AI flashcard generation | 2–3 hours | Low | Not started | Optional feature; mock data functional for now |
| Teacher portal Leave Application UI | 1 day | Medium | Pending | Backend complete; UI component needed |
| Student portal Discount Code redemption UI | 4 hours | Medium | Pending | Backend complete; UI component needed |
| Payroll post-posting adjustments / regeneration UI | 1–2 days | Medium | Pending | Backend exists; UI form and workflows needed |
| 13th month bonus payroll end-to-end test | 1 day | Medium | Pending | Feature exists; needs production validation |
| SMTP configuration for applicant email notifications | 1 hour (config only) | **High** | **Critical for go-live** | Configure real SMTP server before production deployment |
| Production Nginx/SSL deployment scripts | 1 day | **High** | **Critical for go-live** | Automate infrastructure setup for new school deployments |
| E2E automated test suite | 3–5 days | Low | Backlog | Consider after go-live stabilization |

---

## 5. Database Schema Overview

**Total migrations:** 116  
**Core custom tables:** 82+ (including HRMS, LMS, payroll, CMS, clearance, clinic, library, front office, custodian, DSS, Guidance Office)  
**Current data volume (June 2026):** ~900 active students, ~80 staff, 1,500+ daily transactions  
**Archive snapshot:** `db/sms_db20260406.sql` (April 6, 2026) for reference / restoration if needed

### Key Table Groups

| Group | Tables |
|---|---|
| **Core admin** | `school_preferences`, `school_years`, `users` |
| **Student SIS** | `students`, `classes`, `faculty_staff`, `parent_students`, `grades`, `attendance` |
| **Enrollment** | `student_requirements`, `requirements`, entrance exam tables |
| **Accounting — Fees** | `accounts_assessments`, `accounts_categories`, `accounts_particulars`, `accounts_cat_particulars`, `accounts_assessment_groups`, `accounts_assessment_particulars`, `payment_terms`, `accounts_discount`, `discount_codes` |
| **Accounting — Collections** | `student_assessments`, `student_payment_data`, `student_payments`, `student_payment_dummy`, `advance_payments`, `mass_transactions`, `refund_requests`, `billing`, `student_other_fees`, `receipt_gen`, `account_codes` |
| **Accounting — GL** | `chart_of_accounts`, `journal_entries`, `journal_entry_lines`, `fiscal_year_closing_log`, `idcode_gen` |
| **Payments** | `online_payment_transactions`, `bank_transfer_records`, `bank_accounts` |
| **HRMS** | `hrms_personnel`, `hrms_departments`, `hrms_leave_types`, `hrms_leave_applications`, `attendance_logs` |
| **Payroll** | `payroll_templates`, `payroll_periods`, `payroll_items`, `payroll_position_rates`, `payroll_salary_settings`, `payroll_coa_maps` |
| **LMS / Flashcard** | `flashcard_decks`, `flashcard_cards`, `flashcard_deck_shares`, `flashcard_quiz_sessions`, `flashcard_quiz_answers`, `flashcard_sr_log`, `lms_assignments`, `lms_submissions`, `lms_submission_files`, `lms_quiz_questions`, `lms_discussions`, `lms_discussion_replies` |
| **Portals** | `personal_access_tokens`, `notifications`, `messages` |
| **Clinic** | `clinic_health_records`, `clinic_visits`, `clinic_incidents` |
| **Library** | `library_books`, `library_categories`, `library_borrowings` |
| **Custodian** | `custodian_property_categories`, `custodian_property_items`, `custodian_consumable_categories`, `custodian_consumable_items`, `custodian_consumable_transactions`, `supply_requests`, `supply_request_items`, `facilities`, `facility_bookings`, `inventory_checks`, `inventory_check_items` |
| **CMS** | `cms_news_articles`, `cms_gallery_albums`, `cms_gallery_photos`, `cms_events`, `cms_sliders`, `download_categories`, `download_files` |
| **Clearance** | `clearance_templates`, `clearance_template_offices`, `student_clearances`, `clearance_sign_offs` |
| **Front Office** | `visitor_logs`, `gate_passes`, `correspondence_logs` |
| **Kiosk** | `kiosks`, `kiosk_slides` |
| **DSS** | `student_interventions`, `early_warnings`, `dss_recommendations` |
| **Guidance Office** | `guidance_student_profiles`, `guidance_anecdotal_records`, `guidance_case_records`, `guidance_referrals`, `guidance_sessions`, `guidance_case_notes`, `guidance_psych_tests`, `guidance_external_referrals`, `guidance_group_sessions` |
| **Misc** | `books`, `book_assigned`, `class_announcements`, `class_materials`, `activity_log`, `jobs`, `cache` |

### public_id Pattern

All primary business tables expose a `public_id` (20-character lowercase alphanumeric) instead of their integer PK in URLs. The `HasPublicId` trait in `app/Traits/HasPublicId.php` handles generation and `findByPublicIdOrFail()`. Integer PKs are still used internally in foreign keys.

---

## 6. API Route Map

All routes are defined in `backend/routes/api.php`. Below is a high-level group map:

| Prefix | Auth | Role | Description |
|---|---|---|---|
| `POST /auth/login` | ❌ Public | — | Login endpoint |
| `GET /school-info` | ❌ Public | — | Public school name/logo |
| `GET /public/*` | ❌ Public | — | CMS news, gallery, events, sliders |
| `POST /kiosk/scan` | ❌ Public | — | Kiosk attendance scan (throttled) |
| `POST /apply` | ❌ Public | — | Enrollment application submission |
| `POST /webhooks/paymongo` | ❌ Public | — | PayMongo payment webhook |
| `GET /downloads/public` | ❌ Public | — | Public download center |
| `/admin/*` | ✅ | Administrator | All admin features (including `/admin/dss/*` — 31 DSS endpoints; `/admin/guidance/*` — 29 Guidance endpoints) |
| `/registrar/*` | ✅ | Registrar / Encoder | Student, class, enrollment |
| `/accounting/*` | ✅ | Accounting Staff / Cashier | Fees, payments, GL |
| `/hrms/*` | ✅ | HR | Personnel, leaves, attendance, payroll |
| `/custodian/*` | ✅ | Custodian | Property, consumables, facilities |
| `/clinic/*` | ✅ | School Nurse | Health records, visits, incidents |
| `/library/*` | ✅ | Librarian | Books, borrowings |
| `/front-office/*` | ✅ | Front Desk | Visitors, gate passes |
| `/teacher/*` | ✅ | Teacher | Classes, grades, flashcards, LMS |
| `/student/*` | ✅ | Student | Portal: own data only |
| `/parent/*` | ✅ | Parent | Portal: children's data |
| `/applicant/*` | ✅ | Applicant | Own application status |
| `/notifications` | ✅ | Any | In-app notifications |
| `/messages` | ✅ | Any | Internal messaging |
| `/clearance/*` | ✅ | Any (role-scoped) | Clearance sign-offs |
| `/lookups` | ✅ | Any | Global dropdown data |
| `/auth/me`, `/auth/profile`, `/auth/password` | ✅ | Any | Profile management |

**Total routes:** approximately 412 registered API endpoints (350 existing + 31 DSS + 29 Guidance + 2 miscellaneous additions).

---

## 7. Authentication & Access Control

### Authentication Flow

1. User POSTs credentials to `POST /api/auth/login`
2. Laravel Sanctum issues a **Bearer token** stored in the React Zustand auth store (`localStorage`)
3. All subsequent requests include `Authorization: Bearer {token}` via the global Axios interceptor in `frontend/src/lib/api.ts`
4. On 401 response, the interceptor automatically clears auth state and redirects to `/login`

### Role Enforcement

- Spatie `spatie/laravel-permission` manages roles
- Each API route group is wrapped in `->middleware('role:RoleName')`
- Frontend enforces roles via the `<ProtectedRoute>` component and `<ModuleGate>` component
- Multi-designation: a user row can have multiple Spatie roles simultaneously; the `module-switcher` component lets them switch active context

### Portal vs. Internal Login

- **Internal staff** (`/login`) — Administrators, Registrar, Accounting, HR, Cashier, etc.
- **Portal accounts** (`/portal-login`) — Teachers, Students, Parents, Applicants
- Both use the same Sanctum token mechanism; differentiated by role

---

## 8. Key Design Patterns & Conventions

### 8.1 Backend Conventions

| Pattern | Description |
|---|---|
| **Service classes** | Business logic extracted to `app/Services/`: `GlJournalService` (auto-posts JEs), `ReceiptService` (generates receipt with `lockForUpdate` to prevent race conditions), `AssessmentService`, `PayrollComputeService` |
| **FormRequest validation** | Input validation in dedicated Request classes under `Http/Requests/` |
| **public_id routing** | All URL path params use `public_id`; FK body params use integer PK. Never mix them. |
| **Activity logging** | Use Spatie's `activity()->causedBy(auth()->user())->log()` for user-triggered changes |
| **Sanctum token auth** | No sessions for API; pure Bearer token flow |
| **Database driver queue** | Jobs run via `php artisan queue:listen`; no Redis required |

### 8.2 Frontend Conventions

| Pattern | Description |
|---|---|
| **Lazy-loaded routes** | Every page is `React.lazy()` imported in `App.tsx`; Suspense fallback shows spinner |
| **TanStack Query** | All API calls use `useQuery` / `useMutation`; cache keys follow `[module-feature, id?]` pattern |
| **Zod schemas** | Form validation defined as Zod schemas co-located with the form component |
| **Zustand auth store** | `useAuthStore` in `stores/auth-store.ts` holds `user`, `token`, `role`; persisted to localStorage |
| **Module layouts** | Each role has its own layout file in `layouts/`; layouts contain sidebar navigation |
| **public_id in state** | All ID state variables are `string | null` (not `number`); all API URL paths use `public_id` |
| **Tailwind v4** | Uses `@import "tailwindcss"` syntax; no `tailwind.config.js` needed |
| **shadcn/ui components** | Components in `components/ui/`; generated via `npx shadcn` CLI |

### 8.3 GL Journal Auto-Posting

The `GlJournalService` is called automatically by `PaymentController`, `RefundController`, `AdvancePaymentController`, `PayrollController`, and `CustodianController` (depreciation, stock-out). A payment without a configured GL account is still recorded — but no JE is created. GL accounts are mapped in Admin → GL Settings and are stored in `school_preferences.gl_*_account_id` columns.

### 8.4 Receipt Generation

`ReceiptService::generateReceipt()` uses `DB::lockForUpdate()` to prevent duplicate receipt numbers in concurrent requests. Receipt numbers auto-increment from `receipt_gen` table.

---

## 9. Development Environment Setup

### Prerequisites

- PHP 8.2 + extensions: `pdo_mysql`, `mbstring`, `openssl`, `json`, `zip`, `gd`, `bcmath`, `curl`, `fileinfo`
- MySQL 8.0 or MariaDB 10.6
- Node.js 20 LTS + npm
- Composer 2.x

### Quick Start

```bash
# 1. Clone and enter the repo
cd c:/xampp/htdocs/svhs-sms-revamped

# 2. Backend setup
cd backend
cp .env.example .env
composer install
php artisan key:generate

# Edit .env — set DB_DATABASE, DB_USERNAME, DB_PASSWORD, APP_URL
# APP_URL=http://localhost:8000
# FRONTEND_URL=http://localhost:5173

php artisan migrate --seed           # Full schema + seed with TestDataSeeder
php artisan storage:link             # Symlink public/storage

# 3. Frontend setup
cd ../frontend
npm install

# 4. Run both servers (in two terminals)
# Terminal A:
cd backend && php artisan serve      # Runs on http://localhost:8000
cd backend && php artisan queue:listen --tries=1

# Terminal B:
cd frontend && npm run dev           # Runs on http://localhost:5173
```

### Environment Variables (backend .env key settings)

```ini
APP_NAME="Eskwelawakan - Smart School System by Aqura"
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sms_db          # actual DB name used in dev
DB_USERNAME=root
DB_PASSWORD=

MAIL_MAILER=smtp                    # or 'log' for dev
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=
MAIL_PASSWORD=

PAYMONGO_SECRET_KEY=                # sk_test_... or sk_live_...
PAYMONGO_PUBLIC_KEY=                # pk_test_... or pk_live_...
PAYMONGO_WEBHOOK_SECRET=

OPENAI_API_KEY=                     # For AI flashcard generation (optional)
```

### Seeder Reference

The `TestDataSeeder` is **fully idempotent** — safe to re-run without wiping data. It provisions all test accounts, students, assessments, HRMS records, and payment history described in `docs/test-login-creds.md`.

```bash
# Re-seed without wiping:
php artisan db:seed --class=TestDataSeeder

# Full wipe and re-seed:
php artisan migrate:fresh --seed
```

---

## 10. Testing

### Backend Tests

```bash
cd backend
php artisan test          # Runs PHPUnit test suite
```

Test files are in `backend/tests/Feature/` and `backend/tests/Unit/`. The test suite covers authentication, payment flows, GL posting, and enrollment state transitions.

### Frontend Tests

```bash
cd frontend
npm test                  # Vitest watch mode
npm run test:run          # Single run
npm run test:coverage     # Coverage report
```

Test files follow the `*.test.tsx` convention co-located with their page (e.g., `teacher/class-analytics.test.tsx`, `student/health-record.test.tsx`).

### End-to-End Testing

See `docs/test-login-creds.md` → **Suggested End-to-End Test Flows** (Flows 1–13) for manual testing scenarios covering the full student lifecycle, accounting GL sync, HRMS cycle, and CMS.

---

## 11. Known Issues & Technical Debt

| Issue | Location | Severity | Status | Notes |
|---|---|---|---|---|
| AI Flashcard Generation is a stub | `FlashcardController::generateAi()` | Low | ⚠️ **Active** | Returns mock data; wire `OPENAI_API_KEY` when ready. Schema and backend route exist. |
| SMTP not configured by default | `.env` | Medium | ⚠️ **Active** | Applicant confirmation and notification emails go to log file in dev. Critical for go-live: configure real SMTP. |
| Teacher portal has no Leave Application UI | Teacher sidebar | Medium | 🔶 **Pending** | `LeaveController` backend is complete; sidebar link and form component missing. **Effort: 2–3 hours** |
| Student portal Discount Code redemption not wired | Student portal pages | Medium | 🔶 **Pending** | `DiscountCodeController` exists; student UI component not built. **Effort: 2–3 hours** |
| Payroll post-posting adjustments | `PayrollController` | Medium | 🔶 **Pending** | Backend supports period regeneration but no UI form exposed. **Effort: 1 day** |
| 13th month payroll type | `PayrollComputeService` | Low | 🔶 **Pending** | Template type registered; full computation coverage untested in production. **Effort: 1 day testing** |
| No automated E2E test suite | — | Medium | 📝 **Design Phase** | Only unit tests and manual flow tests exist. Consider Playwright or Cypress integration. |
| `student_payment_dummy` table | `StudentPaymentDummy` model | Low | 📋 **Review** | Legacy carry-over table from original SMS; used for dummy/test payments. Review if still needed or archive. |
| Chart of Accounts `is_system` flag | `ChartOfAccountController` | Low | ✅ **Working** | System accounts (AR, Revenue) are protected from deletion but no visual indicator in UI. |
| `MassTransactionController.php.backup` | backend controllers | Low | ✅ **Safe** | Stale backup file in source; safe to delete (does not affect functionality). |
| Database performance indexes | Queries on large tables | Low | ✅ **Resolved** | Composite indexes added in migration `2026_03_27_052519_add_performance_indexes.php`. Monitor slow query log. |

---

## 12. Scaling Plan

### Current Capacity

The system is currently deployed at SVHS with:
- ~800–1,200 active students (by school year)
- ~80–100 staff
- ~40–60 concurrent users during peak hours (morning, reporting period)

Designed and tested for reliable performance at this scale.

### Short-Term Scaling (1,000 → 3,000 students)

No architectural changes required. Incremental improvements:

| Action | Effort | Impact |
|---|---|---|
| Add MySQL query cache and index tuning | Low | Faster report queries |
| Upgrade server RAM from 4 GB → 16 GB | Low (hardware) | More concurrent connections |
| Enable OPcache in php.ini | Low | 30–50% PHP execution speedup |
| Switch from DB queue driver to **Redis** | Medium | Faster async jobs, fewer DB table locks |
| Add `CACHE_DRIVER=redis` for Laravel cache | Medium | Dramatically faster lookup endpoints |
| Add CDN for file storage (Cloudflare R2 / S3) | Medium | Offload file bandwidth from app server |

### Medium-Term Scaling (Multi-School / SaaS)

If the system is to be offered to multiple schools simultaneously:

| Action | Effort | Impact |
|---|---|---|
| **Multi-tenancy via subdomain isolation** | High | Each school gets its own DB schema or separate DB |
| Introduce **Tenant middleware** (e.g., stancl/tenancy) | High | Route all requests through tenant context |
| Centralized auth service (optional SSO) | High | Single login across tenant instances |
| Extract frontend to per-school theme config | Medium | White-labeling per school |
| Shared admin panel for managing school instances | High | Vendor-level control |

### Infrastructure Scaling Path

```
Current: Single server (XAMPP dev) 
  → Stage 1: VPS on Ubuntu 22.04, Nginx, PHP-FPM, MySQL, PM2
  → Stage 2: Separate DB server + App server
  → Stage 3: Load-balanced app servers + Managed DB (PlanetScale / RDS)
  → Stage 4: Multi-tenant architecture with per-school DB isolation
```

### Performance Indexes

Migration `2026_03_27_052519_add_performance_indexes.php` already adds composite indexes on the most-queried columns across the payment and student tables. Future bottlenecks should be identified via MySQL `EXPLAIN` on slow query log entries.

---

## 13. Deployment Guide

### On-Premises Production (Ubuntu 22.04 + Nginx)

```bash
# 1. Install dependencies
sudo apt update
sudo apt install nginx php8.2-fpm php8.2-mysql php8.2-mbstring php8.2-xml \
     php8.2-zip php8.2-gd php8.2-bcmath php8.2-curl php8.2-fileinfo \
     mysql-server nodejs npm composer -y

# 2. Clone repo
git clone <repo-url> /var/www/svhs-sms
cd /var/www/svhs-sms

# 3. Backend
cd backend
composer install --optimize-autoloader --no-dev
cp .env.example .env
# Edit .env with production values
php artisan key:generate
php artisan migrate --force --seed   # or: migrate --force (no seed on production)
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 4. Frontend
cd ../frontend
npm install
npm run build
# Output: frontend/dist/  — serve as static files

# 5. Nginx config (example)
# /etc/nginx/sites-available/svhs-sms
server {
    listen 80;
    server_name school.yourdomain.com;

    # Frontend SPA
    root /var/www/svhs-sms/frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
# (Add HTTPS with certbot for internet-facing deployments)

# 6. Queue worker (PM2)
pm2 start "php artisan queue:work --tries=3" --name svhs-queue
pm2 save

# 7. Scheduler (cron)
# Add to crontab:
# * * * * * cd /var/www/svhs-sms/backend && php artisan schedule:run >> /dev/null 2>&1
```

### Environment Checklist Before Go-Live

- [ ] Set `APP_ENV=production` and `APP_DEBUG=false`
- [ ] Set production `APP_URL` and `FRONTEND_URL`
- [ ] Configure real SMTP credentials (`MAIL_*`)
- [ ] Configure PayMongo live keys (`PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`)
- [ ] Set `SESSION_SECURE_COOKIE=true` if HTTPS
- [ ] Set `SANCTUM_STATEFUL_DOMAINS` to the frontend domain
- [ ] Run `php artisan config:cache` and `php artisan route:cache`
- [ ] Enable MySQL binary logging for point-in-time recovery
- [ ] Schedule automated `mysqldump` backups (or use Admin → Backups)
- [ ] Set file upload size limits in `php.ini`: `upload_max_filesize=20M`, `post_max_size=25M`

---

## 14. Maintenance Reference

### Common Artisan Commands

```bash
# Re-seed without wiping
php artisan db:seed --class=TestDataSeeder

# Full wipe and re-seed (DESTRUCTIVE)
php artisan migrate:fresh --seed

# Clear all caches
php artisan optimize:clear

# Run queue worker
php artisan queue:listen --tries=1 --timeout=0

# Run scheduler manually
php artisan schedule:run

# Generate new application key (emergency only — invalidates all tokens)
php artisan key:generate

# Check route list
php artisan route:list --path=api

# Diagnose duplicate records (diagnostic scripts in root)
php diag.php
php diag_dupes.php
php diag_ledger.php
php diag_schema.php
```

### File Storage

All uploaded files (student photos, requirement documents, CMS images, payslips) are stored in `backend/storage/app/public/`. The `public/storage` symlink points to this directory.

To back up files: archive `backend/storage/app/` directory.

### Database Backups

- **Admin panel**: Admin → Database Backup → triggers `mysqldump` and serves a timestamped `.sql.gz` download. ✅ Tested regularly.
- **Manual**: `mysqldump -u root sms_db > backup_$(date +%Y%m%d).sql`
- **Archive snapshots**: `db/sms_db20260406.sql` (April 2026) and earlier versions for disaster recovery reference
- **Recommended frequency**: Daily automated backups to external storage; weekly test restore to separate machine

### Log Files

- Laravel logs: `backend/storage/logs/laravel.log`
- Queue job failures: Laravel failed_jobs table (`php artisan queue:failed`)
- PayMongo webhook events: logged in `laravel.log` at DEBUG level

### Adding a New Role / Module

1. Add the Spatie role in `DatabaseSeeder` or via `php artisan tinker` → `Role::create(['name' => 'NewRole'])`
2. Create a new controller namespace under `app/Http/Controllers/NewModule/`
3. Add route group in `api.php` with `->middleware('role:NewRole')`
4. Create a new layout in `frontend/src/layouts/new-module-layout.tsx`
5. Add pages under `frontend/src/pages/new-module/`
6. Register routes in `App.tsx` with `<ProtectedRoute role="NewRole">` wrapper
7. Add sidebar link in the new layout

### Upgrading Laravel

The project targets Laravel 12 (released Feb 2025; current stable as of June 2026). When upgrading to a future major version:
1. Check `composer.json` for `"laravel/framework": "^12.0"` compatibility
2. Run `composer update` and review the official upgrade guide
3. Re-run `php artisan migrate` for any new framework-level migrations
4. Re-run `php artisan config:cache`
5. Monitor Laravel security advisories and apply patches promptly

### Upgrading React / Vite

The frontend uses React 19 and Vite 6, both on the latest stable versions as of June 2026. Monitor for React Router v8+ and Vite 7+ releases when available; test thoroughly before adopting major version updates.

---

## Appendix A — Role & User Account Summary

| Role | Internal Login | Portal Login | Designation |
|---|---|---|---|
| Administrator | ✅ `/login` | — | `admin` |
| Registrar | ✅ `/login` | — | `registrar` |
| Encoder | ✅ `/login` | — | `encoder` |
| Accounting Staff | ✅ `/login` | — | `accounting` |
| Cashier | ✅ `/login` | — | `cashier` |
| HR | ✅ `/login` | — | `hr` |
| Custodian | ✅ `/login` | — | `custodian` |
| School Nurse | ✅ `/login` | — | `clinic` |
| Librarian | ✅ `/login` | — | `library` |
| Front Desk | ✅ `/login` | — | `front-office` |
| Teacher | — | ✅ `/portal-login` | — |
| Student | — | ✅ `/portal-login` | — |
| Parent | — | ✅ `/portal-login` | — |
| Applicant | — | ✅ `/portal-login` | — |

See `docs/test-login-creds.md` for all test credentials.

---

## Appendix B — Key File Reference

| File | Purpose |
|---|---|
| `backend/routes/api.php` | All API routes (single file, ~350 routes) |
| `backend/app/Traits/HasPublicId.php` | public_id auto-generation trait |
| `backend/app/Services/GlJournalService.php` | Auto GL journal posting |
| `backend/app/Services/ReceiptService.php` | Race-condition-safe receipt generation |
| `backend/config/school.php` | School-specific constants (grade levels, strands, fiscal year) |
| `backend/database/seeders/TestDataSeeder.php` | Idempotent test data seeder |
| `frontend/src/App.tsx` | Full route tree (150+ routes) |
| `frontend/src/lib/api.ts` | Axios instance with Sanctum token interceptor |
| `frontend/src/stores/auth-store.ts` | Zustand auth store |
| `frontend/src/types/dss.ts` | TypeScript interfaces for all DSS data shapes |
| `frontend/src/pages/admin/dss/` | 7 DSS page components |
| `backend/app/Services/Dss/` | 5 DSS service classes |
| `backend/app/Http/Controllers/Admin/Dss/` | 7 DSS controllers |
| `backend/resources/views/dss/reports/` | 8 PDF Blade templates + 2 partials |
| `frontend/src/types/guidance.ts` | TypeScript interfaces for all Guidance data shapes |
| `frontend/src/pages/admin/guidance/` | 7 Guidance Office page components |
| `backend/app/Services/Guidance/GuidanceCaseService.php` | Case number generation, open/close transaction, dashboard stats |
| `backend/app/Http/Controllers/Admin/Guidance/` | 9 Guidance controllers |
| `backend/resources/views/guidance/reports/` | 4 PDF Blade templates + 2 partials (RA 9258 confidentiality headers) |
| `frontend/src/components/protected-route.tsx` | Role-based route guard |
| `frontend/src/components/module-gate.tsx` | Component-level role gating |
| `docs/test-login-creds.md` | All dev/test accounts, seeded data reference, flow testing guide |
| `docs/TROUBLESHOOTING.md` | Common error fixes |
| `db/sms_db20260406.sql` | DB snapshot archive (April 2026; current live DB maintained separately) |

---

## 15. Go-Live Implementation Plan

This section documents the concrete steps to transition from the current development environment to a fully operational production deployment.

### 15.1 Pre-Launch Checklist

#### Infrastructure
- [ ] Provision server (see §13 for specs — minimum quad-core, 8 GB RAM, 256 GB SSD)
- [ ] Install Ubuntu 22.04 LTS, Nginx, PHP 8.2-FPM, MySQL 8.0, Node 20, Composer, PM2
- [ ] Assign a domain name and point DNS to server IP
- [ ] Obtain SSL certificate via Certbot (`certbot --nginx -d yourdomain.com`)
- [ ] Configure firewall: allow ports 80, 443, 22 only (`ufw allow 'Nginx Full'; ufw allow ssh; ufw enable`)
- [ ] Set up automated daily `mysqldump` cron backup to an external drive or cloud bucket

#### Application
- [ ] Clone repo to `/var/www/eskwelawakan` (or school-specific folder)
- [ ] Run `composer install --optimize-autoloader --no-dev`
- [ ] Copy `.env.example` → `.env`; fill all production values (see table below)
- [ ] Run `php artisan key:generate`
- [ ] Run `php artisan migrate --force` (no seed on production — use real data migration)
- [ ] Run `php artisan storage:link`
- [ ] Run `php artisan config:cache && php artisan route:cache && php artisan view:cache`
- [ ] Build frontend: `npm install && npm run build`
- [ ] Verify `frontend/dist/index.html` exists
- [ ] Start queue worker via PM2: `pm2 start "php artisan queue:work --tries=3" --name queue`
- [ ] Add Laravel scheduler to crontab: `* * * * * cd /var/www/.../backend && php artisan schedule:run >> /dev/null 2>&1`

#### Production `.env` Values to Set

| Variable | Value |
|---|---|
| `APP_NAME` | `"Eskwelawakan - Smart School System by Aqura"` |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | Run `php artisan key:generate` |
| `APP_URL` | `https://yourdomain.com` |
| `FRONTEND_URL` | `https://yourdomain.com` |
| `DB_DATABASE` | `sms_db` (or school-specific name) |
| `DB_USERNAME` | Dedicated DB user (not `root`) |
| `DB_PASSWORD` | Strong random password |
| `MAIL_MAILER` | `smtp` |
| `MAIL_HOST` | School SMTP server or Gmail/Mailtrap |
| `MAIL_PORT` | `587` |
| `MAIL_USERNAME` | SMTP account |
| `MAIL_PASSWORD` | SMTP password |
| `MAIL_FROM_ADDRESS` | `noreply@yourdomain.com` |
| `PAYMONGO_PUBLIC_KEY` | `pk_live_...` from PayMongo dashboard |
| `PAYMONGO_SECRET_KEY` | `sk_live_...` from PayMongo dashboard |
| `PAYMONGO_WEBHOOK_SECRET` | From PayMongo → Webhooks → Secret |
| `SESSION_SECURE_COOKIE` | `true` |
| `SANCTUM_STATEFUL_DOMAINS` | `yourdomain.com` |
| `QUEUE_CONNECTION` | `database` (or `redis` if Redis is installed) |
| `CACHE_STORE` | `file` (or `redis`) |

#### Security Hardening
- [ ] Create a dedicated MySQL user with only the permissions needed (`GRANT ALL ON sms_db.* TO 'appuser'@'localhost'`)
- [ ] Remove `APP_KEY=` empty value — key must be generated before first request
- [ ] Ensure `APP_DEBUG=false` — debug mode leaks stack traces to the browser
- [ ] Set `upload_max_filesize=20M` and `post_max_size=25M` in `php.ini`
- [ ] Disable PHP error display in production `php.ini`: `display_errors=Off`
- [ ] Restrict `backend/storage/` and `backend/bootstrap/cache/` to be writable only by the web user
- [ ] Verify `.env` is not publicly accessible (Nginx config must not serve files from the backend root)
- [ ] Register PayMongo webhook URL in the dashboard: `https://yourdomain.com/api/webhooks/paymongo`

---

### 15.2 Data Migration Steps

Before go-live, the school's existing data must be migrated from their current system (Excel / old SMS / paper records).

| Step | Action | Owner | Estimated Time |
|---|---|---|---|
| 1 | Audit existing student master list (Excel/CSV) | Developer + Registrar | 0.5 day |
| 2 | Clean data: fix name formats, fill LRN, remove duplicates | Developer | 1–2 days |
| 3 | Prepare school years, grade levels, class sections in system | Developer | 2 hours |
| 4 | Import students via Admin → Registrar → Import (CSV) | Developer / Encoder | 0.5 day |
| 5 | Migrate fee structure: assessments, categories, particulars | Developer + Accounting | 1 day |
| 6 | Migrate opening balances (carry-over receivables from old system) | Developer + Accounting | 1–2 days |
| 7 | Import personnel records (HR module) | Developer + HR | 0.5 day |
| 8 | Set up Chart of Accounts (GL structure) | Developer + Accounting | 0.5 day |
| 9 | Configure GL Settings (AR, Revenue, Cash accounts) | Developer + Accounting | 2 hours |
| 10 | Set up library catalog (optional at go-live) | Librarian | 1–2 days |
| 11 | Spot-check: school admin reviews 10–20 random student records | School Admin | 2–3 hours |
| 12 | Sign-off: Registrar and Principal sign migration verification sheet | School Admin | — |

---

### 15.3 User Account Provisioning

Before go-live, create all staff and portal accounts:

1. **Admin** → Users → create accounts for all internal staff (Registrar, Encoder, Accounting, Cashier, HR, Custodian, Librarian, Nurse, Front Desk)
2. **Admin** → Portal Accounts → create Teacher portal accounts linked to faculty staff records
3. **Admin** → Portal Accounts → bulk-create Student and Parent portal accounts (or have students register during orientation)
4. Distribute temporary passwords to staff; require password change on first login
5. Test one login per role before the go-live date

---

### 15.4 Parallel Run Period (Recommended: 2 Weeks)

Do not immediately shut down the old system. Run both in parallel:

| Day | Action |
|---|---|
| **Day 1–3** | All cashiers enter payments in **both** old system and new system |
| **Day 1–3** | Registrar enrolls new students in **both** systems |
| **Day 3** | Cross-check: verify total collections in new system match old system for the same period |
| **Day 4–7** | Taper off old system — new system is primary; old system is reference only |
| **Day 8–14** | New system is sole source of truth; old system is read-only reference |
| **Day 15** | Official cutover complete — freeze old system |

---

### 15.5 Go-Live Day Runbook

```
T-7 days   Freeze old system data migration (no more bulk imports)
T-7 days   Final data verification sign-off by school admin
T-3 days   Deploy app to production server; configure .env
T-3 days   Run smoke tests on all major modules (login, payment, enrollment)
T-1 day    Brief all staff on login credentials and quick-start guides
T-1 day    Verify queue worker is running (pm2 status)
T-1 day    Verify PayMongo webhook is registered and responding

Go-Live Day:
  08:00   Announce to staff: "System is live"
  08:00   Developer on standby (on-site or remote) for first 4 hours
  09:00   First cashier transaction posted; verify receipt prints correctly
  10:00   Check laravel.log for any unexpected errors
  12:00   First daily report generated; cross-check with manual records
  EOD     Review error log; triage any issues found during day 1

T+3 days   Post-launch review meeting with school admin
T+7 days   Confirm all staff are using the system independently
T+14 days  Formal handover sign-off
```

---

### 15.6 Rollback Plan

In the unlikely event of a critical failure after go-live:

| Condition | Action |
|---|---|
| API returns 500 on all requests | Check `laravel.log`; most likely a missing `.env` value or migration not run |
| Database corruption / bad migration | Restore from last `mysqldump` backup; re-run only failed migrations |
| Frontend not loading | Check Nginx config; verify `frontend/dist/` exists and Nginx root points to it |
| Queue worker stopped | `pm2 restart queue` or `pm2 start queue` |
| PayMongo webhook not firing | Re-verify webhook URL in PayMongo dashboard; check `APP_URL` in `.env` |
| Need to fully roll back | Restore DB snapshot from `db/sms_db20260406.sql`; revert to last known-good git commit |

Keep the pre-go-live DB snapshot and a post-data-migration snapshot stored in at least two separate locations before switching live.

---

### 15.7 Post-Launch Monitoring (First 30 Days)

| Check | Frequency | How |
|---|---|---|
| Error log review | Daily | `tail -n 200 backend/storage/logs/laravel.log` |
| Queue worker health | Daily | `pm2 status` |
| Database backup verification | Weekly | Download and restore-test the backup on a separate machine |
| Disk space | Weekly | `df -h` — watch for storage/ growth from uploaded files |
| Slow query detection | Weekly | Enable MySQL slow query log; review with `mysqldumpslow` |
| Failed jobs | Weekly | `php artisan queue:failed` — inspect and retry or delete |
| User feedback collection | Ongoing | Dedicated channel (email/chat) for staff to report issues |
| Performance baseline | Day 30 | Run load test with realistic concurrent users; compare response times |

---

## Appendix C � Next Phase Recommendations (June 2026 onward)

This section outlines the strategic direction and recommended work items for the next 6�12 months as the system matures.

### Immediate (Next 4 Weeks)

1. **Stabilize Pilot Modules**
   - Gather feedback from DSS dashboard users (Admin)
   - Gather feedback from Guidance Office users (Counselor)
   - Refine UI/UX based on real usage patterns
   - Document any edge cases discovered

2. **Close High-Priority Gaps**
   - [ ] Implement Teacher Portal Leave Application UI (1 day effort)
   - [ ] Implement Student Discount Code Redemption (4 hours effort)
   - [ ] Configure real SMTP for applicant notifications (1 hour config)
   - [ ] Create production Nginx/SSL deployment scripts (1 day effort)

3. **Quality Assurance**
   - [ ] Run manual E2E test flows (see TESTING-KB.md, Flows 1�13)
   - [ ] Review \laravel.log\ for any error patterns
   - [ ] Verify all module permissions are role-correct
   - [ ] Stress-test with realistic concurrent user load

### Short-Term (Months 2�3)

1. **Expand to Additional Schools** (if applicable)
   - Establish multi-tenancy architecture using \stancl/tenancy\ or similar
   - Create school-specific configuration management
   - Develop white-labeling support (logo, colors, domain)
   - Deploy to second school instance

2. **Complete Remaining Features**
   - [ ] Wire OpenAI/Gemini API for AI Flashcard Generation
   - [ ] Test 13th Month Payroll end-to-end
   - [ ] Build Payroll post-posting adjustment UI

3. **Infrastructure & DevOps**
   - [ ] Move from XAMPP dev to production Ubuntu 22.04 + Nginx stack
   - [ ] Set up automated CI/CD pipeline (GitHub Actions / GitLab CI)
   - [ ] Implement Redis for queue + cache (if scaling)
   - [ ] Set up monitoring & alerting (e.g., Sentry, LogRocket, DataDog)

### Medium-Term (Months 4�6)

1. **Analytics & Reporting**
   - [ ] Build E2E test suite with Playwright (currently manual only)
   - [ ] Create internal dashboards for system health (uptime, error rate, response time)
   - [ ] Publish quarterly feature roadmap to stakeholders

2. **Performance Optimization**
   - [ ] Profile slow queries using MySQL slow query log
   - [ ] Add Redis query caching for lookup endpoints
   - [ ] Implement API response pagination where missing
   - [ ] Consider CDN for static assets and uploaded file delivery

3. **Security Hardening**
   - [ ] Conduct security audit (OWASP Top 10 check)
   - [ ] Implement rate limiting on public endpoints
   - [ ] Add 2FA for admin accounts
   - [ ] Encrypt sensitive fields (SSN, bank account numbers) at rest

### Long-Term (Months 7�12+)

1. **SaaS Platform Evolution**
   - [ ] Build multi-tenancy with full tenant isolation
   - [ ] Create tenant management admin panel
   - [ ] Implement usage-based billing integration
   - [ ] Establish SLA monitoring and customer support portal

2. **Advanced Features**
   - [ ] Mobile app (React Native or Flutter) for student/parent portals
   - [ ] Video conferencing integration (for distance learning LMS)
   - [ ] AI-powered chatbot for student support
   - [ ] Advanced reporting with drill-down capabilities

3. **Community & Ecosystem**
   - [ ] Open-source select modules (if appropriate for Aqura's strategy)
   - [ ] Build plugin architecture for third-party integrations
   - [ ] Create partner marketplace (e.g., for transportation, tuition financing)


---

## Appendix D � Support & Handover Contact

**Current Developer:** Emilio B. Magtolis Jr.
**Role:** Lead Developer / Architect
**GitHub Repository:** [School SMS Revamped](https://github.com/your-org/svhs-sms-revamped) (if public)
**Documentation:** This HANDOVER.md + supporting docs in `/docs/kb/`  
**Knowledge Base:** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues

### For New Developers

1. Start by reading this handover document entirely
2. Run the quick-start in �9 to set up local dev environment
3. Review `docs/test-login-creds.md` and manually test each module
4. Study the architecture diagram and design patterns in �8
5. Examine the DSS and Guidance Office modules as complex examples
6. Ask clarifying questions � code should be readable without guessing intent

### For School Administrators

1. Review the **System Overview** (�1) and **Module Status** (�4)
2. Refer to module-specific knowledge bases in `docs/kb/` for operational guidance
3. Contact the developer for feature requests, bug reports, or performance issues
4. Schedule monthly check-ins to review system health and upcoming needs

### For Future Maintenance Teams

1. **Version your changes:** Use semantic versioning for releases
2. **Document migrations:** Every schema change should have a clear Artisan migration
3. **Test before deploying:** Run the test suite and manual E2E flows
4. **Monitor in production:** Keep `laravel.log` and slow query log under observation
5. **Communicate changes:** Notify school admin of scheduled downtime and feature releases

---

**Document Completion:** This handover document was last updated on **June 21, 2026** and represents the definitive state of the Eskwelawakan system. It should be reviewed and updated quarterly as the system evolves.

*End of Document*
