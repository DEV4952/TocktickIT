# Actions Taken lifecycle extension — contract before schema changes

Date: 2026-10-30. Branch: feat/lab4-7-dashboard-api. Included with Issue #65 at the user's request as a rubric-driven scope extension, not a minor patch. No new GitHub issue is created without separate authorization to do so.

## Defined states and permissions

| Current state | Permitted next states | Role/condition |
| --- | --- | --- |
| RECORDED | IN_PROGRESS, COMPLETED, CANCELLED | IT_STAFF or ADMINISTRATOR with existing ticket access |
| IN_PROGRESS | COMPLETED, CANCELLED | IT_STAFF or ADMINISTRATOR with existing ticket access |
| COMPLETED | none | Terminal; no further assignment/content changes |
| CANCELLED | none | Terminal; no further assignment/content changes |

- RECORDED is an initial record, not a claim that legacy work is unfinished. Existing actions retain all existing field values; they receive RECORDED and null assignee because prior assignment/completion cannot be inferred.
- New actions start RECORDED; performedById always comes from the signed session and remains immutable. assigneeId is independent: defaults to the creator on new records, or may explicitly be an active IT_STAFF/ADMINISTRATOR; null means unassigned.
- Starting/completing requires an active staff/admin assignee. Cancellation is permitted while unassigned. Existing result/follow-up validation remains enforced.
- All permitted staff/admins can assign/reassign and edit nonterminal actions under the existing shared ticket policy. Requesters can only read actions/history on their own tickets, never edit, assign or transition them. This extends rather than weakens backend RBAC.
- Same-state and illegal transitions: 400. Unknown/missing action or wrong parent: 404. Inactive/non-staff assignee: 400. Wrong role: 403. Stale lifecycle version: 409. Missing/invalid lifecycle currentUpdatedAt: 400.
- Completion/cancellation do not change Ticket status, requester feedback or Ticket owner. Ticket workflow remains independent.

## API and history

- POST /api/tickets/:id/actions adds optional assigneeId. Caller-supplied status/history/performer fields cannot alter initial state or identity.
- PATCH /api/tickets/:id/actions/:actionId permits existing content fields and assigneeId. Existing performer/ticket immutability remains. Optional currentUpdatedAt enables stale-edit checks for the new UI; old clients remain compatible.
- PATCH /api/tickets/:id/actions/:actionId/status accepts status and mandatory currentUpdatedAt.
- GET /api/tickets/:id/actions/:actionId/history returns chronologically ordered history, with only public actor fields. No history update/delete endpoint exists.
- Every successful create/edit/assignment/transition appends a history event with actor, before/after snapshots and creation time in the same transaction. Rejected requests append nothing. History is append-only through the application APIs. Direct privileged SQL is outside this API guarantee.
- Legacy rows get no fabricated past events; the first subsequent mutation records its full prior snapshot. Snapshot history preserves earlier content while current action rows remain editable until terminal.
- Use an additive migration: new enum, nullable assignee FK/index, default status and new history table. No table replacement, reset, destructive backfill or fabricated creator/time.

## Required verification

API tests: roles, active/inactive/requester assignees, immutable performer/parent, complete/cancel matrix, legacy null assignment, terminal edits, version/conflicts, ordered immutable history and rollback/no extra events on rejection. UI tests: assignment loading/error, controls by role/status, original performer, failed/duplicate saves, status success/conflict and history display. Run previous Actions Taken, dashboard/workflow regressions and both builds. Responsive screenshots remain a later evidence step, not a claimed result.

## Implementation / final verification

Implemented the contract above in:

- server/prisma/schema.prisma and migrations/20261030000000_add_action_lifecycle/migration.sql
- server/src/services/actionLifecycle.ts and routes/actionsTaken.ts
- client/src/types.ts, api.ts and components/ActionsTaken.tsx
- server/tests/lab-04/action-lifecycle.api.test.ts and client/tests/lab-04/ActionLifecycle.test.tsx
- Updated the prior ActionsTaken component tests only where assignment/version fields intentionally extend the contract. Prior recorder/parent immutability and validation assertions remain.
- Synchronized specification.md, api-spec.md, tests.md and ui-spec.md with actual endpoints, statuses, permissions and error codes.

