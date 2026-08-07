// Supabase Edge Function: scim
// SCIM 2.0 user create / deactivate. Header: Authorization Bearer <SCIM_TOKEN>
// Deploy: supabase functions deploy scim --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
  })
}

function unauthorized(): Response {
  return json(
    { schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], detail: 'Unauthorized', status: '401' },
    401,
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const expected = Deno.env.get('SCIM_TOKEN')
  const auth = req.headers.get('Authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!expected || token !== expected) return unauthorized()

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/scim\/?/, '').replace(/^functions\/v1\/scim\/?/, '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, service)

  try {
    if (req.method === 'GET' && (path === 'Users' || path === '' || path.startsWith('Users'))) {
      const { data } = await admin.from('profiles').select('id, email, name, role, scim_external_id').limit(100)
      const Resources = (data ?? []).map((p) => ({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        id: p.id,
        userName: p.email,
        displayName: p.name,
        active: true,
        emails: [{ value: p.email, primary: true }],
        externalId: p.scim_external_id,
        roles: [{ value: p.role }],
      }))
      return json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        totalResults: Resources.length,
        Resources,
        stub: false,
      })
    }

    if (req.method === 'POST' && (path === 'Users' || path.endsWith('/Users'))) {
      const body = await req.json() as {
        userName?: string
        displayName?: string
        emails?: { value: string }[]
        externalId?: string
        roles?: { value: string }[]
        password?: string
      }
      const email = body.emails?.[0]?.value || body.userName
      if (!email) {
        return json({ detail: 'email required', status: '400' }, 400)
      }
      const role = body.roles?.[0]?.value || 'nurse'
      const password = body.password || `Tmp-${crypto.randomUUID().slice(0, 12)}!aA1`

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: body.displayName || email.split('@')[0] },
      })
      if (createErr || !created.user) {
        return json({ detail: createErr?.message || 'create failed', status: '400' }, 400)
      }

      await admin
        .from('profiles')
        .update({
          name: body.displayName || email.split('@')[0],
          role: ['admin', 'doctor', 'nurse', 'patient'].includes(role) ? role : 'nurse',
          scim_external_id: body.externalId ?? null,
        })
        .eq('id', created.user.id)

      return json({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        id: created.user.id,
        userName: email,
        displayName: body.displayName,
        active: true,
        emails: [{ value: email, primary: true }],
        externalId: body.externalId,
        stub: false,
      }, 201)
    }

    if (req.method === 'PATCH' || req.method === 'PUT' || req.method === 'DELETE') {
      const id = path.replace(/^Users\//, '')
      if (!id) return json({ detail: 'User id required', status: '400' }, 400)

      let active = true
      if (req.method === 'DELETE') active = false
      else {
        const body = await req.json() as {
          active?: boolean
          Operations?: { op: string; value: { active?: boolean } }[]
        }
        active = body.active !== false
        if (body.Operations) {
          for (const op of body.Operations) {
            if (op.value?.active === false) active = false
          }
        }
      }

      if (!active) {
        await admin.auth.admin.updateUserById(id, { ban_duration: '876000h' })
      } else {
        await admin.auth.admin.updateUserById(id, { ban_duration: 'none' })
      }

      return json({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        id,
        active,
        stub: false,
      })
    }

    return json({ detail: 'Not found', status: '404' }, 404)
  } catch (e) {
    return json({ detail: e instanceof Error ? e.message : 'SCIM error', status: '500' }, 500)
  }
})
