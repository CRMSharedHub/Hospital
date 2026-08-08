# Automatable ops (no legal / cloud-vendor console required for the script itself)

## One-shot helpers

```bash
npm run ops:print              # SQL order + Edge list + secrets
npm run ops:check              # Fail if any SQL / Edge source missing
npm run ops:bundle-sql         # Write supabase/APPLY_ALL.sql (one paste)
npm run ops:gen-secrets        # Print random ENCRYPTION_KEY / cron / SCIM values
npm run ops:verify-env         # Check local .env* presence
npm run ops:deploy-functions   # supabase functions deploy (needs CLI + link)
```

## Local observability (dev)

With `npm run dev` or SSR server:

- `POST /api/errors` — logs client errors (default when `VITE_ERROR_ENDPOINT` unset in DEV)
- `POST /api/vitals` — logs web vitals (default when `VITE_VITALS_ENDPOINT` unset in DEV)

Static nginx accepts the same paths with `204` (discard). Point production env to a real APM.

## SQL order (also printed by ops:print)

Includes `phase-d2-facility-rls.sql` after `phase-d-enterprise.sql`.

## What this automates vs what stays manual

| Automated in repo | Still manual (your accounts) |
|-------------------|------------------------------|
| SQL order checklist + ops CI + APPLY_ALL bundle | Pasting SQL / enabling pg_cron |
| Edge deploy script | `supabase link` + secret values |
| Secret value generation | Setting secrets on the project |
| Local /api/errors + /api/vitals sinks | Production APM URL |
| Honest offline banner | Durable offline mutation queue |
| SSO via `VITE_SSO_PROVIDER` | Enabling provider + IdP app |
| SCIM create/ban users | `SCIM_TOKEN` + IdP connector |
| KMS prefer `kms-unwrap` | Setting `ENCRYPTION_KEY` |
| DLP + audit on export | — |
| Facility RLS + memberships UI | Assigning live Auth user UUIDs |
| CDS drug–drug + allergy | Clinical expansion of pairs |
| Compliance templates + auto-detect | Signing BAA, drills, HR training |
| Live checklist doc | MFA / PITR toggles in Dashboard |

Go-live order: `docs/ops/LIVE_CHECKLIST.md`.
