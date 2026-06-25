# Teacher Guide
## School MIS — Knowledge Base

**Role:** Teacher  
**Access Level:** Teacher Portal — own classes only; grade entry, attendance, materials, flashcards, announcements, leave requests, payslip view  
**Login URL:** `/login`

---

## Table of Contents

1. [Role Overview](#role-overview)
2. [Workflow 1 — Navigating the Teacher Dashboard](#workflow-1--navigating-the-teacher-dashboard)
3. [Workflow 2 — Viewing My Classes and Class Rosters](#workflow-2--viewing-my-classes-and-class-rosters)
4. [Workflow 3 — Entering Student Grades](#workflow-3--entering-student-grades)
5. [Workflow 4 — Recording Attendance](#workflow-4--recording-attendance)
6. [Workflow 5 — Posting Class Announcements](#workflow-5--posting-class-announcements)
7. [Workflow 6 — Uploading Learning Materials](#workflow-6--uploading-learning-materials)
8. [Workflow 7 — Creating and Assigning Flashcard Sets](#workflow-7--creating-and-assigning-flashcard-sets)
9. [Workflow 8 — Using AI-Assisted Flashcard Generation](#workflow-8--using-ai-assisted-flashcard-generation)
10. [Workflow 9 — Reviewing Quiz Results and Analytics](#workflow-9--reviewing-quiz-results-and-analytics)
11. [Workflow 10 — Managing Advisees](#workflow-10--managing-advisees)
12. [Workflow 11 — Filing a Leave of Absence](#workflow-11--filing-a-leave-of-absence)
13. [Data Requirements Summary](#data-requirements-summary)

---

## Role Overview

The **Teacher** is responsible for the academic delivery side of the system:
- Entering and managing grades for their assigned classes
- Recording class attendance
- Distributing learning materials and announcements to students
- Building and assigning flashcard quizzes for their classes

A Teacher's access is strictly scoped to **their own assigned classes**. They cannot view other teachers' students, grades, or materials.

**Depends on (must be done first):**
- Administrator has activated the school year
- Registrar has created class sections and assigned the teacher as the subject teacher
- Students must be enrolled in a class before they appear in the teacher's roster

**Provides data to:**
- Student Portal (grades, attendance, materials, announcements)
- Parent Portal (child's grades, announcements, materials)
- Registrar (grades used for report cards and Form 137)
- Admin (grade completion tracking)

---

## Workflow 1 — Navigating the Teacher Dashboard

**Navigate to:** `/teacher` (after login)

The dashboard shows:
- **My Classes** — Quick count of classes assigned to this teacher
- **Pending Grade Submissions** — Classes with incomplete grade entries
- **My Advisees** — if this teacher is a class adviser, the advisee list is shown
- **Recent Announcements** — Announcements recently posted by the teacher or received system-wide
- **Upcoming Events** — School calendar events

**Supply Requests shortcut** — If the teacher needs supplies, the dashboard links to the Supply Request module (submit a request to the Custodian).

---

## Workflow 2 — Viewing My Classes and Class Rosters

**Navigate to:** Teacher → My Classes

This page lists every class section and subject combination assigned to this teacher for the active school year.

---

### Step 2.1 — Open a Class

Click on a class to view:
- **Class Roster** — Full list of enrolled students with status
- **Grade Summary** — Overview of which students have grades entered
- **Attendance Summary** — Attendance records for this class
- **Materials & Announcements** — Content uploaded for this class

---

### Step 2.2 — Export the Class Roster

Inside a class, click **Export Roster** to download a printable class list. This is useful for paper-based attendance before the teacher shifts to digital attendance recording.

---

## Workflow 3 — Entering Student Grades

**When to do this:** At the end of each grading period (quarterly or semestral), as mandated by the school's academic calendar.

**Data required:**
- Final computed grades per subject per student
- Active semester (set by Administrator)
- Grading period (1st Quarter, 2nd Quarter, etc.)

---

### Step 3.1 — Open the Grade Sheet

**Navigate to:** Teacher → My Classes → [Class Name] → Grades

The grade sheet shows all enrolled students in one list. Each student has an input cell for the current grading period.

---

### Step 3.2 — Enter Grades

Click on a student's grade cell and enter the final grade (numeric format, e.g., 88, 92, 75).

| Grade Range | Descriptor |
|-------------|-----------|
| 90–100 | Outstanding |
| 85–89 | Very Satisfactory |
| 80–84 | Satisfactory |
| 75–79 | Fairly Satisfactory |
| Below 75 | Did Not Meet Expectations |

**Why numeric grades (not letters):** The system stores numeric grades for precise computation of general averages, GPA calculations, and Form 137 entries. Descriptors are auto-generated from the numeric value.

---

### Step 3.3 — Save the Grade Sheet

Click **Save** after entering all grades for the period. Grades are saved in `draft` status — they are visible to the teacher but **not yet released to students**.

---

### Step 3.4 — Submit Grades for Release

After verifying all grades, click **Submit / Release Grades**.

- This makes grades visible in the **Student Portal** and **Parent Portal**
- Notifies students that their grades are available
- Flags this class as `Grades Submitted` in the Registrar's completion tracker

> **Do not submit grades until they are final.** Once submitted, grade changes require the teacher to contact the Registrar (Registrar only can unlock a grade for revision, with a reason logged for the audit trail).

---

### Step 3.5 — Handle Incomplete or Special Cases

For students with incomplete grades:

| Situation | Action |
|-----------|--------|
| Student was absent during the exam | Enter grade when the make-up exam is taken; indicate `INC` as a temporary marker |
| Student transferred out mid-year | Enter grades for the period they were enrolled; leave remaining periods blank |
| Grade correction needed after submission | Contact Registrar to unlock; document the reason |

---

## Workflow 4 — Recording Attendance

**When to do this:** At the start of each class session, or at least once per school day per class.

**Navigate to:** Teacher → My Classes → [Class] → Attendance → Take Attendance

---

### Step 4.1 — Select the Date

The system defaults to today's date. To record attendance for a past date (within the same week), select the date from the date picker.

---

### Step 4.2 — Mark Each Student

For each student in the roster, mark their attendance status:

| Status | Meaning |
|--------|---------|
| Present (P) | Student attended the class |
| Absent (A) | Student did not attend, no excuse |
| Late (L) | Student arrived after the start time |
| Excused (E) | Student was absent with an official excuse (medical certificate, parent note) |

---

### Step 4.3 — Save the Attendance Record

Click **Save**. The attendance record is permanent and timestamped. The Registrar and Admin can generate attendance summary reports from this data.

---

### Step 4.4 — View Attendance History

**Navigate to:** Teacher → My Classes → [Class] → Attendance → History

View attendance per student across all dates. Students with high absence rates are highlighted, allowing teachers to proactively follow up.

**Why attendance matters in the system:** DepEd requires attendance records per class section. The system generates certified attendance sheets that can be printed for DepEd inspection. Student attendance also factors into academic retention policies at the school level.

---

## Workflow 5 — Posting Class Announcements

**When to do this:** When informing students of an upcoming exam, a class activity, a deadline, changes in schedule, or any class-specific update.

**Navigate to:** Teacher → My Classes → [Class] → Announcements → Post Announcement

---

### Step 5.1 — Compose the Announcement

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Title | Short subject line, e.g., "3rd Quarter Exam Schedule" | Students see this as the notification header |
| Body | Full text of the announcement (rich text — supports bold, lists, links) | The message students and parents will read |
| Target Class | Pre-filled with the current class | Confirms the announcement goes to the right section |
| Pinned | Yes / No | Pinned announcements stay at the top of the student's announcement feed |

---

### Step 5.2 — Post the Announcement

Click **Post**. Students with active portal accounts receive an **in-app notification** immediately. Parents also see the announcement in the Parent Portal under their child's class activity.

---

### Step 5.3 — Edit or Delete an Announcement

Click **Edit** to correct an error. Click **Delete** to remove an announcement entirely (e.g., if a date is rescheduled and the old post is misleading). Deletion is logged in the activity log.

---

## Workflow 6 — Uploading Learning Materials

**When to do this:** When distributing any study material, reviewer, module, assignment sheet, or reference document to students.

**Navigate to:** Teacher → My Classes → [Class] → Materials → Upload Material

---

### Step 6.1 — Prepare the File

Supported file types:
- PDF (recommended for modules, reviewers, handouts)
- DOCX, PPTX (Office documents)
- Images (JPG, PNG — for reference charts, photos)
- Links (paste a URL to a YouTube video, Google Drive file, or external resource)

**Best practice:** Convert documents to PDF before uploading. PDFs display consistently across all devices and cannot be accidentally edited by students.

---

### Step 6.2 — Upload the Material

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Title | e.g., "Week 5 Reading — Cell Division" | Students see this as the material name in their portal |
| Description | Brief note on what the material is for | Context for students — e.g., "Review for Chapter 3 quiz on Friday" |
| File / Link | Upload file or paste URL | The actual content students will access |
| Visibility | Published / Draft | Draft materials are only visible to the teacher; published materials are visible to enrolled students |

---

### Step 6.3 — Notify Students

After uploading, post an Announcement (Workflow 5) to let students know the material is available. Students also receive an automatic notification when a new material is published.

---

## Workflow 7 — Creating and Assigning Flashcard Sets

**When to do this:** When creating a study tool for an upcoming exam, or for ongoing subject vocabulary/concept practice.

**Navigate to:** Teacher → Flashcards → Create New Deck

---

### Step 7.1 — Create the Deck

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Deck Title | e.g., "Chapter 4 — Photosynthesis Terms" | Students see this as the quiz name |
| Subject / Class | Assign to one or more classes | Controls which students can access the quiz |
| Description | What topic or chapter this deck covers | Context for students |

---

### Step 7.2 — Add Flashcard Items

For each card in the deck:

| Field | What to Enter |
|-------|---------------|
| Front (Question / Term) | The question, term, or prompt that appears face-up |
| Back (Answer / Definition) | The answer or definition shown when the card is flipped |
| Hint (Optional) | A clue for students who are struggling | 

Add as many cards as needed. A good quiz deck typically has 10–30 cards for focused study.

---

### Step 7.3 — Assign the Deck as a Quiz

After creating the deck, click **Assign to Class**:

| Field | What to Enter |
|-------|---------------|
| Target Class | Which class section(s) this quiz applies to |
| Mode | Practice (unscored, self-paced) or Quiz (scored, timed) |
| Deadline | Date by which students should complete the quiz |
| Time Limit (Quiz mode) | Maximum minutes allowed to complete |
| Max Attempts | How many times a student can take the quiz |

---

### Step 7.4 — Publish the Assignment

Click **Publish**. Students receive an in-app notification that a new quiz is available, with the deadline shown.

---

## Workflow 8 — Using AI-Assisted Flashcard Generation

**When to do this:** When you want to quickly generate a flashcard deck from a lesson topic or pasted text, without manually typing each card.

**Navigate to:** Teacher → Flashcards → Create New Deck → AI Generate

---

### Step 8.1 — Provide the Source

Choose one of:
- **Topic Input** — Type a topic (e.g., "The Water Cycle", "Quadratic Equations") and the AI generates relevant term/definition pairs
- **Text Paste** — Paste a paragraph or lesson text; the AI extracts key concepts and definitions

---

### Step 8.2 — Review and Edit Generated Cards

The AI returns a draft deck. **Always review each card before publishing.**

- Remove any incorrect or irrelevant cards
- Edit wording to match your teaching style and the school's terminology
- Add cards the AI may have missed from your lesson

> **Important:** AI-generated content is a starting point, not a finished product. You are responsible for the accuracy of all materials published to students.

---

### Step 8.3 — Save and Assign

Once satisfied, save the deck and follow Steps 7.3–7.4 to assign it to the class.

---

## Workflow 9 — Reviewing Quiz Results and Analytics

**When to do this:** After the quiz deadline has passed, to assess student performance.

**Navigate to:** Teacher → Flashcards → [Deck Name] → Results

---

### Step 9.1 — View Class Summary

The summary shows:
- Average score for the class
- Completion rate (how many students took the quiz)
- Highest and lowest scores
- Distribution chart (how many students scored in each range)

---

### Step 9.2 — View Individual Results

Click on a student's name to see:
- Their score and number of attempts
- Time taken to complete
- Which specific cards they answered incorrectly

**Using results to guide teaching:** If many students missed the same card, that concept likely needs to be revisited in class. The per-card error rate highlights knowledge gaps across the cohort.

---

### Step 9.3 — Export Results

Click **Export Results** to download a CSV with each student's score, attempt count, and completion date. This can be used as a reference when computing quarterly grades.

---

## Workflow 10 — Managing Advisees

**When to do this:** When a teacher is assigned as a class adviser.

**Navigate to:** Teacher → Advisees

The Advisees page shows all students in the teacher's advisory class with:
- Name and photo
- Enrollment status
- Current GPA (if grades have been submitted by subject teachers)
- Attendance summary

As adviser, use this view to monitor the holistic status of students in your care — identify students who may be struggling academically or have attendance concerns, and coordinate with the Registrar or counselor as appropriate.

---

## Workflow 11 — Filing a Leave of Absence

**When to do this:** Before taking any planned leave, or on the first day back after an emergency leave.

**Navigate to:** Teacher → Leave Application → File Leave

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Leave Type | Sick Leave / Vacation Leave / Emergency / Other | Determines which leave balance is deducted |
| Start Date | First day of absence | |
| End Date | Last day of absence | System calculates total leave days |
| Reason | Brief explanation | Required for HR records; made-up reasons create compliance risk |
| Supporting Document | Upload medical certificate (for sick leave) | Required by HR for sick leave of 2+ consecutive days |

**Why file in the system:** The HR module tracks leave balances per employee. Leave not filed in the system is not deducted from the balance, causing inaccurate payroll records. It also creates accountability — the HR officer can see patterns of absence for performance review purposes.

---

## Data Requirements Summary

| Workflow | Required Before Starting |
|----------|--------------------------|
| Grade Entry | Class sections created; students enrolled; active semester set |
| Attendance Recording | Students enrolled in the class |
| Announcements | Active class assignment |
| Materials Upload | Active class assignment; file or URL prepared |
| Flashcard Creation | None (independent) |
| Flashcard Assignment | Deck created; class assigned |
| AI Flashcard Generation | Topic or source text prepared; AI service accessible |
| Quiz Results | Quiz assigned; deadline passed (or sufficient submissions to review) |
| Leave Filing | Leave types configured by HR; own employee profile active in HRMS |
