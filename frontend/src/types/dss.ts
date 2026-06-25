export interface DssDashboardKpi {
  total_enrolled: number;
  enrolled_delta: number;
  enrolled_delta_pct: number;
  promotion_rate: number;
  retention_rate: number;
  at_risk_count: number;
  faculty_load_compliance_pct: number;
  classroom_utilization_pct: number;
}

export interface EnrollmentTrend {
  school_year: string;
  total_enrolled: number;
  grade_level?: string;
}

export interface SectionFillRate {
  section_name: string;
  grade_level: string;
  dept: string;
  semester: string;
  enrolled_count: number;
  capacity: number;
  fill_rate_pct: number;
  status: 'full' | 'available' | 'underutilized' | 'overcapacity';
}

export interface EnrollmentByGradeLevel {
  grade_level: string;
  dept: string;
  enrolled_count: number;
}

export interface EnrollmentProjection {
  grade_level: string;
  last_enrolled: number;
  projected_next_sy: number;
  next_school_year: string;
}

export interface PromotionRetentionRate {
  grade_level: string;
  total: number;
  promoted: number;
  retained: number;
  promotion_pct: number;
  retention_pct: number;
}

export interface GradeDistributionBracket {
  bracket: string;
  count: number;
}

export interface SubjectPerformance {
  grade_level: string;
  subject: string;
  avg_grade: number;
  student_count: number;
  failed_count: number;
  status: 'pass' | 'fail';
}

export interface AtRiskStudent {
  public_id: string | null;
  reg_id: number;
  student_name: string;
  grade_level: string;
  section: string;
  flag_reasons: string[];
  intervention_status: 'flagged' | 'under_intervention' | 'resolved';
  notes: string | null;
}

export interface EarlyWarning {
  id: number;
  public_id: string;
  warning_type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  related_entity_type: string | null;
  related_entity_id: number | null;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  triggered_at: string;
  created_at: string;
}

export interface DssRecommendation {
  id: number;
  public_id: string;
  recommendation_text: string;
  category: 'enrollment' | 'academic' | 'faculty' | 'resource' | 'general';
  priority: 'high' | 'medium' | 'low';
  basis: string;
  related_warning_id: number | null;
  is_actioned: boolean;
  actioned_at: string | null;
  generated_at: string;
  created_at: string;
}

export interface FacultyLoad {
  faculty_name: string;
  department: string;
  subject_count: number;
  total_units: number;
  load_status: 'overloaded' | 'optimal' | 'underloaded';
}

export interface ClassroomUtilization {
  room_name: string;
  location: string | null;
  capacity: number;
  sections_assigned: number;
  scheduled_hours_per_week: number;
  utilization_pct: number;
  status: 'optimal' | 'underutilized' | 'overcapacity';
}

export interface MaterialsInventoryItem {
  public_id: string;
  item_name: string;
  category: string;
  unit: string;
  quantity_on_hand: number;
  reorder_point: number;
  status: 'adequate' | 'shortage';
}

export interface DssDashboardData {
  kpi: DssDashboardKpi;
  enrollment_trend: EnrollmentTrend[];
  grade_distribution: GradeDistributionBracket[];
  active_alerts: EarlyWarning[];
  recent_recommendations: DssRecommendation[];
  active_school_year: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
