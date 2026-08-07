import type { User } from '../types'

export interface DemoUser extends User {
  password: string
}

/**
 * Local demo accounts — NEVER statically imported from production Login.
 * Loaded only via dynamic import when isDemoAuthAllowed() is true.
 */
export const DEMO_USERS: DemoUser[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@cityhospital.com',
    password: 'admin123',
    role: 'admin',
    linkedPatientId: undefined,
  },
  {
    id: '2',
    name: 'Dr. Sarah Khan',
    email: 'doctor@cityhospital.com',
    password: 'doctor123',
    role: 'doctor',
  },
  {
    id: '3',
    name: 'Nurse Lisa Park',
    email: 'nurse@cityhospital.com',
    password: 'nurse123',
    role: 'nurse',
  },
  {
    id: '4',
    name: 'John Doe',
    email: 'patient@cityhospital.com',
    password: 'patient123',
    role: 'patient',
    linkedPatientId: 101,
  },
]
