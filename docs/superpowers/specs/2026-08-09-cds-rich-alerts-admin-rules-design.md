# CDS Rich Alerts + Admin Rules Design

**Date:** 2026-08-09  
**Status:** Implemented

## Objective

Replace the hard-coded CPOE CDS stubs with **database-backed drug–drug and allergy rules**, richer alert payloads (severity, category, suggested action, bilingual copy), an **admin rules UI**, and a stronger **acknowledge + override-reason** gate on pharmacy clinical orders.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Approach | DB tables + admin screen (not file-only expansion) |
| Override reason | Required for **major** DDI and **all allergy** alerts; moderate DDI needs acknowledge only |
| Language | Bilingual AR/EN from day one (message + suggested action) |
| Soft-delete | Prefer **deactivate** over hard delete |
| Fail-open on rule load | If Supabase rules fail to load, fall back to seeded in-memory rules and log a warning |

## Out of scope

- External commercial DDI knowledge bases / licensed content feeds
- Non-admin pharmacist rule editors / approval workflows
- Dose/renal/hepatic calculators
- Changing lab/imaging order CDS (pharmacy + allergy only for this phase)
- Durable offline mutation queue

## Current baseline

- `src/lib/cds.ts` — ~10 hard-coded DDI pairs  
- `src/lib/cpoe.ts` — 3 allergy families  
- Gate in `dal.placeClinicalOrder` + amber banner on `Orders.tsx`  
- Persist single string `clinical_orders.allergy_alert`

## Architecture

```
Admin UI (/cds-rules)
    ↓ CRUD (admin only)
Supabase: cds_drug_interactions / cds_allergy_rules
    ↓ load active rules (short memory cache)
cdsEngine (unified check)
    ↓ CdsAlert[]
Orders UI (cards + override reason)
    ↓ acknowledge + reason when required
dal.placeClinicalOrder (server-side re-check + persist)
clinical_orders (+ override columns)
```

Demo mode (no Supabase): engine uses the same seed dataset embedded in the repo (identical to SQL seed), so UAT remains deterministic.

## Data model

### `cds_drug_interactions`

| Column | Type | Notes |
|--------|------|-------|
| id | bigserial | PK |
| drug_a | text | Match token (substring, case-insensitive) |
| drug_b | text | Match token |
| severity | text | `major` \| `moderate` |
| category | text | e.g. `bleeding`, `serotonin`, `myopathy`, `hyperkalemia`, `toxicity`, `other` |
| message_en | text | Alert body |
| message_ar | text | Alert body |
| action_en | text | Suggested clinical action |
| action_ar | text | Suggested clinical action |
| active | boolean | default true |
| created_at / updated_at | timestamptz | |

Unordered matching: either side of the pair may match the new medicine vs an active medication name (same semantics as today).

### `cds_allergy_rules`

| Column | Type | Notes |
|--------|------|-------|
| id | bigserial | PK |
| allergy_key | text | e.g. `penicillin`, `sulfa`, `aspirin` |
| drug_matchers | text[] | Substrings that trigger when allergy text contains `allergy_key` |
| severity | text | Prefer `major` for seeded allergy rules |
| category | text | e.g. `allergy_cross_reactivity` |
| message_en / message_ar | text | |
| action_en / action_ar | text | |
| active | boolean | default true |
| created_at / updated_at | timestamptz | |

Also keep **direct name overlap** between allergy string and medicine name (existing heuristic) as a built-in major allergy alert even without a row match.

### `clinical_orders` additions

| Column | Type | Notes |
|--------|------|-------|
| allergy_alert | text | Keep for backward compatibility — human-readable summary (locale of placer optional; store English summary + AR available via structured JSON if needed) |
| cds_alerts_json | jsonb | Structured `CdsAlert[]` snapshot at place time |
| cds_override_reason | text | Required when policy says so |
| cds_acknowledged_by | text | User display / id |
| cds_acknowledged_at | timestamptz | |

SQL file: new `supabase/phase-b3b-cds-rules.sql` (idempotent), included in `SQL_ORDER` / `ops:bundle-sql` after `phase-b3-cpoe.sql`. Seed: migrate current pairs + allergy hints + a modest expansion (~15–25 DDI rows, ~5–8 allergy rows) with AR/EN copy.

RLS: authenticated read of **active** rules for clinical roles; write (insert/update) restricted to admin (match existing admin RLS patterns in phase-d / hardening).

