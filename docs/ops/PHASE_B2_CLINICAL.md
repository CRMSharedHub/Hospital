# Phase B2 — Vitals + Problem List

Apply after B1 (`phase-b1-adt.sql`) when admissions exist; otherwise after Phase A/C SQL is fine (`admission_id` is nullable).

## SQL

```
supabase/phase-b2-clinical.sql
```

Creates:

- `vital_signs` — temperature, HR, RR, BP, SpO₂, weight/height
- `problems` — ICD-10 optional, status active/resolved/inactive, severity

RLS: staff (admin/doctor/nurse) read+write; patient read own via `current_user_patient_id()`.

Redeploy FHIR Edge:

```bash
supabase functions deploy fhir-r4
```

## App surfaces

| Surface | Role | Purpose |
|---------|------|---------|
| `/patients/:id` tabs Vitals + Problem list | staff with `patients:edit` | Record / resolve |
| `/portal` → Records | patient | Read-only vitals + problems |

## FHIR

- Vitals → `Observation` category `vital-signs`, id `vs-{id}`
- Problems → `Condition` id `cond-{id}`

## Local / Dexie

Dexie v6 tables `vitalSigns`, `problems`; seed for patients 101 and 103.

## Smoke

1. Login nurse → open patient 103 → Vitals → Add Record → save HR/BP.
2. Problem list → add ICD problem → Resolve.
3. Patient portal Records shows vitals/problems for linked patient 101.
4. Interop: Fetch `Condition` / `Observation` with patientId `103`.
