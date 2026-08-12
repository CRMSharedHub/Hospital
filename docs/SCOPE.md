# Hospital Management System — Project Scope

## Completed
1. Professional dashboard UI (React + Vite + Tailwind).
2. Responsive layout with sidebar, header, and overview cards.
3. Patients, Doctors, and Appointments listing pages.
4. Arabic/English language toggle with RTL support.
5. Mock data layer for rapid frontend iteration.

## Completed
3. **Advanced Appointment Management**
   - Booking form with doctor, patient, date, time, status.
   - Conflict detection for same doctor + same time slot.
   - Appointment list filters and creation flow.

4. **Electronic Health Record (EHR) / Patient File**
   - Patient detail view with medical history.
   - Tabs for visits, medications, notes, and uploaded files.
   - Navigation from patient list to patient record.

5. **Billing Module**
   - Invoice list with status filters (unpaid, partial, paid).
   - Expandable invoice detail with line items and totals.
   - Mark invoices as paid; revenue and outstanding stats.

6. **Pharmacy Module**
   - Medicine inventory with stock levels and expiry tracking.
   - Pharmacy orders with dispense workflow and stock deduction.
   - Low-stock and out-of-stock indicators.

7. **Lab Module**
   - Lab test orders with status workflow (ordered → in-progress → completed).
   - Result entry modal for completed tests.
   - Filter by status; stats for ordered, in-progress, and completed tests.

8. **Reports & Analytics**
   - Cross-module analytics dashboard with KPIs.
   - Appointment status donut chart, doctor workload bars, monthly revenue trend.
   - Billing, pharmacy, and lab summary cards with progress bars.
   - Reusable chart components (BarChart, DonutChart, ProgressBar).

9. **Notifications & Reminders**
   - Real-time notification engine scanning appointments, invoices, pharmacy, and lab data.
   - Notification types: today's appointments, upcoming, overdue invoices, low/out-of-stock medicines, pending pharmacy orders, lab results ready.
   - Dropdown notification panel with unread badge, mark-as-read, clear-all, and click-to-navigate.
   - Zustand store with localStorage persistence and dedup logic.

10. **Accessibility & PWA**
    - PWA: manifest.json, service worker (offline cache), installable on mobile/desktop.
    - Skip-to-content link for keyboard users.
    - ARIA labels and roles on navigation, dialogs, buttons, and inputs.
    - aria-live region on notification badge.
    - Associated label/input pairs on login form.
    - Click-outside-to-close on command palette and notification panel.

11. **Authentication & Role-Based Access Control (RBAC)**
    - 4 roles: admin, doctor, nurse, patient — each with granular permissions.
    - 17 permissions covering view/edit per module plus users:manage.
    - ProtectedRoute checks both authentication and route-level permission.
    - Sidebar dynamically filters navigation items by user permissions.
    - Login page with quick-login buttons for each demo role.
    - RoleBadge component showing user's role in header and settings.
    - Settings page displays full permission list for current user.
    - usePermission hook for component-level permission checks.

12. **Automated E2E Tests (Playwright)**
    - Playwright config with auto-build-and-preview webServer.
    - 4 test suites: auth, navigation, patients-appointments, theme-language.
    - Auth tests: login flow, invalid credentials, logout, quick-login buttons.
    - RBAC tests: route-level access control for all 4 roles, sidebar visibility.
    - Navigation tests: all module pages, command palette.
    - Patients/Appointments tests: page rendering, add modal, search, calendar view, filters.
    - Theme/Language tests: dark mode toggle, persistence, language switch, RTL/LTR direction, role badge, permissions display.
    - Test fixtures with reusable login/logout/quickLogin helpers.

