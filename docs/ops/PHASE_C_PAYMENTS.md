# Phase C1 — Payments, Statements, Claims stub, FHIR R4

## SQL

Run in Supabase SQL Editor after Phase A scripts:

```
supabase/phase-c-payments.sql
```

Creates `payments`, `claims`, and `invoices.currency`.

## Edge Functions

```bash
supabase secrets set PAYMENT_PROVIDER=mock
# For live Stripe:
# supabase secrets set PAYMENT_PROVIDER=stripe
# supabase secrets set STRIPE_SECRET_KEY=sk_...
# supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
# supabase secrets set APP_ORIGIN=https://your-host

supabase functions deploy payments --no-verify-jwt
supabase functions deploy fhir-r4
```

Stripe webhook URL:

```
https://<project>.supabase.co/functions/v1/payments
```

(Header `stripe-signature` required. Event: `checkout.session.completed`.)

## Frontend env

```env
VITE_PAYMENT_PROVIDER=mock
# VITE_PAYMENT_PROVIDER=stripe
# VITE_STRIPE_PUBLISHABLE_KEY=pk_...   # optional until Elements
```

E2E uses mock via `.env.e2e`.

## Flows

1. **Patient portal** `/portal` — statements, pay remaining balance, payment history.
2. **Admin billing** `/billing` — Pay now (Stripe or mock), mark paid, open claims.
3. **Claims** `/claims` — draft from invoice with ICD-10/CPT; submit/accept stubs (no clearinghouse).
4. **FHIR R4** (read-only):

```js
await supabase.functions.invoke('fhir-r4', {
  body: { resourceType: 'Patient', id: 101 },
})
// Invoice: { resourceType: 'Invoice', id: 5 }
// Account: { resourceType: 'Account', patientId: 101 }
// metadata: { resourceType: 'CapabilityStatement' }
```

Without Supabase, `fetchFhirResource` in `src/lib/paymentsApi.ts` maps locally via `fhirMappers.ts`.

## Out of scope (later)

HL7 v2, remittance EDI, NPHIES/X12, Stripe Elements, patient messaging.
