# Phase C2 — Remittances, FHIR clinical resources, HL7 v2 stubs, portal records

Apply after C1 (`phase-c-payments.sql`).

## SQL

```
supabase/phase-c2-interop.sql
```

Creates `remittances` (ERA stub) linked to `claims`.

Redeploy FHIR Edge (expanded resources):

```bash
supabase functions deploy fhir-r4
```

## App surfaces

| Route | Role | Purpose |
|-------|------|---------|
| `/portal` | patient | Bills + appointments + lab/meds records |
| `/claims` | admin | Claims + post remittance |
| `/interop` | admin | HL7 encode/decode + FHIR fetch playground |

## FHIR R4 (read)

`Patient`, `Invoice`, `Account`, `Encounter`, `Observation`, `MedicationRequest`, `CapabilityStatement`

Local demo uses `src/lib/fhirMappers.ts` via `fetchFhirResource` when Supabase is off.

## HL7 v2

`src/lib/hl7v2.ts` — ADT^A01, ORM^O01, ORU^R01 encode/decode (pipe-delimited). Not MLLP/network.

## Still deferred

Live TCP MLLP, full clearinghouse EDI loop, live NPHIES certificates — see Phase C3 stubs in `PHASE_C3_REMAINING.md`.
