# School MIS — Knowledge Base
## Comprehensive System Guide for All Users

**System:** Integrated School Management Information System  
**Version:** 1.0 — April 2026  
**Maintained by:** System Administrator / Developer

---

## How to Use This Knowledge Base

This knowledge base is organized **by user role**. Each guide explains:
- What the role is responsible for in the system
- Every major workflow, step by step
- **Why** each step is required
- **What data** must be prepared before starting each workflow
- Which other modules a workflow depends on

Find your role below and open the corresponding guide.

---

## Role Guides

| Role | Guide File | Modules Covered |
|------|-----------|-----------------|
| **Administrator** | [admin-guide.md](admin-guide.md) | School Setup, Users, School Year, Backups, CMS, Activity Log |
| **Registrar / Encoder** | [registrar-guide.md](registrar-guide.md) | Student Information, Enrollment, Classes, Requirements, Reports |
| **Accounting Staff / Cashier** | [accounting-guide.md](accounting-guide.md) | Assessments, Billing, Cashiering, Online Payments, GL, Fiscal Closing |
| **Teacher** | [teacher-guide.md](teacher-guide.md) | My Classes, Grades, Attendance, Materials, Announcements, Flashcards |
| **Student** | [student-guide.md](student-guide.md) | Dashboard, Grades, Ledger, Online Payment, Materials, Flashcards, Re-enrollment |
| **Parent / Guardian** | [parent-guide.md](parent-guide.md) | Child Overview, Grades, Payments, Re-enrollment, LMS Access |
| **HR Officer** | [hr-guide.md](hr-guide.md) | Personnel, Departments, Leave, Attendance, Payroll, Payslips |
| **School Nurse** | [support-staff-guide.md](support-staff-guide.md#module-clinic--health-records) | Clinic, Health Profiles, Visit Logs, Incidents |
| **Librarian** | [support-staff-guide.md](support-staff-guide.md#module-library-management) | Book Catalog, Borrowing, Returns, Overdue |
| **Front Desk** | [support-staff-guide.md](support-staff-guide.md#module-front-office-management) | Visitor Log, Gate Passes, Correspondence |
| **Custodian** | [support-staff-guide.md](support-staff-guide.md#module-custodian--property-management) | Property, Consumables, Facilities, Supply Requests, Inventory |

---

## Module Dependency Map

Understanding which modules supply data to others helps staff coordinate workflows:

```
School Year (Admin)
    │
    ├── Class Sections (Registrar)
    │       └── Student Enrollment (Registrar)
    │               ├── Fee Assessment Assignment (Accounting)
    │               │       └── Cashiering / Online Payments (Cashier)
    │               │               └── Student Ledger (Student/Parent view)
    │               ├── Grade Entry (Teacher)
    │               │       └── Report Card (Student/Parent view)
    │               ├── Learning Materials (Teacher → Student/Parent LMS)
    │               └── Clearance (all offices)
    │
    ├── Personnel / Staff (HR)
    │       ├── Kiosk Attendance (HR / Kiosk)
    │       └── Payroll (HR → Accounting GL)
    │
    └── School Year Closing (Admin + Accounting)
```

---

## System Access Points

| User Type | Login URL | Portal |
|-----------|-----------|--------|
| Administrator, Registrar, Accounting, HR, Teacher, Custodian | `/login` | Staff SPA |
| Student | `/portal-login` | Student Portal |
| Parent / Guardian | `/portal-login` | Parent Portal |
| Applicant | `/portal-login` | Applicant Portal |
| Kiosk Attendance | `/kiosk` | Public Kiosk (no login) |

---

## Before Using the System — Prerequisite Checklist

These items must be completed **in order** before the system is fully operational for a new school year. See the [Administrator Guide](admin-guide.md#workflow-1-initial-system-setup) for detailed steps.

1. ✅ School preferences configured (name, logo, address, contact)
2. ✅ Active school year created and activated
3. ✅ User accounts created for all staff
4. ✅ Grade levels and class sections set up
5. ✅ Student records imported or enrolled
6. ✅ Fee structure configured (assessments, categories, particulars)
7. ✅ Assessments assigned to enrolled students
8. ✅ Personnel records added (for HR/Payroll)
9. ✅ Library catalog loaded (for Librarian)
10. ✅ Online payment gateway configured (optional — for PayMongo)
