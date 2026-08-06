// Supabase Edge Function: retention-purge
// Secrets:
//   RETENTION_CRON_SECRET — shared secret for scheduled callers (pg_cron / GitHub Actions)
// Invoke:
//   POST /functions/v1/retention-purge
//   Authorization: Bearer <service_role OR user JWT>
//   x-cron-secret: <RETENTION_CRON_SECRET>   (required unless caller is admin JWT)
//
// Deploy: supabase functions deploy retention-purge --no-verify-jwt
// (JWT optional; cron secret is the gate for unattended runs)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const cronSecret = Deno.env.get('RETENTION_CRON_SECRET')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!url || !serviceKey) {
    return json({ error: 'Server misconfigured' }, 500)
  }

  const providedSecret = req.headers.get('x-cron-secret') ?? ''
  const authHeader = req.headers.get('Authorization') ?? ''
  let authorized = false
  let ranBy = 'cron'

  if (cronSecret && providedSecret && providedSecret === cronSecret) {
    authorized = true
    ranBy = 'cron'
  } else if (authHeader.startsWith('Bearer ') && anonKey) {
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (user) {
      const { data: profile } = await userClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role === 'admin') {
        authorized = true
        ranBy = user.email ?? user.id
      }
    }
  }

  if (!authorized) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const admin = createClient(url, serviceKey)
  const { data, error } = await admin.rpc('purge_expired_records', { p_ran_by: ranBy })

  if (error) {
    return json({ error: error.message }, 500)
  }

  return json({ ok: true, result: data })
})