13. **Backend Integration (Supabase)**
    - Supabase client (`src/lib/supabase.ts`) with env-based configuration.
    - Full SQL schema (`supabase/schema.sql`) with 12 tables, RLS policies, indexes.
    - Seed data SQL (`supabase/seed.sql`) matching existing mock data.
    - Data Access Layer (`src/lib/dal.ts`) — unified interface for all CRUD operations.
    - Automatic fallback to Dexie/IndexedDB when Supabase env vars are absent.
    - All React Query hooks (`src/lib/api.ts`) refactored to use DAL instead of direct Dexie calls.
    - Supabase Auth integration in `authenticate()` with profile-based RBAC.
    - `authStore.logout()` calls `supabase.auth.signOut()` when configured.
    - Login page: quick-login buttons hidden in Supabase mode, loading states added.
    - `seed.ts` skips local seeding when Supabase is configured.
    - `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
    - Snake_case ↔ camelCase field mapping in DAL for Supabase compatibility.
14. **Session Restoration & Auth Listener**
    - `restoreSession()` in `main.tsx` checks active Supabase session on page load.
    - `onAuthStateChange` listener syncs auth state with Zustand store automatically.
15. **Error Handling**
    - `onErrorHandler` helper in `api.ts` — all 15 mutations have `onError` with toast.
    - Error messages extracted from `Error.message` or fallback string.
16. **Supabase Storage for Medical Files**
    - `dal.uploadMedicalFile()` uploads to `medical-files` bucket, returns public URL.
    - `useUploadMedicalFile` hook accepts `{ patientId, file: File }` and handles full flow.
    - `dal.deleteFile()` for removing medical files.
    - Storage bucket + RLS policies in `schema.sql`.
17. **Audit Log & Timestamps**
    - `audit_log` table with `user_id`, `action`, `table_name`, `record_id`, `details`, `created_at`.
    - `dal.logAudit()` called on key mutations (patients, appointments, invoices, lab tests).
    - `useAuditLog()` query hook for displaying audit history.
    - `updated_at` columns + `set_updated_at()` trigger on all 12 tables.
18. **Role-Aware RLS Policies**
    - `current_user_role()`, `current_user_patient_id()`, `current_user_doctor_id()` helper functions.
    - `linked_patient_id` / `linked_doctor_id` columns on `profiles` table.
    - Patients see only their own records (appointments, visits, medications, invoices, files, lab tests).
    - Staff (admin/doctor/nurse) see all records with write access scoped by role.
    - Doctors: read all, write visits/medications. Nurses: read all, write notes/files/lab tests.
    - Admin: full access to all tables including doctors management and invoices.
19. **Realtime Subscriptions**
    - `useRealtimeSync()` / `useRealtimeAll()` hooks — Supabase postgres_changes listener.
    - Auto-invalidates React Query cache when any table changes (INSERT/UPDATE/DELETE).
    - `useRealtimeAll()` called in `App.tsx` for app-wide realtime sync.
20. **Optimistic Updates**
    - `onMutate` + rollback on `onError` for key mutations: addPatient, updateAppointmentStatus, updateInvoiceStatus, updateLabTestStatus.
    - Instant UI feedback without waiting for server round-trip.
21. **Audit Log Viewer Page**
    - `/audit-log` route with `auditLog:view` permission (admin only).
    - Sidebar nav item with `ScrollText` icon.
    - Searchable + filterable table (by user, table, action, record ID).
    - Color-coded action badges (create=green, update=blue).
    - Shows user, action, table, record ID, details, timestamp.
22. **PWA + Offline Sync**
    - Service Worker v2 with Supabase REST API caching (network-first, cache fallback).
    - Background Sync listener notifies clients to retry failed mutations.
    - `useOnlineStatus()` hook with online/offline event listeners.
    - Offline banner in Layout when connection is lost.
    - Cache-first for static assets, network-first for navigation + API.
23. **Input Validation (zod) — All Forms**
    - Shared schemas in `src/lib/validation.ts` (login, doctor, appointment, visit, medication, note, lab result).
    - `AddPatientModal` + `AddDoctorModal` + `AppointmentModal`: react-hook-form + zodResolver.
    - `Login`: zod safeParse with inline field errors.
    - `PatientDetail` (visits, medications, notes): zod safeParse with inline field errors.
    - `Lab` (result entry): zod safeParse with inline error.
24. **Code Splitting (React.lazy + Suspense)**
    - All 13 pages lazy-loaded via `React.lazy()` in `App.tsx`.
    - `Suspense` wrapper with spinner fallback (`PageLoader`).
    - Each page ships as a separate chunk (verified in build output).
25. **Error Tracking**
    - `src/lib/errorReporter.ts` — `reportError()` sends to `VITE_ERROR_ENDPOINT` if configured.
    - `ErrorBoundary` uses `reportUnhandledError()` instead of `console.error`.
    - Global `window.addEventListener('error')` and `'unhandledrejection'` handlers in `main.tsx`.
    - Works with Sentry, custom API, or any HTTP error endpoint.
26. **Nginx Production Config**
    - Gzip compression (js, css, json, svg, fonts).
    - Security headers: CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy.
    - Static asset caching (1 year, immutable).
    - Dotfile access blocked.
    - SPA fallback preserved.
27. **Environment Config Validation**
    - `validateSupabaseConfig()` in `supabase.ts` — validates URL format, key length, hostname.
    - Console error in production if env vars missing; warning in dev for demo mode.
    - `VITE_ERROR_ENDPOINT` added to `.env.example` and `vite-env.d.ts`.
28. **React Query Retry Strategy**
    - Smart retry: up to 2 retries on network/server errors, no retry on 4xx client errors.
    - Exponential backoff with max 8s delay.
    - `staleTime: 30s`, `gcTime: 5min` defaults.
    - `mutations.retry: false` (mutations should not auto-retry).
29. **Refresh Token Rotation**
    - Proactive token refresh 2 minutes before expiry via `scheduleTokenRefresh()`.
    - `TOKEN_REFRESHED` event handler re-schedules timer on refresh.
    - `SIGNED_OUT` event clears React Query cache + auth store.
    - Fallback: if refresh fails, user is logged out gracefully.
30. **Data Export / Backup**
    - `src/lib/export.ts` — reusable `exportCSV()`, `exportJSON()`, `downloadFile()`, `timestampedFilename()`.
    - Reports page: CSV + JSON export buttons with full summary metrics.
    - Audit Log page: CSV + JSON export of filtered logs.
31. **Advanced Audit Log Viewer**
    - Pagination (20 records/page) with prev/next navigation.
    - Date range filter (from/to).
    - User filter dropdown (populated from audit log data).
    - Action filter dropdown.
    - Clear filters button.
    - Record count display.
    - CSV + JSON export of filtered results.
32. **Web Vitals Performance Monitoring**
    - `src/lib/webVitals.ts` — native PerformanceObserver-based monitoring (no external dependency).
    - Tracks LCP, CLS, INP, TTFB with good/needs-improvement/poor ratings.
    - `initWebVitals()` called on app startup in `main.tsx`.
    - `reportVitalsToEndpoint()` for sending metrics to external monitoring service.
    - Console debug output in development mode.
33. **Manual Chunk Splitting**
    - Granular vendor chunks: `supabase`, `icons`, `state`, `ui`, `offline`.
    - Index chunk reduced from 430KB → 73KB (83% reduction).
    - `chunkSizeWarningLimit` raised to 500KB (only `calendar` at 260KB exceeds, loaded lazily).
34. **HIPAA / GDPR Compliance**
    - **Consent Management**: `consentStore.ts` with persisted consent records (data_processing, marketing, analytics, third_party_share). `ConsentBanner` component shows on first visit.
    - **Data Retention Policy**: `dataRetention.ts` with per-table retention periods (7 years for medical records, 2 years for appointments, 90 days for notifications).
    - **Right to Erasure**: `dal.rightToErasure()` deletes all patient data across 8 tables with audit logging. UI button in Settings with confirmation dialog.
    - Settings page: consent toggles, retention policy display, erasure button.
    - **Phase A**: `consent_records` table + RLS; `consentApi.ts` upserts on grant/revoke; hydrate on session bind.
    - **Phase A**: `purge_expired_records()` + Edge `retention-purge` (appointments 2y, pharmacy 3y).
    - Ops runbook: `docs/ops/PHASE_A_DEPLOY.md` (SQL, Edge deploy, PITR, `/health`, monitoring env).
35. **Multi-Factor Authentication (TOTP)**
    - `mfa.ts` — RFC 6238 TOTP implementation using Web Crypto API (no external dependency).
    - `mfaStore.ts` — persisted MFA enrollment and session verification state.
    - `MFAVerify.tsx` — setup modal (generate secret, QR URI) + verification modal (6-digit code).
    - Required for `admin` and `doctor` roles, optional for others.
    - Integrated into Login flow: prompts setup on first login for required roles, verifies on subsequent logins.
36. **Push Notifications (Web Push API)**
    - `pushNotifications.ts` — subscribe/unsubscribe, permission management, local notifications.
    - Service worker: `push` event handler with notification display, `notificationclick` handler with window focus/open.
    - Settings page: push notification toggle with subscribe/unsubscribe.
    - `VITE_VAPID_PUBLIC_KEY` env var for server-side push integration.
37. **Server-Side Rendering (SSR)**
    - `src/entry-server.tsx` — server render function using `StaticRouter` + `renderToString`.
    - `src/entry-client.tsx` — client hydration using `hydrateRoot` (replaces `createRoot`).
    - `server/index.ts` — Express server with Vite middleware mode (dev) + static serving (prod).
    - SSR-safe fixes: `useOnlineStatus` checks `typeof navigator`, `supabase.ts` guards `detectSessionInUrl`.
    - Scripts: `dev:ssr` (dev with SSR), `build:ssr` (client + server build), `start` (production SSR server).
    - `index.html` updated with `<!--ssr-outlet-->` placeholder and `entry-client.tsx` reference.
    - Dependencies: `express`, `tsx`, `@types/express`.
38. **Encryption at Rest (AES-GCM)**
    - `src/lib/encryption.ts` — AES-GCM 256-bit encryption via Web Crypto API (no external dependency).
    - Key derivation: PBKDF2 with 250,000 iterations, SHA-256, per-file random salt (128-bit).
    - `encryptFileForUpload()` — encrypts File → Blob with header (salt + IV + ciphertext).
    - `decryptDownloadedFile()` — decrypts downloaded blob back to original MIME type.
    - `hashFile()` — SHA-256 integrity hash for file verification.
    - Integrated into `dal.uploadMedicalFile()` (encrypts before Supabase Storage upload).
    - New `dal.downloadMedicalFile()` — downloads + decrypts in one step.
    - `VITE_ENCRYPTION_KEY` env var for passphrase (falls back to Supabase anon key if unset).
    - Lazy-loaded via dynamic `import()` to avoid bloating initial bundle.

## Planned
1. Automated database backup scheduling. ✅ Playbook + PITR checklist in `docs/ops/PHASE_A_DEPLOY.md` (enable in Dashboard)
2. Audit log auto-purge based on retention policies. ✅ Partial: appointments/pharmacy via `purge_expired_records`; clinical 7y retained
3. FIDO2/WebAuthn hardware key support.
4. Real-time push notification server (VAPID + push service integration).
5. Server-side key management (AWS KMS, HashiCorp Vault) for encryption keys. ✅ Edge Function + ENCRYPTION_KEY secret (KMS still optional upgrade)
6. Streaming SSR for large data-heavy pages.
7. Supabase Auth MFA (AAL2) replacing client-only TOTP store. ✅ Done when Supabase configured
8. Durable offline mutation queue (IndexedDB) with conflict resolution. ✅ v1: status ops (appointments/invoices/lab/pharmacy), FIFO flush, server-wins

## Security hardening (P0 — Aug 2026)
39. **Production fail-closed auth**
    - Demo auth disabled in production builds unless `VITE_ALLOW_DEMO_AUTH=true`.
    - Misconfigured prod builds clear session and block login.
40. **Private medical-files + signed URLs**
    - Storage bucket `public=false`; DAL stores path and issues short-lived signed URLs.
41. **RLS hardening**
    - Signup always creates `patient` role; trigger blocks non-admin role changes.
    - Patient DELETE admin-only; audit_log admin-read / self-insert.
    - Apply `supabase/security-hardening.sql` on existing projects.
42. **nginx security headers restored**
    - CSP, HSTS, X-Frame-Options, etc. in `nginx.conf`.
43. **GDPR erasure + SW PHI cache fix**
    - Correct table names (`visits`/`notes`); use `linkedPatientId`.
    - Service worker v3 never caches Supabase/REST responses.
44. **Encryption key hygiene + MFA bypass removed**
    - No anon-key fallback; MFA verify fails closed without secret.
    - MFA session verification not persisted across reloads.
45. **E2E auth flags**
    - Playwright build sets `VITE_ALLOW_DEMO_AUTH` + `VITE_DISABLE_MFA`.
46. **Session-bound ProtectedRoute**
    - `sessionSync.ts`: syncs Zustand auth to live Supabase `getSession()`; clears forged localStorage auth.
    - `sessionBound` / `sessionReady` are not persisted — must re-verify each load.
    - ProtectedRoute blocks when Supabase is configured but `sessionBound` is false.
    - Re-checks session on each protected navigation via `assertServerSession()`.
47. **Supabase Auth MFA (AAL2)**
    - `supabaseMfa.ts`: enroll / challenge+verify / AAL status via `supabase.auth.mfa`.
    - Login + MFAVerify/MFASetup use server MFA when Supabase is configured; demo TOTP otherwise.
    - `authStore.mfaVerified` reflects AAL2 (not persisted).
49. **Edge path authorization**
    - `medical-files` Edge checks `profiles.role` + `linked_patient_id` before service-role storage I/O.
    - Staff: any folder. Patient: own folder download only.
50. **Demo credentials out of prod main bundle**
    - `demoUsers.ts` loaded only via dynamic `import()` when `isDemoAuthAllowed()`.
    - Login uses `loadDemoUsers()` — production without demo flag does not static-import passwords.
51. **Reliable E2E build**
    - `npm run build:e2e` → `vite build --mode e2e` loads `.env.e2e`.
    - Playwright always rebuilds (`reuseExistingServer: false`).
52. **Phase A ops**
    - `GET /health` on nginx + Express SSR.
    - `VITE_VITALS_ENDPOINT` wired in `entry-client`.
    - Consent server sync + retention Edge Function (see `docs/ops/PHASE_A_DEPLOY.md`).
53. **Phase C1 — Revenue + interop foundation**
    - Payments: Stripe Checkout Edge + mock provider; `payments` table; patient `/portal` statements.
    - Thin claims: ICD-10/CPT draft/submit stubs; `/claims` admin UI.
    - FHIR R4 read-only Edge (`Patient`, `Invoice`, `Account`) + local mappers.
    - Ops: `docs/ops/PHASE_C_PAYMENTS.md`, `supabase/phase-c-payments.sql`.
54. **Phase C2 — Remittance + clinical FHIR + HL7 stubs**
    - `remittances` table; post ERA stub from Claims (marks claim paid).
    - FHIR: Encounter, Observation, MedicationRequest (+ portal appointments/records tabs).
    - HL7 v2 encode/decode (`hl7v2.ts`); admin `/interop` playground.
    - Ops: `docs/ops/PHASE_C2_INTEROP.md`, `supabase/phase-c2-interop.sql`.
55. **Phase B1 — ADT / Census**
    - Tables: `wards`, `beds`, `admissions`; Dexie v5 + DAL admit/transfer/discharge.
    - UI: `/census` bed map (staff only); permissions `census:view` / `census:edit`.
    - FHIR Encounter `IMP` for admissions (`adm-{id}`); ops: `docs/ops/PHASE_B1_ADT.md`, `supabase/phase-b1-adt.sql`.
56. **Phase B2 — Vitals + Problem List**
    - Tables: `vital_signs`, `problems`; Dexie v6; PatientDetail tabs + portal read-only.
    - FHIR: Observation `vital-signs` (`vs-{id}`), Condition (`cond-{id}`).
    - Ops: `docs/ops/PHASE_B2_CLINICAL.md`, `supabase/phase-b2-clinical.sql`.
57. **Phase B3 — CPOE**
    - `clinical_orders` table; `/orders` UI; lab/pharmacy linkage; allergy override alert.
    - FHIR `ServiceRequest` (`sr-{id}`); ops: `docs/ops/PHASE_B3_CPOE.md`, `supabase/phase-b3-cpoe.sql`.
58. **Phase B4 — eMAR + B5 clinical print**
    - `medication_administrations`; `/emar` schedule/administer; pharmacy CPOE → MAR dose.
    - Print Rx + discharge HTML (`clinicalDocs.ts`); ops: `docs/ops/PHASE_B4_EMAR.md`, `supabase/phase-b4-emar.sql`.
59. **Phase C3 — Remaining interop**
    - ERA 835 encode/import → remittances (`era835.ts`); Claims import UI.
    - MLLP frame/ingest (`mllp.ts` + Edge `mllp-ingest`); ORU → lab result.
    - Patient messaging (`patient_messages`, `/messages`).
    - NPHIES eligibility/claim stubs (`nphies.ts` + Edge `nphies`).
    - Ops: `docs/ops/PHASE_C3_REMAINING.md`, `supabase/phase-c3-remaining.sql`.
60. **Phase D — Enterprise scale stubs**
    - Multi-facility: `facilities`, memberships, patient `facility_id`, Header switcher, `/facilities`.
    - SSO stub on Login + SCIM Edge/client stubs.
    - KMS status + `kms-unwrap` Edge; DLP redaction on exports.
    - `/compliance` HIPAA/BAA checklist; ops: `docs/ops/PHASE_D_ENTERPRISE.md`, `supabase/phase-d-enterprise.sql`.
61. **Automatable ops hardening**
    - `npm run ops:print|verify-env|deploy-functions` (`scripts/ops-automate.mjs`).
    - Facility RLS helpers: `phase-d2-facility-rls.sql`.
    - Real OAuth when `VITE_SSO_PROVIDER` set; SCIM Edge creates/bans Auth users.
    - CDS drug–drug checks in CPOE; export audit + DLP; compliance auto-detect button.
    - Docs: `docs/ops/AUTOMATED_OPS.md`.
62. **Remaining go-live pack**
    - Facility memberships UI + seed; `phase-d3-facility-clinical-rls.sql`.
    - `phase-a-cron.sql` (pg_cron retention); `docs/ops/LIVE_CHECKLIST.md`.
    - Compliance templates: BAA / breach / training under `docs/compliance/`.
    - CI: `.github/workflows/ops-checklist.yml`.
63. **Durable offline mutation queue (v1)**
    - IndexedDB `mutationQueue` (Dexie v12); FIFO flush on `online` + SW `background-sync`.
    - Queued ops: appointment / invoice / lab / pharmacy status updates (Supabase mode).
    - Conflict policy: server-wins via `expectedStatus`; toast + banner for pending/conflict.
    - Spec/plan: `docs/superpowers/specs/2026-08-12-offline-mutation-queue-design.md`.
61. **Automatable ops follow-ups**
    - `npm run ops:print|verify-env|deploy-functions` (`scripts/ops-automate.mjs`).
    - Facility RLS helpers: `phase-d2-facility-rls.sql`.
    - Real OAuth when `VITE_SSO_PROVIDER` set; SCIM Edge creates/bans Auth users.
    - CDS drug–drug checks in CPOE; export audit log; compliance auto-detect.
    - Docs: `docs/ops/AUTOMATED_OPS.md`.
