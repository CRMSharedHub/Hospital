// Supabase Edge Function: kms-unwrap
// Returns a DEK passphrase from ENCRYPTION_KEY secret (mock KMS).
// Auth: user JWT required. Deploy: supabase functions deploy kms-unwrap

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return json({ error: 'Unauthorized' }, 401)

    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } })
    const { data: userData, error } = await userClient.auth.getUser()
    if (error || !userData.user) return json({ error: 'Unauthorized' }, 401)

    const material = Deno.env.get('ENCRYPTION_KEY')
    if (!material || material.length < 32) {
      return json({
        error: 'ENCRYPTION_KEY secret not configured (min 32 chars)',
        stub: true,
        provider: 'edge-mock',
      }, 503)
    }

    return json({
      provider: 'edge-mock',
      keyId: 'edge:ENCRYPTION_KEY',
      // Client uses this as AES passphrase — transport is HTTPS only.
      material,
      stub: true,
    })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'KMS unwrap failed' }, 500)
  }
})
