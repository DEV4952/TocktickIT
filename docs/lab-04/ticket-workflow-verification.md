# Lab 4.6 Ticket workflow verification

Date: 2026-10-30 (Asia/Bangkok)
Branch: `feat/lab4-6-ticket-workflow`
Base: `lab4-staging` at `4448713` (merged Labs 4.3, 4.4 and 4.5).

## Workflow matrix and decisions

The matrix is taken from Lab 4 specification BR-06 and matches the existing backend transition graph. Every allowed transition below is restricted to authenticated **IT_STAFF or ADMINISTRATOR** users. The existing staff policy grants both roles access to all tickets, including unassigned tickets. Requesters have no formal status transitions, regardless of ticket ownership.

| Source | Allowed destinations | Conditions |
| --- | --- | --- |
| NEW | OPEN, IN_PROGRESS, CANCELLED | Staff/Admin; current version token |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED | Staff/Admin; current version token |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED | Staff/Admin; current version token |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED | Staff/Admin; current version token |
| RESOLVED | CLOSED, REOPENED | Staff/Admin; current version token |
| CLOSED | REOPENED | Staff/Admin; current version token |
| REOPENED | IN_PROGRESS, RESOLVED | Staff/Admin; current version token |
| CANCELLED | None (terminal) | No status update permitted |

Same-status requests are disallowed, consistent with the existing matrix: a fresh token produces HTTP 400 with no change or audit; a stale token produces 409 before transition validation. No Action Taken, owner assignment or mandatory resolution note is required to resolve a ticket. No ambiguous edges were added.

The prior Lab 4 documents describe HTTP 422 for illegal transitions, while the existing endpoint and regression tests use HTTP 400. This implementation preserves **400 / INVALID_STATUS_TRANSITION** and documents that compatibility decision rather than changing existing clients' error semantics.

## Backend contract and bypass review

`PATCH /api/staff/tickets/:id/status` retains numeric ID and ticket-number addressing. Example:

```json
{
  "status": "RESOLVED",
  "currentUpdatedAt": "2026-10-30T08:30:00.123Z",
  "resolutionSummary": "Verified service recovery."
}
```

- `currentUpdatedAt` is mandatory and must exactly use the UTC ISO format returned by the API, including milliseconds and Z. Missing tokens, non-strings, invalid calendar dates and noncanonical timestamps return **400 / INVALID_VERSION**.
- `resolutionSummary` remains optional and creates the existing `[Resolution Summary]: ...` public comment. `resolutionNote` from the Lab 4 API document is accepted as an alias; conflicting simultaneous values are rejected. Notes must be strings of at most 2000 trimmed characters.
- Authorization middleware runs before validation, reads or conflict details: unauthenticated requests return **401**, Requesters return **403** even when targeting missing tickets. Existing authentication/session behavior is retained.
- Unknown statuses return **400 / INVALID_STATUS**. Missing tickets return **404**. A valid but unequal version returns **409 / CONFLICT**, a clear explanation and the latest ticket in the existing staff response projection. Equality, rather than a newer-than comparison alone, rejects future or otherwise incorrect valid tokens too.
- All status changes use `server/src/services/ticketWorkflow.ts`. Its transaction reads the ticket, validates the matrix, and performs an atomic conditional update matching ID, status and updatedAt. Concurrent writers cannot both match the same version.
- Updated timestamps advance by at least one millisecond, even for a future stored token, so a successful status change always invalidates its predecessor token.
- Conditional update and optional audit comment commit or roll back together. Conflicts and invalid transitions create no audit rows. A failed audit insertion rolls the status update back.
- Success returns `{ message, ticket }`, including updated status and fresh updatedAt token.
- Route review found no general ticket PUT/PATCH endpoint. Ticket creation fixes initial status to OPEN instead of trusting request-body status. The advisory route changes only problemAppearsResolved and creates its existing public comment; forged status fields cannot resolve a ticket. Foreign requester advisory access continues to return 404 under the existing isolation policy.
- No new audit model, schema, migration or notification system was introduced. The existing optional public resolution summary is the workflow audit behavior retained here.

