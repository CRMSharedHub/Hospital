# Phase B3b — CDS rules (drug–drug + allergy)

Apply after B3 CPOE (`phase-b3-cpoe.sql`).

## SQL

```
supabase/phase-b3b-cds-rules.sql
```

Creates:

- `cds_drug_interactions` — 18 seeded DDI rows (bilingual message + action)
- `cds_allergy_rules` — 6 seeded allergy cross-reactivity rows
- `clinical_orders` columns: `cds_alerts_json`, `cds_override_reason`, `cds_acknowledged_by`, `cds_acknowledged_at`

Seed content mirrors `src/lib/cdsSeed.ts` (same deterministic demo + Supabase baseline).

RLS: clinical roles read **active** rules; admin reads all and is the only writer.

## App surfaces (later tasks)

| Route | Role | Purpose |
|-------|------|---------|
| `/cds-rules` | admin | Manage DDI + allergy rules (soft-deactivate, edit) |

Permissions: `cdsRules:view`, `cdsRules:edit` (admin only).

## Ops

Included in `SQL_ORDER` after `phase-b3-cpoe.sql`. Verify:

```bash
npm run ops:check
```

Or bundle all migrations:

```bash
npm run ops:bundle-sql
```

## Smoke (after app wiring)

1. Admin → `/cds-rules` → see 18 DDI + 6 allergy seed rows.
2. Deactivate warfarin/aspirin → new conflicting pharmacy order no longer alerts (after cache refresh).
3. Place pharmacy order with major/allergy alert → override reason ≥ 5 chars required.
