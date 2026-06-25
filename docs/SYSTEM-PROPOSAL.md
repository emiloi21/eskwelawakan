# System Proposal
## Integrated School Management Information System (School MIS)
### For Basic Education Institutions — Nursery to Grade 12

---

**Prepared by:** Emilio B. Magtolis Jr., System Developer  
**Document Version:** 1.0  
**Date:** April 4, 2026  
**Classification:** Proposal — For School Administration Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Proposed Solution](#3-proposed-solution)
4. [System Modules & Features](#4-system-modules--features)
5. [Benefits & Value Proposition](#5-benefits--value-proposition)
6. [Technology Stack](#6-technology-stack)
7. [System Architecture](#7-system-architecture)
8. [User Roles & Access Control](#8-user-roles--access-control)
9. [Implementation Requirements](#9-implementation-requirements)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Data Migration Plan](#11-data-migration-plan)
12. [Security & Data Privacy Compliance](#12-security--data-privacy-compliance)
13. [Support & Maintenance](#13-support--maintenance)
14. [Return on Investment](#14-return-on-investment)
15. [Conclusion](#15-conclusion)

---

## 1. Executive Summary

Many private and public basic education schools in the Philippines continue to operate on fragmented, paper-based, or loosely connected digital systems. This creates administrative inefficiency, financial inaccuracies, communication gaps, and compliance difficulties — all of which directly affect the quality of education and school governance.

This proposal presents the **Integrated School Management Information System (School MIS)** — a comprehensive, web-based platform purpose-built for basic education institutions from Nursery through Grade 12. The system was developed and proven in a real school environment and is now being offered to other institutions seeking to modernize their operations.

The School MIS consolidates **22 functional modules** into a single unified platform, covering every operational area of a school: student information, academic records, financial management, online payments, human resources, payroll, library, clinic, attendance, front office, content management, and more.

This is not a generic off-the-shelf product. It is a field-tested, actively maintained system backed by a full automated test suite of 232 tests — ensuring reliability and correctness across every functional area.

---

## 2. Problem Statement

### 2.1 Current Challenges in Philippine Basic Education Schools

The following problems are commonly observed in schools operating without an integrated MIS:

#### Administrative & Registrar
| Problem | Impact |
|---------|--------|
| Student records maintained in spreadsheets or physical folders | Time-consuming retrieval; data loss risk; difficult to track multi-year academic history |
| Manual enrollment with duplicate paper forms | Prone to errors; redundant data entry; slow processing |
| No systematic tracking of enrollment status | School administrators lack real-time visibility into enrollment pipeline |
| Grade encoding done in separate sheets per teacher | Inconsistent formats; consolidation delays; late report card releases |
| Requirements (IDs, birth certificates, etc.) tracked manually | Items get lost; no audit trail; difficult to follow up with students |

#### Financial & Accounting
| Problem | Impact |
|---------|--------|
| Cash receipts written manually by cashiers | Errors, fraud risk, no real-time balance updates |
| Fee computation done per student manually | Inconsistencies across sections; delayed billing |
| No audit trail for transactions | Compliance risk; difficult internal audits |
| Collections not reconciled daily | Discrepancies discovered only at month-end |
| No online payment capability | Parents must physically be present for payments; queue congestion every enrollment season |
| Year-end closing done manually in Excel | Data loss, computation errors, balance rollover mistakes |

#### Faculty & Human Resources
| Problem | Impact |
|---------|--------|
| Attendance tracked on paper logbooks | Easily lost or tampered; no real-time reporting |
| Leave applications submitted on paper forms | No tracking of leave balances; approval delays |
| Payroll computed manually in Excel | High error rate; time-consuming; overtime costs |
| Teacher grade submission via email or USB | Version control issues; late submissions; data inconsistency |

#### Student & Parent Experience
| Problem | Impact |
|---------|--------|
| No parent/student portal for self-service | Parents must call or visit school for balance inquiries, grades, announcements |
| Announcements posted only on bulletin boards | Parents and students miss important updates |
| No digital copy of report cards or transcripts | Parents wait for school visits; graduates request manual re-issue |
| Clinic and health records kept in physical logbooks | No systematic follow-up; lost records for returning students |

#### Library & Support Services
| Problem | Impact |
|---------|--------|
| Library borrowing recorded in logbooks | No overdue tracking; lost books not followed up |
| Visitor log maintained manually | Security gap; no verifiable records for incidents |
| Downloads and forms distributed via USB or print | Outdated versions circulate; no control |

---

## 3. Proposed Solution

### The Integrated School Management Information System

The **School MIS** eliminates all the above problems through a single, web-based platform accessible from any device — desktop, tablet, or mobile. It replaces disconnected spreadsheets, paper forms, and siloed software with one coherent system where data flows automatically between modules.

### Key Principles

- **Single source of truth** — All student, financial, and HR data live in one database, eliminating contradictory records across departments.
- **Role-based access** — Each staff member sees only what is relevant to their function, minimizing errors and security risks.
- **Real-time visibility** — Administrators see live dashboards; cashiers see outstanding balances; nurses see health records instantly.
- **Audit trail everywhere** — Every action is logged with user, timestamp, and change details, supporting accountability and compliance.
- **Offline-resilient** — Deployed on the school's own server; the system remains fully functional even without internet connectivity.
- **Scalable** — Built on modern web technologies; designed to grow from 300 to 3,000+ students without performance degradation.

---

## 4. System Modules & Features

The School MIS is organized into **22 integrated modules** covering every operational domain of a basic education institution.

---

### Module 1 — Student Information System (SIS)

The central registry for all student data, from admission to graduation.

**Features:**
- Complete student profiles: personal info, guardian/contact details, photo
- Enrollment pipeline management: Applied → For Assessment → For Payment → Enrolled → Active
- Bulk enrollment promotion (promote entire year level cohort with one action)
- Academic history across all school years per student
- Class section assignment and adviser tracking
- Student status tracking: Active, Graduated, Transferred, On Leave, Dropped
- DepEd-required fields (LRN, birth certificate number, etc.)
- CSV bulk import with preview and validation
- Student ID generation
- Photo upload per student
- Form 137 / Enrollment Certificate PDF generation
- Advanced search and filtering (by grade, section, status, enrollment year)

---

### Module 2 — Enrollment Management

Structured workflow from online application to full enrollment.

**Features:**
- Online enrollment application portal (public-facing, no login required)
- Entrance exam slot booking and management
- Applicant portal: track application status, submit requirements, view exam schedule
- Bulk promote from one grade level to the next at year-end
- Re-enrollment workflow for returning students (student self-service)
- Requirements checklist per student (Birth Certificate, Form 138, etc.)
- Requirement document upload and approval workflow
- Enrollment certificate generation

---

### Module 3 — Academic Records & Grading

Complete grade management from teacher input to official report cards.

**Features:**
- Teacher grade entry per class and subject
- Grade history per student per school year and semester
- Attendance tracking per class section
- Student report card generation (PDF)
- Class roster and grade sheet reports
- Attendance sheet reports
- Learning materials upload and distribution per class
- Announcements per class section (teacher to students)

---

### Module 4 — Financial Assessment & Billing

Flexible, configurable fee structure for any school's billing requirements.

**Features:**
- Assessment templates: define groups of fees by grade level and section
- Fee category management: Tuition, Miscellaneous, Laboratory, Books, Uniforms, etc.
- Fee particulars with itemized amounts
- Assessment-to-category-particular linking for precise billing
- Batch assignment of assessments to student cohorts
- Discount management: percentage or fixed-amount discounts
- Discount codes for online redemption (scholarship codes, sibling discounts, etc.)
- Auto-assessment assignment based on grade level at enrollment
- Advance payment recording and application

---

### Module 5 — Cashiering & Payment Processing

Full-featured collection system supporting both counter and online collections.

**Features:**
- Over-the-counter payment entry with instant receipt generation
- Multi-particular payment in a single transaction
- Receipt printing (standard and simplified formats)
- Void and refund workflows with approval
- Mass transactions (pay multiple students from one corporate account)
- Real-time balance and ledger per student
- Daily and monthly collection reports
- Transaction history and audit trail
- Non-Student Fee (NSF) cashiering for walk-in collections

---

### Module 6 — Online Payment Gateway

Enables parents and students to pay school fees online from anywhere.

**Features:**
- PayMongo integration (GCash, Maya, credit/debit cards, bank transfers)
- Secure payment session management
- Payment status tracking (pending, paid, failed)
- Bank/E-Wallet transfer submission with proof-of-payment upload
- Cashier validation queue for manual bank transfer approvals
- Parent portal online payment for their child
- Automatic balance update upon successful payment

---

### Module 7 — Accounting & Financial Management

Full double-entry general ledger and financial reporting.

**Features:**
- Chart of Accounts (multi-level account hierarchy)
- Journal entry creation with debit/credit validation
- GL posting and void workflow
- Trial balance and financial statements
- Payroll-to-GL automatic posting
- Accounts Receivable (A/R) aging and summary
- Accounts Payable (A/P) tracking
- Fiscal year closing with balance rollover
- Year-end financial reporting

---

### Module 8 — Portal: Teacher

A dedicated workspace for teaching staff.

**Features:**
- Teacher dashboard (class summary, advisee list)
- My Classes view with roster per section
- Grade encoding per class
- Attendance recording per class session
- Class announcements creation and management
- Learning material upload (PDFs, documents, links)
- Flashcard set creation and assignment to classes
- AI-assisted flashcard generation
- Flashcard quiz results and analytics

---

### Module 9 — Portal: Student

A self-service portal for enrolled students.

**Features:**
- Student dashboard (balance, grades, announcements)
- Ledger and payment history
- Schedule and class assignments
- Grade viewing per subject and quarter
- Report card access and PDF download
- Enrollment status and requirements tracking
- Re-enrollment self-service
- Online payment (PayMongo integration)
- Discount code redemption
- Class announcements and learning materials
- Flashcard practice and quizzes
- Academic history (multi-year)
- Enrollment certificate PDF download
- Personal health record viewer

---

### Module 10 — Portal: Parent

Parents stay connected to their child's academic, financial, and learning status.

**Features:**
- Dashboard with child overview
- Child's grades, attendance, balance, and payments
- Child's ledger and report card
- Online payment on behalf of child
- Re-enrollment initiation for child
- Discount code redemption for child
- Academic history and class announcements
- Multi-child support (one parent account, multiple children)
- View child's class learning materials (PDFs, links, documents) per subject
- Monitor child's flashcard quiz scores and study progress
- Read class announcements from each subject teacher

---

### Module 11 — Human Resource Management System (HRMS)

Centralized personnel management for all school staff.

**Features:**
- Department and position hierarchy management
- Personnel profiles: personal, employment, contact, emergency info
- Employee ID and PIN generation for kiosk attendance
- Personnel photo management
- Department assignment and reassignment
- Leave type configuration (Sick Leave, Vacation Leave, etc.)
- Leave application, approval, and rejection workflow
- Leave balance tracking per employee
- Attendance log viewing and summary reporting
- Manual attendance log entry (authorized HR/Admin)

---

### Module 12 — Biometric / RFID Attendance (Kiosk)

Automated daily attendance for personnel using RFID cards or PIN codes.

**Features:**
- Kiosk scan endpoint (no authentication required — designed for dedicated kiosk hardware)
- Employee ID or PIN-based identification
- Automatic time-in / time-out toggle (first scan = in, second = out)
- Inactive employee rejection
- Real-time attendance log creation
- Manual correction capability for authorized HR staff
- Attendance summary reporting

---

### Module 13 — Payroll

End-to-end payroll management integrated with HRMS and general ledger.

**Features:**
- Salary settings per position and per individual personnel
- Payroll templates (define earnings and deductions components)
- Payroll period creation and management
- Automatic payroll computation based on attendance and salary settings
- Statutory deductions: SSS, PhilHealth, Pag-IBIG, Withholding Tax
- Payroll submission, approval, and posting workflow
- Payslip generation per employee
- Payroll-to-GL automatic journal entry posting
- Chart of Accounts mapping for payroll accounts
- Period-level regeneration and adjustment support

---

### Module 14 — Library Management

Complete library operations from catalog to borrowing and returns.

**Features:**
- Book catalog with categories
- Book detail: title, author, ISBN, year, copies available
- Borrowing records per student or staff
- Return processing with date validation
- Overdue list with borrower and book details
- Borrower reference tracking (student or external)

---

### Module 15 — Front Office Management

Formal management of school entry, gate passes, and correspondence.

**Features:**
- Visitor log: check-in with purpose, host person, ID type
- Visitor check-out with time recording
- Gate pass issuance for students (early departure with authorization)
- Gate pass return logging
- Correspondence log: incoming and outgoing school correspondence
- Correspondence tracking with subject, sender/recipient, date, notes

---

### Module 16 — Clinic & Health Records

Student health management throughout their stay in the school.

**Features:**
- Comprehensive student health profile per student
- Blood type, height, weight, vision, hearing records
- Medical conditions, allergies, and current medications
- Vaccination records (structured JSON)
- PhilHealth number tracking
- Clinic visit log: complaint, diagnosis, treatment, medicine given
- Vital signs recording per visit (temperature, BP, pulse, O₂ sat)
- Referral and disposition tracking
- Health incident reports: allergic reactions, injuries, emergencies
- Student self-service: view own health record via student portal

---

### Module 17 — Download Center

Managed distribution of forms, circulars, and documents to the school community.

**Features:**
- Download categories for organization
- File management: title, description, file URL, download tracking
- Visibility tiers: Public (anyone), Authenticated (logged-in), Staff Only, Admin Only
- Public endpoint: externally shareable links (no login required)
- Authenticated endpoint: role-filtered visibility
- Admin panel: full CRUD for categories and files

---

### Module 18 — Custodian & Property Management

Tracking school assets, consumable supplies, and facility management.

**Features:**
- Property category and item registration
- Asset depreciation tracking
- Consumable category and item management
- Stock-in and stock-out with transaction history
- Facility listing and booking request system
- Booking approval / rejection workflow
- Supply request submission (any staff) and fulfillment (custodian)
- Inventory check / physical count workflow with assignable tasks

---

### Module 19 — Clearance Management

Digital clearance process for students and outgoing employees.

**Features:**
- Clearance template definition (offices/departments involved)
- Student or employee clearance application
- Per-office clearance marking (each department clears independently)
- Clearance return (flag an office as not-yet-clear)
- Pending clearance queue per office
- My clearance record self-service view

---

### Module 20 — School Website (CMS)

A public-facing school website managed entirely from the admin panel — no technical knowledge required to update content.

**News & Articles**
- Create articles with title, body (rich text), excerpt, category (Announcement, Achievement, Events, General), and cover image
- Publish/unpublish toggle with automatic `published_at` timestamp
- Auto-generated SEO-friendly URL slugs (e.g., `enrollment-sy-2026-2027`)
- Author attribution (linked to the admin account that created the article)
- Public endpoint serves only published articles; drafts remain hidden

*Example articles:* "Enrollment for School Year 2026–2027 Now Open," "SVHS Students Win Regional Science Quiz Bee," "Grade 12 Graduation Ceremony — June 2026"

**Photo Gallery**
- Create photo albums with title, description, cover image, event date, and sort order
- Upload multiple photos per album with captions
- Albums publicly browsable by slug (e.g., `/gallery/intramurals-2025-sports-day`)
- Cover image upload per album

*Example albums:* "Intramurals 2025 — Sports Day," "Graduation 2026," "Science Fair 2025," "Buwan ng Wika 2025," "Foundation Day 2026 — 50th Anniversary"

**Events Calendar**
- Create events with title, description, start/end date, location, category, color code, and public/private flag
- Color-coded by category for easy calendar visualization
- Internal events (e.g., Faculty Planning Workshop) can be flagged non-public
- End date validation: must be on or after start date

*Example events:*

| Title | Date | Category | Color |
|-------|------|----------|-------|
| Enrollment Period SY 2026-2027 | May 4 – May 29 | Enrollment | `#16a34a` |
| 1st Quarter Examinations | Aug 17 – Aug 21 | Examination | `#dc2626` |
| Teachers' Day | Oct 5 | Holiday | `#7c3aed` |
| Semestral Break (No Classes) | Oct 19 – Oct 24 | Holiday | `#f59e0b` |
| Christmas Program 2026 | Dec 18 | Event | `#dc2626` |

**Homepage Sliders / Banners**
- Create full-screen hero banners with title, subtitle, background image or solid color, and overlay opacity
- Two call-to-action buttons per slide with configurable label, link, and style (Primary, Secondary, Outline, Ghost)
- Text alignment per slide (Left, Center, Right)
- Drag-and-drop sort order management
- Active/inactive toggle per slide
- Background color fallback when no image is uploaded

*Example sliders:*

| Title | Subtitle | Buttons |
|-------|----------|---------|
| Enrollment is Now Open! | School Year 2026–2027 · May 4–29 · Nursery to Grade 12 | "Enroll Now" → `/apply` · "Learn More" → `/news/enrollment-sy-...` |
| Welcome to SVHS | Nurturing Faith, Excellence, and Service since 1976 | "Our Programs" · "Contact Us" |
| Academic Excellence Award 2025 | Ranked Top 3 in Division-Wide NAT Results | "Read More" |

**Public CMS Endpoints (No Login Required)**
- `GET /api/public/news` — list all published articles
- `GET /api/public/news/{slug}` — read a specific article
- `GET /api/public/gallery` — list all albums with photo count
- `GET /api/public/gallery/{slug}` — view album with all photos
- `GET /api/public/events` — list upcoming events
- `GET /api/public/sliders` — fetch active slides for homepage carousel

---

### Module 21 — Messaging & Notifications

In-system communication and alert infrastructure.

**Features:**
- In-app notifications: triggered by system events (payment confirmed, leave approved, etc.)
- Mark-as-read and mark-all-read
- Internal messaging between users
- Inbox, sent, and conversation threading
- Contact list from registered users

---

### Module 22 — Learning Management System (LMS)

A fully integrated digital learning environment connecting teachers, students, and parents — built directly into the school's existing portals with no separate login or platform.

#### For Teachers

- **Subject Learning Materials** — Upload and organize PDFs, documents, and links per class section; set visibility (published / draft); track upload history
- **Class Announcements** — Broadcast targeted announcements to specific class sections; students receive real-time notifications
- **Flashcard Set Creation** — Build structured flashcard decks linked to a subject and class section
- **AI-Assisted Flashcard Generation** — Generate flashcard content automatically from a topic or pasted text using AI
- **Flashcard Quiz Assignment** — Release flashcard sets to students as graded or practice quizzes
- **Quiz Analytics** — View per-student and per-deck results: scores, completion rates, time spent, and attempt history
- **Class Engagement Overview** — Track which students have accessed materials and completed assigned decks

#### For Students

- **Class Materials Viewer** — Access all learning materials organized by class and subject in one unified view
- **Announcements Feed** — See all teacher announcements across enrolled subjects, ordered by date
- **Flashcard Practice Mode** — Self-paced study of any available flashcard deck
- **Flashcard Quiz Mode** — Take timed or un-timed quizzes; view score and correct answers after submission
- **Assigned Deck Tracker** — See pending and completed quiz assignments with deadlines
- **Progress Summary** — Review past quiz scores and identify weak areas for review

#### For Parents / Guardians

- **Child's Materials Overview** — View learning materials shared in each of the child's enrolled subjects
- **Child's Quiz Performance** — Monitor flashcard quiz scores, attempt counts, and completion status per subject
- **Class Announcements** — Read teacher announcements for all of the child's class sections

#### Platform Capabilities

- No separate LMS login — fully integrated with existing Teacher, Student, and Parent portals
- Materials and announcements scoped by class section (students only see content for their enrolled classes)
- Flashcard decks can be shared across multiple sections or restricted to one
- All content changes are logged with uploader identity and timestamp
- Responsive design — accessible from any device (desktop, tablet, phone)

---

## 5. Benefits & Value Proposition

### 5.1 For Students and Parents

| Benefit | Description |
|---------|-------------|
| 24/7 Self-Service Portal | View grades, balances, schedules, and health records anytime via web or mobile browser |
| Online Payments | Pay tuition and fees via GCash, Maya, credit card, or bank transfer — no need to queue at school |
| Transparent Billing | Itemized statement of account with every transaction recorded |
| Real-Time Grades | Report card available online; no waiting for distribution day |
| Re-Enrollment Online | Submit requirements and re-enroll without a physical school visit |
| Health Record Access | Students can view their own clinic history and health profile |

### 5.2 For Teachers and Faculty

| Benefit | Description |
|---------|-------------|
| Paperless Grade Entry | Enter and submit grades directly in the system — no more Excel files via USB |
| Digital Attendance | Record attendance once; reports are generated automatically |
| Class Communication | Post announcements and materials directly to student portals |
| Leave Management | File leave applications online; track approval status in real time |
| Payslip Access | View payslips and salary history without going to the HR office |

### 5.3 For Administrative Staff

| Benefit | Description |
|---------|-------------|
| Centralized Student Records | One place for enrolling, updating, and retrieving student data |
| Automated Financial Reports | Daily collection, aging, assessment, and year-end reports generated in seconds |
| Audit Trail | Every transaction is logged; easy to trace discrepancies |
| Enrollment Pipeline | Live view of how many students are in each enrollment stage |
| Reduced Paperwork | Document uploads replace physical submission of requirements |

### 5.4 For School Management and Administration

| Benefit | Description |
|---------|-------------|
| Real-Time Dashboard | See enrollment counts, collection totals, and pending actions at a glance |
| Compliance Readiness | System generates DepEd-required reports (Form 137, class rosters, grade sheets) |
| Financial Control | Double-entry accounting ensures accurate, auditable financial records |
| HR and Payroll Management | Manage all staff records, attendance, leaves, and payroll in one place |
| School Year Management | School year transitions, fiscal closing, and data rollover handled systematically |
| Data Security | Role-based access ensures each user sees only what their role permits |

### 5.5 Quantified Efficiency Gains (Estimated)

| Area | Before | After | Improvement |
|------|--------|-------|-------------|
| Enrollment processing per student | 20–30 minutes | 3–5 minutes | ~80% reduction |
| Monthly financial report preparation | 2–3 days | Instant (automated) | ~95% reduction |
| Grade consolidation per grading period | 1–2 weeks | Real-time | ~90% reduction |
| Payroll computation (50 staff) | 2–3 days | 1–2 hours | ~85% reduction |
| Balance inquiry (parent visiting school) | 15–30 minutes | Immediate (online) | ~100% elimination of in-person visits |
| Leave application cycle | 3–5 days (paper routing) | Same day (digital) | ~80% reduction |

---

## 6. Technology Stack

The system is built on a proven, modern web technology stack that balances performance, maintainability, and familiarity for local development and support.

### 6.1 Backend

| Component | Technology | Version |
|-----------|------------|---------|
| Language | PHP | 8.2 |
| Framework | Laravel | 12 (LTS-track) |
| Authentication | Laravel Sanctum | v4.3 (SPA token-based) |
| Database | MySQL / MariaDB | 8.0+ / 10.6+ |
| Queue / Jobs | Laravel Queue (database driver) | Built-in |
| File Storage | Laravel Storage (local / S3-compatible) | Built-in |
| Activity Logging | Spatie Activity Log | Latest |
| PDF Generation | Server-side via Laravel controller | — |

### 6.2 Frontend

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React | 18 |
| Language | TypeScript | 5+ |
| Build Tool | Vite | 8 |
| Styling | Tailwind CSS v4 + shadcn/ui | 4.2.1 |
| Component Library | @base-ui/react | 1.3 |
| Tables | @tanstack/react-table | v8 |
| Forms | react-hook-form + zod | — |
| State Management | Zustand + @tanstack/react-query | — |
| HTTP Client | Axios | — |
| Icons | Lucide React | — |

### 6.3 Infrastructure Options

| Deployment Type | Description | Recommended For |
|----------------|-------------|-----------------|
| **On-Premises** | Server installed at school; runs locally on LAN | Schools with reliable LAN; no internet dependency; full data control |
| **Cloud-Hosted** | Hosted on VPS (e.g., Contabo, DigitalOcean, Vultr) | Schools wanting remote access and off-site backups |
| **Hybrid** | Local server for daily operations; cloud backup and remote access via VPN | Best of both; recommended for larger schools |

### 6.4 Minimum Server Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | Dual-core 2.0 GHz | Quad-core 3.0 GHz |
| RAM | 4 GB | 8–16 GB |
| Storage | 100 GB HDD | 250 GB SSD |
| OS | Ubuntu 22.04 LTS / Windows Server 2019 | Ubuntu 22.04 LTS |
| PHP | 8.2 | 8.2+ |
| MySQL / MariaDB | 8.0 / 10.6 | MySQL 8.0 |
| Web Server | Apache 2.4 or Nginx | Nginx |

### 6.5 Client Device Requirements

- Any modern web browser: Chrome 100+, Firefox 100+, Edge 100+, Safari 15+
- No installation required on client devices
- Responsive design — works on phones, tablets, and desktops
- Minimum screen resolution: 360px wide (mobile), 1024px (desktop recommended)

---

## 7. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│   Web Browser (Desktop / Tablet / Mobile)              │
│   React + TypeScript + Tailwind CSS SPA                │
└────────────────────────┬────────────────────────────────┘
                         │  HTTPS / REST API
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    API LAYER                            │
│   Laravel 12 (PHP 8.2) — RESTful JSON API              │
│   Laravel Sanctum   │   Role Middleware                │
│   Controllers        │   Request Validation            │
│   Service Classes    │   Activity Logging              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    DATA LAYER                           │
│   MySQL 8.0 / MariaDB 10.6                             │
│   50+ normalized tables across all modules             │
│   Foreign key constraints & indexes                    │
│   Automated scheduled backups                          │
└─────────────────────────────────────────────────────────┘

Additional Components:
   ┌───────────────┐   ┌──────────────┐   ┌────────────────┐
   │ File Storage  │   │  Job Queue   │   │ Payment Gateway│
   │ (Local/S3)    │   │ (Async jobs) │   │ (PayMongo API) │
   └───────────────┘   └──────────────┘   └────────────────┘
```

---

## 8. User Roles & Access Control

The system implements strict **role-based access control (RBAC)**. Each user is assigned one role, and every API endpoint enforces role authorization.

| Role | Access Scope |
|------|-------------|
| **Administrator** | Full system access — all modules, all reports, all settings |
| **Registrar** | Student Information, Enrollment, Requirements, Class Management, Registrar Reports |
| **Encoder** | Student data entry (subset of Registrar access) |
| **Accounting Staff** | Assessments, Billing, Ledger, Reports, Chart of Accounts, Journal Entries |
| **Cashier** | Cashiering (payment entry), Receipts, Balance Inquiry |
| **HR** | HRMS, Leave Management, Attendance, Payroll |
| **Teacher** | Teacher Portal (own classes only), Grade Entry, Attendance, Flashcards, Materials |
| **Librarian** | Library module (book catalog, borrowings, overdue tracking) |
| **School Nurse** | Clinic module (health records, visits, incidents) |
| **Front Desk** | Front Office module (visitor log, gate passes, correspondence) |
| **Custodian** | Custodian module (property, consumables, facilities, inventory checks) |
| **Student** | Student Portal (own data only: grades, balance, materials, health record) |
| **Parent** | Parent Portal (children's data: grades, balance, payments, enrollment) |
| **Applicant** | Applicant Portal (own application: status, requirements, exam schedule) |

---

## 9. Implementation Requirements

### 9.1 Hardware Requirements

#### Server (On-Premises Deployment)

| Component | Minimum Specification | Notes |
|-----------|----------------------|-------|
| Computer / Server | Desktop PC or Rack Server | Dedicated machine recommended |
| Processor | 4-core CPU, 2.5 GHz+ | Intel Core i5 / AMD Ryzen 5 or better |
| Memory | 8 GB RAM | 16 GB for schools over 1,000 students |
| Storage | 256 GB SSD | SSD strongly preferred over HDD for database performance |
| Network | 100 Mbps LAN switch | Gigabit switch recommended |
| UPS | 1000 VA UPS | Protects against power interruptions |
| Backup Drive | External 1 TB HDD | For weekly backup copies |

#### Network Infrastructure

| Component | Requirement |
|-----------|-------------|
| LAN | Wired or wireless network covering all school offices |
| Client Devices | Existing staff computers or tablets; no new hardware required if already networked |
| Internet (Optional) | Required only for online payments (PayMongo), cloud backups, and remote access |

### 9.2 Software Requirements (Server)

| Software | Version | License | Notes |
|----------|---------|---------|-------|
| Ubuntu Server | 22.04 LTS | Free | Recommended OS |
| Nginx | 1.24+ | Free | Web server |
| PHP | 8.2 | Free | With extensions: pdo, pdo_mysql, mbstring, openssl, json, zip, gd, bcmath, curl |
| MySQL | 8.0 | Free (Community Edition) | Or MariaDB 10.6+ |
| Composer | 2.x | Free | PHP dependency manager |
| Node.js | 20 LTS | Free | For frontend build |
| PM2 | Latest | Free | Node process manager |
| Certbot / SSL | Latest | Free | Let's Encrypt SSL (for internet-facing deployment) |

### 9.3 Personnel Requirements

#### School-Side Personnel

| Role | Responsibility | Time Commitment |
|------|----------------|-----------------|
| IT Coordinator / System Administrator | Server maintenance, user account management, backup monitoring | 2–4 hours/week |
| Registrar | Data entry, enrollment processing, student record management | Full time (module use) |
| Cashier | Payment entry, receipt management, daily reconciliation | Full time (module use) |
| HR Officer | Personnel records, leave processing, payroll review | Full time (module use) |
| Subject Teachers | Grade entry, attendance, materials upload | Per grading period |
| School Nurse | Health records, clinic visit logging | As needed |
| Librarian | Book catalog, borrowing management | As needed |

#### System Developer / Vendor Support

| Service | Description |
|---------|-------------|
| Initial Setup | Server installation, application deployment, database migration |
| Training | Role-specific user training (3–5 sessions, approximately 2 hours each) |
| Go-Live Support | On-site or remote support during first week of live operation |
| Ongoing Support | Bug fixes, updates, and feature enhancements per agreement |

### 9.4 Data Preparation Requirements

Before going live, the school must prepare the following data in structured format (provided template):

| Data Set | Format | Estimated Effort |
|----------|--------|-----------------|
| Student master list (active) | CSV / Excel | 1–2 days |
| Historical student list (alumni, transferred) | CSV / Excel | Optional; 2–3 days |
| Fee structure (assessments, categories, particulars) | Input form / spreadsheet | 1–2 days |
| Staff and faculty list with employment details | CSV / Excel | 0.5–1 day |
| Library book catalog | CSV / Excel (ISBN optional) | Variable |
| School preferences (name, logo, address, school ID) | Direct input | 1 hour |
| Existing account balances / carry-over balances | Verified from existing records | 1–2 days |

### 9.5 Training Plan

| Session | Participants | Topics Covered | Duration |
|---------|-------------|----------------|----------|
| 1 — Admin Overview | School Head, IT Coordinator | System overview, school preferences, school year setup, user account management | 2 hours |
| 2 — Registrar Module | Registrar, Encoder | Student enrollment, class management, requirements, reports | 3 hours |
| 3 — Accounting & Cashiering | Accounting Staff, Cashiers | Assessments, billing, cashiering, receipts, reports, online payments | 3 hours |
| 4 — HR, Payroll & Attendance | HR Officer | Personnel, leaves, attendance, payroll computation, payslips | 3 hours |
| 5 — Support Modules | Nurse, Librarian, Front Desk, Custodian | Clinic, Library, Front Office, Custodian modules | 2 hours |
| 6 — Teacher Portal | All Teaching Staff | Grade entry, attendance, materials, flashcards, announcements | 2 hours |
| 7 — Student & Parent Portals | Selected student/parent representatives | Portal navigation, online payments, self-service features | 1.5 hours |

---

## 10. Implementation Roadmap

The system is delivered in phased releases to minimize disruption and allow gradual staff adoption.

### Phase 1 — Foundation & Core Admin (Weeks 1–2)

- [ ] Server hardware procurement and OS installation
- [ ] Application deployment and database setup
- [ ] School preferences configuration (name, logo, school year, semesters)
- [ ] User account creation for all staff roles
- [ ] Admin training (Session 1)

### Phase 2 — Student Information & Enrollment (Weeks 3–4)

- [ ] Student data migration from existing records
- [ ] Class sections and subjects setup
- [ ] Requirements configuration
- [ ] Fee structure setup (assessments, categories, particulars)
- [ ] Registrar and Encoder training (Session 2)
- [ ] Parallel run: new enrollees in system alongside existing process

### Phase 3 — Financial Management & Cashiering (Weeks 5–6)

- [ ] Opening balance migration (existing student balances)
- [ ] Discount and payment term configuration
- [ ] Chart of accounts setup (if GL is to be used)
- [ ] Online payment gateway configuration (PayMongo credentials)
- [ ] Accounting and Cashier training (Session 3)
- [ ] Parallel cashiering: receipt in both old and new system for 1 week

### Phase 4 — HR, Payroll & Attendance (Weeks 7–8)

- [ ] Department and position hierarchy setup
- [ ] Personnel data migration
- [ ] Salary settings and payroll templates configuration
- [ ] Statutory data entry (SSS, PhilHealth, Pag-IBIG, tax tables)
- [ ] Kiosk hardware setup (if RFID/PIN attendance is being used)
- [ ] HR training (Session 4)

### Phase 5 — Support Modules Go-Live (Week 9)

- [ ] Library catalog import
- [ ] Clinic health record setup
- [ ] Front Office and Download Center configuration
- [ ] Support staff training (Session 5)

### Phase 6 — Teacher & Student Portals (Weeks 10–11)

- [ ] Teacher accounts activated and class assignments verified
- [ ] Student and parent portal accounts provisioned
- [ ] Teacher training (Session 6)
- [ ] Student/parent orientation (Session 7)
- [ ] Online payment testing with pilot group

### Phase 7 — Full Go-Live & Stabilization (Week 12+)

- [ ] All old parallel processes discontinued
- [ ] System is the single source of truth for all operations
- [ ] Support hotline/ticket system activated
- [ ] Performance monitoring and initial optimization
- [ ] Post-deployment review with school administration

**Total Estimated Timeline: 10–14 weeks** (depending on school size and data readiness)

---

## 11. Data Migration Plan

### 11.1 Migration Strategy

All existing school data will be migrated before go-live. The migration follows a structured process to ensure data accuracy and completeness.

**Step 1 — Data Audit:** Review existing records (Excel files, paper forms, old system exports) and identify data quality issues.

**Step 2 — Data Cleaning:** Correct duplicates, fill missing fields, standardize formats (e.g., date formats, name capitalization).

**Step 3 — Template Population:** Fill standardized CSV import templates provided by the system developer.

**Step 4 — Staged Import:** Import data in logical order: School Year → Sections/Classes → Students → Staff → Financial Records.

**Step 5 — Verification:** Run data verification reports; school staff spot-check a random sample.

**Step 6 — Sign-Off:** School registrar and principal sign off on migrated data before go-live.

### 11.2 Data That Can Be Migrated

| Data | Migration Method | Notes |
|------|-----------------|-------|
| Active student list | CSV bulk import | System provides template; supports up to 5,000 students per batch |
| Historical grades | Manual or CSV import | Verify format compatibility |
| Outstanding student balances | Manual entry / CSV import | Requires verified ledger from previous year |
| Staff/personnel records | CSV import | Supports photo upload post-import |
| Library book catalog | CSV import | ISBN-based or manual title entry |
| Assessment and fee structure | Form-based or developer-assisted | Requires school's current fee schedule |

### 11.3 Data That Cannot Be Automatically Migrated

- Physical documents (requires manual scanning and attachment to records)
- Data locked inside non-exportable legacy systems (requires manual re-entry)
- Hand-written records that have not been digitized

---

## 12. Security & Data Privacy Compliance

### 12.1 Security Measures

| Layer | Measure |
|-------|---------|
| Authentication | Token-based authentication (Laravel Sanctum); no password sent in plain text |
| Password Storage | Passwords hashed using bcrypt (minimum cost 10) |
| Role Authorization | Every API endpoint enforces role-based access; unauthorized requests return HTTP 403 |
| Input Validation | All inputs validated against strict rules before processing |
| Activity Logging | All significant actions (login, data changes, transactions) recorded with user and timestamp |
| SQL Injection Prevention | Laravel Eloquent ORM with parameterized queries; no raw string interpolation in queries |
| XSS Prevention | Output sanitized via React's virtual DOM on frontend; headers set on API |
| CSRF Protection | Sanctum SPA CSRF protection for browser-based requests |
| HTTPS | TLS/SSL enforced on all connections for internet-facing deployments |
| Backup Encryption | Database backups stored securely; access restricted to server administrators |

### 12.2 Data Privacy Act (Republic Act No. 10173) Compliance

The system is designed in alignment with the Philippine Data Privacy Act:

| Requirement | Implementation |
|-------------|---------------|
| Data minimization | Only necessary fields collected; personal data collected with purpose |
| Access control | Role-based access ensures only authorized personnel access sensitive data |
| Audit trails | All data access and modification events are logged |
| Data subject rights | Export and viewing capabilities for student/staff records upon request |
| Security safeguards | Technical (passwords, roles, HTTPS) and organizational (training, access revocation) measures in place |
| Data breach procedures | Activity logs and access records support breach investigation |

### 12.3 Backup Policy

| Backup Type | Frequency | Retention | Storage |
|------------|-----------|-----------|---------|
| Automated DB snapshot | Daily | 30 days rolling | Local server storage |
| Weekly full backup | Weekly | 3 months | External drive (school custody) |
| Manual backup (admin-triggered) | On-demand | Indefinite | Admin downloads via panel |

---

## 13. Support & Maintenance

### 13.1 Support Tiers

| Tier | Response Time | Coverage |
|------|--------------|---------|
| **Critical** (system down, data at risk) | Within 4 hours | 7 days/week |
| **High** (major feature unavailable) | Within 24 hours | Weekdays |
| **Normal** (non-blocking issue) | Within 3 business days | Weekdays |
| **Enhancement request** | Next release cycle | Per agreement |

### 13.2 Maintenance Services Included

- Bug fixes for reported issues
- Security patches as vulnerabilities are discovered
- Compatibility updates (PHP, MySQL, OS updates)
- Annual system health check
- Database performance optimization

### 13.3 Optional Add-On Services

| Service | Description |
|---------|-------------|
| New module development | Additional modules per school's unique requirements |
| SMS/Email notification integration | Automated messaging to parents and staff |
| Mobile app (iOS/Android) | Dedicated app for student and parent portals |
| DepEd EBEIS integration | Direct data export in DepEd EBEIS-compatible format |
| Biometric device integration | Support for fingerprint or face recognition hardware |
| Custom report generation | Bespoke reports per DepEd or school requirements |
| Cloud hosting setup and management | VPS provisioning, SSL, domain, and monitoring |
| Multi-campus support | Unified system across multiple school branches |

---

## 14. Return on Investment

### 14.1 Cost Drivers of the Current (Paper-Based) System

The following represents an estimated annual cost baseline for a school with 500 students and 50 staff:

| Cost Area | Estimated Annual Cost |
|-----------|----------------------|
| Paper, printing, and consumables (receipts, forms, reports) | ₱30,000 – ₱60,000 |
| Overtime pay for manual report preparation | ₱24,000 – ₱60,000 |
| Errors and re-processing (wrong billing, duplicate records) | ₱10,000 – ₱30,000 |
| Third-party payroll service (if outsourced) | ₱24,000 – ₱60,000 |
| Productivity loss from inefficient processes | Unquantified; estimated at 20–30% of admin staff time |
| **Total (estimated)** | **₱88,000 – ₱210,000/year** |

### 14.2 System Benefits in Financial Terms

| Benefit Area | Estimated Annual Savings |
|-------------|------------------------|
| Eliminated paper-based receipts and forms | ₱30,000 – ₱50,000 |
| Eliminated manual payroll computation labor | ₱24,000 – ₱48,000 |
| Reduced overtime for report preparation | ₱20,000 – ₱40,000 |
| Reduced billing errors and adjustments | ₱10,000 – ₱25,000 |
| Online payment collection fees paid by payor (not school) | Net neutral to positive |
| Reduced physical storage for records | ₱5,000 – ₱15,000 |
| **Total (estimated)** | **₱89,000 – ₱178,000/year** |

### 14.3 Non-Financial Benefits

- Improved parent satisfaction and trust through transparent, accessible online services
- Faster enrollment turnaround improves school capacity and reduces lost enrollees
- Compliance readiness reduces risk of DepEd audit findings
- Institutional knowledge retained in the system (not in individual employees' files)
- Competitive advantage over schools that still operate manually — increasingly a factor in family school choice

---

## 15. Conclusion

The **Integrated School Management Information System** is not merely a software tool — it is a digital transformation of how your school operates. By consolidating 21 functional modules into one coherent, reliable, and actively maintained platform, the system enables your school to:

- Serve students and parents better through self-service portals and online payments
- Operate administrative processes faster, with fewer errors and less paper
- Maintain accurate, auditable financial records compliant with DepEd requirements
- Manage your human resources and payroll efficiently in one place
- Protect sensitive student and staff data with modern security practices

The system has been **built and proven in a real school environment**, developed iteratively based on actual operational needs. It is backed by **232 automated tests** ensuring every feature works reliably — a level of quality assurance rarely found in custom school software.

We invite your school's administration to schedule a live demonstration and begin the conversation about implementation.

---

**Contact Information**

| | |
|-|-|
| **Developer** | Emilio B. Magtolis Jr. |
| **System** | Integrated School Management Information System (School MIS) |
| **Built For** | Basic Education Institutions — Nursery to Grade 12 |
| **Platform** | Web-based (Laravel 12 / React 18) |

---

*This proposal document is confidential and intended solely for the school administration of the recipient institution. All system features, designs, and architectural details described herein are proprietary.*
