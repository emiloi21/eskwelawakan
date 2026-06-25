import { describe, it, expect } from 'vitest';
import { getHomePathForRole, getLoginPathForRole, getAllRoles, hasAnyRole } from '@/lib/role-utils';

describe('getHomePathForRole', () => {
  it.each([
    ['Administrator', '/admin'],
    ['Registrar', '/registrar'],
    ['Encoder', '/registrar'],
    ['Accounting Staff', '/accounting'],
    ['Cashier', '/accounting'],
    ['Teacher', '/teacher'],
    ['Student', '/student'],
    ['Parent', '/parent'],
    ['Applicant', '/applicant'],
    ['HR', '/hrms'],
    ['Custodian', '/custodian'],
  ])('maps %s to %s', (role, expected) => {
    expect(getHomePathForRole(role)).toBe(expected);
  });

  it('returns /login for unknown roles', () => {
    expect(getHomePathForRole('Unknown')).toBe('/login');
    expect(getHomePathForRole('')).toBe('/login');
  });
});

describe('getLoginPathForRole', () => {
  it('returns /portal-login for portal roles', () => {
    expect(getLoginPathForRole('Student')).toBe('/portal-login');
    expect(getLoginPathForRole('Teacher')).toBe('/portal-login');
    expect(getLoginPathForRole('Parent')).toBe('/portal-login');
    expect(getLoginPathForRole('Applicant')).toBe('/portal-login');
  });

  it('returns /login for staff roles', () => {
    expect(getLoginPathForRole('Administrator')).toBe('/login');
    expect(getLoginPathForRole('HR')).toBe('/login');
    expect(getLoginPathForRole('Registrar')).toBe('/login');
    expect(getLoginPathForRole('Custodian')).toBe('/login');
  });
});

describe('getAllRoles', () => {
  it('returns single role when no designations', () => {
    const user = { access: 'Teacher' };
    expect(getAllRoles(user)).toEqual(['Teacher']);
  });

  it('merges primary access with designations, deduped', () => {
    const user = {
      access: 'Teacher',
      designations: [{ designation: 'Librarian' }, { designation: 'Teacher' }],
    };
    expect(getAllRoles(user)).toEqual(['Teacher', 'Librarian']);
  });

  it('handles undefined designations gracefully', () => {
    const user = { access: 'HR', designations: undefined };
    expect(getAllRoles(user)).toEqual(['HR']);
  });
});

describe('hasAnyRole', () => {
  const user = { access: 'Teacher', designations: [{ designation: 'Librarian' }] };

  it('returns true when user has a matching role', () => {
    expect(hasAnyRole(user, ['Teacher', 'Student'])).toBe(true);
    expect(hasAnyRole(user, ['Librarian'])).toBe(true);
  });

  it('returns false when user has no matching role', () => {
    expect(hasAnyRole(user, ['Administrator', 'HR'])).toBe(false);
  });

  it('returns false for empty roles array', () => {
    expect(hasAnyRole(user, [])).toBe(false);
  });
});
