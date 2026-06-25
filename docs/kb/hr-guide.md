# Human Resources (HR) Guide
## School MIS — Knowledge Base

**Role:** HR Officer (Human Resources)  
**Access Level:** HRMS — Personnel, Departments, Positions, Leave Management, Attendance, Payroll, Payslips  
**Login URL:** `/login`

---

## Table of Contents

1. [Role Overview](#role-overview)
2. [Workflow 1 — Initial HR Setup](#workflow-1--initial-hr-setup)
3. [Workflow 2 — Adding a New Employee](#workflow-2--adding-a-new-employee)
4. [Workflow 3 — Managing Leave Requests](#workflow-3--managing-leave-requests)
5. [Workflow 4 — Attendance Management](#workflow-4--attendance-management)
6. [Workflow 5 — Kiosk Attendance System Setup](#workflow-5--kiosk-attendance-system-setup)
7. [Workflow 6 — Running Payroll](#workflow-6--running-payroll)
8. [Workflow 7 — Generating and Distributing Payslips](#workflow-7--generating-and-distributing-payslips)
9. [Workflow 8 — Posting Payroll to the General Ledger](#workflow-8--posting-payroll-to-the-general-ledger)
10. [Workflow 9 — Off-boarding an Employee](#workflow-9--off-boarding-an-employee)
11. [Data Requirements Summary](#data-requirements-summary)

---

## Role Overview

The **HR Officer** manages all personnel-related functions:
- Maintaining a complete personnel registry for all school employees
- Tracking leave balances and processing leave applications
- Recording and verifying daily attendance
- Computing and releasing payroll
- Generating payslips accessible to employees through the portal

**Depends on (must be done first):**
- Administrator has created an HR user account
- Administrator has activated the school year (affects payroll period scoping)

**Provides data to:**
- Teacher Portal (own leave balance, payslip view)
- Accounting / GL (payroll journal entries if GL integration is enabled)
- Kiosk (employee IDs and PINs for attendance scanning)

---

## Workflow 1 — Initial HR Setup

**When to do this:** Once, when the system is first configured, and when organizational changes occur (new departments, new positions, new statutory rates).

---

### Step 1.1 — Create Departments

**Navigate to:** HR → Departments → Add Department

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Department Name | e.g., Junior High School, Senior High School, Grade School, Administration | Groups employees for reporting and payroll segregation |
| Description | Brief description of the department's function | Reference documentation |

**Common departments for a basic education school:**
- Administration
- Registrar
- Accounting / Finance
- Grade School
- Junior High School
- Senior High School
- Property / Custodian
- Clinic / Health Services

---

### Step 1.2 — Create Leave Types

**Navigate to:** HR → Leave Types → Add Leave Type

| Field | What to Enter | Why It Matters |
|-------|---------------|----------------|
| Leave Type Name | e.g., Sick Leave, Vacation Leave, Emergency Leave, Maternity Leave, Paternity Leave | Determines which balance bucket is charged when an employee takes leave |
| Annual Days Allowed | e.g., 15 days for SL, 15 days for VL | Used to compute leave balances per employee per year |
| Is Paid | Yes / No | Paid leave carries no salary deduction; unpaid leave deducts the day's equivalent salary |
| Requires Documentation | Yes / No | If Yes, employee must upload a supporting document (e.g., medical certificate for sick leave) |

**Standard leave types in Philippine schools (RA 11210, CSC rules, and school policy):**

| Leave Type | Typical Allowance | Paid? |
|-----------|-------------------|-------|
| Sick Leave | 15 days/year | Yes |
| Vacation Leave | 15 days/year | Yes |
| Emergency Leave | 3–5 days/year | Yes |
| Maternity Leave | 105 days | Yes (with SSS benefit) |
| Paternity Leave | 7 days | Yes |
| Bereavement Leave | 3–5 days | Yes |
| Special Privilege Leave | 3 days | Yes |
| Leave Without Pay (LWOP) | Unlimited (with approval) | No |

---

### Step 1.3 — Configure Payroll Templates

**Navigate to:** HR → Payroll → Payroll Templates → Add Template

A payroll template defines what components go into a payroll computation: which earnings lines and which deduction lines.

| Component Type | Examples |
|---------------|---------|
| **Earnings** | Basic Salary, COLA (Cost of Living Allowance), Transportation Allowance, Teaching Overload |
| **Deductions** | SSS Contribution, PhilHealth Contribution, Pag-IBIG, Withholding Tax, Tardiness/Absence Deductions, Loan Repayments |

Create one template per employee classification (e.g., one for Teaching Staff, one for Non-Teaching Staff, one for Part-time Hours-based).

---

### Step 1.4 — Set Up Statutory Tables

**Navigate to:** HR → Payroll Settings → Statutory Deductions

Enter the current contribution schedules:

| Deduction | What to Configure |
|-----------|-----------------|
| **SSS** | Contribution table (salary bracket → SSS employee share + employer share) |
| **PhilHealth** | Premium rate (currently 5% of basic salary, split evenly; update as PHIC announces rate changes) |
| **Pag-IBIG** | Employee contribution rate (1% or 2% of salary depending on bracket) |
| **Withholding Tax** | BIR tax table (TRAIN Law rates; updated by BIR annually) |

**Why configuring this matters:** The system uses these tables to automatically compute deductions during payroll generation. Incorrect tables produce incorrect payslips and incorrect tax remittances — a serious legal and financial compliance issue.

---

## Workflow 2 — Adding a New Employee

**When to do this:** When a new staff member joins the school.

**Data required:**

| Information Category | Data Needed |
|---------------------|-------------|
| Personal | Full legal name, date of birth, gender, civil status, home address |
| Employment | Employee ID, employment type (Regular/Casual/Part-time/Contractual), date hired, department, position |
| Compensation | Monthly salary or daily rate, applicable payroll template |
| Government IDs | SSS number, PhilHealth number, Pag-IBIG number, TIN |
| Emergency Contact | Name, relationship, contact number |
| Bank Details | Bank name, account name, account number (for payroll crediting) |

---

### Step 2.1 — Create the Personnel Record

**Navigate to:** HR → Personnel → Add Personnel

Fill all tabs completely:

**Basic Information:**
- Full name, nickname, date of birth, gender, civil status, nationality
- Blood type (optional but recommended for emergency preparedness)
- Home address, personal email, personal mobile number

**Employment Details:**
- Employee ID (auto-generated or manually assigned based on school's format, e.g., `EMP-2026-025`)
- Department — select from departments created in Step 1.1
- Position / Job Title (e.g., Subject Teacher, Registrar, Cashier)
- Classification — Teaching Staff / Non-Teaching Staff
- Employment Type — Regular, Probationary, Part-time, Contractual
- Date of Employment — used to compute years of service and tenure-based benefits
- Date of Regularization (if applicable)

**Government Contributions:**
- SSS Number (required for SSS deduction computation)
- PhilHealth Number
- Pag-IBIG Number (HDMF)
- TIN (Tax Identification Number — required for withholding tax computation)

> **Why government IDs are required:** Payroll without these numbers cannot accurately compute deductions, and the school cannot correctly remit contributions to SSS, PhilHealth, and Pag-IBIG. Incorrect remittances lead to penalties.

**Salary Settings:**
- Basic Monthly Salary (for regular/probationary) OR Daily Rate (for part-time/contractual)
- Assign the applicable Payroll Template created in Step 1.3

---

### Step 2.2 — Upload Employee Photo

**Navigate to:** HR → Personnel → [Employee] → Photo → Upload

The photo appears in the HR personnel directory and on the employee's kiosk identification record.

---

### Step 2.3 — Generate Employee ID and PIN

**Navigate to:** HR → Personnel → [Employee] → Kiosk Access

The system auto-generates:
- **Employee ID** — Used on the RFID card for kiosk attendance (if RFID is used)
- **PIN** — A numeric code the employee uses at the kiosk as an alternative to RFID

Print the ID card or provide the PIN to the employee. The PIN must be treated as personal and confidential — employees should not share their PIN.

---

### Step 2.4 — Create the Staff Portal Account (if applicable)

For employees who need portal access (Teachers, HR can view their own data):

**Navigate to:** Admin → Users → Add User → Link to Personnel Record

Assign the appropriate role (Teacher, HR, etc.) and link the user account to the personnel record created in Step 2.1.

---

## Workflow 3 — Managing Leave Requests

---

### Step 3.1 — Employee Files a Leave Application

Employees file leaves through their portal (Teachers via Teacher Portal → Leave Application, or HR submits on their behalf):

**Navigate to:** HR → Leaves → Add Leave (for HR-assisted filing)

| Field | What to Enter |
|-------|---------------|
| Employee | Search and select the employee |
| Leave Type | Select from configured leave types |
| Start Date | First day of absence |
| End Date | Last day of absence |
| Reason | Brief explanation (required) |
| Supporting Document | Upload medical certificate (required for sick leave ≥ 2 consecutive days) |

---

### Step 3.2 — Review and Approve/Reject

**Navigate to:** HR → Leaves → Pending Approvals

For each pending request:

- Click **Approve** — Leave is posted; employee's leave balance is deducted accordingly; status is visible in Teacher Portal
- Click **Reject** — Leave is not approved; provide a reason; employee is notified

**Factors to consider before approving:**
- Does the employee have sufficient leave balance?
- Is there a supporting document for sick leave?
- Is the leave overlapping with a critical school period (e.g., examination week)?
- Has the employee filed in advance (for planned leaves)?

---

### Step 3.3 — Monitor Leave Balances

**Navigate to:** HR → Leaves → Leave Balance Summary

View each employee's current leave balance per leave type. Use this for:
- Answering employee queries about their remaining leave
- Planning school staffing during high-absence periods
- Year-end leave monetization computation (for schools that offer leave conversion)

---

### Step 3.4 — Year-End Leave Reset

At the end of the school year, leave balances are reset for the new year (or carried forward, based on school policy). Configure the reset policy in:

**Navigate to:** HR → Leave Types → [Leave Type] → Carry-Forward Policy

| Policy Option | Behavior |
|--------------|---------|
| Reset to Zero | All unused leave days are forfeited at year end |
| Full Carry-Forward | All unused days are added to the new year's allowance |
| Partial Cap | Up to X days can be carried forward; the rest is forfeited or monetized |

---

## Workflow 4 — Attendance Management

---

### Step 4.1 — View Daily Attendance Logs

**Navigate to:** HR → Attendance → View Logs

The attendance log shows all time-in and time-out records from the kiosk (or manually entered) for every employee, for every day.

Filter by:
- Employee name
- Department
- Date range

---

### Step 4.2 — Manual Attendance Entry

For employees who missed the kiosk scan due to a system issue, forgot to scan, or were on off-site duty:

**Navigate to:** HR → Attendance → Add Manual Entry

| Field | What to Enter |
|-------|---------------|
| Employee | Search by name or employee ID |
| Date | The attendance date |
| Time In | Actual arrival time |
| Time Out | Actual departure time |
| Reason | Why manual entry is needed (e.g., "Kiosk offline", "Off-site assignment") |

All manual entries are flagged as `Manual` in the log and visible in audit reports — they cannot be quietly altered.

---

### Step 4.3 — Generate Attendance Summary Report

**Navigate to:** HR → Attendance → Reports

Attendance summary reports show per employee:
- Total days present
- Total days absent
- Total days late / undertime
- Days on approved leave (not counted as absent)

Use this report as the basis for payroll computation (absences and tardiness affect salary).

---

## Workflow 5 — Kiosk Attendance System Setup

**When to do this:** When configuring a dedicated terminal (tablet, PC, or kiosk device) for employee daily time-in/time-out.

---

### Step 5.1 — Set Up the Kiosk Device

The kiosk is a web-based interface accessible at: `/kiosk` (no login required — designed for a locked-down dedicated device)

On the kiosk device:
1. Open the browser and navigate to `[system URL]/kiosk`
2. Set the browser to kiosk/fullscreen mode to prevent employees from navigating away
3. Place the device at the school entrance or HR office

---

### Step 5.2 — Employee Scan Process

When an employee arrives or departs:

1. The employee taps their RFID card (if RFID hardware is connected) **or** types their numeric PIN on the kiosk screen.
2. The system identifies the employee and automatically records:
   - **First scan of the day** = Time In
   - **Second scan of the day** = Time Out
3. The employee's name, photo, and recorded time are shown on the kiosk screen for confirmation.

---

### Step 5.3 — Handling Kiosk Errors

| Error | Cause | Resolution |
|-------|-------|-----------|
| "Employee not found" | Employee ID or PIN entered incorrectly | Employee retypes; if persists, check HR → Personnel for correct PIN |
| "Inactive employee" | Employee's status is set to Inactive | HR reactivates the record if the employee is still working |
| Kiosk not recording | Network issue or system offline | Record on the paper logbook; HR enters manually after system is restored |

---

## Workflow 6 — Running Payroll

**When to do this:** At the end of each payroll period (typically twice monthly: 1st–15th and 16th–end of month, or as defined by school policy).

**Data required:**
- Attendance summary for the period (auto-populated from kiosk/manual entries)
- Approved leave records for the period
- Any one-time adjustments (bonuses, loan deductions, overtime)

---

### Step 6.1 — Create a Payroll Period

**Navigate to:** HR → Payroll → Payroll Periods → Create Period

| Field | What to Enter |
|-------|---------------|
| Period Label | e.g., `April 1–15, 2026` |
| Start Date / End Date | Exact dates of the payroll coverage |
| Cutoff Date | Last date attendance data will be included from |

---

### Step 6.2 — Generate Payroll

**Navigate to:** HR → Payroll → [Period] → Generate Payroll

Click **Generate**. The system:
1. Pulls each employee's basic salary or daily rate
2. Computes earnings: basic pay + allowances + overtime (if applicable)
3. Computes deductions: SSS, PhilHealth, Pag-IBIG, withholding tax, absences, tardiness
4. Applies any one-time adjustments added to the period
5. Shows a payroll summary table with each employee's gross pay, total deductions, and net pay

---

### Step 6.3 — Review Payroll Computations

Before submitting payroll, review:
- Are all employees included? (Check against active personnel list)
- Are absence deductions correct? (Verify against attendance summary)
- Are statutory deductions at correct amounts?
- Are one-time bonuses or deductions accurate?

Correct any discrepancies:
**Navigate to:** HR → Payroll → [Period] → Adjustments → Add Adjustment

Enter the employee, adjustment type, amount, and reason.

---

### Step 6.4 — Submit for Approval

**Navigate to:** HR → Payroll → [Period] → Submit for Approval

Status changes from `Draft` to `For Approval`. The Administrator reviews the summary and either:
- **Approves** — Payroll is locked; no further changes allowed
- **Returns for Revision** — HR corrects and resubmits

---

### Step 6.5 — Post Payroll (Mark as Released)

After approval and actual salary release (cash payout or bank crediting):

**Navigate to:** HR → Payroll → [Period] → Mark as Released

This updates the payroll status to `Released` and makes payslips visible to employees in their portal.

---

## Workflow 7 — Generating and Distributing Payslips

**After payroll is posted:**

**Navigate to:** HR → Payroll → [Period] → Payslips

Each employee has a generated payslip showing:
- Earnings breakdown (basic, allowances, overtime)
- Deductions breakdown (SSS, PhilHealth, Pag-IBIG, withholding tax, absences)
- Net pay

---

### Step 7.1 — Individual Payslip Access

Employees with portal access can view and download their payslips:
- **Teachers** — Teacher Portal → Payslip
- **Other staff** — Their respective portal view

---

### Step 7.2 — Print/Export Payslips

**Navigate to:** HR → Payroll → [Period] → Download All Payslips (PDF pack)

Download a ZIP file containing individual PDF payslips for all employees. Print and distribute to those without portal access.

---

## Workflow 8 — Posting Payroll to the General Ledger

**(Requires General Ledger / Accounting module to be configured)**

**When to do this:** After payroll is approved and before the fiscal period closes.

**Navigate to:** HR → Payroll → [Period] → Post to GL

The system generates a journal entry:

| Side | Account | Amount |
|------|---------|--------|
| **Debit** | Salaries Expense | Total gross payroll |
| **Credit** | Cash / Bank (net pay) | Total net pay |
| **Credit** | SSS Payable | Total SSS deductions |
| **Credit** | PhilHealth Payable | Total PhilHealth deductions |
| **Credit** | Pag-IBIG Payable | Total Pag-IBIG deductions |
| **Credit** | Withholding Tax Payable | Total tax deductions |

The journal entry is auto-generated but must be reviewed and posted by the Accounting Staff.

**Why GL integration matters:** Without posting payroll to the GL, the school's income statement does not reflect true labor costs, and the balance sheet does not show government contribution liabilities — making financial statements inaccurate.

---

## Workflow 9 — Off-boarding an Employee

**When to do this:** When an employee resigns, retires, is terminated, or their contract ends.

---

### Step 9.1 — Process Final Payroll

Run a final payroll cut for the employee covering up to their last day. Include:
- Any remaining salary
- Leave conversion (if the school's policy allows monetization of unused leave)
- 13th month pay pro-rated (if applicable)

---

### Step 9.2 — Deactivate the Employee Record

**Navigate to:** HR → Personnel → [Employee] → Edit → Status → Set to Inactive

**Do not delete the record.** All past attendance logs, payroll records, and leave history are retained for legal compliance (the DOLE requires employment records to be maintained for a minimum period after separation).

---

### Step 9.3 — Revoke Portal Access

**Navigate to:** Admin → Users → [Employee's User Account] → Set Status to Inactive

This prevents the ex-employee from logging in. Their past data remains accessible to HR and Admin for record purposes.

---

## Data Requirements Summary

| Workflow | Required Before Starting |
|----------|--------------------------|
| HR Setup (Departments, Leave Types) | Administrator has created HR user account |
| Payroll Templates | Departments and positions defined; statutory rate tables available |
| Adding New Employee | Personal info, employment details, government IDs, salary rate |
| Leave Processing | Employee record active; leave types configured; supporting docs for sick leave |
| Attendance Management | Employee records with IDs/PINs; kiosk set up (for kiosk attendance) |
| Running Payroll | Payroll template assigned to all employees; attendance data for the period; leave records approved |
| GL Posting | Payroll approved; Chart of Accounts set up with payroll-related accounts |
| Off-boarding | Final payroll computed; leave balance accounted for |