| Check | Result |
| --- | --- |
| New lifecycle API tests | **52/52 passed** |
| New lifecycle UI tests | **13/13 passed** |
| Previous Actions Taken API regression | **84/84 passed** |
| Previous Actions Taken UI regression | **37/37 passed** |
| Selected safe combined backend suite | **324/324 passed, 8 files** |
| Full frontend suite | **169/169 passed, 18 files** |
| Backend and frontend TypeScript/production builds | Passed |
| Prisma format/validate/generate | Passed |
| Live database versus schema diff | No difference |
| diff whitespace check | Passed |

### Migration and preservation

The migration was generated by diffing the live database with the new Prisma schema. SQL was reviewed before application; it contains only CREATE enum/table/index, ADD columns/FKs, wrapped in BEGIN/COMMIT. No DROP/rebuild/reset/truncate/delete/backfill of old content. Applied successfully with migrate deploy (the known development role has no shadow-database creation permission). This is now the sixth applied migration.

SHA-256 comparisons of every original column of every pre-existing row matched after migration and all tests. Only the intentionally added status/assignee columns are excluded from the old-column hash; all nine legacy actions were explicitly verified to have RECORDED/null assignment, unchanged existing timestamps and contents. No legacy history was fabricated; the history table is empty again after exact-fixture cleanup.

| Original table | Before | After |
| --- | ---: | ---: |
| users | 29 | 29 |
| categories | 4 | 4 |
| tickets | 482 | 482 |
| attachments | 5 | 5 |
| comments | 135 | 135 |
| internal_notes | 48 | 48 |
| actions_taken | 9 | 9 |

Tests create UUID-namespaced users/tickets and delete only returned fixture IDs. No existing user/ticket is reused or modified. Backend scope includes lifecycle, dashboard, prior Actions Taken/Ticket workflow, isolated Lab2 database, and Lab1 health/category checks. Full legacy backend suites with shared-data cleanup were not run. Frontend tests mock API/session data and do not access the database.

### Remaining limitations / rubric evidence

- Statuses/permissions are the explicitly documented implementation decision for grading Parts 6–7; no claim is made that the handout prescribes these exact enum names.
- History is append-only through application APIs, not protected from privileged SQL. Parent deletion follows existing Cascade cleanup; there is no public Action/history deletion endpoint.
- Legacy records are not retrospectively assigned, completed or given fabricated history; users assign them explicitly before starting/completing.
- Content updates accept optional versions for previous-client compatibility; the new UI always submits a version. Lifecycle transitions always require one.
- Rendered browser/responsive screenshots and full browser E2E remain unverified/deferred, as the user requested evidence collection later. Component tests are not presented as visual proof.
- Dashboard UI and its current-user Actions Taken view remain in the later dashboard UI issue. This extension does not claim to implement all grading Parts 5/8/9.
- No configured lint scripts; no lint pass is claimed.

### Proposed combined PR rationale

“Align grading Parts 6–7 by adding Action assignees, lifecycle controls and atomic append-only audit history alongside Issue #65 dashboard APIs.”

This describes the real additive feature scope. No separate GitHub issue was created. The user subsequently authorized commit, push and a combined review PR from feat/lab4-7-dashboard-api into lab4-staging. No merge is authorized.

Repeat from repository root:

```powershell
npm.cmd --prefix server run test -- tests/lab-04/action-lifecycle.api.test.ts --fileParallelism=false
npm.cmd --prefix client run test -- tests/lab-04/ActionLifecycle.test.tsx
npm.cmd --prefix server run build
npm.cmd --prefix client run build
```

Final pre-PR rerun: selected safe backend 324/324, entire frontend 169/169, both builds, Prisma validate and migration status passed. Six migrations applied, no pending migrations. Screenshots/manual responsive checks and full browser E2E remain unclaimed.
