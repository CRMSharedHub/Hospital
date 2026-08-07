/**
 * SCIM 2.0 user provisioning stubs (Phase D2).
 */

export type ScimUserActive = boolean

export interface ScimUser {
  id: string
  userName: string
  displayName: string
  active: ScimUserActive
  emails: { value: string; primary: boolean }[]
  externalId?: string
  roles?: string[]
}

export interface ScimListResponse {
  schemas: string[]
  totalResults: number
  Resources: ScimUser[]
}

const memoryUsers = new Map<string, ScimUser>()

export function scimCreateUser(input: {
  userName: string
  displayName: string
  email: string
  externalId?: string
  role?: string
}): ScimUser {
  const id = `scim-${Date.now()}`
  const user: ScimUser = {
    id,
    userName: input.userName,
    displayName: input.displayName,
    active: true,
    emails: [{ value: input.email, primary: true }],
    externalId: input.externalId,
    roles: input.role ? [input.role] : ['staff'],
  }
  memoryUsers.set(id, user)
  return user
}

export function scimDeactivateUser(id: string): ScimUser | null {
  const u = memoryUsers.get(id)
  if (!u) return null
  const next = { ...u, active: false }
  memoryUsers.set(id, next)
  return next
}

export function scimListUsers(): ScimListResponse {
  const Resources = [...memoryUsers.values()]
  return {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: Resources.length,
    Resources,
  }
}

/** Reset in-memory store (tests). */
export function scimResetStore(): void {
  memoryUsers.clear()
}
