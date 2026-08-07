# Automatable ops (no legal / cloud-vendor console required for the script itself)

## One-shot helpers

```bash
npm run ops:print              # SQL order + Edge list + secrets
npm run ops:verify-env         # Check local .env* presence
npm run ops:deploy-functions   # supabase functions deploy (needs CLI + link)
```

## SQL order (also printed by ops:print)

Includes `phase-d2-facility-rls.sql` after `phase-d-enterprise.sql`.

## What this automates vs what stays manual

| Automated in repo | Still manual (your accounts) |
|-------------------|------------------------------|
| SQL order checklist + ops CI | Pasting SQL / enabling pg_cron |
| Edge deploy script | `supabase link` + secret values |
| SSO via `VITE_SSO_PROVIDER` | Enabling provider + IdP app |
| SCIM create/ban users | `SCIM_TOKEN` + IdP connector |
| KMS prefer `kms-unwrap` | Setting `ENCRYPTION_KEY` |
| DLP + audit on export | — |
| Facility RLS + memberships UI | Assigning live Auth user UUIDs |
| CDS drug–drug + allergy | Clinical expansion of pairs |
| Compliance templates + auto-detect | Signing BAA, drills, HR training |
| Live checklist doc | MFA / PITR toggles in Dashboard |

Go-live order: `docs/ops/LIVE_CHECKLIST.md`.
