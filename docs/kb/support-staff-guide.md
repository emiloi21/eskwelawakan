# Support Staff Guide
## School MIS — Knowledge Base

**Roles Covered:** School Nurse, Librarian, Front Desk Staff, Custodian  
**Login URL:** `/login`

---

## Table of Contents

### Module: Clinic & Health Records (School Nurse)
1. [Role Overview — School Nurse](#role-overview--school-nurse)
2. [Workflow N1 — Setting Up a Student Health Profile](#workflow-n1--setting-up-a-student-health-profile)
3. [Workflow N2 — Recording a Clinic Visit](#workflow-n2--recording-a-clinic-visit)
4. [Workflow N3 — Logging a Health Incident or Emergency](#workflow-n3--logging-a-health-incident-or-emergency)
5. [Workflow N4 — Updating Vaccination Records](#workflow-n4--updating-vaccination-records)

### Module: Library Management (Librarian)
6. [Role Overview — Librarian](#role-overview--librarian)
7. [Workflow L1 — Managing the Book Catalog](#workflow-l1--managing-the-book-catalog)
8. [Workflow L2 — Processing a Book Borrowing](#workflow-l2--processing-a-book-borrowing)
9. [Workflow L3 — Processing a Book Return](#workflow-l3--processing-a-book-return)
10. [Workflow L4 — Managing Overdue Books](#workflow-l4--managing-overdue-books)

### Module: Front Office Management (Front Desk)
11. [Role Overview — Front Desk](#role-overview--front-desk)
12. [Workflow F1 — Logging a Visitor Check-In](#workflow-f1--logging-a-visitor-check-in)
13. [Workflow F2 — Visitor Check-Out](#workflow-f2--visitor-check-out)
14. [Workflow F3 — Issuing a Gate Pass for a Student](#workflow-f3--issuing-a-gate-pass-for-a-student)
15. [Workflow F4 — Gate Pass Return](#workflow-f4--gate-pass-return)
16. [Workflow F5 — Recording Correspondence](#workflow-f5--recording-correspondence)

### Module: Custodian & Property Management (Custodian)
17. [Role Overview — Custodian](#role-overview--custodian)
18. [Workflow C1 — Managing School Property (Assets)](#workflow-c1--managing-school-property-assets)
19. [Workflow C2 — Managing Consumable Supplies](#workflow-c2--managing-consumable-supplies)
20. [Workflow C3 — Processing Supply Requests from Staff](#workflow-c3--processing-supply-requests-from-staff)
21. [Workflow C4 — Facility Booking Management](#workflow-c4--facility-booking-management)
22. [Workflow C5 — Conducting a Physical Inventory Count](#workflow-c5--conducting-a-physical-inventory-count)
23. [Clearance Management — All Offices](#clearance-management--all-offices)

---

---

## Module: Clinic & Health Records

---

## Role Overview — School Nurse

**Access Level:** Clinic module only — student health profiles, clinic visit logs, health incidents  
**Purpose:** Maintain a complete and accurate medical record for every student, log clinic visits during the school day, and document health incidents that occur on school premises.

**Depends on:**
- Registrar has enrolled students (student records must exist before health profiles can be created)

**Provides data to:**
- Student Portal (own health record view)
- Administrator (incident reports)

---

## Workflow N1 — Setting Up a Student Health Profile

**When to do this:** During enrollment season or when a new student is admitted. Every enrolled student should have a health profile before the school year begins.

**Navigate to:** Clinic → Students → [Student] → Health Profile → Create / Edit

---

### Step N1.1 — Enter Basic Health Information

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Blood Type | A, B, AB, O (+ or –) | Critical for emergency blood transfusions |
| Height | In centimeters | Tracked annually to monitor growth; required for DepEd mandatory health records |
| Weight | In kilograms | Same as above; also used to flag underweight/overweight students for nutrition programs |
| Vision | Specify if normal, nearsighted, farsighted, or wears glasses | Helps teachers seat students appropriately |
| Hearing | Normal / Mild / Moderate loss | Same; also alerts for listening accommodations |
| PhilHealth Number | PhilHealth ID number if available | For referral paperwork and hospitalization coordination |

---

### Step N1.2 — Enter Medical Conditions and Allergies

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Known Medical Conditions | e.g., Asthma, Diabetes, Epilepsy, Hypertension | Alerts nurse and teachers during emergencies; guides treatment decisions |
| Allergies | Food (nuts, seafood), medication (penicillin), environmental (dust) | Prevents accidental exposure; critical for clinic first aid |
| Current Medications | e.g., "Takes Singulair for asthma daily" | Affects what the school can administer; prevents drug interactions |

> **These fields are critical.** An incomplete allergy record can result in the nurse administering a medication that causes a life-threatening reaction. Always verify with the parent/guardian form submitted at enrollment.

---

### Step N1.3 — Record Vaccination History

**Navigate to:** Clinic → Students → [Student] → Health Profile → Vaccinations → Add

| Field | What to Enter |
|-------|---------------|
| Vaccine Name | e.g., MMR, Flu Vaccine, HPV, COVID-19 |
| Date Administered | Date of vaccination |
| Batch/Lot Number | From the vaccine vial (for traceability in case of adverse events) |
| Administered By | e.g., School Nurse, Parent Doctor, DOH |

---

## Workflow N2 — Recording a Clinic Visit

**When to do this:** Every time a student visits the clinic during school hours, no matter how minor.

**Navigate to:** Clinic → Visit Log → Add Visit

---

### Step N2.1 — Identify the Student

Search for the student by name or ID. The student's health profile (conditions, allergies, medications) is automatically displayed alongside the visit form — review it before proceeding.

---

### Step N2.2 — Record the Visit Details

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Date & Time | Auto-filled; adjust if recording retroactively | Timestamps create an accurate timeline of frequency of visits per student |
| Complaint | Student's stated reason for the visit (e.g., "headache", "stomach pain", "sprained ankle") | Documents the presenting problem |
| Vital Signs | Temperature, blood pressure, pulse rate, O₂ saturation (as applicable) | Objective measurements that guide clinical decisions; essential for follow-up comparisons |
| Assessment / Diagnosis | Nurse's clinical assessment | Documents the nurse's professional judgment |
| Treatment Given | Medications administered, first aid performed | Accountability; informs parents of what was given |
| Medications | Name and dosage | Avoids double-dosing; parent may ask what was given |
| Disposition | Returned to class / Sent home / Referred to doctor / Hospital referral | Records the outcome of the visit |
| Notes | Additional observations | Any other relevant information |

---

### Step N2.3 — Notify the Teacher or Parent if Needed

If the student is being sent home:
1. Contact the parent/guardian using the contact number on file in the student record.
2. Document the parent notification in the visit notes (e.g., "Parent notified at 10:30 AM via call; father will pick up").
3. Issue a gate pass through the Front Office (see Workflow F3).

---

## Workflow N3 — Logging a Health Incident or Emergency

**When to do this:** When a student experiences an allergy attack, seizure, injury, or any serious health event on school premises.

**Navigate to:** Clinic → Incidents → Add Incident

---

### Step N3.1 — Record Incident Details (as soon as situation is stabilized)

| Field | What to Enter |
|-------|---------------|
| Incident Type | Allergic Reaction / Seizure / Injury / Emergency / Other |
| Date & Time | Exact time the incident occurred |
| Location | Where on school grounds (e.g., classroom, gymnasium, canteen) |
| Description | Detailed narrative of what happened |
| Immediate Action Taken | First aid given; emergency services called (y/n) |
| Outcome | Student returned to class / Sent home / Referred to hospital |
| Witness(es) | Names of staff or students who witnessed the incident |
| Parent Notified | Yes/No; if yes, time and how |

> **Documentation protects the school.** A detailed, timestamped incident report is the school's legal record in case of parent complaints, insurance claims, or DOH inquiries. Undocumented incidents create serious liability.

---

## Workflow N4 — Updating Vaccination Records

**When to do this:** After a school-based immunization drive, or when a student submits a vaccination card showing new immunizations.

**Navigate to:** Clinic → Students → [Student] → Health Profile → Vaccinations → Add

Add each new vaccine with the date administered and batch number. For school-based drives:
- Record the same batch/lot number for all students immunized from the same vial
- Note the DOH/RHU personnel who administered the vaccines

---

---

## Module: Library Management

---

## Role Overview — Librarian

**Access Level:** Library module only — book catalog, borrowing records, returns, overdue tracking  
**Purpose:** Maintain an organized book catalog, manage borrowing and return transactions, and track overdue books.

**Depends on:**
- Student records must exist (students are identified by their profile when borrowing)

---

## Workflow L1 — Managing the Book Catalog

**When to do this:** When adding new books, updating book details, or recording books as lost/damaged.

**Navigate to:** Library → Books → Add Book

---

### Step L1.1 — Add a Book to the Catalog

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Title | Full title of the book | Primary identifier in search |
| Author | Author name(s) | Used in catalog search and borrower reference |
| ISBN | International Standard Book Number (if available) | Unique identifier; helps when ordering replacements |
| Publisher | Publisher name | Reference for procurement |
| Year Published | Publication year | Helps assess relevance; older editions may be superseded |
| Category | e.g., Fiction, Science, Mathematics, Reference, Filipiniana | Organizes the catalog for browsing; required for reports |
| Copies Available | Total physical copies owned | The system tracks available copies by deducting active borrowings |
| Location | Shelf number or section | Helps staff and students find the book physically |

---

### Step L1.2 — Update Book Details

When a book is damaged or lost:

**Navigate to:** Library → Books → [Book] → Edit → Update Copies Available

Reduce the copies count accordingly. Add a note in the Description field (e.g., "1 copy lost, reported by borrower Juan Dela Cruz on April 5, 2026").

---

## Workflow L2 — Processing a Book Borrowing

**When to do this:** When a student or staff member checks out a book.

**Navigate to:** Library → Borrowings → Add Borrowing

---

### Step L2.1 — Identify the Borrower

Search for the borrower — either a **Student** (by name or student ID) or a **Staff** member (by name).

**Check for existing overdue books:** Before processing a new borrowing, check if the borrower has existing unreturned and overdue books. School policy typically restricts borrowing of additional books while overdue books remain outstanding.

---

### Step L2.2 — Record the Borrowing

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Borrower | Student or staff member | Establishes accountability for the book |
| Book | Search for the book by title or ISBN | Must be a book with at least 1 available copy |
| Borrow Date | Today's date (auto-filled) | Establishes the start of the loan period |
| Due Date | Auto-calculated based on the school's loan period (e.g., 7 days) | Sets the return deadline; basis for overdue computation |
| Copy Number | If books are individually numbered | Identifies the specific physical copy |

The system decrements the available copy count for the book.

---

## Workflow L3 — Processing a Book Return

**When to do this:** When a borrower returns a book.

**Navigate to:** Library → Borrowings → Active → [Borrower] → Mark as Returned

---

### Step L3.1 — Verify the Book

Before marking as returned:
1. Confirm the book covers and spine are intact.
2. Check for missing pages or damage beyond normal wear.
3. If damaged, note it in the return record.

---

### Step L3.2 — Record the Return

| Field | What to Enter |
|-------|---------------|
| Return Date | Today's date (auto-filled) |
| Condition | Good / Minor Damage / Major Damage / Damaged |
| Damage Notes | If condition is not "Good", describe the issue |
| Fine (if applicable) | Computed automatically if returned after due date |

The system restores the book's available copy count.

---

### Step L3.3 — Collect Library Fine (if overdue)

If the book is returned after the due date, the system computes the fine based on the school's fine-per-day rate (configurable in Library Settings).

Inform the borrower of the fine amount. Collect the fine in cash and issue a receipt, or direct them to the Cashier for official receipt processing.

---

## Workflow L4 — Managing Overdue Books

**Navigate to:** Library → Borrowings → Overdue List

This list shows all borrowings where the due date has passed and the book has not yet been returned.

---

### Step L4.1 — Follow Up with Borrowers

For each overdue record:
- Contact the borrower (student → contact via class teacher or Registrar's contact info; staff → direct contact)
- Request immediate return or provide a deadline

Document all follow-up attempts in the notes field of the borrowing record.

---

### Step L4.2 — Generate the Overdue Report

**Navigate to:** Library → Reports → Overdue Report

Print or export the overdue list. This can be:
- Shared with the Registrar to flag students for clearance purposes
- Submitted to the Principal for action on long-overdue books

---

---

## Module: Front Office Management

---

## Role Overview — Front Desk

**Access Level:** Front Office module — visitor log, gate passes, correspondence  
**Purpose:** Manage all school entry, maintain a verifiable log of all visitors, control student early departures through gate passes, and track incoming and outgoing official correspondence.

**Depends on:**
- Student records must exist (for gate pass issuance linked to a student)

**Why this module matters:** The front office is the school's security gateway. Proper logging of visitors and gate passes protects students from unauthorized pickups and provides an auditable record for security incidents.

---

## Workflow F1 — Logging a Visitor Check-In

**When to do this:** Every time a non-student, non-staff person enters the school.

**Navigate to:** Front Office → Visitor Log → Add Visitor

---

### Step F1.1 — Collect Visitor Information

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Visitor Name | Full name | Identifies who was on campus |
| ID Type | Government ID / School ID / Company ID | Records the type of identification presented |
| ID Number | The ID number shown | Creates a traceable record in case of incidents |
| Purpose of Visit | e.g., "Parent meeting with Registrar", "Vendor delivery", "DECS/DepEd inspection" | Documents the reason for entry; helps verify legitimacy |
| Person to Visit | Staff name or office (e.g., "Registrar Office", "Mrs. Santos") | Creates accountability — the visited person is on record |
| Time In | Current time (auto-filled) | Establishes when the visitor entered |

---

### Step F1.2 — Issue a Visitor's Pass (Optional)

If the school uses printed visitor passes, note the pass number in the record. The visitor returns the pass upon exit.

---

## Workflow F2 — Visitor Check-Out

**When to do this:** When a logged visitor is leaving the school.

**Navigate to:** Front Office → Visitor Log → [Active Visitors] → Check Out

Find the visitor's log entry and click **Check Out**. Enter or confirm the time out.

Collect the visitor's pass if one was issued.

---

### Why check-out records matter:
A visitor log with only check-in times (no check-out) is an incomplete security record. Unchecked-out entries indicate either that a visitor is still on campus or that the log is not being maintained properly.

---

## Workflow F3 — Issuing a Gate Pass for a Student

**When to do this:** When a student needs to leave school premises before the regular dismissal time (early departure for any reason — medical, family emergency, appointment, etc.).

**Navigate to:** Front Office → Gate Passes → Issue Gate Pass

---

### Step F3.1 — Verify Authorization

Before issuing a gate pass, verify:
- The parent or guardian requesting the student's release is **the same person on file in the student record** (or an authorized representative)
- For unplanned pickups: call the registered guardian's number to confirm the authorization, especially if a different adult (e.g., aunt, neighbor) is doing the pickup
- Never release a student to an unverified person, regardless of their claim

---

### Step F3.2 — Record the Gate Pass

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Student | Search by name or ID | Links the gate pass to the official student record |
| Authorized Person | Name of the person picking up the student | Creates accountability |
| Relationship to Student | e.g., Mother, Uncle, Family Driver | Reference for verification |
| Reason for Early Departure | e.g., Medical appointment, Family emergency | Documents the purpose; required for reporting |
| Time Out | Current time | Records when the student left school grounds |
| Pass Number | Auto-generated or manually assigned | Physical pass given to student to show teachers on the way out |

---

### Step F3.3 — Notify the Student's Teacher

Contact the student's current class teacher (by phone, messenger, or personally) to release the student to the front gate. Do not release the student until the teacher confirms.

---

## Workflow F4 — Gate Pass Return

**When to do this:** When a student who was issued a gate pass returns to school the same day (rare, but applicable).

**Navigate to:** Front Office → Gate Passes → [Pass] → Mark Returned

Record the time the student returned and the person who accompanied them (if any).

---

## Workflow F5 — Recording Correspondence

**When to do this:** When the school receives or sends any official letter, memo, or document.

**Navigate to:** Front Office → Correspondence → Add

---

### Step F5.1 — Incoming Correspondence

| Field | What to Enter |
|-------|---------------|
| Type | Incoming |
| Date Received | Date the letter/package arrived |
| Sender | Organization or person name |
| Subject | Brief description of the content |
| Reference Number | The document's own reference number (from sender) |
| Addressed To | Which department or person it is addressed to |
| Date Forwarded | When it was forwarded to the recipient |
| Notes | Action taken or pending action |

---

### Step F5.2 — Outgoing Correspondence

| Field | What to Enter |
|-------|---------------|
| Type | Outgoing |
| Date Sent | Date the school sent the document |
| Recipient | Organization or person the document was sent to |
| Subject | Brief description |
| Reference Number | The school's own reference number for the document |
| Sent By | Staff member who signed or authorized the document |
| Delivery Method | Hand-delivered / Courier / Email / PhilPost |
| Notes | Tracking number or delivery confirmation |

---

---

## Module: Custodian & Property Management

---

## Role Overview — Custodian

**Access Level:** Custodian module — property, consumables, facilities, supply requests, inventory checks  
**Purpose:** Track all school assets and consumable supplies, manage facility bookings, process supply requests from staff, and conduct physical inventory counts.

---

## Workflow C1 — Managing School Property (Assets)

**When to do this:** When new equipment or furniture is acquired, or when existing property needs to be updated (repair, disposal, loss).

**Navigate to:** Custodian → Property → Add Property Item

---

### Step C1.1 — Register a New Asset

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Item Name | e.g., "Dell Laptop", "Ceiling Fan", "Steel Cabinet" | Identifies the asset |
| Category | e.g., Office Equipment, Furniture, Classroom Equipment | Groups items for reporting and inventory audits |
| Quantity | Number of units acquired | Basis for depreciation and stock tracking |
| Unit Cost | Purchase price per unit | Required for depreciation computation |
| Date Acquired | Purchase or transfer date | Starting point for depreciation schedule |
| Condition | New / Good / Fair / For Repair / Condemned | Current state of each unit |
| Location | Where the item is physically kept | Helps during physical inventory and loss prevention |
| Serial Number / Property Number | If assigned | Unique identifier for specific units; required for DepEd property records |

---

### Step C1.2 — Track Property Condition Changes

When an item is damaged, repaired, or condemned:

**Navigate to:** Custodian → Property → [Item] → Update Condition

Update the condition and add notes (e.g., "Monitor #003 cracked screen — sent to repair on April 5, 2026").

---

## Workflow C2 — Managing Consumable Supplies

**When to do this:** When tracking office supplies, cleaning materials, and other items that are used up and need restocking.

---

### Step C2.1 — Receiving New Stock (Stock-In)

**Navigate to:** Custodian → Consumables → [Item] → Add Stock-In

| Field | What to Enter |
|-------|---------------|
| Date Received | Receipt date |
| Quantity | Number of units received |
| Unit | e.g., pieces, reams, boxes |
| Source | e.g., Purchased from supplier, Donated, Transferred from another office |
| Reference | Purchase order number or delivery receipt number |

---

### Step C2.2 — Releasing Stock to Staff (Stock-Out)

**Navigate to:** Custodian → Consumables → [Item] → Add Stock-Out

| Field | What to Enter |
|-------|---------------|
| Date Released | Date the items were released |
| Quantity Released | How many units were given out |
| Released To | Department or staff name that received the items |
| Reference | Supply request reference number (links to supply request if one was filed) |

The system automatically deducts the released quantity from the running stock balance.

---

### Step C2.3 — Monitor Stock Levels

**Navigate to:** Custodian → Consumables → Stock Summary

Items approaching minimum stock levels are highlighted. This prompts the Custodian to initiate a procurement request before stock runs out.

---

## Workflow C3 — Processing Supply Requests from Staff

**When to do this:** Staff members (teachers, HR, accounting, etc.) submit a supply request from their portal. The Custodian reviews and fulfills it.

---

### Step C3.1 — View Pending Supply Requests

**Navigate to:** Custodian → Supply Requests → Pending

Each request shows:
- Requestor name and department
- Items requested with quantities
- Date submitted
- Urgency / Remarks

---

### Step C3.2 — Approve and Fulfill the Request

For each item requested:
1. Confirm the item is in stock.
2. If available: click **Approve and Fulfill**. The system posts a Stock-Out for the exact items released and marks the request as fulfilled.
3. If not available: click **Partially Fulfill** (release what you have) or **Decline** with a reason (e.g., "Out of stock — indent pending").

---

### Step C3.3 — Physical Release

The requestor or a designated representative picks up the items from the supply room. Both the Custodian and the recipient should acknowledge the release in the system or on a physical release slip.

---

## Workflow C4 — Facility Booking Management

**When to do this:** When a teacher, staff member, or department requests to use a school facility (gymnasium, AVR/conference room, computer laboratory, covered court, chapel).

---

### Step C4.1 — Add Facilities to the System

**Navigate to:** Custodian → Facilities → Add Facility

| Field | What to Enter |
|-------|---------------|
| Facility Name | e.g., "AVR (Audio-Visual Room)", "Computer Lab 1", "School Gymnasium" |
| Capacity | Maximum persons the facility can accommodate |
| Description | Features and equipment available in the facility |
| Is Available for Booking | Yes / No | Inactive facilities will not appear in the booking list |

---

### Step C4.2 — Review Booking Requests

**Navigate to:** Custodian → Bookings → Pending

Each booking request shows:
- Facility requested
- Requester name and department
- Requested date and time
- Purpose of use
- Expected number of attendees

---

### Step C4.3 — Approve or Decline Booking

- **Approve** — Marks the time slot as reserved; requestor receives confirmation notification
- **Decline** — Requestor is notified with the reason (e.g., "Facility already booked", "Facility undergoing maintenance")

> **Conflict checking:** The system prevents double-booking — two requests for the same facility at the same time. Only one can be approved; the other must be rescheduled.

---

## Workflow C5 — Conducting a Physical Inventory Count

**When to do this:** At the end of each school year, or upon instruction for audit purposes.

---

### Step C5.1 — Create an Inventory Check Task

**Navigate to:** Custodian → Inventory → Create Inventory Check

| Field | What to Enter |
|-------|---------------|
| Inventory Date | Date the count will take place |
| Scope | All property / Specific category / Specific location |
| Assigned To | Staff member or Custodian who will perform the count |

---

### Step C5.2 — Perform the Count

The assigned staff member receives the inventory task in their portal. They go through each item in the scope and record:
- Physical count (how many units are actually present)
- Condition of each unit

---

### Step C5.3 — Record Discrepancies

**Navigate to:** Custodian → Inventory → [Task] → Enter Count Results

For each item where the physical count differs from the system record:
- Record the actual count
- Note the discrepancy (shortage or surplus)
- Provide a reason if known (e.g., "2 units borrowed by Admin office", "1 unit condemned last quarter but not yet updated")

---

### Step C5.4 — Finalize and Adjust

After review and reconciliation:
- **Adjust system records** to match verified physical counts
- Generate the Inventory Count Report (Custodian → Inventory → Reports → Inventory Count Summary)
- Submit the report to the Administrator

---

---

## Clearance Management — All Offices

Clearance is shared across all support staff offices. Each relevant office is responsible for updating clearance status for students and employees assigned to their department.

**Navigate to:** [Your Module's section] → Clearance Queue

Or for the dedicated clearance view: (accessible depending on role assignment by Admin)

---

### How Clearance Works

When a student or employee applies for clearance (e.g., for graduation, transfer, employment separation):

1. A clearance record is created listing all required offices.
2. **Each office sees only the clearances relevant to them** — they can clear or return.
3. Once all offices mark the clearance as `Cleared`, the full clearance is complete.

---

### Clearing a Student or Employee

| Office | Common Grounds for Holding | Action When Cleared |
|--------|---------------------------|---------------------|
| **Accounting** | Outstanding school balance | When balance is zero or written off → mark Cleared |
| **Library** | Unreturned book or unpaid fine | When all books returned and fines paid → mark Cleared |
| **Clinic** | Unreturned clinic property | When all items returned → mark Cleared |
| **Registrar** | Missing required documents | When all docs received → mark Cleared |
| **Custodian** | Unreturned school equipment or property | When all items returned → mark Cleared |
| **HR** | Final payroll pending, unreturned office items (for employees) | When resolved → mark Cleared |

**Navigate to:** Your module → Clearance Queue → [Name] → Mark as Cleared / Return

Always document the reason if returning (not clearing). This appears in the student/employee's clearance record and is visible to the Administrator.
