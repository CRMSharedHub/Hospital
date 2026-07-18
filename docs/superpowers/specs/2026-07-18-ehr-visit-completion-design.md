# EHR and Visit Completion Design

## Objective

Introduce a production-ready application foundation using React/Vite, an Express API, PostgreSQL, and Prisma. The first deliverable is an end-to-end visit-completion flow: a confirmed appointment is completed by recording a diagnosis, optional clinical notes, and zero or more prescriptions; the patient EHR then displays the persisted data.

## Scope

This phase includes the backend foundation, PostgreSQL/Prisma schema and migrations, seed data, API integration for existing patient, doctor, appointment, and EHR screens, and the visit completion UI.

This phase excludes billing, pharmacy inventory/dispensing, laboratory workflows, notification delivery, reporting dashboards, authentication, and authorization. Those modules will build on the same database in later phases.

## Architecture

- The existing React/Vite frontend remains the client application.
- A separate Express API owns all database access and business validation.
- PostgreSQL is the only persistent datastore.
- Prisma provides schema definition, migrations, query access, and seed support.
- The frontend never connects to PostgreSQL directly; its API base URL is supplied through environment configuration.
- Development uses a local PostgreSQL instance. Production uses PostgreSQL on the Hostinger VPS or an equivalent managed database.

## Data Model

### Patient

Stores the existing patient profile, including name, age, phone number, condition, blood type, and allergies.

### Doctor

Stores name, specialty, availability, patient count, and rating.

### Appointment

Stores patient and doctor foreign keys, scheduled date/time, and one of `pending`, `confirmed`, `completed`, or `cancelled` statuses. Existing name-only mock appointments are converted to relational references.

### Visit

Stores exactly one completed clinical encounter for an appointment. It contains the appointment reference, patient and doctor references, diagnosis, optional notes, and completion timestamp.

### Prescription

Stores a medication issued during a visit: medication name, dosage, and optional instructions. A visit may have zero or more prescriptions.

### VisitNote

Stores an optional clinical note linked to a visit. The completion flow creates a note when the user supplies one.

## API

Initial resources provide read/create operations needed by the current frontend:

- `GET/POST /api/patients`
- `GET /api/patients/:id/record`
- `GET /api/doctors`
- `GET/POST/PATCH /api/appointments`
- `POST /api/appointments/:id/complete`

The completion endpoint receives a diagnosis, optional notes, and a prescription list. It runs a database transaction that validates the appointment, creates the visit and related records, then changes the appointment status to `completed`.

## Visit Completion Rules

- Only a `confirmed` appointment can be completed.
- A completed or cancelled appointment is rejected.
- Diagnosis is required.
- Each submitted prescription requires both medication name and dosage.
- The visit must use the patient and doctor assigned to its appointment.
- Each appointment can have one visit only.
- If any validation or database operation fails, no partial visit, prescription, note, or appointment state is persisted.

## User Experience

- Confirmed appointments show an `End Visit` action.
- The action opens a modal with required diagnosis, optional clinical notes, and a repeatable prescription form.
- On success, the modal closes, the appointment displays `completed`, and data queries refresh.
- Patient record history shows visits; medications shows prescriptions; notes shows visit notes.
- API and validation errors are shown to the user without clearing their entered form values.

## Frontend Data Transition

The existing `DataContext` and `mockData` are replaced incrementally by API-backed state. Prisma seed data will reproduce the current demo data so the UI continues to work immediately after the transition.

## Configuration and Deployment

- Database connection configuration is stored only in a server-side `.env` file.
- The frontend receives only a public API base URL via Vite environment configuration.
- Prisma migrations are applied during deployment before the API starts.
- PostgreSQL backups and restricted network access are required before production use because the system stores patient data.

## Tests

- Unit tests cover appointment eligibility and completion service rules.
- API integration tests cover successful completion, missing diagnosis, invalid prescription data, completed appointment rejection, cancelled appointment rejection, and transaction rollback.
- Frontend tests cover modal validation and a successful completion path.

## Acceptance Criteria

1. Local development can start PostgreSQL, apply migrations, seed data, and run the frontend and API.
2. Existing patients, doctors, and appointments load from PostgreSQL through the API.
3. A confirmed appointment can be completed with a diagnosis, optional notes, and optional prescriptions.
4. Completing a visit persists all data atomically and updates the appointment to `completed`.
5. The patient EHR displays newly created visits, prescriptions, and notes.
6. Invalid or duplicate completion attempts return clear errors and create no partial data.
