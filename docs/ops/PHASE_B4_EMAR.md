# Phase B4 — eMAR + Phase B5 — Clinical print docs

Apply after B3 (`phase-b3-cpoe.sql`).

## SQL (B4)

```
supabase/phase-b4-emar.sql
```

Creates `medication_administrations` (scheduled / given / held / refused / missed).

Pharmacy CPOE orders auto-schedule one MAR dose (+1h).

## App surfaces

| Route | Role | Purpose |
|-------|------|---------|
| `/emar` | admin, doctor, nurse | Schedule + administer doses |
| `/patients/:id` → eMAR tab | staff | Patient MAR list |
| Patient header | staff | Print Rx / Print discharge (B5) |

Permissions: `emar:view`, `emar:edit`.

## B5 clinical documents

`src/lib/clinicalDocs.ts` — browser print HTML (no PDF library):

- Prescription (Rx) from EHR medications
- Discharge summary from problems + meds + last vitals

## Smoke

1. Nurse → `/emar` → see due doses → mark Given.
2. Schedule new dose for a patient.
3. Patient 103 → Print Rx / Print discharge (allow pop-ups).
4. Place pharmacy CPOE order → new MAR scheduled entry appears.
