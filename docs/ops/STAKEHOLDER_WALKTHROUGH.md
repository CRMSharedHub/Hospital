# Live stakeholder walkthrough (30–45 min each)

Use after automated UAT (`npx playwright test --config=playwright.uat.config.ts`).  
Demo auth: `VITE_ALLOW_DEMO_AUTH=true`. Optional local skip MFA: `VITE_DISABLE_MFA=true` (never production).  
Local MFA / overlay notes: `docs/ops/LOCAL_DEMO_UAT.md` (also paste into `LIVE_CHECKLIST.md` §4 when that file is unlocked).

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@cityhospital.com` | `admin123` |
| Doctor | `doctor@cityhospital.com` | `doctor123` |
| Nurse | `nurse@cityhospital.com` | `nurse123` |
| Patient | `patient@cityhospital.com` | `patient123` |

---

## 1. HIM / hospital admin (~40 min)

**Goal:** billing, claims, compliance, facilities, audit feel usable for go-live dry-run.

1. Sign in as **Admin**. If MFA appears: password already succeeded — enroll/verify or use local `VITE_DISABLE_MFA`.
2. Open **Billing** — open an invoice, confirm totals readable, note any empty/zero seed flash.
3. Open **Claims** — create or open a claim draft; confirm status labels make sense.
4. Open **Compliance** — walk checklist rows; confirm links to BAA / breach / training docs.
5. Open **Facilities** — switch facility in header; confirm list filters or empty state is clear.
6. Open **Audit log** — confirm recent actions appear after claim/facility steps.
7. Negative check: try `/portal` — expect redirect away (no patient portal for admin).

**Ask them:** Can HIM run claim create + facility switch without training deck? What is still confusing?

---

## 2. Nursing / charge nurse (~35 min)

**Goal:** census/ADT, eMAR, pharmacy view, messages for shift handoff.

1. Sign in as **Nurse**.
2. **Census** — bed/ward status; admit or transfer if UI allows; note unclear statuses.
3. **eMAR** — pick a patient due med; walk admin path without giving real drugs; note timing cues.
4. **Pharmacy** (view) — confirm med list readable; note missing edit is expected for nurse.
5. **Messages** — open thread; send test note if allowed.
6. Negative: **Reports** and **Billing** should be absent or denied.

**Ask them:** Can charge nurse hand off beds + meds in one pass? Where do they get stuck?

---

## 3. IT / security (~45 min)

**Goal:** MFA, env, Edge, checklist — not clinical polish.

1. Confirm `.env` / `.env.local`: real `VITE_SUPABASE_*` for staging; **no** `VITE_DISABLE_MFA` / `VITE_ALLOW_DEMO_AUTH` on staging build.
2. Follow `docs/ops/LIVE_CHECKLIST.md` §§0–4 (link, SQL order, secrets, Edge deploy, MFA TOTP).
3. Staff login with MFA enroll → AAL2; cancel/re-login and verify challenge (not silent bypass).
4. Optional: SSO stub vs real `VITE_SSO_PROVIDER`; SCIM token smoke if IdP ready.
5. Confirm PITR / backups §5 scheduled; document RPO/RTO owner.
6. Health: `npm run ops:verify-env`, staging `/health`, no checker overlay needed for prod build.

**Ask them:** Blockers on secrets, MFA, PITR, or IdP before pilot date?

---

## Optional clinical add-on (attending, ~30 min)

Doctor login → **Orders** (place lab) → **eMAR** / **Lab** → confirm CDS cues → deny **Billing**.

---

## Capture

| Stakeholder | Date | Pass / blockers | Owner |
|-------------|------|-----------------|-------|
| HIM / admin | | | |
| Nursing | | | |
| IT / security | | | |
| Attending (opt.) | | | |
