# CDS Rich Alerts + Admin Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hard-coded CPOE CDS stubs with database-backed (and demo-seeded) bilingual drug–drug / allergy rules, richer order alerts with mandatory override reasons for major/allergy, and an admin rules UI.

**Architecture:** A pure `cdsEngine` evaluates injected rule sets into `CdsAlert[]`. `cdsRulesStore` loads active rules from Supabase (or identical in-repo seed / IndexedDB in demo), with a 60s cache and invalidate-on-write. `dal.placeClinicalOrder` re-checks and persists summary + JSON + override metadata. Orders shows alert cards; `/cds-rules` lets admins soft-deactivate/edit rules.

**Tech Stack:** React 18, Vite, TypeScript, Dexie (demo), Supabase JS, Vitest, existing i18n + `usePermission`.

## Global Constraints

- Override reason required when any alert is `kind === 'allergy'` OR any DDI has `severity === 'major'`; moderate-only DDI needs acknowledge only.
- Override reason minimum trimmed length is `5`.
- Alert clinical copy is bilingual via `messageEn`/`messageAr` and `actionEn`/`actionAr` on each alert (not static i18n for clinical text).
- Prefer soft-deactivate (`active: false`); no hard delete in v1.
- If Supabase rule load fails → log warning and use seed (do not block ordering).
- Keep populating legacy `allergy_alert` text for older list/report paths.
- Pharmacy orders only for CDS gates this phase (lab/imaging unchanged).
- Collapse client flags to a single `acknowledgeCds` (still accept legacy `acknowledgeAllergy` / `acknowledgeDrugInteraction` as OR for compat).
- Arabic/English UI chrome via `en.ts` / `ar.ts`; follow existing Sidebar Admin group + permission patterns.
- Do not add external DDI APIs, dose calculators, or offline mutation queues.

---

## File Structure

| Path | Responsibility |
|------|----------------|
| Create `src/lib/cdsTypes.ts` | Shared `CdsAlert`, rule row types, severity/kind |
| Create `src/lib/cdsSeed.ts` | Deterministic seed DDI + allergy rules (source of truth for demo + SQL comments) |
| Create `src/lib/cdsEngine.ts` | Pure matching + `evaluateCds` / policy helpers |
| Create `src/lib/cdsEngine.test.ts` | Engine + policy unit tests |
| Create `src/lib/cdsRulesStore.ts` | Load/cache/invalidate + demo IndexedDB sync helpers |
| Create `src/lib/cdsRulesStore.test.ts` | Cache + seed fallback tests (mock supabase off) |
| Modify `src/lib/cds.ts` | Thin re-exports or deprecate callers → engine |
| Modify `src/lib/cpoe.ts` | Remove allergy matching; keep `canPlaceOrder` etc. |
| Modify `src/lib/cpoe.test.ts` | Point allergy cases at engine |
| Modify `src/lib/cds.test.ts` | Point at engine / keep as smoke |
| Create `supabase/phase-b3b-cds-rules.sql` | Tables, RLS, seed, order column alters |
| Modify `scripts/ops-automate.mjs` | Insert SQL into `SQL_ORDER` after `phase-b3-cpoe.sql` |
| Modify `src/types/index.ts` | `ClinicalOrder` CDS fields |
| Modify `src/lib/db.ts` | Dexie tables for demo CDS rules + bump version |
| Modify `src/lib/dal.ts` | Map rows, `placeClinicalOrder` gate, rule CRUD |
| Modify `src/lib/api.ts` | Hooks for rules CRUD; place-order error handling |
| Modify `src/pages/Orders.tsx` | Alert cards + override reason |
| Create `src/components/CdsAlertCards.tsx` | Presentational alert stack |
| Create `src/pages/CdsRules.tsx` | Admin tabs CRUD |
| Modify `src/App.tsx` | Route `/cds-rules` |
| Modify `src/components/Sidebar.tsx` | Admin nav link |
| Modify `src/auth/permissions.ts` | `cdsRules:view` / `cdsRules:edit` (admin only) |
| Modify `src/i18n/en.ts` + `src/i18n/ar.ts` | Chrome strings |
| Modify `src/pages/PatientDetail.tsx` | Show override reason |
| Create/Modify `docs/ops/PHASE_B3B_CDS.md` | Apply order note |
| Modify `docs/ops/PHASE_B3_CPOE.md` | Link to B3b |

