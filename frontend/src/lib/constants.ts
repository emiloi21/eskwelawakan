/**
 * Shared constant values used across the application.
 * These are static enums that don't need to come from the DB.
 */

export const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer'] as const;

export const DEPARTMENTS = [
  'Grade School',
  'Junior High School',
  'Senior High School',
] as const;

export const GRADE_LEVELS = [
  // Grade School
  'Nursery',
  'Preparatory',
  'Kinder',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  // Junior High School
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  // Senior High School
  'Grade 11',
  'Grade 12',
] as const;

/** Grade levels grouped by department */
export const GRADE_LEVELS_BY_DEPT: Record<string, readonly string[]> = {
  'Grade School': ['Nursery', 'Preparatory', 'Kinder', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
  'Junior High School': ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
  'Senior High School': ['Grade 11', 'Grade 12'],
};

export const STRANDS = ['N/A', 'ABM', 'HE', 'HUMSS', 'ICT', 'STEM'] as const;

export const CLASSIFICATIONS = ['New', 'Old', 'Transferee', 'Cross-enrollee', 'Returnee'] as const;

export const STUDENT_STATUSES = [
  'For Accounts Assessment',
  'For Payment',
  'Enrolled',
  'Transferred Out',
  'Withdrawn',
  'Dropped',
  'Graduated',
] as const;

export const USER_ROLES = [
  'Administrator',
  'Encoder',
  'Registrar',
  'Accounting Staff',
  'Cashier',
  'Teacher',
  'HR',
  'Custodian',
  'Librarian',
  'School Nurse',
  'Front Desk',
] as const;

export const ACCOUNT_GROUPS = ['Tuition Fee', 'Standard Fees', 'Non-standard Fees', 'Other Fees'] as const;

export const DISCOUNT_TYPES = ['Fixed', 'Percentage'] as const;

export const PAYMENT_TERM_CATEGORIES = ['Full', 'Monthly'] as const;
