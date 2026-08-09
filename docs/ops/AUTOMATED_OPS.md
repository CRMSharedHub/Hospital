# Automatable ops (no legal / cloud-vendor console required for the script itself)

## One-shot helpers

```bash
npm run ops:print              # SQL order + Edge list + secrets
npm run ops:check              # Fail if any SQL / Edge source missing
npm run ops:bundle-sql         # Write supabase/APPLY_ALL.sql (one paste)
npm run ops:gen-secrets        # Print random ENCRYPTION_KEY / cron / SCIM values
npm run ops:write-secrets      # Persist values to gitignored .env.edge-secrets
npm run ops:sync-config        # Ensure supabase/config.toml lists all functions
npm run ops:doctor             # CLI + link + sources + secrets readiness
npm run ops:set-secrets        # Push secrets to linked project (needs login+link)
npm run ops:deploy-functions   # Deploy all 8 Edge functions (needs CLI + link)
npm run ops:go-live-edge       # sync-config → set-secrets → deploy-functions
npm run ops:smoke-edge         # OPTIONS probe against VITE_SUPABASE_URL
npm run ops:verify-env         # Check local .env* presence
```

## Edge go-live (one command after link)

```bash
npx supabase login
npx supabase link --project-ref <ref>
npm run ops:write-secrets      # once — keep .env.edge-secrets safe
npm run ops:go-live-edge
npm run ops:smoke-edge
```

Or via GitHub Actions: set `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, plus the three Edge secrets, then run workflow **Edge deploy**.

Daily purge: workflow **Retention cron** needs `SUPABASE_URL` + `RETENTION_CRON_SECRET`.

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
| Edge config sync + doctor + smoke | `supabase login` + `link` |
| Secret generation + set-secrets / CI deploy | Creating Access Token + project ref |
| Local /api/errors + /api/vitals sinks | Production APM URL |
| Honest offline banner | Durable offline mutation queue |
| SSO via `VITE_SSO_PROVIDER` | Enabling provider + IdP app |
| SCIM create/ban users | IdP connector pointed at `/functions/v1/scim` |
| KMS prefer `kms-unwrap` | Keeping ENCRYPTION_KEY stable across deploys |
| DLP + audit on export | — |
| Facility RLS + memberships UI | Assigning live Auth user UUIDs |
| CDS drug–drug + allergy + admin rules | DB-backed rules, override reasons, `/cds-rules` UI |
| Compliance templates + auto-detect | Signing BAA, drills, HR training |
| Retention cron GitHub Action | MFA / PITR toggles in Dashboard |

Go-live order: `docs/ops/LIVE_CHECKLIST.md`.