## Runtime types

```ts
type CdsSeverity = 'major' | 'moderate'
type CdsKind = 'allergy' | 'drug_drug'

interface CdsAlert {
  kind: CdsKind
  severity: CdsSeverity
  category: string
  messageEn: string
  messageAr: string
  actionEn: string
  actionAr: string
  withDrug?: string      // interacting active med
  ruleId?: number        // null for built-in direct allergy overlap
}
```

Helpers:

- `requiresOverrideReason(alerts: CdsAlert[]): boolean` — true if any allergy **or** any major DDI  
- `requiresAcknowledge(alerts: CdsAlert[]): boolean` — true if any alert  
- `formatCdsSummary(alerts, locale)` — for legacy `allergy_alert` string and list rows  

## Placement rules (`placeClinicalOrder`)

For `orderType === 'pharmacy'`:

1. Resolve medicine name + patient allergies + active medication names (existing sources).  
2. Run engine → `alerts`.  
3. If `alerts.length` and `!acknowledgeCds` → throw typed error (UI shows cards; do not toast as generic failure).  
4. If `requiresOverrideReason(alerts)` and `cdsOverrideReason` trim length < 5 → throw.  
5. Persist summary string, `cds_alerts_json`, override reason, acknowledger, timestamp.  
6. Moderate-only: acknowledge flag required; reason optional/null.

Client must send: `acknowledgeCds`, `acknowledgeDrugInteractions` (keep compat or collapse to one flag — prefer **single** `acknowledgeCds` covering both), and `cdsOverrideReason`.

## UI

### Orders (`/orders`)

- Replace single amber line with a stack of alert cards when pending alerts exist.  
- Each card: severity badge, category, localized message, localized suggested action.  
- Major/allergy: stronger visual weight; moderate: lighter.  
- Textarea for override reason when `requiresOverrideReason`; disable submit until length ≥ 5.  
- Moderate-only: acknowledge checkbox/button without reason.  
- Order list + PatientDetail orders tab: show summary + override reason when present.

### Admin (`/cds-rules`)

- Admin-only route + nav entry (Admin group).  
- Tabs: Drug interactions | Allergy rules.  
- Table: active, severity, category, match keys, message preview (UI locale).  
- Create / edit drawer or modal; toggle active.  
- Soft-deactivate only (no hard delete in v1).  
- On save: invalidate rules cache so new orders see updates promptly.

## Rule loading & cache

- Module-level cache TTL ~60s (or invalidate on admin write).  
- `loadCdsRules()`: Supabase if configured; else seed.  
- On Supabase error: log + seed fallback (do not block ordering).

## i18n

- UI chrome keys in `en.ts` / `ar.ts` (card labels, reason placeholder, admin page).  
- Clinical alert **content** comes from rule columns `message_*` / `action_*`, not from static i18n files (except built-in direct-overlap template with AR/EN strings in code).

## Testing

- Unit: matching, bilingual selection, `requiresOverrideReason`, moderate vs major.  
- Unit: `placeClinicalOrder` rejects missing reason for major/allergy; accepts moderate with ack only (demo/IndexedDB path).  
- Extend existing `cds.test.ts` / `cpoe.test.ts`; add engine tests.  
- Optional Playwright smoke later — not required for first merge.

## Implementation notes

- Prefer one `src/lib/cdsEngine.ts` (or expand `cds.ts`) as the single check API; keep thin wrappers so `dal` does not duplicate matching.  
- Preserve `allergy_alert` column population so older UI/report paths keep working.  
- Update `docs/ops/PHASE_B3_CPOE.md` (or short CDS ops note) with SQL apply order.  
- Wire new SQL into `scripts/ops-automate.mjs` `SQL_ORDER`.

## Success criteria

1. Admin can deactivate a seeded major pair and a new conflicting order no longer alerts on that pair (after cache refresh).  
2. Placing warfarin + aspirin without reason fails; with reason ≥ 5 chars succeeds and stores reason.  
3. Allergy penicillin vs amoxicillin requires reason; moderate-only DDI does not.  
4. Switching UI language changes card message/action language without re-placing the order (for **pending** cards from live rules; historical `cds_alerts_json` can render either language from stored bilingual fields).  
5. Demo mode (no Supabase) still runs seed rules and unit tests pass.