---

### Task 1: Types, seed, pure engine (TDD)

**Files:**
- Create: `src/lib/cdsTypes.ts`
- Create: `src/lib/cdsSeed.ts`
- Create: `src/lib/cdsEngine.ts`
- Create: `src/lib/cdsEngine.test.ts`
- Modify: `src/lib/cds.ts` (re-export engine helpers used by old tests)
- Modify: `src/lib/cpoe.ts` (remove `ALLERGY_DRUG_HINTS` / `checkDrugAllergyAlert` — re-export from engine for one release if needed)
- Modify: `src/lib/cds.test.ts`, `src/lib/cpoe.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `CdsSeverity`, `CdsKind`, `CdsAlert`
  - `CdsDrugInteractionRule`, `CdsAllergyRule`
  - `SEED_DDI_RULES`, `SEED_ALLERGY_RULES`
  - `evaluateCds(input: { medicineName: string; allergies?: string[]; activeMedications: string[]; ddiRules: CdsDrugInteractionRule[]; allergyRules: CdsAllergyRule[] }): CdsAlert[]`
  - `requiresOverrideReason(alerts: CdsAlert[]): boolean`
  - `requiresAcknowledge(alerts: CdsAlert[]): boolean`
  - `formatCdsSummary(alerts: CdsAlert[], locale: 'en' | 'ar'): string | null`
  - `CdsAckRequiredError` class with `alerts: CdsAlert[]` and `message: string`

- [ ] **Step 1: Write failing engine tests**

Create `src/lib/cdsEngine.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  evaluateCds,
  requiresOverrideReason,
  requiresAcknowledge,
  formatCdsSummary,
} from './cdsEngine'
import { SEED_DDI_RULES, SEED_ALLERGY_RULES } from './cdsSeed'

const rules = { ddiRules: SEED_DDI_RULES, allergyRules: SEED_ALLERGY_RULES }

