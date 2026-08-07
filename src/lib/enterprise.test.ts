import { describe, expect, it, beforeEach } from 'vitest'
import { startSsoLogin, completeSsoCallback } from './sso'
import { scimCreateUser, scimDeactivateUser, scimListUsers, scimResetStore } from './scim'
import { redactText, redactRecord } from './dlp'
import { describeKmsStatus } from './kms'

describe('sso stubs', () => {
  it('starts authorize url', () => {
    const r = startSsoLogin('oidc', 'http://localhost/login')
    expect(r.stub).toBe(true)
    expect(r.mode).toBe('stub')
    expect(r.authorizeUrl).toContain('authorize')
    expect(r.state).toMatch(/^sso-/)
  })

  it('completes stub callback', () => {
    const r = completeSsoCallback(new URLSearchParams('sso=1&email=doctor@cityhospital.com'))
    expect(r.ok).toBe(true)
    expect(r.email).toBe('doctor@cityhospital.com')
  })
})

describe('scim stubs', () => {
  beforeEach(() => scimResetStore())

  it('creates and deactivates users', () => {
    const u = scimCreateUser({
      userName: 'jdoe',
      displayName: 'Jane Doe',
      email: 'jdoe@hospital.com',
      role: 'nurse',
    })
    expect(u.active).toBe(true)
    expect(scimListUsers().totalResults).toBe(1)
    const off = scimDeactivateUser(u.id)
    expect(off?.active).toBe(false)
  })
})

describe('dlp', () => {
  it('redacts phone and email', () => {
    const s = redactText('Call +966501234567 or a@b.com')
    expect(s).not.toContain('501234567')
    expect(s).not.toContain('a@b.com')
  })

  it('redacts record keys', () => {
    const r = redactRecord({ name: 'Ali', phone: '0501234567', note: 'ok' })
    expect(r.phone).not.toBe('0501234567')
    expect(r.note).toBe('ok')
  })
})

describe('kms', () => {
  it('reports status', () => {
    const s = describeKmsStatus()
    expect(s.keyId).toBeTruthy()
    expect(['env', 'edge-mock', 'aws-kms', 'vault']).toContain(s.provider)
  })
})
