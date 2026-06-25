# SVHS School Management System — Documentation Index

## Quick Links

| Document | Purpose | Audience |
|----------|---------|----------|
| [SYSTEM-PROPOSAL.md](SYSTEM-PROPOSAL.md) | Full system proposal (22 modules, architecture, testing plan) | Stakeholders / Dev Team |
| [TESTING-KB.md](TESTING-KB.md) | Test case reference and coverage notes | QA / Dev Team |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues and fixes | Dev Team / Support |
| [UI-UX-GUIDE.md](UI-UX-GUIDE.md) | Interface conventions and design guidelines | Dev Team / Designers |
| [test-login-creds.example.md](test-login-creds.example.md) | Template for local test credentials (copy to `test-login-creds.md`) | Dev Team |

## Knowledge Base (User Guides)

Role-specific step-by-step workflow guides:

| Guide | Description |
|-------|-------------|
| [kb/README.md](kb/README.md) | Master index — module dependency map and prerequisites |
| [kb/admin-guide.md](kb/admin-guide.md) | Administrator workflows |
| [kb/registrar-guide.md](kb/registrar-guide.md) | Registrar / Encoder workflows |
| [kb/accounting-guide.md](kb/accounting-guide.md) | Accounting / Cashier workflows |
| [kb/teacher-guide.md](kb/teacher-guide.md) | Teacher portal workflows |
| [kb/student-guide.md](kb/student-guide.md) | Student portal workflows |
| [kb/parent-guide.md](kb/parent-guide.md) | Parent / Guardian portal workflows |
| [kb/hr-guide.md](kb/hr-guide.md) | HR workflows |
| [kb/support-staff-guide.md](kb/support-staff-guide.md) | Nurse, Librarian, Front Desk, Custodian workflows |

## Project Structure

```
svhs-sms-revamped/
├── svhs-api/        Laravel 12 backend (PHP 8.2) — REST API, Sanctum auth
├── svhs-web/        React 18 + TypeScript + Vite frontend (SPA)
├── docs/            This documentation directory
└── db/              Database reference (svhs_sms20260304.sql schema snapshot)
```

> **Note:** The active database schema is managed via Laravel migrations in `svhs-api/database/migrations/`. The SQL file in `db/` is a March 2026 reference snapshot.
