# Registrar / Encoder Guide
## School MIS — Knowledge Base

**Roles:** Registrar, Encoder  
**Access Level:** Student Information, Enrollment, Class Management, Requirements, Registrar Reports  
**Login URL:** `/login`

> **Encoder vs. Registrar:** Encoders have data entry access (add/edit student records and enrollment data) but cannot delete records, generate official reports, or perform year-end operations. All workflows below apply to the Registrar; steps marked **(Registrar only)** are not available to Encoders.

---

## Table of Contents

1. [Role Overview](#role-overview)
2. [Workflow 1 — Enrolling a New Student](#workflow-1--enrolling-a-new-student)
3. [Workflow 2 — Processing an Online Applicant](#workflow-2--processing-an-online-applicant)
4. [Workflow 3 — Re-Enrolling a Returning Student](#workflow-3--re-enrolling-a-returning-student)
5. [Workflow 4 — Managing Class Sections](#workflow-4--managing-class-sections)
6. [Workflow 5 — Tracking Student Requirements](#workflow-5--tracking-student-requirements)
7. [Workflow 6 — Generating Registrar Reports](#workflow-6--generating-registrar-reports)
8. [Workflow 7 — Year-End Promotion (Bulk Promote)](#workflow-7--year-end-promotion-bulk-promote)
9. [Workflow 8 — Managing Student Status](#workflow-8--managing-student-status)
10. [Workflow 9 — Bulk Student Import via CSV](#workflow-9--bulk-student-import-via-csv)
11. [Data Requirements Summary](#data-requirements-summary)

---

## Role Overview

The **Registrar** maintains the official student registry — every student profile, enrollment record, class assignment, and academic history. The Registrar also manages the enrollment pipeline from application to full enrollment and produces official reports such as Form 137, class rosters, and grade sheets.

**Depends on (must be done first):**
- Administrator has created and activated the School Year
- Administrator has created class sections for the grade levels

**Provides data to:**
- Accounting (enrolled students receive fee assessments)
- Teachers (class rosters are derived from enrollment)
- Student/Parent portals (enrollment status, schedule, academic history)

---

## Workflow 1 — Enrolling a New Student

**When to do this:** When a brand new student (never enrolled in this school before) is being admitted.

**Data required before starting:**

| Data Item | Source | Notes |
|-----------|--------|-------|
| Student's full name | Birth certificate or PSA document | Legal name required |
| Date of birth | Birth certificate | Must match PSA |
| Gender | Birth certificate | |
| LRN (Learner Reference Number) | Previous school records | Leave blank for nursery/new entrants if not yet assigned |
| Grade level to enroll into | Admission decision | |
| Section assignment | Class section list | Must exist in the system (see Workflow 4) |
| Guardian name and contact | Parent/guardian form | Used for portal account creation and emergency contact |
| Photo | Student ID photo or any recent photo | |
| School Year | Active school year | Set by Administrator |

---

### Step 1.1 — Create the Student Profile

**Navigate to:** Registrar → Students → Add Student

Fill in the **Basic Information** tab:

| Field | Why It Matters |
|-------|----------------|
| Last Name, First Name, Middle Name | Official name used on all documents — report cards, certificates, Form 137 |
| Date of Birth | Required for age-grade verification; used on Form 137 |
| Gender | Demographic reporting; DepEd data requirements |
| LRN | DepEd Learner Reference Number — used in all official DepEd submissions |
| Place of Birth | Required on Form 137 and enrollment certificate |
| Religion | Optional; used in school records |
| Civil Status | For senior high and adult learners |
| Nationality | Required for DepEd EBEIS reporting |

Fill in the **Address** tab:
- Home address is required — used for emergency correspondence and official records.

Fill in the **Guardian/Contact** tab:

| Field | Why It Matters |
|-------|----------------|
| Guardian Name | Person to contact in emergencies and for enrollment-related communication |
| Relationship | Father / Mother / Guardian — printed on school documents |
| Contact Number | Used for portal account SMS or direct contact |
| Email | Used to create the Parent portal account |

**Save the student profile** before proceeding. A student profile must exist before an enrollment record can be created.

---

### Step 1.2 — Create the Enrollment Record

After saving the profile, click **Enroll Student** or navigate to Registrar → Enrollment → Add.

| Field | What to Select | Why It Matters |
|-------|----------------|----------------|
| Student | Search and select the student created in Step 1.1 | Links enrollment to the student profile |
| School Year | Select the active school year | Enrollment is scoped per school year |
| Grade Level | Select grade level (Nursery through Grade 12) | Determines which fee assessment template will be assigned |
| Section | Select from available sections for the grade level | Determines which teacher's class roster this student appears in |
| Enrollment Status | Set to `For Assessment` initially | Triggers the Accounting team to assign fee assessments |
| Track / Strand (Grade 11–12 only) | STEM / ABM / HUMSS / etc. | Required for Senior High School enrollment; affects subject assignments |

---

### Step 1.3 — Notify Accounting for Fee Assessment

After the enrollment record is saved with status `For Assessment`, the Accounting team will see it in their queue to assign the appropriate fee template.

**Enrollment Status Flow:**
```
Applied → For Assessment → For Payment → Enrolled → Active
```

- `Applied` — Initial application received (online or walk-in)
- `For Assessment` — Student profile complete; waiting for fee assignment by Accounting
- `For Payment` — Fee assessment assigned; waiting for payment/or partial payment
- `Enrolled` — Payment requirements met; officially enrolled
- `Active` — Enrolled and attending classes

---

### Step 1.4 — Upload Student Photo

**Navigate to:** Registrar → Students → [Student] → Photo

Upload a clear ID-type photo. The photo appears in:
- The student's portal profile
- Printed report cards
- Student ID (if generated from the system)

---

## Workflow 2 — Processing an Online Applicant

**When to do this:** When a student has submitted an online application through the public-facing application portal (`/apply`).

---

### Step 2.1 — Review Applicant Queue

**Navigate to:** Registrar → Applicants

All online applications appear here with status `Pending`. Review each application's submitted details.

---

### Step 2.2 — Book an Entrance Exam Slot (if applicable)

**Navigate to:** Registrar → Exam Slots

Create exam slots with date, time, and capacity. Applicants can book a slot through their Applicant Portal. Confirm or reassign slots as needed.

---

### Step 2.3 — Evaluate and Accept the Application

After reviewing the application and (if applicable) exam results:

- **Accept** — Moves the applicant to `For Enrollment` status; the Registrar then creates a full student profile (Workflow 1) linked to this application.
- **Reject** — Informs the applicant through their portal that the application was not accepted.
- **Waitlist** — Holds the application pending slot availability.

---

### Step 2.4 — Convert Applicant to Enrolled Student

When the applicant is accepted, the system pre-fills the student profile fields from the application data. Review and complete any missing fields, then follow Workflow 1 Steps 1.2–1.4 to finalize enrollment.

---

## Workflow 3 — Re-Enrolling a Returning Student

**When to do this:** At the start of each new school year, when an existing student is continuing their studies.

**Data required:**
- List of returning students (typically all `Active` students from the previous year)
- New grade level and section assignments
- Active school year (must be set by Administrator)

---

### Step 3.1 — Bulk Promote (Year-End Promotion)

**(Registrar only)** Before re-enrollment, use the Year-End Promotion tool to advance the entire student cohort one grade level.

See [Workflow 7 — Year-End Promotion](#workflow-7--year-end-promotion-bulk-promote) for the detailed process.

---

### Step 3.2 — Student Self-Service Re-Enrollment (Alternative)

Students with active portal accounts can initiate their own re-enrollment:
1. Student logs into `/portal-login`
2. Navigates to Enrollment → Re-Enroll
3. Confirms their details and submits

The Registrar then reviews and confirms the re-enrollment, assigning sections as needed.

---

### Step 3.3 — Manual Re-Enrollment for Individual Students

**Navigate to:** Registrar → Enrollment → Add (or via student profile → Enroll)

Select the student, the new school year, their new grade level, and section. Set status to `For Assessment`. The process then follows the same flow as Workflow 1 Steps 1.2–1.4.

---

## Workflow 4 — Managing Class Sections

**When to do this:** Before enrollment opens, when the school finalizes its class section structure for the year.

**Data required:**
- School year (active)
- Grade level names (Nursery, Kinder, Grade 1–12)
- Section names (e.g., St. Vincent, St. Mary, Section A, Section B)
- Adviser assignment for each section
- Maximum class capacity per section

---

### Step 4.1 — Create Grade Levels

**Navigate to:** Registrar → Classes → Add Class

> In the system, "Classes" refers to class sections (a specific section of a specific grade level, e.g., "Grade 7 — St. Vincent, S.Y. 2026-2027").

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Grade Level | Nursery / Kinder / Grade 1–12 | Determines the student cohort and subject list |
| Section Name | e.g., St. Vincent | Identifies which section within the grade level |
| School Year | Active school year | Class only exists in the context of a school year |
| Adviser | Assign a teacher | Advisers see their class in the Teacher Portal under "Advisees" |
| Capacity | Maximum number of students | Prevents over-enrollment; system warns when a section is full |
| Track / Strand (Gr 11–12) | STEM / ABM / HUMSS / GAS / TVL | Required for Senior High School sections |

---

### Step 4.2 — Assign Students to Sections

Students are assigned to a section during the enrollment process (Step 1.2). You can also reassign a student to a different section:

**Navigate to:** Registrar → Students → [Student] → Edit Enrollment → Change Section

**Why section assignment matters:** Teachers see their class roster, enter grades, and post announcements based on section assignment. A wrong section means a student misses their teacher's materials and their grades appear in the wrong teacher's grade sheet.

---

## Workflow 5 — Tracking Student Requirements

**When to do this:** During and after enrollment, to track which required documents have been submitted.

**Common required documents:**
- PSA Birth Certificate
- Form 138 (Report Card from previous school)
- Good Moral Certificate
- 2×2 ID Photos
- Certificate of Baptism (for Catholic schools)
- Barangay Certificate (for some schools)

---

### Step 5.1 — Configure Required Documents

**Navigate to:** Registrar → Requirements → Configure (Registrar only)

Set up the list of required documents per grade level. This is typically done once at the start of the year and only updated if requirements change.

---

### Step 5.2 — Mark Requirements as Submitted

**Navigate to:** Registrar → Students → [Student] → Requirements

For each required document, mark it as:
- `Submitted` — Physical document received and on file
- `Pending` — Not yet submitted
- `Waived` — Officially excused (e.g., no birth certificate available yet with formal promise date)

---

### Step 5.3 — Monitor Outstanding Requirements

**Navigate to:** Registrar → Requirements → Outstanding Report

View all students with pending requirements. Use this report to generate follow-up lists for the school's communication with parents.

**Why tracking matters:** Unentered requirements create compliance gaps for DepEd inspections. The system's audit trail shows when each document was received and by whom.

---

## Workflow 6 — Generating Registrar Reports

**(Registrar only)**

**Navigate to:** Registrar → Reports

| Report | What It Contains | When to Use |
|--------|-----------------|-------------|
| **Class Roster** | List of enrolled students per section | Provide to teachers; submit to Principal at start of year |
| **Grade Sheet** | All subject grades per student per class | End of grading period; for consolidation |
| **Form 137 (SF10)** | Official permanent record per student | Upon graduation, transfer, or official DepEd request |
| **Enrollment Certificate** | Proof of enrollment for the current year | Student brings to bank, scholarship offices, etc. |
| **Enrollment Statistics** | Count of enrolled students by grade level and status | For school administration and DepEd EBEIS submission |
| **Requirements Report** | Students with incomplete requirements | Follow-up tool |

---

### Step 6.1 — Generate Form 137 / Enrollment Certificate

**Navigate to:** Registrar → Students → [Student] → Reports → Form 137 / Enrollment Certificate

The system generates a PDF pre-filled with the student's name, grade, section, school year, and academic history. Print and have the Registrar sign and stamp.

---

## Workflow 7 — Year-End Promotion (Bulk Promote)

**(Registrar only)**

**When to do this:** After all grades for the school year are finalized and before the new school year's enrollment opens.

---

### Step 7.1 — Verify Grade Completion

Before promoting, confirm all teachers have submitted final grades for all subjects. Use the Grade Completion Report (Registrar → Reports → Grade Completion).

---

### Step 7.2 — Run Bulk Promotion

**Navigate to:** Registrar → Year-End → Promote Students

1. Select the school year to promote **from** (current year).
2. Select the target school year to promote **into** (new year).
3. The system shows a preview of how many students per grade level will be promoted.
4. Confirm the promotion.

**What happens during promotion:**
- Students' grade level is incremented by one (Grade 7 → Grade 8, etc.)
- Grade 12 graduates are moved to status `Graduated`
- Students flagged as `Retained` (failed) are kept at the same grade level
- All students are set to `For Assessment` enrollment status in the new school year, awaiting fee assignment by Accounting
- Academic history for the completed year is preserved permanently

---

### Step 7.3 — Assign New Sections

After promotion, students must be assigned to new sections for the incoming year. This can be done:
- Individually via Registrar → Students → Edit Enrollment
- Via bulk section assignment tool (Registrar → Year-End → Assign Sections)

---

## Workflow 8 — Managing Student Status

**Navigate to:** Registrar → Students → [Student] → Edit → Status

| Status | When to Use | Effect |
|--------|-------------|--------|
| Active | Enrolled and attending | Normal portal access; appears in class rosters |
| Graduated | Completed Grade 12 | No longer active in enrollment; portal access retained for records |
| Transferred | Left before completing the year | Removed from class rosters; records preserved for Form 137 requests |
| On Leave | Official leave of absence | Temporarily removed from active rosters; resumes on return |
| Dropped | Did not complete enrollment or abandoned | Removed from active data; records preserved |

**Why status matters:** Teachers' class rosters show only Active students. Reports like enrollment statistics count only by status. Incorrect status creates misleading reports and affects school-wide enrollment counts.

---

## Workflow 9 — Bulk Student Import via CSV

**When to do this:** At the start of a new system deployment when migrating an existing student list, or when onboarding a large cohort.

**Navigate to:** Registrar → Import Students

---

### Step 9.1 — Download the CSV Template

Download the provided CSV template. Do not modify the column headers — the system uses exact header names for field mapping.

**Required columns in the template:**

| Column | Notes |
|--------|-------|
| last_name | Last name only |
| first_name | First name only |
| middle_name | Middle name (leave blank if none) |
| date_of_birth | Format: YYYY-MM-DD |
| gender | `Male` or `Female` |
| lrn | DepEd LRN — 12 digits; leave blank if not yet assigned |
| grade_level | Exact grade level name as configured in the system |
| section | Exact section name as configured in the system |
| guardian_name | Full name of primary guardian |
| guardian_contact | 11-digit mobile number |

---

### Step 9.2 — Prepare and Validate the Data

Before importing:
- Remove duplicate rows (same student appearing twice)
- Ensure all date values are in `YYYY-MM-DD` format
- Ensure grade level and section names match exactly what is in the system
- Ensure the CSV file encoding is UTF-8 (to support Filipino special characters like ñ)

---

### Step 9.3 — Upload and Preview

Upload the CSV file. The system shows a preview with validation highlights:
- **Green rows** — Valid and ready to import
- **Yellow rows** — Warning (e.g., duplicate LRN); review before importing
- **Red rows** — Error (missing required field); must fix in the CSV before importing

---

### Step 9.4 — Confirm Import

Click **Import** to process all valid rows. The system creates student profiles and enrollment records for each row. After import, review a sample of records to confirm accuracy.

---

## Data Requirements Summary

| Workflow | Required Before Starting |
|----------|--------------------------|
| New Student Enrollment | Active school year; class sections created; student personal data |
| Online Applicant Processing | Active school year; exam slot schedule (if applicable) |
| Re-Enrollment | Previous year records finalized; active school year set |
| Class Section Setup | Active school year; teacher accounts created; grade level configuration |
| Requirements Tracking | Requirements list configured; students enrolled |
| Reports | Students enrolled; grades submitted (for grade reports) |
| Year-End Promotion | All grades submitted; active new school year set |
| Bulk CSV Import | CSV template downloaded; data cleaned and validated; sections created |
