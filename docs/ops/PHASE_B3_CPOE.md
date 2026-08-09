# Phase B3 — CPOE (clinical orders)

Apply after B2 (`phase-b2-clinical.sql`).

## SQL

```
supabase/phase-b3-cpoe.sql
```

Creates `clinical_orders` (lab / pharmacy / imaging / nursing / other) with priority, allergy alert text, and optional links to `lab_tests` / `pharmacy_orders`.

Next: [Phase B3b — CDS rules](./PHASE_B3B_CDS.md) (`phase-b3b-cds-rules.sql`).

Redeploy FHIR:

```bash
supabase functions deploy fhir-r4
```

## App surfaces

| Route | Role | Purpose |
|-------|------|---------|
| `/orders` | admin, doctor, nurse | Place + manage orders |
| `/patients/:id` → Orders tab | staff | Patient order list |
| `/portal` → Records | patient | Read-only orders |

Permissions: `orders:view`, `orders:edit`.

## Behavior

- Lab order → also creates `lab_tests` row (`status: ordered`)
- Pharmacy order → also creates `pharmacy_orders` row; runs simple drug–allergy check (e.g. Penicillin ↔ Amoxicillin); requires acknowledge to override
- Imaging / nursing / other → CPOE record only

## FHIR

- Non-pharmacy orders → `ServiceRequest` id `sr-{id}`
- Pharmacy still surfaces via existing `MedicationRequest` / pharmacy module

## Smoke

1. Doctor → `/orders` → place lab order for patient 103.
2. Pharmacy order Amoxicillin for patient 101 (Penicillin allergy) → alert → acknowledge.
3. Interop: Fetch `ServiceRequest` patientId `105`.
