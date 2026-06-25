// Guidance Office TypeScript types

export type CaseType =
  | 'academic'
  | 'behavioral'
  | 'personal_social'
  | 'career'
  | 'family'
  | 'crisis'
  | 'child_protection';

export type CaseStatus =
  | 'open'
  | 'ongoing'
  | 'resolved'
  | 'referred_external'
  | 'referred_cpc'
  | 'closed_transferred'
  | 'closed_withdrawn';

export type UrgencyLevel = 'routine' | 'urgent' | 'crisis';
export type ReferralType = 'self' | 'teacher' | 'parent' | 'admin' | 'nurse';
export type ReferralStatus = 'pending' | 'acknowledged' | 'converted_to_case' | 'declined';
export type RiskLevel = 'none' | 'low' | 'moderate' | 'high';
export type SessionType = 'individual' | 'group' | 'family' | 'phone';
export type AgencyType = 'dswd' | 'pnp_wcpd' | 'mental_health' | 'hospital' | 'ngo' | 'barangay' | 'lgu' | 'other';
export type GroupSessionType =
  | 'group_counseling'
  | 'psychoeducational'
  | 'career_guidance'
  | 'information'
  | 'values_formation'
  | 'homeroom_guidance';

export interface GuidanceStudentSnippet {
  reg_id: string;
  last_name: string;
  first_name: string;
  grade_level?: string | null;
  section?: string | null;
}

export interface GuidanceCaseNote {
  public_id: string;
  session_id: number;
  case_id: number;
  note_date: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  written_by: number;
}

export interface GuidanceSession {
  public_id: string;
  case_id: number;
  session_number: number;
  session_date: string;
  session_time: string | null;
  duration_minutes: number | null;
  session_type: SessionType;
  approach_used: string | null;
  presenting_issues: string | null;
  interventions_done: string | null;
  response_to_intervention: string | null;
  risk_level: RiskLevel;
  next_steps: string | null;
  follow_up_date: string | null;
  counselor_id: number;
  counselor?: { id: number; name: string } | null;
  case_note?: GuidanceCaseNote | null;
}

export interface GuidancePsychTest {
  public_id: string;
  case_id: number;
  reg_id: string;
  test_name: string;
  test_date: string;
  administered_by: number;
  raw_score: number | null;
  scaled_score: number | null;
  score_interpretation: string | null;
  full_interpretation: string | null;
  recommendations: string | null;
  feedback_given: boolean;
  feedback_date: string | null;
  administered_by_user?: { id: number; name: string } | null;
}

export interface GuidanceExternalReferral {
  public_id: string;
  case_id: number;
  agency_name: string;
  agency_type: AgencyType;
  contact_person: string | null;
  contact_number: string | null;
  reason_for_referral: string;
  services_requested: string | null;
  referred_at: string;
  school_head_cosigned: boolean;
  follow_up_date: string | null;
  outcome: string | null;
  status: 'sent' | 'accepted' | 'in_progress' | 'completed' | 'declined';
}

export interface GuidanceReferral {
  public_id: string;
  reg_id: string;
  case_id: number | null;
  referral_type: ReferralType;
  referrer_name: string;
  referrer_role: string | null;
  referrer_user_id: number | null;
  concern_description: string;
  urgency: UrgencyLevel;
  referred_at: string;
  acknowledged_at: string | null;
  acknowledged_by: number | null;
  action_taken: string | null;
  status: ReferralStatus;
  student?: GuidanceStudentSnippet | null;
}

export interface GuidanceCaseRecord {
  public_id: string;
  case_number: string;
  case_type: CaseType;
  presenting_concern: string;
  urgency: UrgencyLevel;
  status: CaseStatus;
  parent_notified: boolean;
  parent_notified_at: string | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  student?: GuidanceStudentSnippet | null;
  assigned_counselor?: { id: number; name: string } | null;
  school_year?: { id: number; school_year: string } | null;
  referrals?: GuidanceReferral[];
  sessions?: GuidanceSession[];
  psych_tests?: GuidancePsychTest[];
  external_referrals?: GuidanceExternalReferral[];
}

export interface GuidanceDashboardStats {
  total_cases: number;
  open_cases: number;
  resolved_cases: number;
  crisis_active: number;
  pending_referrals: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
}

export interface GuidanceDashboardData {
  stats: GuidanceDashboardStats;
  recent_cases: GuidanceCaseRecord[];
  pending_referrals: GuidanceReferral[];
}

export interface GuidanceAnecdotalRecord {
  public_id: string;
  reg_id: string;
  observed_by_name: string;
  observed_by_role: string;
  observed_by_user_id: number | null;
  observation_date: string;
  location: string | null;
  behavior_description: string;
  interpretation: string | null;
  filed_by: number;
  student?: GuidanceStudentSnippet | null;
  filed_by_user?: { id: number; name: string } | null;
}

export interface GuidanceGroupSession {
  public_id: string;
  school_year_id: number;
  session_title: string;
  session_type: GroupSessionType;
  target_group: string | null;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  facilitator_id: number;
  objectives: string | null;
  activities: string | null;
  observations: string | null;
  attendee_count: number;
  facilitator?: { id: number; name: string } | null;
}

export interface GuidanceStudentProfile {
  public_id: string;
  reg_id: string;
  school_year_id: number;
  father_name: string | null;
  father_occupation: string | null;
  father_contact: string | null;
  mother_name: string | null;
  mother_occupation: string | null;
  mother_contact: string | null;
  guardian_name: string | null;
  guardian_relationship: string | null;
  guardian_contact: string | null;
  monthly_family_income: string | null;
  siblings_count: number;
  birth_order: number | null;
  living_with: string;
  health_conditions: string | null;
  special_needs: string | null;
  interests_hobbies: string | null;
  career_aspirations: string | null;
  is_4ps_beneficiary: boolean;
  is_pwd: boolean;
  is_solo_parent_child: boolean;
  notes: string | null;
}

export interface PaginatedGuidance<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
