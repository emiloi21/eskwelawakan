# Accounting Staff & Cashier Guide
## School MIS — Knowledge Base

**Roles:** Accounting Staff, Cashier  
**Access Level:**  
- *Accounting Staff* — Full accounting module: assessments, billing, cashiering, ledger, GL, chart of accounts, journal entries, reports  
- *Cashier* — Payment entry, receipt generation, balance inquiry only  
**Login URL:** `/login`

> **Cashier vs. Accounting Staff:** A Cashier can record payments and print receipts but cannot configure fee structures, post journal entries, or run financial reports. Workflows marked **(Accounting Staff only)** are not visible to Cashiers.

---

## Table of Contents

1. [Role Overview](#role-overview)
2. [Workflow 1 — Setting Up the Fee Structure](#workflow-1--setting-up-the-fee-structure)
3. [Workflow 2 — Assigning Assessments to Students](#workflow-2--assigning-assessments-to-students)
4. [Workflow 3 — Processing an Over-the-Counter Payment](#workflow-3--processing-an-over-the-counter-payment)
5. [Workflow 4 — Validating an Online Bank Transfer Payment](#workflow-4--validating-an-online-bank-transfer-payment)
6. [Workflow 5 — Processing a Void or Refund](#workflow-5--processing-a-void-or-refund)
7. [Workflow 6 — NSF (Non-Student Fee) Cashiering](#workflow-6--nsf-non-student-fee-cashiering)
8. [Workflow 7 — Mass Transactions (Corporate Payments)](#workflow-7--mass-transactions-corporate-payments)
9. [Workflow 8 — Fiscal Year Closing](#workflow-8--fiscal-year-closing)
10. [Workflow 9 — General Ledger & Journal Entries](#workflow-9--general-ledger--journal-entries)
11. [Workflow 10 — Financial Reports](#workflow-10--financial-reports)
12. [Workflow 11 — Discount Codes Management](#workflow-11--discount-codes-management)
13. [Data Requirements Summary](#data-requirements-summary)

---

## Role Overview

The Accounting team is responsible for:
- Defining the school's fee structure (what each student owes)
- Assigning appropriate fees to enrolled students
- Collecting payments (counter and online)
- Maintaining the school's general ledger
- Producing financial reports for management
- Closing the fiscal year at the year's end

**Depends on (must be done first):**
- Administrator has created and activated the School Year
- Registrar has enrolled students and set them to `For Assessment` status
- Administrator has configured Bank Accounts (for online payment references)

**Provides data to:**
- Student Portal (ledger view, payment history, online payment options)
- Parent Portal (child's balance and payment history)
- Admin (financial reports, trial balance, fiscal year closing)

---

## Workflow 1 — Setting Up the Fee Structure

**(Accounting Staff only)**

**When to do this:** Once per school year, before assessments are assigned to students. Must be completed before the enrollment period opens.

The fee structure has three layers:
```
Assessment Group (template)
    └── Fee Category (e.g., Tuition, Miscellaneous, Books)
            └── Fee Particular (individual line item with amount)
```

---

### Step 1.1 — Create Fee Categories

**Navigate to:** Accounting → Categories → Add Category

Fee categories group related charges together on the student ledger.

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Category Name | e.g., Tuition Fee, Miscellaneous Fee, Laboratory Fee, Books, Uniforms | Categories appear as section headers on billing statements and receipts |
| Description | Brief explanation of what charges this category covers | Reference for staff; may appear on detailed billing printouts |
| Sort Order | Number controlling display sequence | Tuition typically appears first, followed by other fees |

**Common categories:**
- Tuition Fee
- Miscellaneous Fee
- Laboratory Fee (for Science subjects)
- Books and School Supplies
- Uniform / PE Uniform
- Technology Fee
- PTCA Contribution
- SHS Voucher Deduction (if applicable)

---

### Step 1.2 — Create Fee Particulars

**Navigate to:** Accounting → Particulars → Add Particular

Fee particulars are the individual line items within a category.

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Particular Name | e.g., Monthly Tuition, Registration Fee, Lab Manual | This exact name appears on receipts and ledger entries |
| Category | Assign to an existing category | Groups the charge under the correct category on billing statements |
| Amount | Base amount in Philippine Peso | Starting amount; can be adjusted per assessment assignment |
| Frequency | One-time / Monthly / Semestral / Annual | Determines how many times the charge appears per school year |
| Description | Additional notes | Internal reference |

---

### Step 1.3 — Create Assessment Groups (Templates)

**(Accounting Staff only)**

**Navigate to:** Accounting → Assessments → Add Assessment

An Assessment Group is a named template that bundles a set of fee particulars applicable to a specific grade level.

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Assessment Name | e.g., `Grade 7 Full Year 2026-2027` | Identifies the template when assigning to students |
| School Year | Active school year | Assessment templates are year-specific |
| Grade Level | Grade level this template applies to | Ensures the right fees are assigned to the right students |
| Particulars | Add each fee particular with confirmed amount | The final amounts here become what the student owes |

**Best practice:** Create one assessment template per grade level per school year. If sections within the same grade level have different fees (e.g., Science section has additional lab fees), create separate templates.

---

### Step 1.4 — Configure Payment Terms (Optional)

**Navigate to:** Accounting → Payment Terms → Add

Payment terms define installment schedules (e.g., "Pay 50% upon enrollment, balance by October").

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Term Name | e.g., Full Payment, Semi-annual, Monthly | Students select or are assigned a payment term |
| Due Dates | Dates when each installment is expected | Used to compute if a student's account is overdue |
| Discount for Full Payment | Amount or percentage (optional) | Incentivizes early full payment |

---

## Workflow 2 — Assigning Assessments to Students

**(Accounting Staff only)**

**When to do this:** After the Registrar sets students to `For Assessment` status.

---

### Step 2.1 — Batch Assessment Assignment

**Navigate to:** Accounting → Assessments → Assign

For each batch of students in the same grade level:

1. Select the **Assessment Group** (template created in Workflow 1).
2. Select the target student cohort (all Grade 7 students enrolled for SY 2026-2027, for example).
3. Review the list — verify no students are included in error.
4. Click **Assign** to apply the assessment to all selected students.

**What this does:** Creates individual ledger entries for each fee particular in the template for each student. These become the charges on the student's account.

---

### Step 2.2 — Manual Assessment for Individual Students

For a student with non-standard fees (e.g., transferee with partial year, student with a special payment arrangement):

**Navigate to:** Registrar → Students → [Student] → Ledger → Add Assessment → Add Individual Particular

Add line items manually with the agreed amounts.

---

### Step 2.3 — Apply Discounts

**Navigate to:** Accounting → Discounts → Assign to Student

| Discount Type | How It Works |
|--------------|-------------|
| Percentage Discount | Reduces specified particulars by a set percentage (e.g., 10% sibling discount on tuition) |
| Fixed Amount Discount | Removes a fixed peso amount from specified particulars (e.g., ₱2,000 scholarship award) |
| Discount Code | Student or parent enters a code during online payment; applies discount automatically |

---

### Step 2.4 — Update Enrollment Status to "For Payment"

After assessment is assigned, update the student's enrollment status:

**Navigate to:** Registrar → Students → [Student] → Enrollment → Change Status → For Payment

This signals to the Cashier that the student's fees are ready for collection.

---

## Workflow 3 — Processing an Over-the-Counter Payment

**When to do this:** Every time a student or parent makes a payment at the cashier's window.

**Data required:**
- Student name or ID (to look up the account)
- Amount tendered
- Payment method (cash, check, or card)

---

### Step 3.1 — Look Up the Student

**Navigate to:** Accounting → Cashiering → New Transaction

Search for the student by name or student ID. The system displays:
- Current balance
- Itemized list of unpaid charges (by particular, due date, and amount)

---

### Step 3.2 — Select Items to Pay

The cashier or the payor selects which line items to apply this payment to. The system supports:
- **Full payment** — Pay all outstanding charges
- **Partial payment** — Pay specific items only (e.g., pay tuition, skip laboratory fee)
- **Advance payment** — Record a payment in excess of current charges

**Why selecting items matters:** Payments are posted to specific ledger line items. This creates an accurate per-item payment history, which is critical for end-of-year reconciliation and for answering parent queries about exactly what was paid.

---

### Step 3.3 — Enter Payment Details

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Amount | Amount actually received | Must match tendered amount; system calculates change |
| Payment Method | Cash / Check / Card | Appears on the receipt; used in collection reports |
| Check Number (if check) | Bank check number | Required for check transaction audit trail |
| OR Number | Official Receipt number | Auto-generated or manually entered if using a receipt book in parallel |
| Remarks | Optional note | e.g., "advance payment", "partial payment per agreement" |

---

### Step 3.4 — Generate and Print the Receipt

Click **Post Transaction**. The system immediately:
1. Reduces the student's outstanding balance for the selected items
2. Generates an Official Receipt with OR number, date, school name, student name, and itemized payment details
3. Updates the Cashier's collection summary for the day

Print the receipt and give the original to the student/parent. The system retains a permanent digital copy.

---

### Step 3.5 — Update Enrollment Status (if fully paid)

When a student has paid the required enrollment fees, update their status to `Enrolled`:

**Navigate to:** Registrar → Students → [Student] → Enrollment → Change Status → Enrolled

---

## Workflow 4 — Validating an Online Bank Transfer Payment

**When to do this:** When a parent/student has submitted an online payment using bank transfer and uploaded a proof-of-payment screenshot.

---

### Step 4.1 — Open the Validation Queue

**Navigate to:** Accounting → Cashiering → Online Payments → Pending Validation

This queue shows all submitted bank transfer payments with:
- Student name
- Amount claimed
- Bank account used
- Submitted proof-of-payment image
- Submission timestamp

---

### Step 4.2 — Verify the Payment

1. Open the submitted proof-of-payment image.
2. Cross-check:
   - **Amount** matches what the parent declared
   - **Reference number** is unique and not previously used
   - **Recipient account** is the school's bank account
   - **Date** is recent (reject payments older than 7 days without authorization)

---

### Step 4.3 — Approve or Reject

- **Approve** — The system posts the payment to the student's ledger, sends a confirmation notification to the parent/student portal, and generates a receipt.
- **Reject** — The system notifies the parent/student with the rejection reason (e.g., "Amount does not match declared payment.").

> **Security note:** Never approve a payment without verifying the actual proof-of-payment image. Do not approve based on verbal or chat communication alone.

---

## Workflow 5 — Processing a Void or Refund

**(Accounting Staff only)**

**When to do this:** When a payment was entered in error, or when a student is entitled to a refund.

---

### Step 5.1 — Locate the Transaction

**Navigate to:** Accounting → Transactions → Search

Find the transaction by date, OR number, or student name.

---

### Step 5.2 — Request Void (within the same day)

Same-day transactions can be voided:

1. Click **Void** on the transaction.
2. Enter the reason for voiding (required for audit trail).
3. Confirm.

The transaction is marked voided, the balance is reversed, and the OR number is flagged as void in all reports.

---

### Step 5.3 — Process a Refund (previous-day transactions)

For transactions from previous days:

1. Navigate to Accounting → Refunds → Add Refund.
2. Link to the original transaction.
3. Enter the amount to refund (may be partial).
4. Enter the reason.
5. Submit for approval (Administrator must approve refunds above a threshold).

After approval, the refund is posted and a refund receipt is generated.

---

## Workflow 6 — NSF (Non-Student Fee) Cashiering

**When to do this:** When collecting fees from walk-in non-student payors — facility rental, library fines, ID replacement fees, certificates, etc.

**Navigate to:** Accounting → NSF Cashiering → New NSF Transaction

| Field | What to Enter |
|-------|---------------|
| Payor Name | Full name of the person paying |
| Purpose | e.g., Library Fine, Facility Rental, Certification Fee |
| Amount | Amount collected |
| Payment Method | Cash / Check |

An official receipt is generated. NSF collections are tracked separately from student fee collections in the daily collection report.

---

## Workflow 7 — Mass Transactions (Corporate Payments)

**(Accounting Staff only)**

**When to do this:** When a voucher-paying agency (e.g., DepEd for SHS Voucher, a company sponsoring employees' children) makes a single payment covering multiple students.

**Navigate to:** Accounting → Mass Transactions → Add

1. Enter the corporate payor name and total amount.
2. Add students to be covered by this payment.
3. Allocate amounts per student.
4. Post the transaction.

Each student's ledger is updated individually. A consolidated receipt is generated for the corporate payor, plus individual receipts for each student.

---

## Workflow 8 — Fiscal Year Closing

**(Accounting Staff only)**

**When to do this:** At the end of each academic/fiscal year, after all financial transactions for the year are finalized.

**Prerequisites:**
- All payment entries for the year are posted
- All void/refund requests are resolved
- Journal entries for the year are complete
- Trial balance reviewed and agreed

**This action is irreversible.** Confirm with the Administrator before proceeding.

---

### Step 8.1 — Run the Pre-Closing Report

**Navigate to:** Accounting → Reports → Year-End Summary

Review:
- Total collections for the year
- Outstanding student balances (these will roll forward)
- Any unposted journal entries

---

### Step 8.2 — Initiate Closing

**Navigate to:** Admin → School Years → [Active Year] → Close Fiscal Year (Administrator does this)

The system:
1. Locks all transaction posting for the closed year
2. Rolls outstanding student balances forward as opening balances in the new year
3. Posts closing journal entries (income and expense accounts → retained earnings)

---

### Step 8.3 — Verify Opening Balances in New Year

After closing, open the new school year's ledger and confirm that each student with a balance from the previous year now shows their balance as a carry-forward charge.

---

## Workflow 9 — General Ledger & Journal Entries

**(Accounting Staff only)**

**When to do this:** To record non-cashiering transactions (e.g., expenses, adjustments, bank transfers) in the double-entry ledger.

---

### Step 9.1 — Manage Chart of Accounts

**Navigate to:** Accounting → Chart of Accounts

The chart of accounts defines every account used in journal entries. Organize accounts in the standard structure:

| Account Type | Examples |
|-------------|---------|
| Asset | Cash on Hand, Bank Accounts, Accounts Receivable |
| Liability | Accounts Payable, Advance Tuition Received |
| Equity | School Fund, Retained Surplus |
| Revenue | Tuition Income, Miscellaneous Income |
| Expense | Salaries, Supplies, Utilities |

---

### Step 9.2 — Create a Journal Entry

**Navigate to:** Accounting → Journal Entries → Add

| Field | What to Enter |
|-------|---------------|
| Date | Transaction date |
| Reference | e.g., Check number, bank advice number |
| Description | Brief explanation of the transaction |
| Debit Lines | Account + amount |
| Credit Lines | Account + amount |

**Rule:** Total debits must equal total credits before the journal entry can be saved. The system enforces this validation.

---

### Step 9.3 — Post and Review

After saving, the journal entry is in `Draft` status. Review for accuracy, then click **Post**. Posted entries update the trial balance immediately.

To correct an error in a posted entry: post a **reversing journal entry** (do not edit posted entries directly — the audit trail must be preserved).

---

## Workflow 10 — Financial Reports

**(Accounting Staff only)**

**Navigate to:** Accounting → Reports

| Report | What It Shows | When to Use |
|--------|---------------|-------------|
| **Daily Collection Report** | All payments collected on a given day, by cashier | End of each day for cashier reconciliation |
| **Accounts Receivable (A/R) Aging** | Outstanding student balances grouped by age (current, 30, 60, 90+ days) | Monthly for collections management |
| **Assessment Summary** | Total assessed vs. collected vs. outstanding by grade level | Monthly or upon request |
| **Trial Balance** | All GL accounts with debit and credit totals | Before fiscal year closing |
| **Financial Statements** | Income Statement and Balance Sheet | Quarterly/annually for management |
| **Ledger per Student** | Complete transaction history for one student | For parent billing inquiries |
| **Payables Report** | Outstanding amounts owed by the school | Monthly for cash flow planning |

---

## Workflow 11 — Discount Codes Management

**(Accounting Staff only)**

**When to do this:** When setting up scholarship promotions, sibling discount programs, or any batch discount applied during online enrollment.

**Navigate to:** Accounting → Discount Codes → Add

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Code | e.g., `SCHOLAR2026` | Students enter this code during online payment |
| Discount Type | Percentage or Fixed Amount | Determines how the discount is calculated |
| Discount Value | e.g., 10 (for 10%) or 500 (for ₱500) | Amount deducted when code is applied |
| Applicable Particulars | Select which fee items the code applies to | Prevents codes from being applied to non-intended fees |
| Expiry Date | Date after which code is invalid | Prevents abuse after the promotion period |
| Max Uses | Maximum number of times the code can be used | Limits the financial exposure of a promotional code |
| Is Active | Yes / No | Inactive codes cannot be used |

---

## Data Requirements Summary

| Workflow | Required Before Starting |
|----------|--------------------------|
| Fee Structure Setup | Active school year; fee categories and particulars defined |
| Assessment Assignment | Students enrolled and set to `For Assessment`; assessment templates created |
| Over-the-Counter Payment | Assessment assigned to student; student enrolled |
| Online Transfer Validation | Proof-of-payment image submitted by parent/student |
| Void / Refund | Original transaction exists; reason documented |
| NSF Cashiering | Payor name and purpose known |
| Mass Transactions | List of students to credit; total amount and allocation |
| Fiscal Year Closing | All transactions posted; trial balance verified; Admin confirmation |
| Journal Entries | Chart of accounts set up; source document (invoice, bank advice) available |
| Discount Codes | Fee particulars defined; discount rules agreed by management |
