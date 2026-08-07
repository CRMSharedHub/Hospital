# Phase B1 — ADT / Census (wards, beds, admissions)

Apply after Phase C SQL if present (`phase-c-payments.sql`, `phase-c2-interop.sql`). Can also run after Phase A alone.

## SQL

```
supabase/phase-b1-adt.sql
```

Creates:

- `wards`
- `beds` (`available` | `occupied` | `cleaning` | `blocked`)
- `admissions` (`admitted` | `discharged`) with unique active patient/bed indexes

Seeds 3 wards × 4 beds. Staff (admin/doctor/nurse) can read/write admissions and beds; patients have no access.

Redeploy FHIR Edge (Encounter IMP):

```bash
supabase functions deploy fhir-r4
```

## App surfaces

| Route | Role | Purpose |
|-------|------|---------|
| `/census` | admin, doctor, nurse | Bed map + admit / transfer / discharge |

Permissions: `census:view`, `census:edit` (not granted to `patient`).

## Local / Dexie demo

Without Supabase, Dexie v5 seeds wards/beds + one demo admission (patient 103 on bed 1).

## FHIR

Active and historical admissions map to Encounter with `class.code = IMP` and id `adm-{id}`. Ambulatory appointments remain `AMB`.

## Smoke

1. Login as nurse/admin → open Census.
2. Admit a free patient to an available bed.
3. Transfer → discharge → mark bed Ready (cleaning → available).
4. Interop: Fetch Encounter with patientId of admitted patient → expect IMP entry.
