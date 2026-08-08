# Local demo / UAT notes (MFA + checker overlay)

Companion to `LIVE_CHECKLIST.md` §4. **Not for production builds.**

## MFA after password (expected)

Admin and doctor demo roles require MFA after a successful password. That is **not** a failed login — the UI shows a pending-MFA hint and the MFA modal.

For friction-free local walkthroughs only:

1. In `.env.local` set `VITE_ALLOW_DEMO_AUTH=true` and `VITE_DISABLE_MFA=true`
2. Restart Vite
3. **Never** ship those flags to production / staging with real PHI

## Checker overlay (UX-01)

`vite-plugin-checker` overlay is **off by default** (terminal diagnostics remain). It used to intercept clicks on `npm run dev`.

- Opt in: `VITE_CHECKER_OVERLAY=true`
- Prefer stakeholder UAT via `npx playwright test --config=playwright.uat.config.ts` (preview build on `:4174`)

## Live sessions

See `docs/ops/STAKEHOLDER_WALKTHROUGH.md` for HIM / nursing / IT scripts.
