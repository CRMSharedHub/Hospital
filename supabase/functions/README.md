# Edge Functions

Full checklist: `docs/ops/PHASE_A_DEPLOY.md`

## medical-files

1. Install CLI: `npm i -g supabase`
2. Link: `supabase link --project-ref <ref>`
3. Secrets: `supabase secrets set ENCRYPTION_KEY="your-32+-char-secret"`
4. Deploy: `supabase functions deploy medical-files`
5. Dashboard → Authentication → Multi-Factor → enable TOTP

Authorization (service role bypasses Storage RLS — enforced in function):

- admin / doctor / nurse: upload + download any `{patientId}/...`
- patient: download only own `linked_patient_id` folder; upload denied

Client: `supabase.functions.invoke('medical-files', { body: { action, ... } })`

## retention-purge

1. Apply SQL: `supabase/phase-a-compliance.sql`
2. Secret: `supabase secrets set RETENTION_CRON_SECRET="..."`
3. Deploy: `supabase functions deploy retention-purge --no-verify-jwt`
4. Schedule daily POST with header `x-cron-secret` (see Phase A deploy doc)

Purges completed/cancelled appointments (>2y) and pharmacy orders (>3y). Clinical tables stay for 7 years.

## payments + fhir-r4 (Phase C1)

See `docs/ops/PHASE_C_PAYMENTS.md`.

```bash
supabase functions deploy payments --no-verify-jwt
supabase functions deploy fhir-r4
```

## mllp-ingest + nphies (Phase C3)

See `docs/ops/PHASE_C3_REMAINING.md`.

```bash
supabase functions deploy mllp-ingest
supabase functions deploy nphies
```

