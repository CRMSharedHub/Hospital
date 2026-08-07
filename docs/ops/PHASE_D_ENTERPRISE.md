# Phase D — Enterprise scale (multi-facility, SSO/SCIM, KMS/DLP, HIPAA checklist)

Apply after Phase C3 (or after B4 if C3 already applied).

## SQL

```
supabase/phase-d-enterprise.sql
```

Creates:

- `facilities` + `facility_memberships`
- `patients.facility_id`
- `profiles.active_facility_id`, `external_idp_sub`, `scim_external_id`
- `compliance_attestations` (HIPAA/BAA checklist seed)

## Edge Functions

```bash
supabase secrets set SCIM_TOKEN="long-random-token"
# ENCRYPTION_KEY already used by medical-files — reused by kms-unwrap

supabase functions deploy scim --no-verify-jwt
supabase functions deploy kms-unwrap
```

## App surfaces

| Route | Role | Purpose |
|-------|------|---------|
| `/facilities` | admin | CRUD facilities · SCIM stub playground · set active filter |
| Header select | staff/admin | Active facility filter (patients list) |
| `/compliance` | admin | HIPAA/BAA checklist + KMS status |
| `/login` | demo | SSO stub (`Continue with SSO`) |

## Local libs

| Module | Role |
|--------|------|
| `facility.ts` | Code normalize + filter helpers |
| `sso.ts` | OIDC authorize/callback stubs |
| `scim.ts` | In-memory SCIM user create/deactivate |
| `kms.ts` | Env / mock key resolution |
| `dlp.ts` | PHI redaction for exports |

`exportCSV` / `exportJSON` redact by default (`opts.dlp: false` to disable).

## Still not live enterprise

Real Azure AD / Okta OIDC (enable in Dashboard + `VITE_SSO_PROVIDER`), cloud KMS (AWS/GCP), formal BAA legal process — see `AUTOMATED_OPS.md` for what the repo automates.
