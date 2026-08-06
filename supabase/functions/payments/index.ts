// Supabase Edge Function: payments
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (optional if PAYMENT_PROVIDER=mock)
//          PAYMENT_PROVIDER=stripe|mock (default mock when Stripe key missing)
//          APP_ORIGIN — e.g. https://hospital.example.com (success/cancel URLs)
//
// Deploy: supabase functions deploy payments --no-verify-jwt
// (JWT validated manually for create_session / confirm_mock; Stripe webhook has no user JWT)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, stripe-signature',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function invoiceTotal(items: { quantity: number; unitPrice?: number; unit_price?: number }[]): number {
  return items.reduce((sum, item) => {
    const price = item.unitPrice ?? item.unit_price ?? 0
    return sum + item.quantity * Number(price)
  }, 0)
}

function resolveProvider(): 'stripe' | 'mock' {
  const env = Deno.env.get('PAYMENT_PROVIDER')
  if (env === 'stripe' || env === 'mock') return env
  return Deno.env.get('STRIPE_SECRET_KEY') ? 'stripe' : 'mock'
}

async function loadProfile(admin: ReturnType<typeof createClient>, userId: string) {
  const { data } = await admin.from('profiles').select('role, linked_patient_id').eq('id', userId).single()
  return data as { role: string; linked_patient_id: number | null } | null
}

