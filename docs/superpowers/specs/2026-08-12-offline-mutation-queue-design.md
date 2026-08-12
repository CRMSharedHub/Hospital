# Durable Offline Mutation Queue — Design

**Date:** 2026-08-12  
**Status:** Approved (server-wins conflict policy)

## Goal

When Supabase is configured and the client is offline (or a write fails with a network error), queue selected mutations in IndexedDB and flush them FIFO when connectivity returns. Conflicts resolve with **server-wins**.

## Non-goals (v1)

- Demo/Dexie-only mode (local writes already work offline).
- File uploads, payments, CDS pharmacy order placement, GDPR erasure.
- Last-write-wins or automatic field merge.
- Full CRDT / OT.

## Scope of queued ops (v1)

| Op | Notes |
|----|--------|
| `updateAppointmentStatus` | Status only |
| `updateInvoiceStatus` | Status + optional paidAmount |
| `updateLabTestStatus` | Status + optional result |
| `updatePharmacyOrderStatus` | Status only |

## Architecture

1. **`offlineQueueTypes`** — `QueuedMutation`, op discriminated union, statuses: `pending` | `conflict` | `failed`.
2. **`offlineQueueStore`** — Dexie table `mutationQueue` (DB v12); injectable store interface for unit tests.
3. **`offlineQueue`** — `enqueue`, `listPending`, `flushAll(executor)`, conflict check via optional `expectedUpdatedAt`.
4. **`runOrEnqueue`** — Used by React Query mutationFns: direct execute if online; on offline/network error → enqueue + return `{ queued: true }`.
5. **Lifecycle** — `online` event + SW `background-sync` message → `flushAll`; request Background Sync tag `retry-mutations` after enqueue.
6. **UI** — Layout banner: offline / syncing(N) / conflict count; i18n strings.

## Conflict policy (server-wins)

On flush, before applying an op that carries `expectedUpdatedAt`:

1. Load current server row.
2. If server `updated_at` ≠ expected → mark mutation `conflict`, do **not** apply client payload, invalidate related queries.
3. If match or no expected → apply update, remove from queue.

User is notified via toast; UI shows server truth after invalidate.

## Success criteria

- Unit tests cover enqueue, FIFO flush, network re-queue, server-wins conflict.
- With Supabase + offline, status mutations enqueue instead of hard-failing.
- Banner reflects pending/conflict counts.
- SCOPE Planned item #8 marked done (v1).
