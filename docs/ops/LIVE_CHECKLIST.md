# Live go-live checklist (manual console steps)

Repo code + stubs are ready. These steps require **your** Supabase / IdP / legal accounts.

## 0. Prep

```bash
npm run ops:print
npm run ops:check
npm run ops:verify-env
npm run ops:gen-secrets          # optional: print random secret values
npm run ops:bundle-sql           # optional: one-file SQL paste → supabase/APPLY_ALL.sql
supabase login
supabase link --project-ref <ref>
```

## 1. SQL (Dashboard → SQL Editor)

**Option A:** Run every file listed by `npm run ops:print` in order (includes `phase-a-cron.sql` last if Pro+).

**Option B (faster paste):** `npm run ops:bundle-sql` then open `supabase/APPLY_ALL.sql` in the SQL Editor.

## 2. Secrets

```bash
npm run ops:gen-secrets   # prints values — copy into the commands below
supabase secrets set ENCRYPTION_KEY="<min-32-chars>"
supabase secrets set RETENTION_CRON_SECRET="<random>"
supabase secrets set SCIM_TOKEN="<random>"
# optional Stripe / APP_ORIGIN
```

## 3. Edge Functions

```bash
npm run ops:deploy-functions
```

## 4. MFA (Dashboard)

1. Authentication → Providers → Email on  
2. Authentication → Multi-Factor → enable **TOTP**  
3. Sign in as staff → enroll MFA → confirm AAL2  

## 5. PITR / Backups (Dashboard)

1. Project → Database → Backups  
2. Enable **Point-in-Time Recovery** (Pro+)  
3. Document RPO/RTO in your runbook  
4. Quarterly: restore to staging and smoke-test  

## 6. SSO (IdP + Supabase)

1. Create OIDC app in Azure AD / Okta / Google  
2. Set redirect URI to Supabase Auth callback  
3. Dashboard → Authentication → Providers → enable Azure/Google/…  
4. App env: `VITE_SSO_PROVIDER=azure` (or google/github)  
5. Login → **Continue with SSO**  

## 7. SCIM (optional)

1. Point IdP SCIM to `https://<project>.supabase.co/functions/v1/scim`  
2. Bearer token = `SCIM_TOKEN`  
3. Test create + deactivate  

## 8. Legal / process (cannot automate)

| Item | Template |
|------|----------|
| BAA with vendors | `docs/compliance/BAA_CHECKLIST.md` |
| Breach response | `docs/compliance/BREACH_PLAYBOOK.md` |
| Workforce training | `docs/compliance/WORKFORCE_TRAINING.md` |

After signing/training, mark rows **done** on `/compliance`.

## 9. Verify

```bash
npm test
npm run build
curl -s https://your-host/health
```

Manual: staff login + MFA → facility switcher → place pharmacy order with CDS → export report (audit + DLP) → patient portal.
