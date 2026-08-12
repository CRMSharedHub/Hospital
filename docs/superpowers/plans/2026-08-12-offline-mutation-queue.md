# Offline Mutation Queue Implementation Plan

> **For agentic workers:** TDD required. Spec: `docs/superpowers/specs/2026-08-12-offline-mutation-queue-design.md`

**Goal:** Durable IndexedDB queue for selected Supabase status mutations; FIFO flush; server-wins conflicts.

## File structure

| Path | Role |
|------|------|
| `src/lib/offlineQueueTypes.ts` | Types + op union |
| `src/lib/offlineQueue.ts` | enqueue / flush / conflict (injectable store) |
| `src/lib/offlineQueue.test.ts` | Unit tests |
| `src/lib/offlineQueueDexie.ts` | Dexie-backed store |
| `src/lib/isNetworkError.ts` | Network error detection |
| `src/lib/db.ts` | v12 + `mutationQueue` table |
| `src/lib/api.ts` | Wire 4 status mutations via `runOrEnqueue` |
| `src/lib/offlineQueueLifecycle.ts` | online + SW message → flush |
| `src/entry-client.tsx` | Start lifecycle |
| `src/components/Layout.tsx` | Banner pending/conflict |
| `src/i18n/en.ts` + `ar.ts` | Strings |
| `docs/SCOPE.md` + `AUTOMATED_OPS.md` | Mark done |

## Tasks

### Task 1: Pure queue + tests
- Memory store; enqueue; flush FIFO; conflict when `expectedStatus !== serverStatus` and server ≠ desired; idempotent when server already desired.

### Task 2: Dexie store + network helper + runOrEnqueue
- Persist queue; `runOrEnqueue` for Supabase mode only.

### Task 3: Wire api + lifecycle + UI
- Four status mutations; flush on online/SW; banner counts.

### Task 4: Docs + full test run
