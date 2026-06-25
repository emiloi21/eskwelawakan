/**
 * Returns the default home path for a given user role.
 */
export function getHomePathForRole(role: string): string {
  switch (role) {
    case 'Administrator':
      return '/admin';
    case 'Registrar':
    case 'Encoder':
      return '/registrar';
    case 'Accounting Staff':
    case 'Cashier':
      return '/accounting';
    case 'Teacher':
      return '/teacher';
    case 'Student':
      return '/student';
    case 'Parent':
      return '/parent';
    case 'Applicant':
      return '/applicant';
    case 'HR':
      return '/hrms';
    case 'Custodian':
      return '/custodian';
    case 'Guidance Counselor':
      return '/admin/guidance/dashboard';
    case 'School Nurse':
      return '/clinic';
    case 'Librarian':
      return '/library';
    case 'Front Desk':
      return '/front-office';
    default:
      return '/login';
  }
}

const PORTAL_ROLES = ['Student', 'Teacher', 'Parent', 'Applicant'];

/** Returns the correct login page for a given role. */
export function getLoginPathForRole(role: string): string {
  return PORTAL_ROLES.includes(role) ? '/portal-login' : '/login';
}

/** All roles a user has, merging primary access + secondary designations. */
export function getAllRoles(user: { access: string; designations?: { designation: string }[] }): string[] {
  const extras = (user.designations ?? []).map((d) => d.designation);
  return Array.from(new Set([user.access, ...extras]));
}

/** True if the user has at least one of the given roles. */
export function hasAnyRole(
  user: { access: string; designations?: { designation: string }[] },
  roles: string[]
): boolean {
  return getAllRoles(user).some((r) => roles.includes(r));
}
