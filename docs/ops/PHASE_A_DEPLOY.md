# Phase A deploy checklist (~48% single-clinic target)

Run these on your Supabase project and hosting. Code in this repo is ready; live infra is required for production PHI.

## 1. SQL

In **Supabase Dashboard → SQL Editor**, run in order:

1. `supabase/schema.sql` (new projects) or skip if already applied
2. `supabase/security-hardening.sql`
3. `supabase/phase-a-compliance.sql` (consent_records + purge function)

## 2. Auth MFA

Local demo friction (skip MFA / checker overlay): see `docs/ops/LOCAL_DEMO_UAT.md`. Production: do **not** set `VITE_DISABLE_MFA` or `VITE_ALLOW_DEMO_AUTH`.

Dashboard → **Authentication → Multi-Factor** → enable **TOTP**.

## 3. Edge Functions

```bash
supabase link --project-ref <your-ref>
supabase secrets set ENCRYPTION_KEY="<min-32-char-secret>"
supabase secrets set RETENTION_CRON_SECRET="<random-long-secret>"
supabase functions deploy medical-files
supabase functions deploy retention-purge --no-verify-jwt
```

## 4. Scheduled retention purge

Example GitHub Action / cron (daily):

```bash
curl -X POST "https://<project>.supabase.co/functions/v1/retention-purge" \
  -H "x-cron-secret: $RETENTION_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Or call `SELECT public.purge_expired_records('pg_cron');` via Supabase pg_cron with service role.

## 5. Backups

Dashboard → **Database → Backups**:

- Enable **Point-in-Time Recovery (PITR)** on Pro+ (recommended for PHI)
- Confirm daily backups are on; document RPO/RTO in your runbook
- Quarterly: restore a backup to a staging project and smoke-test login + patient read

## 6. Monitoring

| Signal | How |
|--------|-----|
| App liveness | `GET /health` (nginx + SSR server) → `{"status":"ok"}` |
| Client errors | Set `VITE_ERROR_ENDPOINT` to your sink (Sentry relay / custom API) |
| Web Vitals | Set `VITE_VITALS_ENDPOINT` (sendBeacon payload) |
| Edge logs | Dashboard → Edge Functions → Logs |
| DB | Dashboard → Reports / Advisors |

Wire uptime checks (e.g. UptimeRobot) to `https://your-host/health`.

## 7. Frontend env (production)

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
# Do NOT set VITE_ALLOW_DEMO_AUTH or VITE_DISABLE_MFA
# Do NOT set VITE_ALLOW_CLIENT_ENCRYPTION with real PHI
VITE_ERROR_ENDPOINT=https://...
VITE_VITALS_ENDPOINT=https://...
```

## 8. Verify

```bash
npm run test          # unit
npm run test:e2e      # Playwright (demo build)
npm run build         # prod bundle — no demo passwords
curl -s https://your-host/health
```

Manual: sign in with Supabase user → MFA → accept consent banner → confirm row in `consent_records`.
