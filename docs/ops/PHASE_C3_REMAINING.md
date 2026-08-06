# Phase C3 — Remaining interop (ERA, MLLP, messaging, NPHIES)

Apply after C2 (`phase-c2-interop.sql`).

## SQL

```
supabase/phase-c3-remaining.sql
```

Creates `patient_messages` with staff + patient RLS.

## Edge Functions

```bash
supabase functions deploy mllp-ingest
supabase functions deploy nphies
```

- **mllp-ingest** — HTTP body = MLLP-framed or bare HL7; returns MSA ACK; ORU may complete/create `lab_tests`.
- **nphies** — mock eligibility + claim submit (no live CHI credentials).

## App surfaces

| Route | Role | Purpose |
|-------|------|---------|
| `/claims` | admin | Import ERA 835 · Submit to NPHIES stub |
| `/interop` | admin | MLLP frame/ingest · NPHIES eligibility · HL7/FHIR |
| `/messages` | staff + patient | Patient–staff messaging |
| `/portal` | patient | Link to messages |

## Local libs (Dexie / demo)

| Module | Role |
|--------|------|
| `src/lib/era835.ts` | Encode/parse thin X12 835 → remittance posts |
| `src/lib/mllp.ts` | VT/FS framing + ACK + ORU→lab hint |
| `src/lib/nphies.ts` | Eligibility + claim submit stubs |
| `src/lib/interopApi.ts` | Edge with local fallback |

## Still out of scope (Phase D / live ops)

Real TCP MLLP listener, live NPHIES certificates, full HIPAA 835 loop, multi-facility SSO.
