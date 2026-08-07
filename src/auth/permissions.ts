import type { User } from '../types'

export type Permission =
  | 'dashboard:view'
  | 'patients:view'
  | 'patients:edit'
  | 'doctors:view'
  | 'doctors:edit'
  | 'appointments:view'
  | 'appointments:edit'
  | 'billing:view'
  | 'billing:edit'
  | 'claims:view'
  | 'claims:edit'
  | 'portal:view'
  | 'messages:view'
  | 'messages:edit'
  | 'interop:view'
  | 'pharmacy:view'
  | 'pharmacy:edit'
  | 'lab:view'
  | 'lab:edit'
  | 'census:view'
  | 'census:edit'
  | 'orders:view'
  | 'orders:edit'
  | 'emar:view'
  | 'emar:edit'
  | 'reports:view'
  | 'auditLog:view'
  | 'settings:view'
  | 'settings:edit'
  | 'users:manage'
  | 'facilities:view'
  | 'facilities:edit'
  | 'compliance:view'
  | 'compliance:edit'

export type Role = User['role']

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'dashboard:view',
    'patients:view', 'patients:edit',
    'doctors:view', 'doctors:edit',
    'appointments:view', 'appointments:edit',
    'billing:view', 'billing:edit',
    'claims:view', 'claims:edit',
    'interop:view',
    'messages:view', 'messages:edit',
    'pharmacy:view', 'pharmacy:edit',
    'lab:view', 'lab:edit',
    'census:view', 'census:edit',
    'orders:view', 'orders:edit',
    'emar:view', 'emar:edit',
    'reports:view',
    'auditLog:view',
    'facilities:view', 'facilities:edit',
    'compliance:view', 'compliance:edit',
    'settings:view', 'settings:edit',
    'users:manage',
  ],
  doctor: [
    'dashboard:view',
    'patients:view', 'patients:edit',
    'doctors:view',
    'appointments:view', 'appointments:edit',
    'lab:view', 'lab:edit',
    'census:view', 'census:edit',
    'orders:view', 'orders:edit',
    'emar:view', 'emar:edit',
    'messages:view', 'messages:edit',
    'facilities:view',
    'reports:view',
    'settings:view',
  ],
  nurse: [
    'dashboard:view',
    'patients:view', 'patients:edit',
    'doctors:view',
    'appointments:view', 'appointments:edit',
    'pharmacy:view',
    'lab:view', 'lab:edit',
    'census:view', 'census:edit',
    'orders:view', 'orders:edit',
    'emar:view', 'emar:edit',
    'messages:view', 'messages:edit',
    'facilities:view',
    'settings:view',
  ],
  patient: [
    'dashboard:view',
    'patients:view',
    'appointments:view',
    'portal:view',
    'messages:view', 'messages:edit',
    'settings:view',
  ],
}

export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false
}

export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false
  return permissions.some((p) => hasPermission(user, p))
}

export function hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false
  return permissions.every((p) => hasPermission(user, p))
}

const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/': 'dashboard:view',
  '/patients': 'patients:view',
  '/doctors': 'doctors:view',
  '/appointments': 'appointments:view',
  '/billing': 'billing:view',
  '/claims': 'claims:view',
  '/portal': 'portal:view',
  '/messages': 'messages:view',
  '/interop': 'interop:view',
  '/facilities': 'facilities:view',
  '/compliance': 'compliance:view',
  '/pharmacy': 'pharmacy:view',
  '/lab': 'lab:view',
  '/census': 'census:view',
  '/orders': 'orders:view',
  '/emar': 'emar:view',
  '/reports': 'reports:view',
  '/audit-log': 'auditLog:view',
  '/settings': 'settings:view',
}

export function getRoutePermission(path: string): Permission | undefined {
  const match = Object.keys(ROUTE_PERMISSIONS).find((route) =>
    path === route || path.startsWith(route + '/'),
  )
  return match ? ROUTE_PERMISSIONS[match] : undefined
}
