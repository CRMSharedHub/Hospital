# EHR Visit Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Express and PostgreSQL backend that persists hospital data and lets a confirmed appointment create one atomic EHR visit with a diagnosis, notes, and prescriptions.

**Architecture:** Keep the React/Vite app as the browser client and add an Express API under `server/`. Prisma owns the PostgreSQL schema, migrations, and seed data. The API encapsulates all database access and uses a transaction to complete a visit; the frontend fetches API data through `DataContext` and refreshes it after mutations.

**Tech Stack:** React 18, Vite 5, Tailwind CSS, Express, Prisma, PostgreSQL, Vitest, Supertest, React Testing Library.

## Global Constraints

- Use PostgreSQL as the only persistent datastore; never connect React directly to the database.
- Store `DATABASE_URL` only in server-side environment configuration; use `VITE_API_URL` only for the public API base URL.
- Preserve Arabic/English and RTL support in all new visible copy.
- A visit can only complete a `confirmed` appointment and each appointment has at most one visit.
- Visit completion must create its visit, note, prescriptions, and appointment status update in one transaction.
- Do not add billing, pharmacy inventory, lab workflows, notifications, reports, authentication, or authorization in this phase.

---

## File Structure

- **Create** `prisma/schema.prisma` — Prisma data model and PostgreSQL datasource.
- **Create** `prisma/seed.js` — deterministic development seed records replacing current mock data.
- **Create** `server/src/lib/prisma.js` — shared Prisma client.
- **Create** `server/src/services/appointmentService.js` — validation and transaction for visit completion.
- **Create** `server/src/routes/patients.js` — patient list/create and EHR record endpoints.
- **Create** `server/src/routes/doctors.js` — doctor list endpoint.
- **Create** `server/src/routes/appointments.js` — appointment list/create/update and completion endpoint.
- **Create** `server/src/app.js` — Express app, middleware, route registration, error handler.
- **Create** `server/src/server.js` — HTTP listener and graceful Prisma shutdown.
- **Create** `server/vitest.config.js` — Node test environment configuration for API tests.
- **Create** `vitest.config.js` — jsdom test environment configuration for React tests.
- **Create** `server/tests/appointmentService.test.js` — service unit coverage using a transaction mock.
- **Create** `server/tests/api.test.js` — HTTP integration coverage with an isolated PostgreSQL test database.
- **Create** `src/api/client.js` — typed-by-convention fetch wrapper and API resource functions.
- **Modify** `src/DataContext.jsx` — load API data, expose CRUD actions, and expose visit completion.
- **Create** `src/components/CompleteVisitModal.jsx` — diagnosis, notes, and repeatable prescription form.
- **Modify** `src/pages/Appointments.jsx` — display completion action and open the completion modal.
- **Modify** `src/pages/PatientDetail.jsx` — render relational visit, prescription, and note responses.
- **Modify** `src/i18n.jsx` — Arabic and English labels/errors for visit completion.
- **Create** `src/components/CompleteVisitModal.test.jsx` — UI validation and submit behavior.
- **Modify** `package.json` — scripts and runtime/test dependencies.
- **Create** `.env.example` — non-secret local configuration template.
- **Modify** `vite.config.js` — dev proxy for `/api` to the Express server.

## API Contract

The frontend consumes normalized DTOs:

```js
// Appointment DTO
{
  id: number,
  patientId: number,
  doctorId: number,
  patient: string,
  doctor: string,
  date: 'YYYY-MM-DD HH:mm',
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
}

// Completion request
{
  diagnosis: string,
  notes: string,
  prescriptions: [{ medicationName: string, dosage: string, instructions: string }]
}

// EHR record DTO
{
  bloodType: string,
  allergies: string[],
  history: [{ id: number, date: string, title: string, doctor: string, notes: string }],
  medications: [{ id: number, name: string, dosage: string, instructions: string, startDate: string }],
  notes: [{ id: number, date: string, text: string }],
  files: []
}
```