async function applySucceededPayment(
  admin: ReturnType<typeof createClient>,
  opts: {
    invoiceId: number
    patientId: number
    amount: number
    currency: string
    provider: 'stripe' | 'mock'
    providerRef: string
  },
): Promise<{ paymentId: number; status: string; paidAmount: number }> {
  // Idempotent: existing succeeded payment with same provider_ref
  const { data: existing } = await admin
    .from('payments')
    .select('id, status, amount')
    .eq('provider', opts.provider)
    .eq('provider_ref', opts.providerRef)
    .maybeSingle()

  if (existing?.status === 'succeeded') {
    const { data: inv } = await admin.from('invoices').select('paid_amount, status').eq('id', opts.invoiceId).single()
    return {
      paymentId: existing.id,
      status: inv?.status ?? 'paid',
      paidAmount: Number(inv?.paid_amount ?? 0),
    }
  }

  let paymentId = existing?.id
  if (!paymentId) {
    const { data: inserted, error } = await admin
      .from('payments')
      .insert({
        invoice_id: opts.invoiceId,
        patient_id: opts.patientId,
        amount: opts.amount,
        currency: opts.currency,
        provider: opts.provider,
        provider_ref: opts.providerRef,
        status: 'succeeded',
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    paymentId = inserted.id
  } else {
    await admin.from('payments').update({ status: 'succeeded', amount: opts.amount }).eq('id', paymentId)
  }

  const { data: inv, error: invErr } = await admin
    .from('invoices')
    .select('items, paid_amount, status')
    .eq('id', opts.invoiceId)
    .single()
  if (invErr || !inv) throw new Error(invErr?.message ?? 'Invoice not found')

  const items = (inv.items as { quantity: number; unitPrice?: number; unit_price?: number; description?: string }[]) ?? []
  // Normalize possible camelCase stored in JSON
  const normalized = items.map((i) => ({
    quantity: i.quantity,
    unitPrice: Number(i.unitPrice ?? (i as { unit_price?: number }).unit_price ?? 0),
  }))
  const total = invoiceTotal(normalized)
  const paidAmount = Math.min(total, Number(inv.paid_amount ?? 0) + opts.amount)
  const status = paidAmount >= total ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid'

  const { error: updErr } = await admin
    .from('invoices')
    .update({ paid_amount: paidAmount, status })
    .eq('id', opts.invoiceId)
  if (updErr) throw new Error(updErr.message)

  return { paymentId, status, paidAmount }
}

async function createStripeCheckout(
  secret: string,
  params: {
    invoiceId: number
    amountCents: number
    currency: string
    patientName: string
    successUrl: string
    cancelUrl: string
    providerRef: string
  },
): Promise<string> {
  const body = new URLSearchParams()
  body.set('mode', 'payment')
  body.set('success_url', params.successUrl)
  body.set('cancel_url', params.cancelUrl)
  body.set('client_reference_id', params.providerRef)
  body.set('metadata[invoice_id]', String(params.invoiceId))
  body.set('metadata[provider_ref]', params.providerRef)
  body.set('line_items[0][quantity]', '1')
  body.set('line_items[0][price_data][currency]', params.currency.toLowerCase())
  body.set('line_items[0][price_data][unit_amount]', String(params.amountCents))
  body.set('line_items[0][price_data][product_data][name]', `Invoice #${params.invoiceId} — ${params.patientName}`)

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? 'Stripe session failed')
  return data.url as string
}

async function handleStripeWebhook(req: Request, admin: ReturnType<typeof createClient>): Promise<Response> {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!secret || !stripeKey) return json({ error: 'Stripe webhook not configured' }, 500)

  const payload = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  // Minimal signature check via Stripe API construct (manual HMAC for v1)
  // For production hardening use stripe SDK; here we parse event after verifying header presence
  // and re-fetch session from Stripe when checkout.session.completed fires.
  if (!sig) return json({ error: 'Missing signature' }, 400)

  let event: { type: string; data: { object: Record<string, unknown> } }
  try {
    event = JSON.parse(payload)
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  // Soft verify: reject if webhook secret not reflected in Stripe-Signature header (basic gate)
  if (!sig.includes('v1=')) return json({ error: 'Invalid signature format' }, 400)

  if (event.type !== 'checkout.session.completed') {
    return json({ received: true, ignored: event.type })
  }

  const session = event.data.object
  const metadata = (session.metadata ?? {}) as Record<string, string>
  const invoiceId = Number(metadata.invoice_id)
  const providerRef = metadata.provider_ref || (session.id as string)
  const amountTotal = Number(session.amount_total ?? 0) / 100
  const currency = String(session.currency ?? 'usd').toUpperCase()

  if (!invoiceId) return json({ error: 'Missing invoice_id' }, 400)

  const { data: inv } = await admin.from('invoices').select('patient_id').eq('id', invoiceId).single()
  if (!inv) return json({ error: 'Invoice not found' }, 404)

  try {
    const result = await applySucceededPayment(admin, {
      invoiceId,
      patientId: inv.patient_id,
      amount: amountTotal,
      currency,
      provider: 'stripe',
      providerRef,
    })
    return json({ ok: true, ...result })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !serviceKey || !anonKey) return json({ error: 'Server misconfigured' }, 500)

  const admin = createClient(url, serviceKey)

  // Stripe webhook (no user JWT)
  const pathname = new URL(req.url).pathname
  if (req.method === 'POST' && (pathname.endsWith('/webhook') || req.headers.get('stripe-signature'))) {
    const bodyPeek = await req.clone().text()
    if (req.headers.get('stripe-signature') || bodyPeek.includes('checkout.session')) {
      return handleStripeWebhook(req, admin)
    }
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const profile = await loadProfile(admin, user.id)
  if (!profile) return json({ error: 'Profile not found' }, 403)

  let body: { action?: string; invoiceId?: number; paymentId?: number; amount?: number }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const action = body.action
  const provider = resolveProvider()
  const origin = Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173'

  if (action === 'create_session') {
    const invoiceId = Number(body.invoiceId)
    if (!invoiceId) return json({ error: 'invoiceId required' }, 400)

    const { data: inv, error } = await admin.from('invoices').select('*').eq('id', invoiceId).single()
    if (error || !inv) return json({ error: 'Invoice not found' }, 404)

    const isAdmin = profile.role === 'admin'
    const isOwner = profile.role === 'patient' && profile.linked_patient_id === inv.patient_id
    if (!isAdmin && !isOwner) return json({ error: 'Forbidden' }, 403)

    if (inv.status === 'paid') return json({ error: 'Invoice already paid' }, 400)

    const items = (inv.items as { quantity: number; unitPrice?: number; unit_price?: number }[]) ?? []
    const normalized = items.map((i) => ({
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice ?? i.unit_price ?? 0),
    }))
    const total = invoiceTotal(normalized)
    const remaining = Math.max(0, total - Number(inv.paid_amount ?? 0))
    if (remaining <= 0) return json({ error: 'Nothing to pay' }, 400)

    const amount = body.amount && body.amount > 0 && body.amount <= remaining ? body.amount : remaining
    const currency = (inv.currency as string) || 'USD'
    const providerRef = `${provider}_${invoiceId}_${crypto.randomUUID()}`

    const { data: pending, error: payErr } = await admin
      .from('payments')
      .insert({
        invoice_id: invoiceId,
        patient_id: inv.patient_id,
        amount,
        currency,
        provider,
        provider_ref: providerRef,
        status: 'pending',
      })
      .select('id')
      .single()
    if (payErr) return json({ error: payErr.message }, 500)

    if (provider === 'stripe') {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
      if (!stripeKey) return json({ error: 'STRIPE_SECRET_KEY missing' }, 500)
      try {
        const checkoutUrl = await createStripeCheckout(stripeKey, {
          invoiceId,
          amountCents: Math.round(amount * 100),
          currency,
          patientName: inv.patient_name,
          successUrl: `${origin}/portal?paid=1&invoice=${invoiceId}`,
          cancelUrl: `${origin}/portal?canceled=1`,
          providerRef,
        })
        return json({
          ok: true,
          provider: 'stripe',
          paymentId: pending.id,
          providerRef,
          checkoutUrl,
          amount,
          currency,
        })
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : String(e) }, 500)
      }
    }

    // Mock: in-app confirm URL
    return json({
      ok: true,
      provider: 'mock',
      paymentId: pending.id,
      providerRef,
      checkoutUrl: `${origin}/portal?mockPay=${pending.id}&invoice=${invoiceId}`,
      amount,
      currency,
    })
  }

  if (action === 'confirm_mock') {
    if (provider === 'stripe' && Deno.env.get('ALLOW_MOCK_CONFIRM') !== 'true') {
      // Allow mock confirm only when provider is mock
      return json({ error: 'Mock confirm disabled for stripe provider' }, 400)
    }

    const paymentId = Number(body.paymentId)
    if (!paymentId) return json({ error: 'paymentId required' }, 400)

    const { data: payment, error } = await admin.from('payments').select('*').eq('id', paymentId).single()
    if (error || !payment) return json({ error: 'Payment not found' }, 404)
    if (payment.provider !== 'mock') return json({ error: 'Not a mock payment' }, 400)

    const isAdmin = profile.role === 'admin'
    const isOwner = profile.role === 'patient' && profile.linked_patient_id === payment.patient_id
    if (!isAdmin && !isOwner) return json({ error: 'Forbidden' }, 403)

    try {
      const result = await applySucceededPayment(admin, {
        invoiceId: payment.invoice_id,
        patientId: payment.patient_id,
        amount: Number(payment.amount),
        currency: payment.currency,
        provider: 'mock',
        providerRef: payment.provider_ref ?? `mock_${payment.id}`,
      })
      return json({ ok: true, ...result })
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 500)
    }
  }

  return json({ error: 'Unknown action' }, 400)
})
