// Supabase Edge Function: nphies
// Mock NPHIES eligibility + claim submit. No live CHI credentials.
//
// Deploy: supabase functions deploy nphies

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

function hashStub(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return json({ error: 'Unauthorized' }, 401)

    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json() as {
      action?: string
      nationalId?: string
      payerId?: string
      memberId?: string
      claimId?: number
      icd10Codes?: string[]
      cptCodes?: string[]
      total?: number
    }

    const action = body.action || 'eligibility'

    if (action === 'eligibility') {
      const id = (body.nationalId || '').replace(/\D/g, '')
      if (id.length < 5) {
        return json({
          status: 'unknown',
          payerName: body.payerId || 'NPHIES Mock Payer',
          coveragePercent: 0,
          memberId: '',
          policyNumber: '',
          message: 'National ID too short',
          stub: true,
        })
      }
      const ineligible = id.endsWith('9') && Number(id.slice(-1)) % 2 === 1
      if (ineligible) {
        return json({
          status: 'ineligible',
          payerName: body.payerId || 'NPHIES Mock Payer',
          coveragePercent: 0,
          memberId: body.memberId || `MEM-${id.slice(-6)}`,
          policyNumber: '',
          message: 'Coverage not active (mock)',
          stub: true,
        })
      }
      return json({
        status: 'eligible',
        payerName: body.payerId || 'NPHIES Mock Payer',
        coveragePercent: 70 + (hashStub(id) % 30),
        memberId: body.memberId || `MEM-${id.slice(-6)}`,
        policyNumber: `POL-${hashStub(id).toString(16).toUpperCase().slice(0, 8)}`,
        message: 'Eligible under mock NPHIES coverage',
        stub: true,
      })
    }

    if (action === 'submit') {
      const icd = body.icd10Codes || []
      const cpt = body.cptCodes || []
      if (!icd.length || !cpt.length) {
        return json({
          submissionId: '',
          status: 'rejected',
          externalRef: '',
          message: 'ICD-10 and CPT codes required',
          stub: true,
        })
      }
      const claimId = body.claimId || 0
      const submissionId = `NPH-${claimId}-${Date.now()}`
      const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (service && claimId) {
        const admin = createClient(url, service)
        await admin
          .from('claims')
          .update({ status: 'submitted', external_ref: submissionId })
          .eq('id', claimId)
      }
      return json({
        submissionId,
        status: 'accepted',
        externalRef: submissionId,
        message: 'Accepted by NPHIES mock gateway',
        stub: true,
      })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'NPHIES stub failed' }, 500)
  }
})