### Task 1: Add backend tooling and local configuration

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Create: `server/src/app.js`
- Create: `server/src/server.js`
- Create: `server/vitest.config.js`
- Create: `vitest.config.js`
- Modify: `vite.config.js`

**Interfaces:**
- Produces `createApp()` from `server/src/app.js`.
- Produces an API listener at `PORT` (default `4000`).
- Produces `npm run dev`, `npm run dev:api`, `npm run test:api`, and `npm run test:web` scripts.

- [ ] **Step 1: Add test and server dependencies**

Run:

```powershell
npm install express cors dotenv @prisma/client
npm install -D prisma concurrently vitest supertest @testing-library/react @testing-library/jest-dom jsdom
```

Expected: `package.json` records the installed packages.

- [ ] **Step 2: Add root scripts and Prisma seed configuration**

Replace the `scripts` object and add the `prisma` object in `package.json` with:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:web\" \"npm run dev:api\"",
    "dev:web": "vite",
    "dev:api": "node --watch server/src/server.js",
    "build": "vite build",
    "preview": "vite preview",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "test:api": "vitest run --config server/vitest.config.js",
    "test:web": "vitest run --config vitest.config.js"
  },
  "prisma": {
    "seed": "node prisma/seed.js"
  }
}
```

- [ ] **Step 3: Create a failing API health test**

Create `server/tests/api.test.js`:

```js
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'

describe('API health', () => {
  it('returns a health response', async () => {
    const response = await request(createApp()).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm run test:api -- server/tests/api.test.js`

Expected: FAIL because `server/src/app.js` does not exist.

- [ ] **Step 5: Implement app creation and listener**

Create `server/src/app.js`:

```js
import cors from 'cors'
import express from 'express'

export function createApp() {
  const app = express()
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
  app.use(express.json())
  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
  app.use((error, _request, response, _next) => {
    const status = error.status || 500
    response.status(status).json({ error: error.message || 'Internal server error' })
  })
  return app
}
```

Create `server/src/server.js`:

```js
import 'dotenv/config'
import { createApp } from './app.js'

const port = Number(process.env.PORT || 4000)
createApp().listen(port, () => console.log(`API listening on ${port}`))
```

Create `.env.example`:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hospital?schema=public"
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
VITE_API_URL=http://localhost:4000/api
```

Create `server/vitest.config.js`:

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node' },
})
```

Create `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true },
})
```

Update `vite.config.js` to proxy API requests:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:4000' } },
})
```

- [ ] **Step 6: Run the health test**

Run: `npm run test:api -- server/tests/api.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add package.json package-lock.json .env.example vite.config.js vitest.config.js server
 git commit -m "chore: add express API foundation"
```