## Frontend behavior

- Ticket Detail now uses `client/src/ticketWorkflow.ts` instead of handwritten JSX branches. Backend and frontend definitions are separate to avoid changing server output paths/project boundaries; both are tested against the same independently specified BR-06 graph.
- Only Staff/Admin controls are displayed once auth loading finishes. Requester advisory controls remain separate from formal resolution.
- Requests include the ticket's current updatedAt. Successful status, claim, reassign and priority responses merge the returned ticket fields/token into local state.
- Status updates have a synchronous submission guard plus disabled controls while pending. Success immediately updates the summary badge, current selection, permitted destinations and version for the next request.
- HTTP 409 preserves existing user input, locks the status control, explains that the change was not saved and offers **Load latest ticket**. There is no automatic retry or overwrite. Explicit refresh replaces ticket state/token, clears stale status selection and asks the user to review the latest details before selecting another transition. A failed refresh keeps the lock and retry action.

## Automated verification

| Check | Result |
| --- | --- |
| New `server/tests/lab-04/ticket-workflow.api.test.ts` | **155/155 passed** |
| New `client/tests/lab-04/TicketWorkflow.test.tsx` | **37/37 passed** |
| Selected backend regressions plus workflow | **245/245 passed across 5 files** |
| Entire frontend suite | **156/156 passed across 17 files** |
| Backend TypeScript build | Passed |
| Frontend TypeScript + Vite build | Passed |
| `git diff --check` | Passed |
| Separate lint | Not run: no configured lint scripts |

Backend coverage includes every source/destination pair for Staff and Admin, same-status requests, requester direct resolution denial, missing/general-route bypass checks, advisory isolation, missing/malformed/stale tokens, concurrent writers (one 200 and one 409), audit consistency/rollback, monotonic tokens, missing records and unauthenticated requests. UI coverage includes all role/status combinations, advisory separation, token refresh, duplicate submission protection, error handling and explicit conflict recovery without automatic retry.

Backend integration tests run on the configured development PostgreSQL target using unique UUID fixture namespaces and cleanup restricted to IDs returned by this suite's create calls. Existing development tickets/users are not reused or modified. No reset, truncate or broad deleteMany is used by the new suite. Frontend tests use API/session/fetch mocks and never connect to a database.

Selected backend regressions were Lab4.4 Actions Taken (84), isolated Lab2 database tests (4), and Lab1 health/categories (2). Legacy Lab3 staff-detail API tests were updated to send required tokens, including the fresh token after cancellation, but were **not executed** because their setup/cleanup mutates shared fixtures. Full legacy backend suites were not run against the shared development database. Their results are not claimed as passed.

## Manual browser verification limitation

Browser inventory was checked for this task and returned `The browser access host is unavailable`. Consequently, manual browser verification of status controls and the two-user conflict flow was not performed. Automated Supertest/Testing Library coverage passed; it is not presented as manual browser evidence.

Suggested manual follow-up: open the same ticket in two authenticated staff sessions, change status in session A, then submit from session B. B should show the conflict message without overwriting A; load latest, review the new status and choose a permitted transition manually. As Requester, confirm only advisory feedback is available.

## Repeat commands (repository root, PowerShell)

```powershell
npm.cmd --prefix server run test -- tests/lab-04/ticket-workflow.api.test.ts --fileParallelism=false
npm.cmd --prefix client run test -- tests/lab-04/TicketWorkflow.test.tsx
npm.cmd --prefix server run test -- tests/lab-04/ticket-workflow.api.test.ts tests/lab-04/actions-taken.api.test.ts tests/lab-02/database.test.ts tests/lab-01 --fileParallelism=false
npm.cmd --prefix client run test
npm.cmd --prefix server run build
npm.cmd --prefix client run build
```

The user subsequently authorized commit, push and a review PR for Lab4.6 targeting `lab4-staging`. No merge is authorized; do not merge into master. Manual browser verification remains unperformed as documented above.
