# Administrator Guide
## School MIS — Knowledge Base

**Role:** Administrator  
**Access Level:** Full system access — all modules, all reports, all settings  
**Login URL:** `/login`

---

## Table of Contents

1. [Role Overview](#role-overview)
2. [Workflow 1 — Initial System Setup](#workflow-1--initial-system-setup)
3. [Workflow 2 — Managing School Years](#workflow-2--managing-school-years)
4. [Workflow 3 — User Account Management](#workflow-3--user-account-management)
5. [Workflow 4 — School Year Closing & Fiscal Year End](#workflow-4--school-year-closing--fiscal-year-end)
6. [Workflow 5 — Database Backup & Restore](#workflow-5--database-backup--restore)
7. [Workflow 6 — CMS Management (School Website)](#workflow-6--cms-management-school-website)
8. [Workflow 7 — Bank Account Setup](#workflow-7--bank-account-setup)
9. [Workflow 8 — Activity Log Review](#workflow-8--activity-log-review)
10. [Data Requirements Summary](#data-requirements-summary)

---

## Role Overview

The **Administrator** is responsible for:
- Configuring the system before it is used by any other role
- Managing school year transitions
- Creating and deactivating user accounts for all staff
- Overseeing financial and operational reports
- Maintaining the school's public website (CMS)
- Monitoring all user activity through audit logs
- Performing database backups

> **Important:** Many workflows in other modules (Registrar, Accounting, HR) cannot proceed until the Administrator has completed the Initial Setup and activated a School Year. Always complete setup before granting access to other staff.

---

## Workflow 1 — Initial System Setup

**When to do this:** Once, when the system is first deployed, and again at the start of each new school year.

**Data required before starting:**
- School name, address, contact number, email
- School logo image file
- School year label (e.g., `2026-2027`)
- Semester structure (e.g., 1st Semester / 2nd Semester, or Quarterly)

---

### Step 1.1 — Configure School Preferences

**Navigate to:** Admin → School Preferences

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| School Name | Full official name of the school | Appears on all printed reports, receipts, report cards, and the public website |
| School Address | Complete address | Printed on official documents |
| Contact Number | School landline or mobile | Used on printed documents and portal contact info |
| School Logo | Upload PNG or JPG, ideally 200×200px | Appears on receipts, report cards, and the CMS homepage |
| School Year | e.g., `2026-2027` | All student records, assessments, and reports are scoped to the active school year |
| Active Semester | 1st Semester / 2nd Semester / Summer | Determines which semester grades and attendance apply to |

**Why this step is first:** Every printed document and portal page references school preferences. An incorrect school name on a receipt or report card is an official error that creates confusion and requires correction.

---

### Step 1.2 — Create a School Year Record

**Navigate to:** Admin → School Years (or via School Preferences → Manage School Years)

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| School Year Label | `2026-2027` | This is the identifier linked to all student enrollments, classes, grades, and financial records for that year |
| Fiscal Year Start Date | e.g., `June 1, 2026` | The accounting module uses this for journal entry periods and fiscal year closing |
| Fiscal Year End Date | e.g., `May 31, 2027` | Marks the end of the financial period; used in year-end closing |

**Why fiscal dates matter:** The accounting module runs a year-end closing process that rolls forward outstanding student balances and finalizes the general ledger. Without fiscal dates, this process cannot be automated correctly.

---

### Step 1.3 — Activate the School Year

After creating the school year record, click **Activate**.

- Only one school year can be active at a time.
- All new enrollments, grades, attendance records, and transactions will be tagged to the active school year.
- **Do not activate** a new school year until all records from the previous year are finalized — activation does not delete old data, but all new transactions will belong to the new year.

---

### Step 1.4 — Set the Active Semester

**Navigate to:** Admin → School Preferences → Semester

Select the current semester (1st Semester, 2nd Semester, or Summer).

- Grade entry by teachers is scoped to the active semester.
- Report cards generated will reflect grades for the active semester.
- Change this setting at the start of each semester period.

---

## Workflow 2 — Managing School Years

**When to do this:** At the start of each academic year, and during year-end transitions.

---

### Step 2.1 — Review Previous Year Status

Before creating a new school year:

1. Confirm all students have final grades entered by teachers.
2. Confirm the Accounting team has completed fiscal year closing (see [Accounting Guide — Workflow 8](accounting-guide.md#workflow-8--fiscal-year-closing)).
3. Confirm the Registrar has completed year-end promotion (see [Registrar Guide — Workflow 7](registrar-guide.md#workflow-7--year-end-promotion)).

**Why this matters:** Activating a new school year while the previous year's closing processes are incomplete will result in mixed data — new enrollments in one year, unfinished records in another.

---

### Step 2.2 — Create and Activate New School Year

Follow steps 1.2 and 1.3 above. The previous school year's data remains intact and accessible in all reports; it is simply no longer the active year.

---

### Step 2.3 — Update Semester Setting

Set the active semester to `1st Semester` at the start of the new school year.

---

## Workflow 3 — User Account Management

**When to do this:** When a new staff member joins, when a staff member leaves, or when a role changes.

**Data required:**
- Full name of the staff member
- Desired username (typically formatted as `firstname.lastname` or an abbreviated form)
- Assigned role (see role list below)
- Temporary password (staff will be advised to change it on first login)

---

### Step 3.1 — Create a New User Account

**Navigate to:** Admin → Users → Add User

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Full Name | Legal name of the staff member | Displays on activity logs, receipts, and report headers |
| Username | Unique login identifier | Used for authentication; must not duplicate existing usernames |
| Role | Select from list below | Determines which modules and data the user can access |
| Password | Temporary password | Will be used for initial login — advise the user to change it |
| Status | Active | Inactive accounts cannot log in |

**Available Roles and Their Access:**

| Role | What They Can Access |
|------|---------------------|
| Administrator | Everything |
| Registrar | Student records, enrollment, classes, requirements, registrar reports |
| Encoder | Student data entry (read/add, no delete/admin actions) |
| Accounting Staff | Assessments, billing, ledger, GL, reports, journal entries |
| Cashier | Payment entry, receipts, balance inquiry only |
| HR | Personnel, departments, leaves, attendance, payroll |
| Teacher | Own classes, grade entry, attendance, materials, flashcards |
| Librarian | Library module only |
| School Nurse | Clinic module only |
| Front Desk | Front Office module only |
| Custodian | Custodian module (property, consumables, facilities, supply requests, inventory) |

> **Security principle:** Assign the minimum role needed. A cashier should not have Accounting Staff access; a teacher should not have Registrar access. This limits exposure in case of account compromise.

---

### Step 3.2 — Deactivate a User Account

When a staff member leaves, **do not delete their account** — deactivate it.

**Navigate to:** Admin → Users → Edit → Set Status to Inactive

**Why not delete?** All past activity logs, receipts, grade entries, and transactions reference the user account. Deleting the account would break audit trails and create orphaned data in reports.

---

### Step 3.3 — Reset a User's Password

If a staff member forgets their password:

**Navigate to:** Admin → Users → Edit → Set New Password

Communicate the temporary password to the user through a secure channel (face-to-face or internal message — not email if the account is not email-verified).

---

## Workflow 4 — School Year Closing & Fiscal Year End

**When to do this:** At the end of each academic and fiscal year, after all grades are submitted and all financial transactions are finalized.

**Prerequisites (must be done first):**
- [ ] All teacher grades submitted for all classes
- [ ] Registrar has completed year-end promotion
- [ ] Accounting staff has finalized all transactions for the year
- [ ] All void/refund requests resolved

---

### Step 4.1 — Verify Grade Completion

**Navigate to:** Registrar → Reports → Grade Completion Report

Check that all class sections show 100% grade submission. Follow up with teachers who have pending grades before proceeding.

---

### Step 4.2 — Initiate Fiscal Year Closing

**Navigate to:** Admin → School Years → [Current Year] → Close Fiscal Year

The system will:
1. Calculate outstanding balances for all active students
2. Roll forward any unpaid balance to become the opening balance for the next year
3. Post a journal entry closing all revenue and expense accounts to retained earnings (if GL is enabled)
4. Lock the fiscal year — no new transactions can be posted to it after closing

> **This action is irreversible once confirmed.** Ensure Accounting has reviewed the trial balance before proceeding.

---

### Step 4.3 — Activate New School Year

After closing is confirmed, create and activate the new school year following Workflow 2.

---

## Workflow 5 — Database Backup & Restore

**When to do this:** Before any major changes (school year closing, bulk imports, system updates), and on a scheduled basis.

---

### Step 5.1 — Manual Backup

**Navigate to:** Admin → Backups → Create Backup Now

The system exports a full SQL dump of the database. The file is downloadable from the admin panel.

**Best practice:** Download the backup file and store it on an external drive or cloud storage. On-server backups are lost if the server fails.

---

### Step 5.2 — Automated Backup Schedule

The system performs daily automated snapshots retained for 30 days. Review the backup log regularly to confirm scheduled backups are completing successfully.

---

### Step 5.3 — Restore from Backup

Restoring from backup is a developer-level operation. Contact the system developer if a restore is required. Do not attempt to import the SQL file without the developer's guidance, as it will overwrite all current data.

---

## Workflow 6 — CMS Management (School Website)

**When to do this:** Any time the school needs to publish a news article, update the event calendar, manage gallery albums, or change the homepage banner.

No technical knowledge is required — all content is managed through the admin panel.

---

### Step 6.1 — Publish a News Article

**Navigate to:** Admin → CMS → News → Add Article

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Title | Article headline | Auto-generates the URL slug for public sharing |
| Category | Announcement / Achievement / Events / General | Used to filter articles on the public website |
| Body | Full article text (rich text editor) | Main content displayed to readers |
| Excerpt | 1–2 sentence summary | Shown in article list cards on the public website |
| Cover Image | Upload a photo | Visual thumbnail displayed in news listings |
| Status | Draft / Published | Only published articles are visible to the public |

**Why drafts exist:** Writers can prepare and review articles before they go live. Set to Draft until reviewed; change to Published when ready to release.

---

### Step 6.2 — Manage the Events Calendar

**Navigate to:** Admin → CMS → Events → Add Event

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Title | Event name | Displayed on the public calendar |
| Start / End Date | Event dates | End date must be on or after start date; multi-day events span the range |
| Category | Enrollment / Examination / Holiday / Event | Used for color-coding on the calendar |
| Color Code | Hex color (e.g., `#16a34a`) | Visually distinguishes event types at a glance |
| Is Public | Yes / No | Internal events (staff meetings, faculty planning) can be hidden from the public |

---

### Step 6.3 — Manage Homepage Sliders

**Navigate to:** Admin → CMS → Sliders → Add Slide

Each slide is a full-width hero banner shown on the public homepage.

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Title | Main headline text | Largest text on the banner |
| Subtitle | Supporting text | Secondary message below the title |
| Background Image | Upload photo | If no image, the background color is used |
| Background Color | Hex color | Fallback color if no image |
| Text Alignment | Left / Center / Right | Controls layout of text and buttons on the slide |
| Button 1 Label + Link | e.g., "Enroll Now" → `/apply` | Calls-to-action for visitors |
| Button 2 Label + Link | Optional second CTA | Provides an alternative action |
| Is Active | Yes / No | Inactive slides are not displayed |
| Sort Order | Number (1, 2, 3...) | Controls the display sequence; drag-to-reorder also available |

---

### Step 6.4 — Manage Photo Gallery

**Navigate to:** Admin → CMS → Gallery → Add Album

Create an album first, then add photos to it.

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Album Title | e.g., "Graduation 2026" | Displayed on the public gallery page |
| Description | About the event | Context for viewers |
| Cover Image | Upload a representative photo | Thumbnail shown in the gallery listing |
| Event Date | Date the event took place | Displayed on the album page; used for sorting |

After creating the album, open it and use **Add Photos** to upload multiple images at once. Each photo can have an optional caption.

---

## Workflow 7 — Bank Account Setup

**When to do this:** Before the Cashier begins processing payments, or when the school adds a new bank account for receiving transfers.

**Navigate to:** Admin → Bank Accounts → Add

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Bank Name | e.g., BDO, BPI, UnionBank | Identifies the bank for cashier reference |
| Account Name | School's official account name | Printed on payment instructions sent to parents |
| Account Number | Bank account number | Parents use this when making bank transfers |
| Account Type | Savings / Checking | For cashier's reference |
| Is Active | Yes / No | Only active accounts appear in payment options |

**Why this is an Admin task:** Bank account details are sensitive and must only be managed by the Administrator to prevent unauthorized changes to payment routing information.

---

## Workflow 8 — Activity Log Review

**When to do this:** Routinely (weekly recommended), and immediately when an issue is reported.

**Navigate to:** Admin → Activity Log

The activity log records every significant action performed by any user:
- Login and logout events
- Record creation, updates, and deletions
- Payment entries and voids
- Grade submissions
- User account changes

**How to use the log:**

| Scenario | What to look for |
|----------|-----------------|
| Unauthorized data change suspected | Filter by record type and date; look for unexpected edits |
| Transaction discrepancy | Filter by cashier username and date; compare with receipt records |
| Teacher grade dispute | Filter by teacher username and grade entry date |
| Login audit | Filter by `login` action type; check for unusual hours or locations |

**Why this log exists:** The system is designed to be fully accountable. Every action is traceable to a specific user, date, and time. This protects both the school and the staff — if an error is reported, the log shows exactly who did what and when.

---

## Data Requirements Summary

| Workflow | Data Required Before Starting |
|----------|-------------------------------|
| Initial Setup | School name, address, logo, contact info |
| School Year | Year label, fiscal start and end dates |
| User Accounts | Full name, role, desired username |
| Year Closing | All grades final, all transactions posted |
| CMS News | Article text, cover image, category |
| CMS Events | Title, dates, category, visibility setting |
| CMS Sliders | Banner image or color, title, CTA links |
| Bank Accounts | Bank name, account name, account number |