### Task 2: Model PostgreSQL data and seed it with current demo records

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.js`
- Create: `server/src/lib/prisma.js`

**Interfaces:**
- Produces Prisma models `Patient`, `Doctor`, `Appointment`, `Visit`, `Prescription`, and `VisitNote`.
- Produces `prisma` from `server/src/lib/prisma.js`.
- Enables `npx prisma migrate dev --name init_ehr` and `npm run db:seed`.

- [ ] **Step 1: Write a schema assertion test**

Create `server/tests/schema.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('EHR schema', () => {
  it('enforces one visit per appointment', async () => {
    const appointment = await prisma.appointment.findFirst({ where: { status: 'confirmed' } })
    expect(appointment).not.toBeNull()
    await prisma.visit.create({ data: { appointmentId: appointment.id, patientId: appointment.patientId, doctorId: appointment.doctorId, diagnosis: 'Test diagnosis' } })
    await expect(prisma.visit.create({ data: { appointmentId: appointment.id, patientId: appointment.patientId, doctorId: appointment.doctorId, diagnosis: 'Duplicate' } })).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run the schema test to verify it fails**

Run: `npm run test:api -- server/tests/schema.test.js`

Expected: FAIL because Prisma client and migrations do not exist.

- [ ] **Step 3: Define the schema**

Create `prisma/schema.prisma` with models implementing this relationship graph:

```prisma
model Patient {
  id           Int           @id @default(autoincrement())
  name         String
  age          Int
  phone        String
  condition    String
  bloodType    String?
  allergies    String[]
  appointments Appointment[]
  visits       Visit[]
}

model Doctor {
  id           Int           @id @default(autoincrement())
  name         String
  specialty    String
  available    Boolean       @default(true)
  patientCount Int           @default(0)
  rating       Float         @default(0)
  appointments Appointment[]
  visits       Visit[]
}

model Appointment {
  id          Int               @id @default(autoincrement())
  patientId   Int
  doctorId    Int
  scheduledAt DateTime
  status      AppointmentStatus @default(pending)
  patient     Patient           @relation(fields: [patientId], references: [id])
  doctor      Doctor            @relation(fields: [doctorId], references: [id])
  visit       Visit?
}

enum AppointmentStatus { pending confirmed completed cancelled }

model Visit {
  id            Int            @id @default(autoincrement())
  appointmentId Int            @unique
  patientId     Int
  doctorId      Int
  diagnosis     String
  completedAt   DateTime       @default(now())
  appointment   Appointment    @relation(fields: [appointmentId], references: [id])
  patient       Patient        @relation(fields: [patientId], references: [id])
  doctor        Doctor         @relation(fields: [doctorId], references: [id])
  prescriptions Prescription[]
  notes         VisitNote[]
}

model Prescription {
  id             Int    @id @default(autoincrement())
  visitId        Int
  medicationName String
  dosage         String
  instructions   String?
  visit          Visit  @relation(fields: [visitId], references: [id], onDelete: Cascade)
}

model VisitNote {
  id        Int      @id @default(autoincrement())
  visitId   Int
  text      String
  createdAt DateTime @default(now())
  visit     Visit    @relation(fields: [visitId], references: [id], onDelete: Cascade)
}
```

Include `provider = "postgresql"`, `url = env("DATABASE_URL")`, and `generator client { provider = "prisma-client-js" }`.

- [ ] **Step 4: Create reproducible seed data**

Create `prisma/seed.js` that deletes dependent tables in this order: `visitNote`, `prescription`, `visit`, `appointment`, `doctor`, `patient`; then creates the six current doctors, five current patients, five appointments, and completed historical visits from `src/data/mockData.js`. Use explicit IDs for matching records and `new Date('2026-07-18T09:00:00.000Z')` for appointment datetimes.

- [ ] **Step 5: Create the shared Prisma client**

Create `server/src/lib/prisma.js`:

```js
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
```

- [ ] **Step 6: Generate, migrate, seed, and run test**

Run:

```powershell
npm run db:generate
npx prisma migrate dev --name init_ehr
npm run db:seed
npm run test:api -- server/tests/schema.test.js
```

Expected: migration exists, seed completes, and the unique-visit test passes.

- [ ] **Step 7: Commit**

```powershell
git add prisma server/src/lib/prisma.js server/tests/schema.test.js
git commit -m "feat: add PostgreSQL EHR schema"
```

### Task 3: Implement read APIs and stable DTO mapping

**Files:**
- Create: `server/src/routes/patients.js`
- Create: `server/src/routes/doctors.js`
- Create: `server/src/routes/appointments.js`
- Modify: `server/src/app.js`
- Modify: `server/tests/api.test.js`

**Interfaces:**
- Produces `GET /api/patients`, `POST /api/patients`, `GET /api/patients/:id/record`, `GET /api/doctors`, `GET /api/appointments`, `POST /api/appointments`, and `PATCH /api/appointments/:id`.
- All appointment read responses conform to the `Appointment DTO` above.

- [ ] **Step 1: Write failing HTTP tests**

Add tests to `server/tests/api.test.js`:

```js
it('returns appointments with relational identifiers and display names', async () => {
  const response = await request(createApp()).get('/api/appointments')
  expect(response.status).toBe(200)
  expect(response.body[0]).toMatchObject({ id: expect.any(Number), patientId: expect.any(Number), doctorId: expect.any(Number), patient: expect.any(String), doctor: expect.any(String) })
})

it('returns a patient EHR record from visits', async () => {
  const response = await request(createApp()).get('/api/patients/101/record')
  expect(response.status).toBe(200)
  expect(response.body).toMatchObject({ bloodType: 'A+', history: expect.any(Array), medications: expect.any(Array), notes: expect.any(Array), files: [] })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:api -- server/tests/api.test.js`

Expected: FAIL with `404` for resource endpoints.

- [ ] **Step 3: Implement endpoint mapping**

In each route module, use `express.Router()`. Query Prisma relations with `include: { patient: true, doctor: true }` for appointments. Map `scheduledAt` to `YYYY-MM-DD HH:mm`; map EHR history from visits ordered by `completedAt desc`, medications from prescriptions ordered by visit date, and notes from `VisitNote` ordered by `createdAt desc`. Return `404` with `{ error: 'Patient not found' }` for an unknown patient.

Register routers in `server/src/app.js`:

```js
import appointmentsRouter from './routes/appointments.js'
import doctorsRouter from './routes/doctors.js'
import patientsRouter from './routes/patients.js'

app.use('/api/patients', patientsRouter)
app.use('/api/doctors', doctorsRouter)
app.use('/api/appointments', appointmentsRouter)
```

- [ ] **Step 4: Implement create and patch validation**

For `POST /api/patients`, require non-empty `name`, positive integer `age`, non-empty `phone`, and non-empty `condition`; respond `400` with `{ error: '<message>' }` when invalid. For `POST /api/appointments`, require existing `patientId` and `doctorId`, a valid ISO `scheduledAt`, and reject another non-cancelled appointment for the same doctor at the same time with HTTP `409`. For `PATCH /api/appointments/:id`, accept only the four declared statuses.

- [ ] **Step 5: Run API tests**

Run: `npm run test:api -- server/tests/api.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add server/src/routes server/src/app.js server/tests/api.test.js
git commit -m "feat: expose hospital data APIs"
```

### Task 4: Implement atomic appointment completion

**Files:**
- Create: `server/src/services/appointmentService.js`
- Modify: `server/src/routes/appointments.js`
- Create: `server/tests/appointmentService.test.js`
- Modify: `server/tests/api.test.js`

**Interfaces:**
- Produces `completeAppointment(prisma, appointmentId, payload)`.
- `payload` is `{ diagnosis, notes, prescriptions }`.
- Returns the updated `Appointment DTO`.

- [ ] **Step 1: Write failing service tests**

Create `server/tests/appointmentService.test.js` with tests that expect `completeAppointment` to:

```js
it('writes visit data and marks a confirmed appointment completed', async () => {
  const result = await completeAppointment(prisma, 1, {
    diagnosis: 'Controlled hypertension',
    notes: 'Continue sodium reduction.',
    prescriptions: [{ medicationName: 'Amlodipine 5mg', dosage: 'Once daily', instructions: 'Take after breakfast' }],
  })
  expect(result.status).toBe('completed')
})

it('rejects completion without a diagnosis', async () => {
  await expect(completeAppointment(prisma, 1, { diagnosis: '', notes: '', prescriptions: [] })).rejects.toMatchObject({ status: 400 })
})

it('rejects a non-confirmed appointment', async () => {
  await expect(completeAppointment(prisma, 2, { diagnosis: 'Test', notes: '', prescriptions: [] })).rejects.toMatchObject({ status: 409 })
})
```

- [ ] **Step 2: Run the service tests to verify failure**

Run: `npm run test:api -- server/tests/appointmentService.test.js`

Expected: FAIL because the service is missing.

- [ ] **Step 3: Implement completion service**

Implement `completeAppointment` with `prisma.$transaction(async (tx) => { ... })`:

```js
const appointment = await tx.appointment.findUnique({ where: { id: appointmentId } })
if (!appointment) throw Object.assign(new Error('Appointment not found'), { status: 404 })
if (appointment.status !== 'confirmed') throw Object.assign(new Error('Only confirmed appointments can be completed'), { status: 409 })
if (!diagnosis.trim()) throw Object.assign(new Error('Diagnosis is required'), { status: 400 })
```

Validate every prescription contains trimmed `medicationName` and `dosage`; otherwise throw a `400` error. Create `Visit` with appointment patient/doctor IDs, create prescriptions only when provided, create one `VisitNote` only for non-empty notes, update appointment status to `completed`, include patient and doctor, and map to the declared Appointment DTO.

- [ ] **Step 4: Add endpoint integration tests**

Add HTTP cases for successful `POST /api/appointments/1/complete`, missing diagnosis (`400`), incomplete prescription (`400`), completed/cancelled appointment (`409`), and a repeated request (`409`). For the successful case, subsequently fetch the patient record and assert the diagnosis, medication, and note are present.

- [ ] **Step 5: Register endpoint and error propagation**

Register:

```js
router.post('/:id/complete', async (request, response, next) => {
  try {
    const appointment = await completeAppointment(prisma, Number(request.params.id), request.body)
    response.status(200).json(appointment)
  } catch (error) {
    next(error)
  }
})
```

Ensure the app error handler returns all known `error.status` values and only returns `500` for unexpected errors.

- [ ] **Step 6: Run API test suite**

Run: `npm run test:api`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add server/src/services server/src/routes/appointments.js server/tests
git commit -m "feat: complete appointments into EHR visits"
```

### Task 5: Replace frontend mock-data access with API-backed state

**Files:**
- Create: `src/api/client.js`
- Modify: `src/DataContext.jsx`
- Modify: `src/pages/Dashboard.jsx`
- Modify: `src/pages/Patients.jsx`
- Modify: `src/pages/Doctors.jsx`
- Modify: `src/pages/Appointments.jsx`
- Modify: `src/pages/PatientDetail.jsx`

**Interfaces:**
- Produces `api.getPatients()`, `api.createPatient(input)`, `api.getDoctors()`, `api.getAppointments()`, `api.createAppointment(input)`, `api.getPatientRecord(id)`, and `api.completeAppointment(id, input)`.
- `useData()` exposes `loading`, `error`, `refresh`, `completeAppointment`, and API-backed patient/doctor/appointment arrays.

- [ ] **Step 1: Write a failing client test**

Create `src/api/client.test.js`:

```js
import { describe, expect, it, vi } from 'vitest'
import { api } from './client'

describe('api client', () => {
  it('throws the server error message for a non-success response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Diagnosis is required' }), { status: 400 })))
    await expect(api.completeAppointment(1, { diagnosis: '', notes: '', prescriptions: [] })).rejects.toThrow('Diagnosis is required')
  })
})
```

- [ ] **Step 2: Run the test to verify failure**

Run: `npm run test:web -- src/api/client.test.js`

Expected: FAIL because `src/api/client.js` does not exist.

- [ ] **Step 3: Implement fetch wrapper and API methods**

Create `src/api/client.js` with a `request(path, options)` helper that uses `${import.meta.env.VITE_API_URL || '/api'}${path}`, reads JSON, throws `new Error(body.error || 'Request failed')` for non-OK responses, and exports these exact methods:

```js
export const api = {
  getPatients: () => request('/patients'),
  createPatient: (input) => request('/patients', { method: 'POST', body: JSON.stringify(input) }),
  getDoctors: () => request('/doctors'),
  getAppointments: () => request('/appointments'),
  createAppointment: (input) => request('/appointments', { method: 'POST', body: JSON.stringify(input) }),
  getPatientRecord: (id) => request(`/patients/${id}/record`),
  completeAppointment: (id, input) => request(`/appointments/${id}/complete`, { method: 'POST', body: JSON.stringify(input) }),
}
```

Supply `Content-Type: application/json` for requests with a body.

- [ ] **Step 4: Move `DataContext` to API state**

On provider mount, fetch patients, doctors, and appointments with `Promise.all`. Expose `loading` and `error`. Implement `refresh` to reload the three resources. Update `addPatient`, `addAppointment`, and `completeAppointment` to await the API and then call `refresh`. Fetch a record in `PatientDetail` with `api.getPatientRecord(id)` instead of storing `patientRecords` globally.

- [ ] **Step 5: Preserve existing view behavior**

Update callers so they use API appointment fields (`patientId`, `doctorId`, `date`, `status`) without changing the visual design. Make dashboard cards derive appointment values only after `loading` is false. Show a small localized error state when API loading fails.

- [ ] **Step 6: Run frontend tests and production build**

Run:

```powershell
npm run test:web
npm run build
```

Expected: both commands exit with code `0`.

- [ ] **Step 7: Commit**

```powershell
git add src/api src/DataContext.jsx src/pages package.json package-lock.json
git commit -m "feat: load hospital UI from API"
```

### Task 6: Add visit-completion UI and EHR rendering

**Files:**
- Create: `src/components/CompleteVisitModal.jsx`
- Create: `src/components/CompleteVisitModal.test.jsx`
- Modify: `src/pages/Appointments.jsx`
- Modify: `src/pages/PatientDetail.jsx`
- Modify: `src/i18n.jsx`

**Interfaces:**
- `CompleteVisitModal({ appointment, isOpen, onClose, onSave })` calls `onSave({ diagnosis, notes, prescriptions })`.
- `onSave` rejects with `Error`; the modal displays its message and preserves input.

- [ ] **Step 1: Add translation keys**

Add both Arabic and English translations for: `endVisit`, `diagnosis`, `clinicalNotes`, `addPrescription`, `medicationName`, `dosage`, `instructions`, `remove`, `completeVisit`, `prescriptionIncomplete`, `visitCompleted`, and `onlyConfirmedAppointments`.

- [ ] **Step 2: Write failing modal tests**

Create `src/components/CompleteVisitModal.test.jsx`:

```jsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CompleteVisitModal from './CompleteVisitModal'

