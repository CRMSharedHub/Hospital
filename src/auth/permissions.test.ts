import { describe, expect, it } from 'vitest'
import {
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRoutePermission,
} from './permissions'
import type { User } from '../types'

const makeUser = (role: User['role']): User => ({
  id: '1',
  name: 'Test',
  email: 'test@test.com',
  role,
})

describe('ROLE_PERMISSIONS', () => {
  it('admin has all permissions', () => {
    expect(ROLE_PERMISSIONS.admin.length).toBeGreaterThan(10)
    expect(ROLE_PERMISSIONS.admin).toContain('users:manage')
  })

  it('doctor has view but not edit for doctors', () => {
    expect(ROLE_PERMISSIONS.doctor).toContain('doctors:view')
    expect(ROLE_PERMISSIONS.doctor).not.toContain('doctors:edit')
  })

  it('nurse has limited permissions', () => {
    expect(ROLE_PERMISSIONS.nurse).toContain('patients:view')
    expect(ROLE_PERMISSIONS.nurse).not.toContain('billing:view')
    expect(ROLE_PERMISSIONS.nurse).not.toContain('reports:view')
  })

  it('patient has portal but not billing admin', () => {
    expect(ROLE_PERMISSIONS.patient).toContain('dashboard:view')
    expect(ROLE_PERMISSIONS.patient).toContain('portal:view')
    expect(ROLE_PERMISSIONS.patient).not.toContain('patients:edit')
    expect(ROLE_PERMISSIONS.patient).not.toContain('billing:view')
    expect(ROLE_PERMISSIONS.patient).not.toContain('claims:view')
    expect(ROLE_PERMISSIONS.patient).not.toContain('census:view')
  })

  it('nurse and doctor can manage census', () => {
    expect(ROLE_PERMISSIONS.nurse).toContain('census:edit')
    expect(ROLE_PERMISSIONS.doctor).toContain('census:view')
    expect(getRoutePermission('/census')).toBe('census:view')
  })

  it('staff can manage CPOE orders', () => {
    expect(ROLE_PERMISSIONS.doctor).toContain('orders:edit')
    expect(ROLE_PERMISSIONS.nurse).toContain('orders:view')
    expect(ROLE_PERMISSIONS.patient).not.toContain('orders:view')
    expect(getRoutePermission('/orders')).toBe('orders:view')
  })

  it('staff can manage eMAR', () => {
    expect(ROLE_PERMISSIONS.nurse).toContain('emar:edit')
    expect(ROLE_PERMISSIONS.patient).not.toContain('emar:view')
    expect(getRoutePermission('/emar')).toBe('emar:view')
  })

  it('patient and staff can use messaging', () => {
    expect(ROLE_PERMISSIONS.patient).toContain('messages:view')
    expect(ROLE_PERMISSIONS.doctor).toContain('messages:edit')
    expect(getRoutePermission('/messages')).toBe('messages:view')
  })

  it('admin can manage facilities and compliance', () => {
    expect(ROLE_PERMISSIONS.admin).toContain('facilities:edit')
    expect(ROLE_PERMISSIONS.admin).toContain('compliance:view')
    expect(ROLE_PERMISSIONS.patient).not.toContain('facilities:view')
    expect(getRoutePermission('/facilities')).toBe('facilities:view')
    expect(getRoutePermission('/compliance')).toBe('compliance:view')
  })
})

describe('hasPermission', () => {
  it('returns true for admin on any permission', () => {
    const admin = makeUser('admin')
    expect(hasPermission(admin, 'billing:edit')).toBe(true)
    expect(hasPermission(admin, 'users:manage')).toBe(true)
  })

  it('returns false for patient on billing', () => {
    const patient = makeUser('patient')
    expect(hasPermission(patient, 'billing:view')).toBe(false)
  })

  it('returns false for null user', () => {
    expect(hasPermission(null, 'dashboard:view')).toBe(false)
  })
})

describe('hasAnyPermission', () => {
  it('returns true if user has at least one of the permissions', () => {
    const doctor = makeUser('doctor')
    expect(hasAnyPermission(doctor, ['billing:view', 'patients:view'])).toBe(true)
  })

  it('returns false if user has none of the permissions', () => {
    const patient = makeUser('patient')
    expect(hasAnyPermission(patient, ['billing:view', 'doctors:edit'])).toBe(false)
  })
})

describe('hasAllPermissions', () => {
  it('returns true if user has all permissions', () => {
    const admin = makeUser('admin')
    expect(hasAllPermissions(admin, ['dashboard:view', 'patients:view'])).toBe(true)
  })

  it('returns false if user is missing one', () => {
    const doctor = makeUser('doctor')
    expect(hasAllPermissions(doctor, ['patients:view', 'billing:view'])).toBe(false)
  })
})

describe('getRoutePermission', () => {
  it('returns permission for exact route', () => {
    expect(getRoutePermission('/billing')).toBe('billing:view')
    expect(getRoutePermission('/patients')).toBe('patients:view')
  })

  it('returns permission for nested route', () => {
    expect(getRoutePermission('/patients/123')).toBe('patients:view')
    expect(getRoutePermission('/doctors/45')).toBe('doctors:view')
  })

  it('returns undefined for unknown routes', () => {
    expect(getRoutePermission('/unknown')).toBeUndefined()
  })
})
