export interface SchoolInfo {
  schoolName: string;
  logo: string | null;
  address: string | null;
  emailAddress: string | null;
  contactNumber: string | null;
  region: string | null;
  division: string | null;
}

export interface AppNotification {
  id: string;
  read_at: string | null;
  created_at: string;
  data: {
    type: 'enrollment_status' | 'grade_posted' | 'payment_due' | string;
    title: string;
    body: string;
    url?: string | null;
    [key: string]: unknown;
  };
}

export interface NotificationsResponse {
  data: AppNotification[];
  unread_count: number;
}

export interface MessageContact {
  id: number;
  name: string;
  role: string;
}

export interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  sender?: MessageContact;
  recipient?: MessageContact;
}

export interface MessagesResponse {
  data: Message[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
  unread_count?: number;
}

export interface UserDesignation {
  id: number;
  designation: string;
  position_title: string | null;
  department: string | null;
  is_primary: boolean;
}

export interface User {
  id: number;
  public_id: string;
  username: string;
  fname: string;
  mname: string | null;
  lname: string;
  suffix: string | null;
  full_name: string;
  email: string | null;
  contact_number: string | null;
  access: 'Administrator' | 'Encoder' | 'Registrar' | 'Accounting Staff' | 'Cashier' | 'Teacher' | 'Student' | 'Parent' | 'Applicant' | 'HR' | 'Custodian' | 'Librarian' | 'School Nurse' | 'Front Desk' | 'Guidance Counselor';
  department: string | null;
  sub_department: string | null;
  selected_sy: string | null;
  selected_sem: string | null;
  status: 'Active' | 'Inactive';
  profile_image: string | null;
  designations: UserDesignation[];
}

export interface SchoolPreference {
  school_id: number;
  deped_id: string | null;
  logo: string | null;
  region: string | null;
  division: string | null;
  schoolName: string;
  address: string | null;
  emailAddress: string | null;
  contactNumber: string | null;
  activeSchoolYear: string | null;
  activeSemester: string | null;
  slide_bg_img: string | null;
  fy_closed: boolean;
  fy_closed_at: string | null;
  fy_closed_by: number | null;
}

export interface SchoolYear {
  id: number;
  public_id: string;
  school_year: string;
  status: 'Active' | 'Inactive';
  fy_start_date: string | null;
  fy_end_date: string | null;
  fy_closed: boolean;
  fy_closed_at: string | null;
  fy_closed_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  stats: {
    total_students: number;
    enrolled_students: number;
    total_classes: number;
    total_users: number;
    total_payments: number;
    transaction_count: number;
  };
  by_department: Record<string, number>;
  by_status: Record<string, number>;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface FiscalYearPreview {
  school_year: string;
  students_with_balance: number;
  total_outstanding_balance: number;
  records_to_convert: number;
  fy_closed: boolean;
}

// ── Registrar / SIS Types ──────────────────────────────────────────
export interface Student {
  reg_id: number;
  public_id: string;
  lrn: string;
  esc_id: string;
  student_id: string;
  lname: string;
  fname: string;
  mname: string;
  suffix: string;
  full_name?: string;
  bdMM: string;
  bdDD: string;
  bdYYYY: string;
  sex: 'Male' | 'Female';
  age: number;
  address_street: string | null;
  address_brgy: string | null;
  address_city_mun: string | null;
  address_province: string | null;
  guardian_lname: string | null;
  guardian_fname: string | null;
  guardian_contact: string;
  guardian_relation: string;
  g_address_street: string | null;
  g_address_brgy: string | null;
  g_address_city_mun: string | null;
  g_address_province: string | null;
  last_school: string;
  last_school_sy: string;
  last_school_type: string;
  gen_average: number;
  class_id: number;
  dept: string;
  gradeLevel: string;
  strand: string;
  major: string;
  section: string;
  classification: string;
  schoolYear: string;
  sem: string;
  appDate: string;
  appTime: string;
  assessment_id: number;
  status: string;
  remarks: string | null;
  stat_date: string | null;
  prev_sy_reg_id: number;
  img: string | null;
  created_at: string;
  updated_at: string;
  class_info?: ClassSection | null;
}

export interface ClassSection {
  class_id: number;
  public_id: string;
  gradeLevel: string;
  strand: string;
  major: string;
  section: string;
  dept: string;
  adviser_id: number;
  adviser: string;
  schoolYear: string;
  semester: string;
  students_count?: number;
  students?: Student[];
  created_at: string;
  updated_at: string;
}

export interface Personnel {
  personnel_id: number;
  fname: string;
  mname: string;
  lname: string;
  suffix: string;
  classification: string;
  position: string;
  dept: string;
}

export interface GradeLevelRow {
  dept: string;
  gradeLevel: string;
  strand: string | null;
  male: number;
  female: number;
  total: number;
}

export interface DeptRow {
  male: number;
  female: number;
  total: number;
}

export interface StudentCounts {
  total: number;
  by_status: Record<string, number>;
  by_department: Record<string, DeptRow>;
  by_grade_level: GradeLevelRow[];
}

export interface Requirement {
  require_id: number;
  public_id: string;
  dept: string;
  gradeLevel: string;
  classification: string;
  requirement_name: string;
  description: string | null;
  schoolYear: string;
  type: string | null;
  purpose: string;
  student_requirements_count?: number;
  created_at: string;
  updated_at: string;
}

export interface RequirementChecklist extends Requirement {
  submitted: boolean;
  stud_reqs_id: number | null;
  stud_req_public_id: string | null;
  req_status: string;
  file_path: string | null;
  remarks: string | null;
}

export interface Discount {
  acct_discount_id: number;
  public_id: string;
  dept: string;
  schoolYear: string;
  account_code: string | null;
  description: string;
  amount: number;
  percentage: number;
  classification: string | null;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface DiscountCode {
  discount_code_id: number;
  public_id: string;
  code: string;
  description: string;
  acct_discount_id: number;
  deduct_category_id: number;
  max_uses: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  dept_restriction: string | null;
  grade_level_restriction: string | null;
  classification_restriction: string | null;
  is_active: boolean;
  account_discount?: { description: string; type: string; amount: number; percentage: number };
  category?: { description: string };
  created_at: string;
  updated_at: string;
}

export interface EnrollmentPipeline {
  [status: string]: {
    total: number;
    by_dept: Record<string, number>;
  };
}

// ── Accounting / SAAS Types ────────────────────────────────────────

export interface AccountAssessment {
  assessment_id: number;
  public_id: string;
  dept: string;
  gradeLevel: string;
  strand: string;
  major: string;
  schoolYear: string;
  coverage: string;
  description: string;
  totalAmount: number;
  payables?: AssessmentPayable[];
  created_at: string;
  updated_at: string;
}

export interface AssessmentPayable {
  assess_payable_id: number;
  public_id: string;
  assessment_id: number;
  category_id: number;
  total_amt_payable: number;
  schoolYear: string;
  category?: AccountCategory;
}

export interface AccountCategory {
  category_id: number;
  public_id: string;
  gradeLevel: string;
  strand: string;
  major: string;
  schoolYear: string;
  semester: string;
  description: string;
  totalAmount: number;
  coa_id: number | null;
  coa?: { coa_id: number; account_code: string; account_name: string } | null;
  cat_particulars_count?: number;
  cat_particulars?: CatParticular[];
  created_at: string;
  updated_at: string;
}

export interface AccountParticular {
  particular_id: number;
  public_id: string;
  coa_id: number | null;
  gradeLevel: string;
  strand: string;
  major: string;
  schoolYear: string;
  semester: string;
  account_group: string;
  account_code: string;
  description: string;
  amount: number;
  par_acct_class: string;
  status: string;
  chart_account?: {
    coa_id: number;
    public_id: string;
    account_code: string;
    account_name: string;
    account_type: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface CatParticular {
  cat_particular_id: number;
  public_id: string;
  category_id: number;
  particular_id: number;
  account_group: string;
  description: string;
  amount: number;
  status: string;
  paymentTerm: string;
  schoolYear: string;
  semester: string;
  category?: AccountCategory;
  particular?: AccountParticular;
  created_at: string;
  updated_at: string;
}

export interface StudentAssessmentItem {
  stud_assess_id: number;
  public_id: string;
  reg_id: number;
  assessment_id: number;
  category_id: number;
  particular_id: number;
  account_type: string | null;
  par_stat: string;
  total_amt_payable: number;
  total_amt_discount: number;
  total_amt_paid: number;
  total_amt_debit: number;
  total_amt_credit: number;
  total_amt_bal: number;
  schoolYear: string;
  debit_id: number | null;
  credit_id: number | null;
  category?: AccountCategory;
  assessment?: AccountAssessment;
  created_at: string;
}

export interface StudentPaymentRecord {
  payment_id: number;
  reg_id: number;
  lname: string;
  fname: string;
  receipt_num: string;
  schoolYear: string;
  semester: string;
  payment_type: string;
  method_id: number | null;
  category_id: number;
  particular_id: number;
  amt_payable: number;
  amt_paid: number;
  trans_date: string;
  trans_time: string;
  status: string;
  void_remarks: string | null;
  personnel_user_id: number;
}

export interface PaymentTransaction {
  pay_data_id: number;
  public_id: string;
  reg_id: number;
  receipt_num: string;
  schoolYear: string;
  semester: string;
  trans_payment_type: string;
  cv_payee: string | null;
  cv_bank_office: string | null;
  cv_number: string | null;
  remarks: string | null;
  entry_date: string | null;
  net_amt_payable: number;
  amt_tend: number;
  personnel_user_id: number;
  trans_time: string | null;
  status: string;
  student?: Pick<Student, 'reg_id' | 'lname' | 'fname' | 'mname' | 'student_id'>;
  payments?: StudentPaymentRecord[];
}

export interface PaymentDummyItem {
  payment_id: number;
  reg_id: number;
  lname: string;
  fname: string;
  receipt_num: string;
  schoolYear: string;
  semester: string;
  payment_type: string;
  assessment_id: number;
  category_id: number;
  particular_id: number;
  amt_payable: number;
  amt_paid: number;
  personnel_user_id: number;
}

export interface PaymentTerm {
  pterm_id: number;
  public_id: string;
  payment_term: string;
  category: string | null;
  month_set_up: string | null;
  year_set_up: string | null;
  dept: string;
  schoolYear: string;
  created_at: string;
  updated_at: string;
}

export interface Book {
  book_id: number;
  public_id: string;
  book_title: string;
  book_amt: number;
  gradeLevel: string;
  strand: string;
  schoolYear: string;
  status: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface RefundRequest {
  refund_id: number;
  public_id: string;
  reg_id: number;
  category_id: number;
  amt_excess: number;
  date_time: string;
  personnel_user_id: number;
  status: 'Pending' | 'Approved' | 'Released' | 'Cancelled';
  student?: Pick<Student, 'reg_id' | 'lname' | 'fname' | 'mname' | 'student_id'>;
  category?: Pick<AccountCategory, 'category_id' | 'description'>;
  created_at: string;
  updated_at: string;
}

export interface StudentOtherFee {
  particular_id: number;
  public_id: string;
  reg_id: number;
  category_id: number;
  account_code: string | null;
  description: string;
  amount: number;
  status: string | null;
  paymentTerm: string | null;
  schoolYear: string;
}

export interface AccountingDashboardData {
  stats: {
    total_collected: number;
    transaction_count: number;
    today_collected: number;
    today_transactions: number;
    total_payable: number;
    total_paid: number;
    total_balance: number;
    students_with_balance: number;
    total_assessments: number;
    total_categories: number;
    pending_refunds: number;
  };
  collection_by_dept: Record<string, number>;
  recent_transactions: PaymentTransaction[];
}

export interface CollectionSummary {
  daily: Array<{
    trans_date: string;
    total_collected: number;
    transaction_count: number;
  }>;
  grand_total: number;
  total_transactions: number;
}

export interface LedgerStudent {
  reg_id: number;
  public_id: string;
  student_id: string;
  lname: string;
  fname: string;
  mname: string;
  dept: string;
  gradeLevel: string;
  strand: string;
  status: string;
  schoolYear: string;
  total_payable: number;
  total_paid: number;
  total_balance: number;
}