describe('evaluateCds', () => {
  it('flags major warfarin + aspirin with bilingual fields and action', () => {
    const alerts = evaluateCds({
      medicineName: 'Aspirin 81mg',
      activeMedications: ['Warfarin 5mg'],
      allergies: [],
      ...rules,
    })
    const hit = alerts.find((a) => a.kind === 'drug_drug' && a.severity === 'major')
    expect(hit).toBeTruthy()
    expect(hit!.messageEn.toLowerCase()).toContain('bleeding')
    expect(hit!.messageAr.length).toBeGreaterThan(3)
    expect(hit!.actionEn.length).toBeGreaterThan(3)
    expect(hit!.category).toBe('bleeding')
  })

  it('flags penicillin allergy vs amoxicillin as major allergy requiring reason', () => {
    const alerts = evaluateCds({
      medicineName: 'Amoxicillin 500mg',
      activeMedications: [],
      allergies: ['penicillin'],
      ...rules,
    })
    expect(alerts.some((a) => a.kind === 'allergy' && a.severity === 'major')).toBe(true)
    expect(requiresOverrideReason(alerts)).toBe(true)
  })

  it('moderate-only DDI requires acknowledge but not override reason', () => {
    const alerts = evaluateCds({
      medicineName: 'Iodinated contrast',
      activeMedications: ['Metformin 500mg'],
      allergies: [],
      ...rules,
    })
    expect(alerts.length).toBeGreaterThan(0)
    expect(alerts.every((a) => a.severity === 'moderate')).toBe(true)
    expect(requiresAcknowledge(alerts)).toBe(true)
    expect(requiresOverrideReason(alerts)).toBe(false)
  })

  it('formatCdsSummary picks locale', () => {
    const alerts = evaluateCds({
      medicineName: 'Aspirin',
      activeMedications: ['Warfarin'],
      allergies: [],
      ...rules,
    })
    const en = formatCdsSummary(alerts, 'en')!
    const ar = formatCdsSummary(alerts, 'ar')!
    expect(en).not.toEqual(ar)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run src/lib/cdsEngine.test.ts`  
Expected: FAIL (module not found / exports missing)

- [ ] **Step 3: Implement types + seed + engine**

`src/lib/cdsTypes.ts` — export types exactly as in the design spec (`CdsAlert`, rule interfaces with `id?: number`, `active: boolean`, bilingual fields, `drugMatchers: string[]` for allergy).

`src/lib/cdsSeed.ts` — port all current pairs from `cds.ts` + allergy hints from `cpoe.ts`, plus modest expansion (target ~18 DDI, ~6 allergy). Every row must have AR/EN message and action. Use negative ids for seed (`id: -1, -2, …`) so demo IndexedDB can allocate positive ids later.

`src/lib/cdsEngine.ts` — implement substring matching equivalent to current `matchesDrug`; allergy: direct overlap → built-in major alert (no `ruleId`) + rule table matches; DDI unordered pair match; dedupe by `kind|messageEn|withDrug`.

Policy helpers as specified. `CdsAckRequiredError extends Error` with `readonly alerts: CdsAlert[]`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run src/lib/cdsEngine.test.ts src/lib/cds.test.ts src/lib/cpoe.test.ts`  
Expected: PASS (update old tests to import from engine/seed)

- [ ] **Step 5: Commit**

```bash
git add src/lib/cdsTypes.ts src/lib/cdsSeed.ts src/lib/cdsEngine.ts src/lib/cdsEngine.test.ts src/lib/cds.ts src/lib/cpoe.ts src/lib/cds.test.ts src/lib/cpoe.test.ts
git commit -m "feat(cds): add bilingual engine and seed rules."
```

---

### Task 2: SQL schema + ops order

**Files:**
- Create: `supabase/phase-b3b-cds-rules.sql`
- Create: `docs/ops/PHASE_B3B_CDS.md`
- Modify: `docs/ops/PHASE_B3_CPOE.md` (one-line link)
- Modify: `scripts/ops-automate.mjs` (`SQL_ORDER`)

**Interfaces:**
- Consumes: seed content from Task 1 (mirror in SQL `INSERT`)
- Produces: tables `cds_drug_interactions`, `cds_allergy_rules`; columns on `clinical_orders`

- [ ] **Step 1: Write SQL file**

`supabase/phase-b3b-cds-rules.sql` must be idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS` pattern used elsewhere):

```sql
-- cds_drug_interactions + cds_allergy_rules as in design
-- ALTER clinical_orders ADD cds_alerts_json jsonb, cds_override_reason text,
--   cds_acknowledged_by text, cds_acknowledged_at timestamptz
-- RLS: SELECT active OR admin for authenticated clinical roles
--   USING (active = true OR public.current_user_role() = 'admin')
-- WRITE: admin only FOR ALL
-- Seed INSERT ... ON CONFLICT DO NOTHING (add unique on (drug_a, drug_b) / allergy_key if needed)
```

Use unique constraints:
- `UNIQUE (lower(drug_a), lower(drug_b))` via unique index on `lower(drug_a), lower(drug_b)`
- `UNIQUE (lower(allergy_key))`

Enable RLS + policies mirroring `public.current_user_role() = 'admin'` write pattern from existing schema.

- [ ] **Step 2: Wire `SQL_ORDER`**

In `scripts/ops-automate.mjs`, insert `'supabase/phase-b3b-cds-rules.sql'` immediately after `'supabase/phase-b3-cpoe.sql'`.

- [ ] **Step 3: Docs**

`docs/ops/PHASE_B3B_CDS.md` — apply order, seed note, admin UI path `/cds-rules`.  
Link from `PHASE_B3_CPOE.md`.

- [ ] **Step 4: Verify ops check**

Run: `node scripts/ops-automate.mjs check`  
Expected: includes new SQL as `ok`

- [ ] **Step 5: Commit**

```bash
git add supabase/phase-b3b-cds-rules.sql scripts/ops-automate.mjs docs/ops/PHASE_B3B_CDS.md docs/ops/PHASE_B3_CPOE.md
git commit -m "feat(cds): add phase-b3b SQL rules schema and seed."
```

---

### Task 3: Rules store (load/cache) + Dexie demo tables

**Files:**
- Create: `src/lib/cdsRulesStore.ts`
- Create: `src/lib/cdsRulesStore.test.ts`
- Modify: `src/lib/db.ts` (new version + `cdsDrugInteractions`, `cdsAllergyRules` tables)

**Interfaces:**
- Consumes: seed + types from Task 1; `isSupabaseConfigured` / `supabase` from existing `src/lib/supabase.ts`
- Produces:
  - `async function getActiveCdsRules(): Promise<{ ddi: CdsDrugInteractionRule[]; allergy: CdsAllergyRule[] }>`
  - `function invalidateCdsRulesCache(): void`
  - `async function listCdsDrugInteractions(): Promise<CdsDrugInteractionRule[]>` (admin: all)
  - `async function listCdsAllergyRules(): Promise<CdsAllergyRule[]>`
  - `async function upsertCdsDrugInteraction(rule): Promise<number>`
  - `async function upsertCdsAllergyRule(rule): Promise<number>`
  - `async function setCdsDrugInteractionActive(id: number, active: boolean): Promise<void>`
  - `async function setCdsAllergyRuleActive(id: number, active: boolean): Promise<void>`

- [ ] **Step 1: Failing store test**

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { getActiveCdsRules, invalidateCdsRulesCache } from './cdsRulesStore'
import { SEED_DDI_RULES } from './cdsSeed'

describe('cdsRulesStore', () => {
  beforeEach(() => invalidateCdsRulesCache())

  it('returns seed rules when supabase is not configured', async () => {
    const { ddi, allergy } = await getActiveCdsRules()
    expect(ddi.length).toBeGreaterThanOrEqual(SEED_DDI_RULES.filter((r) => r.active).length)
    expect(allergy.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/lib/cdsRulesStore.test.ts`

- [ ] **Step 3: Implement Dexie + store**

Bump Dexie schema version in `src/lib/db.ts` (follow existing migration style). Tables:

```ts
cdsDrugInteractions: '++id, drugA, drugB, active'
cdsAllergyRules: '++id, allergyKey, active'
```

On first demo read, if both tables empty, bulk-add seed (strip negative ids so Dexie autoincrements, or keep seed ids only in memory path). Prefer: memory seed when tables empty without writing, OR write seed once — **write seed once** so admin deactivate persists in demo.

Cache: module variables `{ at: number, data }` TTL `60_000`; `invalidateCdsRulesStore` clears it. Supabase path: `.from('cds_drug_interactions').select('*').eq('active', true)` (admin list methods omit active filter). On error → `console.warn` + seed.

- [ ] **Step 4: Tests PASS**

Run: `npx vitest run src/lib/cdsRulesStore.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/cdsRulesStore.ts src/lib/cdsRulesStore.test.ts src/lib/db.ts
git commit -m "feat(cds): add rules store with cache and demo persistence."
```

---

### Task 4: Wire `placeClinicalOrder` + types mapping

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/dal.ts` (`mapClinicalOrder` / `placeClinicalOrder`, optional thin wrappers calling store CRUD)
- Create: `src/lib/placeClinicalOrder.cds.test.ts` (demo path unit test)
- Modify: `src/lib/api.ts` (`usePlaceClinicalOrder` error handling for `CdsAckRequiredError`)

**Interfaces:**
- Consumes: `evaluateCds`, `requiresOverrideReason`, `getActiveCdsRules`, `CdsAckRequiredError`, `formatCdsSummary`
- Produces: `placeClinicalOrder` input adds `acknowledgeCds?: boolean`, `cdsOverrideReason?: string`; still accepts legacy ack booleans; return type may include `cdsAlerts?: CdsAlert[]`

Extend `ClinicalOrder`:

```ts
cdsAlerts?: CdsAlert[]
cdsOverrideReason?: string
cdsAcknowledgedBy?: string
cdsAcknowledgedAt?: string
```

- [ ] **Step 1: Write failing placement policy test**

Use demo/IndexedDB path (ensure tests run without Supabase). Pattern: call `dal.placeClinicalOrder` with pharmacy warfarin scenario after seeding patient/meds fixtures the suite already uses, or isolate by testing a small exported helper `assertCdsPlacementAllowed(alerts, input)` in `cdsEngine.ts` if full dal setup is heavy.

Prefer exporting from `cdsEngine.ts`:

```ts
export function assertCdsPlacementAllowed(
  alerts: CdsAlert[],
  opts: { acknowledgeCds?: boolean; cdsOverrideReason?: string },
): void {
  if (!alerts.length) return
  if (!opts.acknowledgeCds) throw new CdsAckRequiredError(alerts)
  if (requiresOverrideReason(alerts) && (opts.cdsOverrideReason?.trim().length ?? 0) < 5) {
    throw new Error('CDS override reason required (min 5 characters)')
  }
}
```

Test that helper thoroughly; dal must call it after `evaluateCds`.

```ts
it('rejects major without reason even if acknowledged', () => {
  const alerts = evaluateCds({ /* warfarin+aspirin */ ... })
  expect(() =>
    assertCdsPlacementAllowed(alerts, { acknowledgeCds: true, cdsOverrideReason: 'no' }),
  ).toThrow(/override reason/i)
})
```

- [ ] **Step 2: Implement helper + dal wiring**

In `placeClinicalOrder` for pharmacy:
1. `const { ddi, allergy } = await getActiveCdsRules()`
2. `const alerts = evaluateCds({ medicineName, allergies: patient?.allergies, activeMedications, ddiRules: ddi, allergyRules: allergy })`
3. `acknowledgeCds = input.acknowledgeCds ?? input.acknowledgeAllergy ?? input.acknowledgeDrugInteraction`
4. `assertCdsPlacementAllowed(alerts, { acknowledgeCds, cdsOverrideReason: input.cdsOverrideReason })`
5. Persist `allergyAlert: formatCdsSummary(alerts, 'en')`, `cdsAlerts`, override fields, acknowledger from `orderedBy`, `cdsAcknowledgedAt` ISO when alerts.length && acknowledgeCds

Map Supabase snake_case ↔ camelCase for new columns. IndexedDB stores camelCase on `ClinicalOrder`.

- [ ] **Step 3: Update `usePlaceClinicalOrder`**

On error: if `e instanceof CdsAckRequiredError` (or `e.name === 'CdsAckRequiredError'`), do not toast; let Orders set pending alerts from `e.alerts`. Export error class from `cdsEngine`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/cdsEngine.test.ts src/lib/placeClinicalOrder.cds.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/lib/dal.ts src/lib/api.ts src/lib/cdsEngine.ts src/lib/placeClinicalOrder.cds.test.ts
git commit -m "feat(cds): enforce ack and override reason on pharmacy orders."
```

---

### Task 5: Orders UI — alert cards + override reason

**Files:**
- Create: `src/components/CdsAlertCards.tsx`
- Modify: `src/pages/Orders.tsx`
- Modify: `src/i18n/en.ts`, `src/i18n/ar.ts`

**Interfaces:**
- Consumes: `CdsAlert`, `requiresOverrideReason`, `CdsAckRequiredError`
- Produces: UI-only

- [ ] **Step 1: Add i18n keys**

Keys (both locales): `cdsAlertsTitle`, `cdsSuggestedAction`, `cdsOverrideReason`, `cdsOverrideReasonHint`, `cdsAcknowledgeAndPlace`, `cdsSeverityMajor`, `cdsSeverityModerate`, `cdsKindAllergy`, `cdsKindDrugDrug`, `cdsCategory`.

- [ ] **Step 2: Build `CdsAlertCards`**

Props: `alerts: CdsAlert[]`, `locale: 'en' | 'ar'`.  
Render one bordered block per alert; major/allergy use stronger amber/red border; show severity badge, kind, category, message, suggested action (locale fields).

- [ ] **Step 3: Wire Orders**

Replace `pendingAllergy: string | null` with `pendingAlerts: CdsAlert[] | null` and `overrideReason: string`.

On catch: if `CdsAckRequiredError`, set `pendingAlerts` to `e.alerts`.  
When `pendingAlerts` set, show `CdsAlertCards`, optional textarea if `requiresOverrideReason(pendingAlerts)`, disable ack button when reason required and trim length < 5.

`buildPayload` adds `acknowledgeCds` and `cdsOverrideReason`.

Remove brittle `msg.includes('bleeding risk')` heuristics.

List rows: show `o.allergyAlert` and if `o.cdsOverrideReason` show muted reason line.

- [ ] **Step 4: Manual sanity (dev)**

Run: `npm run dev` — place pharmacy order that conflicts; confirm cards + reason gate.

- [ ] **Step 5: Commit**

```bash
git add src/components/CdsAlertCards.tsx src/pages/Orders.tsx src/i18n/en.ts src/i18n/ar.ts
git commit -m "feat(cds): show rich alert cards and override reason on orders."
```

---

### Task 6: Admin `/cds-rules` page

**Files:**
- Create: `src/pages/CdsRules.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/auth/permissions.ts`
- Modify: `src/lib/api.ts` (hooks)
- Modify: `src/lib/dal.ts` (delegate CRUD to store if not already)
- Modify: `src/i18n/en.ts`, `src/i18n/ar.ts`

**Interfaces:**
- Consumes: store/dal list + upsert + setActive; `invalidateCdsRulesCache`
- Produces: admin UI

- [ ] **Step 1: Permissions + nav + route**

Add permissions `cdsRules:view` | `cdsRules:edit` to admin role only in `ROLE_PERMISSIONS`.

Sidebar Admin group:

```ts
{ to: '/cds-rules', icon: ShieldAlert /* or FlaskConical */, key: 'cdsRules', permission: 'cdsRules:view' }
```

`App.tsx`: `<Route path="cds-rules" element={<CdsRules />} />`

i18n: `cdsRules`, `navGroup` already exists, `cdsRulesDdiTab`, `cdsRulesAllergyTab`, `cdsRuleActive`, `cdsDeactivate`, `cdsActivate`, `cdsSaveRule`.

- [ ] **Step 2: Implement page**

Tabs: DDI | Allergy. Table columns: active toggle, severity, category, match keys, message preview (`locale`). Modal/drawer for create/edit fields matching rule type. On save/toggle: call dal/store then `invalidateCdsRulesCache()` + react-query invalidate.

Gate page with `can('cdsRules:edit')` for mutations; view-only if somehow granted view without edit (admin has both).

- [ ] **Step 3: Hooks in `api.ts`**

`useCdsDrugInteractions`, `useCdsAllergyRules`, mutations for upsert/setActive.

- [ ] **Step 4: Verify deactivate affects new orders (demo)**

In browser or a small vitest: deactivate warfarin+aspirin rule via store; `getActiveCdsRules` must omit it; `evaluateCds` with remaining rules returns no major bleeding pair.

Add test in `cdsRulesStore.test.ts`:

```ts
it('deactivated seed rule is omitted from active set after upsert in demo', async () => {
  // list, setActive false on warfarin/aspirin id, invalidate, getActive — expect no matching pair
})
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/CdsRules.tsx src/App.tsx src/components/Sidebar.tsx src/auth/permissions.ts src/lib/api.ts src/lib/dal.ts src/i18n/en.ts src/i18n/ar.ts src/lib/cdsRulesStore.test.ts
git commit -m "feat(cds): add admin CDS rules management page."
```

---

### Task 7: PatientDetail + docs polish + full test pass

**Files:**
- Modify: `src/pages/PatientDetail.tsx`
- Modify: `docs/ops/AUTOMATED_OPS.md` (CDS row: admin rules done)
- Modify: `docs/superpowers/specs/2026-08-09-cds-rich-alerts-admin-rules-design.md` (status: Implemented)

**Interfaces:** none new

- [ ] **Step 1: PatientDetail orders tab**

Under `o.allergyAlert`, if `o.cdsOverrideReason` show reason; if `o.cdsAlerts?.length` optionally render compact `CdsAlertCards` read-only.

- [ ] **Step 2: Full unit suite for CDS paths**

Run: `npx vitest run src/lib/cdsEngine.test.ts src/lib/cdsRulesStore.test.ts src/lib/cds.test.ts src/lib/cpoe.test.ts src/lib/placeClinicalOrder.cds.test.ts`  
Expected: all PASS

Run: `npm run typecheck`  
Expected: exit 0

- [ ] **Step 3: Update docs status lines**

- [ ] **Step 4: Commit**

```bash
git add src/pages/PatientDetail.tsx docs/ops/AUTOMATED_OPS.md docs/superpowers/specs/2026-08-09-cds-rich-alerts-admin-rules-design.md
git commit -m "feat(cds): surface override reasons on patient orders and close docs."
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| DB tables + seed + RLS | 2 |
| clinical_orders override columns + json | 2, 4 |
| Unified bilingual engine | 1 |
| requiresOverrideReason policy | 1, 4 |
| Fail-open seed on load error | 3 |
| Cache + invalidate on admin write | 3, 6 |
| Orders alert cards + reason UI | 5 |
| Admin `/cds-rules` soft-deactivate | 6 |
| Demo mode seed | 1, 3 |
| PatientDetail reason display | 7 |
| ops SQL_ORDER | 2 |
| Unit tests | 1, 3, 4, 6, 7 |

## Placeholder / consistency review

- Single acknowledge flag name: `acknowledgeCds` (legacy OR kept).
- Error class name: `CdsAckRequiredError` everywhere.
- SQL file name: `phase-b3b-cds-rules.sql` everywhere.
- Min reason length: `5` everywhere.
