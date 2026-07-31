// TEMPORARY: local demo-only credentials.
// Replaced in Phase 1 by real server-side authentication (hashed passwords, sessions, RBAC).
export const DEMO_CREDENTIALS = {
  email: 'admin@cityhospital.com',
  password: 'admin123',
  name: 'Admin User',
} as const