it('blocks submission without a diagnosis', async () => {
  render(<CompleteVisitModal appointment={{ id: 1 }} isOpen onClose={vi.fn()} onSave={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /complete visit|إنهاء الزيارة/i }))
  expect(await screen.findByText(/required|مطلوب/i)).toBeInTheDocument()
})

it('submits diagnosis, notes, and prescriptions', async () => {
  const onSave = vi.fn().mockResolvedValue()
  render(<CompleteVisitModal appointment={{ id: 1 }} isOpen onClose={vi.fn()} onSave={onSave} />)
  fireEvent.change(screen.getByLabelText(/diagnosis|التشخيص/i), { target: { value: 'Hypertension' } })
  fireEvent.click(screen.getByRole('button', { name: /add prescription|إضافة وصفة/i }))
  fireEvent.change(screen.getByLabelText(/medication name|اسم الدواء/i), { target: { value: 'Amlodipine' } })
  fireEvent.change(screen.getByLabelText(/dosage|الجرعة/i), { target: { value: 'Once daily' } })
  fireEvent.click(screen.getByRole('button', { name: /complete visit|إنهاء الزيارة/i }))
  expect(onSave).toHaveBeenCalledWith({ diagnosis: 'Hypertension', notes: '', prescriptions: [{ medicationName: 'Amlodipine', dosage: 'Once daily', instructions: '' }] })
})
```

- [ ] **Step 3: Run modal tests to verify failure**

Run: `npm run test:web -- src/components/CompleteVisitModal.test.jsx`

Expected: FAIL because the component is missing.

- [ ] **Step 4: Implement modal behavior**

Create a modal consistent with `AppointmentModal.jsx`. Maintain local state:

```js
{ diagnosis: '', notes: '', prescriptions: [] }
```

Require a trimmed diagnosis. Add a blank prescription row on `addPrescription`. Reject any row missing a trimmed medication name or dosage with the localized `prescriptionIncomplete` message. Disable the submit button while `onSave` is pending. Catch `onSave` errors into a visible alert and do not reset form data on error. On success, reset state and call `onClose`.

- [ ] **Step 5: Wire completion into appointments**

In `Appointments.jsx`, add local `selectedAppointment` state. Render an `End Visit` button only where `appt.status === 'confirmed'`. Pass `completeAppointment(selectedAppointment.id, payload)` to `CompleteVisitModal`, then close it after success. Retain existing status filtering and booking behavior.

- [ ] **Step 6: Render persisted EHR data**

In `PatientDetail.jsx`, retrieve the record using the API. Render visit diagnosis as `history.title`, visit notes as `history.notes`, prescriptions with `instructions` when present, and notes with their creation date. Keep files empty in this phase and preserve the existing empty-state UI.

- [ ] **Step 7: Run tests and build**

Run:

```powershell
npm run test:web
npm run test:api
npm run build
```

Expected: all commands exit with code `0`.

- [ ] **Step 8: Commit**

```powershell
git add src/components/CompleteVisitModal.jsx src/components/CompleteVisitModal.test.jsx src/pages/Appointments.jsx src/pages/PatientDetail.jsx src/i18n.jsx
git commit -m "feat: add visit completion workflow"
```

### Task 7: Verify local startup, persistence, and deployment readiness

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Documents exact local setup, migration, seed, test, and production migration commands.

- [ ] **Step 1: Document exact local run commands**

Add a compact backend section to `README.md` containing:

```powershell
Copy-Item .env.example .env
npm install
npm run db:generate
npm run db:migrate -- --name init_ehr
npm run db:seed
npm run dev
```

Document that PostgreSQL must be running and `DATABASE_URL` must be updated before database commands.

- [ ] **Step 2: Document production migration requirement**

Add this deployment command to `README.md`:

```powershell
npx prisma migrate deploy
```

State that `.env` must remain server-only, PostgreSQL must be backed up, and the database must not be publicly exposed.

- [ ] **Step 3: Run final verification**

Run:

```powershell
npm run test:api
npm run test:web
npm run build
```

Expected: all commands exit with code `0`.

- [ ] **Step 4: Perform manual acceptance check**

With PostgreSQL and `npm run dev` running:

1. Open the appointments page.
2. Open a confirmed appointment and choose `End Visit`.
3. Submit diagnosis, note, and one prescription.
4. Confirm the appointment becomes `completed`.
5. Open the matching patient record and verify the visit, medication, and note appear.
6. Attempt to complete the same appointment again and verify a clear rejection with no duplicate records.

- [ ] **Step 5: Commit**

```powershell
git add README.md .env.example
git commit -m "docs: document EHR local setup"
```

## Plan Self-Review

- **Spec coverage:** Tasks 1-2 establish Express, Prisma, PostgreSQL, migration, seed, and environment configuration. Tasks 3-4 implement all phase-one API reads/mutations and the atomic completion rules. Tasks 5-6 connect the React UI, preserve localization, and render stored EHR data. Task 7 covers local setup, test verification, and production safety requirements.
- **Completeness scan:** Every rule and endpoint has an implementation task and explicit verification command; no incomplete work markers or unspecified validation behavior remain.
- **Type consistency:** The `Appointment DTO`, completion payload, EHR record DTO, `completeAppointment` service signature, and frontend API method names are declared once and used consistently in later tasks.
