// Supabase Edge Function: mllp-ingest
// Accepts MLLP-framed or bare HL7 v2 over HTTP; returns MSA ACK.
// Optional: when message is ORU^R01 and service role can write lab_tests, completes a matching ordered test.
//
// Deploy: supabase functions deploy mllp-ingest

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VT = '\x0b'
const FS = '\x1c'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function stripMarkers(s: string): string {
  let out = s
  if (out.startsWith(VT)) out = out.slice(VT.length)
  if (out.endsWith(`${FS}\r`)) out = out.slice(0, -2)
  else if (out.endsWith(FS)) out = out.slice(0, -1)
  return out
}

function unframe(raw: string): string {
  const vt = raw.indexOf(VT)
  const fs = raw.indexOf(FS, vt >= 0 ? vt : 0)
  if (vt >= 0 && fs > vt) return raw.slice(vt + 1, fs)
  return stripMarkers(raw)
}

function frame(hl7: string): string {
  return `${VT}${hl7}${FS}\r`
}

function parseSegments(hl7: string): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const line of hl7.split(/\r|\n/).filter(Boolean)) {
    const parts = line.split('|')
    const tag = parts[0]
    if (!tag) continue
    out[tag] = parts
  }
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const contentType = req.headers.get('content-type') || ''
    let payload = ''
    if (contentType.includes('application/json')) {
      const body = await req.json() as { message?: string; hl7?: string }
      payload = body.message || body.hl7 || ''
    } else {
      payload = await req.text()
    }
    if (!payload.trim()) return json({ error: 'Empty HL7/MLLP body' }, 400)

    const hl7 = unframe(payload)
    const segs = parseSegments(hl7)
    const msh = segs.MSH
    const pid = segs.PID
    const obr = segs.OBR
    const obx = segs.OBX
    const controlId = msh?.[9] || `CTL${Date.now()}`
    const msgType = (msh?.[8] || '').replace('^', '_')

    const patientIdRaw = (pid?.[3] || '').split('^')[0]
    const patientId = Number(patientIdRaw)
    const result = obx?.[5] || obr?.[4] || ''
    const testName = (obr?.[4] || 'Lab result').split('^')[0] || 'Lab result'

    let labUpdated: number | null = null
    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (url && key && patientId && result && msgType.toUpperCase().includes('ORU')) {
      const admin = createClient(url, key)
      const { data: ordered } = await admin
        .from('lab_tests')
        .select('id')
        .eq('patient_id', patientId)
        .in('status', ['ordered', 'in-progress'])
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (ordered?.id) {
        await admin
          .from('lab_tests')
          .update({ status: 'completed', result: String(result) })
          .eq('id', ordered.id)
        labUpdated = ordered.id as number
      } else {
        const { data: inserted } = await admin
          .from('lab_tests')
          .insert({
            patient_id: patientId,
            patient_name: (pid?.[5] || '').replace('^', ' ') || 'Unknown',
            test_name: testName,
            category: 'Interop',
            date: new Date().toISOString().slice(0, 10),
            status: 'completed',
            result: String(result),
          })
          .select('id')
          .single()
        labUpdated = inserted?.id ?? null
      }
    }

    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
    const ackHl7 = [
      `MSH|^~\\&|DYNEX360|HOSP|REMOTE|LIS|${stamp}||ACK|ACK${controlId}|P|2.5`,
      `MSA|AA|${controlId}`,
    ].join('\r')
    const ack = frame(ackHl7)

    return json({
      ok: true,
      ack,
      controlId,
      messageType: msh?.[8] || null,
      patientId: patientId || null,
      labUpdated,
      stub: true,
    })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'MLLP ingest failed' }, 500)
  }
})
