# TokTickIT Lab 4 — Test-Driven Design (Test DD) & Traceability Matrix

**Document Version:** 1.0.0  
**Status:** Approved for Implementation (Test-DD Deliverable)  
**Target Sprint:** Lab 4 — TokTickIT Actions Taken, Dashboards, and Final Regression  
**Authors:** Sorawit Chaitong (@DEV4952)  
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  

---

## 1. Executive Summary & Testing Strategy

This document establishes the **Test-Driven Design (Test DD)** deliverable and **Traceability Matrix** for TokTickIT Sprint 4. Adhering to strict Test-Driven Development principles, this test plan is designed before implementation code is written. It provides 100% verifiable traceability from the Sprint 4 Engineering Contract ([`docs/lab-04/specification.md`](file:///c:/toktickit/docs/lab-04/specification.md)), Business Rules (`BR-01` to `BR-12`), and Acceptance Criteria (`AC-01` to `AC-13`) to automated test suites.

### Testing Pyramid Architecture
```text
                           / \
                          /   \
                         / E2E \       (Playwright: End-to-End Actions Taken, Workflow Gating, Dashboards)
                        /-------\
                       /   UI    \     (Vitest + React Testing Library: Staff/Requester Dashboards, Actions Modal)
                      /-----------\
                     / Integration \   (Supertest + Prisma DB: Actions CRUD, Concurrency 409, Metrics Queries)
                    /---------------\
                   /      Unit       \ (State Machine Transitions, Date-Time Validators, Conditional Note Guard)
                  /-------------------\
```

### Core Verification Pillars:
1. **Actions Taken Subsystem:** Complete CRUD lifecycle, automatic performer binding from session (`performedById`), conditional follow-up note validation, requester read-only isolation, and inactive user rejection.
2. **Role-Appropriate Dashboards:** Correctness of server-side metrics calculation for Requester, IT Staff, and Administrator roles, daily deltas calculation (`+1 from yesterday`), zero-count empty states, and drill-down routing.
3. **Ticket Workflow & Concurrency Gating:** State machine compliance against the permitted transition matrix, advisory handling of customer resolution cues, and optimistic concurrency conflict detection (`409 Conflict`) using `updatedAt` timestamps.
4. **Final Regression & Product Hardening:** Zero regressions across all legacy features delivered in Labs 1 through 3 (Authentication, RBAC, Categories, Tickets, Attachments, Public Comments, Internal Notes, and Admin User Management).

---

## 2. Planned Test Suite Architecture & Repository Increment

In accordance with Lab 4 Handout Section 12 (Minimum Lab 4 Structure), the test catalog maps directly to the designated repository test directories:

| Layer | Test Directory / File | Target Domain & Scope | Framework / Runner | Target Count |
|---|---|---|---|:---:|
| **Server API** | `server/tests/lab-04/actions-taken.api.test.ts` | Actions Taken CRUD, auto performer attribution, conditional follow-up note, inactive user rejection, requester read-only | Vitest + Supertest | 10 |
| **Server API** | `server/tests/lab-04/ticket-workflow.api.test.ts` | Status transition matrix, resolution gate, advisory requester solved flag, optimistic concurrency `409 Conflict` | Vitest + Supertest | 8 |
| **Server API** | `server/tests/lab-04/requester-dashboard.api.test.ts` | Requester metrics (`myOpen`, `waiting`, `inProgress`, `resolved`, `closed`), customer data isolation, recent tickets | Vitest + Supertest | 15 |
| **Server API** | `server/tests/lab-04/staff-dashboard.api.test.ts` | IT Staff queue metrics (`new`, `open`, `inProgress`, `waiting`, `myAssigned`, `unassigned`), deltas, status/priority breakdowns, admin counts | Vitest + Supertest | 12 |
| **Client UI** | `client/tests/lab-04/StaffDashboard.test.tsx` | Staff dashboard rendering, metric cards with deltas, recent tickets list, quick actions, drill-down click routing | Vitest + RTL | 6 |
| **Client UI** | `client/tests/lab-04/RequesterDashboard.test.tsx` | Requester dashboard rendering, customer metric cards, recent tickets, drill-down links to My Tickets | Vitest + RTL | 5 |
| **Client UI** | `client/tests/lab-04/ActionsTaken.test.tsx` | Embedded Actions Taken table, Add/Edit modal, conditional follow-up field, read-only mode for Requester | Vitest + RTL | 7 |
| **Client UI** | `client/tests/lab-04/TicketWorkflow.test.tsx` | Status dropdown populated only with permitted transitions, advisory solve indicator, concurrency conflict alert modal (`409`) | Vitest + RTL | 6 |
| **E2E Workflow**| `e2e/lab-04/actions-taken-flow.spec.ts` | Technician logs action, edits action, verifies visibility on Requester screen | Playwright | 3 |
| **E2E Workflow**| `e2e/lab-04/ticket-resolution.spec.ts` | Requester indicates problem resolved, IT Staff reviews and formally resolves ticket, concurrency conflict test | Playwright | 3 |
| **E2E Workflow**| `e2e/lab-04/dashboards.spec.ts` | Metric counts verify against live database, drill-down navigation to filtered queue views | Playwright | 3 |
| **Regression** | `server/tests/lab-01/`, `lab-02/`, `lab-03/` | Server regression preserving Categories, Auth, Tickets, Attachments, Comments, Notes, Users | Vitest + Supertest | 100+ |
| **Regression** | `client/tests/lab-01/`, `lab-02/`, `lab-03/` | Client regression preserving UI components, forms, validation, and permissions | Vitest + RTL | 70+ |

---

## 3. Acceptance Criteria Traceability Matrix

The following matrix establishes explicit, observable mapping from every Requirement and Acceptance Criterion (`AC-01` through `AC-13`) to its corresponding automated test:

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
|---|---|---|---|---|---|:---:|
| **API-01** | API | AC-01, FR-01, BR-01 | Create valid Action Taken under ticket | HTTP 201 Created; action persisted under target ticket; returns created object | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-02** | API | AC-01, FR-02, BR-03 | Auto performer attribution | Backend binds `performedById = session.userId`; client-supplied performer ID is ignored | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-03** | API | AC-02, FR-03, BR-04 | Follow-up required without follow-up note | HTTP 400 Bad Request; descriptive error stating note is mandatory | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04** | API | FR-03, BR-04 | Follow-up required = false with empty note | HTTP 201 Created; `followUpNote` saved as null or empty without validation error | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-05** | API | AC-03, FR-05, BR-05 | Requester attempts to create Action Taken | HTTP 403 Forbidden; zero records created; permission rejected | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-06** | API | AC-04, FR-05, BR-05 | Requester lists Actions Taken on owned ticket | HTTP 200 OK; returns list of actions recorded by IT staff for viewing | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-07** | API | AC-05, FR-04 | IT Staff updates an existing Action Taken | HTTP 200 OK; updates description/result; refreshes `updatedAt`; preserves original performer | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-08** | API | AC-12, FR-06, BR-11 | Action attributed to inactive user (`isActive = false`)| HTTP 400 Bad Request; rejects inactive user action | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-09** | API | FR-07, BR-12 | Action Taken with attachment notes reference | HTTP 201 Created; persists `attachmentNotes` without altering attachment storage | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-10** | API | AC-09, FR-08, BR-06 | Permitted status transition (`OPEN` ➔ `IN_PROGRESS`) | HTTP 200 OK; updates ticket status; updates `updatedAt` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-11** | API | AC-09, FR-08, BR-06 | Disallowed status transition (`NEW` ➔ `RESOLVED`) | HTTP 400 Bad Request; rejects illegal jump; returns permitted list | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-12** | API | AC-11, FR-09, BR-07 | Requester submits advisory solved flag | HTTP 200 OK; sets `problemAppearsResolved = true`; leaves `status` unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-13** | API | BR-07 | Requester attempts direct status change to `RESOLVED` | HTTP 403 Forbidden; requester cannot bypass resolution gate | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-14** | API | AC-10, FR-10, BR-08 | Optimistic concurrency: update with current timestamp | HTTP 200 OK; status transitions cleanly when client timestamp matches DB | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-15** | API | AC-10, FR-10, BR-08 | Optimistic concurrency: update with stale timestamp | HTTP 409 Conflict; returns current server state; prevents silent overwrite | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-16** | API | AC-06, FR-11, BR-09 | Requester dashboard metrics query | HTTP 200 OK; returns `myOpenTickets`, `waitingForRequester`, `recentlyUpdated`, `recentlyResolved`, `inProgress`, `resolved`, `closed` | `server/tests/lab-04/requester-dashboard.api.test.ts` | Passed (Lab4.7) |
| **API-17** | API | AC-06, BR-09 | Requester dashboard data isolation | HTTP 200 OK; strictly verifies counts include only tickets where `requesterId = session.userId` | `server/tests/lab-04/requester-dashboard.api.test.ts` | Passed (Lab4.7) |
| **API-18** | API | FR-11, BR-10 | Requester dashboard empty state | HTTP 200 OK; user with zero tickets receives all metric counts as `0` and empty recent array `[]` | `server/tests/lab-04/requester-dashboard.api.test.ts` | Passed (Lab4.7) |
| **API-19** | API | AC-07, FR-12, BR-10 | IT Staff dashboard operational queue metrics | HTTP 200 OK; returns `newCount`, `openCount`, `inProgressCount`, `waitingRequesterCount`, `myAssignedCount`, `unassignedCount` counts | `server/tests/lab-04/staff-dashboard.api.test.ts` | Passed (Lab4.7) |
| **API-20** | API | FR-12, BR-12 | IT Staff dashboard daily delta computation | HTTP 200 OK; numeric creation-cohort deltas at UTC boundaries; positive/negative/zero and neutral zero without yesterday data; independent SQL match | `server/tests/lab-04/staff-dashboard.api.test.ts` | Passed (Lab4.7) |
| **API-21** | API | FR-12 | IT Staff dashboard status and priority breakdowns | HTTP 200 OK; returns counts grouped by `status` and `itPriority` | `server/tests/lab-04/staff-dashboard.api.test.ts` | Passed (Lab4.7) |
| **API-22** | API | FR-13 | Administrator dashboard user account counts | HTTP 200 OK; returns user breakdown (`totalUsers`, `activeUsers`, `inactiveUsers`, `requesterCount`, `itStaffCount`, `adminCount`) | `server/tests/lab-04/staff-dashboard.api.test.ts` | Passed (Lab4.7) |
| **UI-01** | UI | AC-01, FR-04 | Actions Taken table rendering in Ticket Detail | Renders actions table with Date/Time, Description, Result, Performer, and Follow-Up pill | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-02** | UI | AC-02, BR-04 | Actions Taken form conditional follow-up note | Checking "Follow-Up Required" dynamically displays and enforces required `followUpNote` input | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-03** | UI | AC-04, FR-05 | Actions Taken Requester read-only mode | Displays action history; omits `+ Add Action Taken` and `Edit` buttons from the DOM | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-04** | UI | AC-05, FR-04 | Actions Taken Edit modal pre-population | Clicking "Edit" opens modal populated with existing values; saves updates successfully | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-05** | UI | AC-06, FR-11 | Requester Dashboard layout & metric cards | Renders 4 customer metric cards, overview heading, recent tickets list, and quick actions | `client/tests/lab-04/RequesterDashboard.test.tsx` | Component/integration passed; visual QA pending |
| **UI-06** | UI | AC-07, FR-12 | IT Staff Dashboard operational metric cards | Renders 5 operational cards with daily deltas (`+2 yesterday`), recent tickets table, quick actions | `client/tests/lab-04/StaffDashboard.test.tsx` | Component/integration passed; visual QA pending |
| **UI-07** | UI | AC-08, FR-15 | Dashboard metric card drill-down navigation | Clicking card navigates to `/staff/queue?status=NEW` or `/staff/queue?ownerId=me` | `client/tests/lab-04/StaffDashboard.test.tsx` | Component/integration passed; visual QA pending |
| **UI-08** | UI | AC-09, BR-06 | Permitted transition dropdown options | Status select contains only valid next transitions according to current status state machine | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-09** | UI | AC-10, BR-08 | Concurrency conflict alert modal (`409`) | Displays conflict modal when 409 is returned; offers `Refresh` action to fetch latest state | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-10** | UI | AC-11, BR-07 | Advisory resolution indicator display | Displays "Requester indicated problem resolved" banner on ticket detail; status stays open | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-11** | UI | FR-17 | Double-click / In-flight submission protection | Disables submit button during active API call; displays loading spinner | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-12** | UI | FR-17 | Form state preservation on recoverable error | Preserves entered text in modal textarea when backend validation failure occurs | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **E2E-01** | E2E | AC-01, AC-04 | End-to-end Actions Taken creation & viewing | IT Staff logs action with follow-up note; Requester logs in and views action in read-only | `e2e/lab-04/actions-taken-flow.spec.ts` | Passed on Lab4.9 feature branch; see tests.md#verification-e2e |
| **E2E-02** | E2E | AC-03 | Requester action creation prohibition | Verifies Requester UI cannot access action submission; direct API invocation returns 403 | `e2e/lab-04/actions-taken-flow.spec.ts` | UI prohibition passed; direct 403 covered by API suite, not this browser spec |
| **E2E-03** | E2E | AC-06, AC-07 | Role Dashboard metrics verification | Compares metric numbers shown on Requester and Staff dashboards against database counts | `e2e/lab-04/dashboards.spec.ts` | Passed on Lab4.9 feature branch; see tests.md#verification-e2e |
| **E2E-04** | E2E | AC-08 | Dashboard drill-down end-to-end | Clicks "My Assigned" card ➔ lands on Ticket Queue filtered to current user tickets | `e2e/lab-04/dashboards.spec.ts` | Passed on Lab4.9 feature branch; see tests.md#verification-e2e |
| **E2E-05** | E2E | AC-09, AC-11 | Requester advisory solved ➔ IT formal resolution | Requester clicks solved flag; IT Staff inspects ticket, updates status to `RESOLVED` | `e2e/lab-04/ticket-resolution.spec.ts` | Passed on Lab4.9 feature branch; see tests.md#verification-e2e |
| **E2E-06** | E2E | AC-10 | Concurrent update conflict handling | Two browser contexts open same ticket; User A updates; User B receives 409 Conflict modal | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| **REG-01** | REG | AC-13, FR-16 | Lab 1 Foundation regression | Health checks, Category seed, and environment configurations pass without error | `server/tests/lab-01/` | Planned |
| **REG-02** | REG | AC-13, FR-16 | Lab 2 Requester ticketing regression | Requester ticket submission, list, attachments, and categories pass cleanly | `server/tests/lab-02/` & `client/tests/lab-02/` | Planned |
| **REG-03** | REG | AC-13, FR-16 | Lab 3 Authentication & RBAC regression | Login, logout, password change, staff queue triage, comments, and internal notes pass | `server/tests/lab-03/` & `client/tests/lab-03/` | Planned |
| **REG-04** | REG | AC-13, FR-16 | Lab 3 Admin user management regression | Admin user CRUD, active toggling, password reset, and safety locks pass cleanly | `server/tests/lab-03/` & `client/tests/lab-03/` | Planned |

---

## 4. How to Execute Automated Test Suites

### 4.1. Run Lab 4 Server API & Workflow Tests
```bash
npm --prefix server test -- tests/lab-04/
```

### 4.2. Run Lab 4 Client Component & Dashboard Tests
```bash
npm --prefix client test -- tests/lab-04/
```

### 4.3. Run Lab 4 End-to-End Workflow Tests
```bash
npm run test:e2e:lab4
```

### 4.4. Run Complete Regression Test Suite (Labs 1, 2, 3, and 4)
```bash
npm --prefix server test && npm --prefix client test
```
*Expected: 100% of tests passing with zero regressions across all server and client test suites.*

## Lab4.7 actual dashboard evidence (2026-10-30)

The current contract is api-spec.md section 4. Admin account statistics are returned only to ADMINISTRATOR callers of /api/dashboard/staff; no separate /admin API is planned. Delta values are numbers derived from current-status/current-owner creation cohorts, not historical queue changes. Requester recent metrics use a rolling inclusive seven-day UTC window; recent lists are five all-time latest public summaries.

| Evidence | Actual tests / result |
| --- | --- |
| API-16/17/18 plus boundary, future-date, sorting, list-limit and field-projection checks | requester-dashboard.api.test.ts: 15 passed |
| API-19/20/21/22 plus role/account protection and independent PostgreSQL checks | staff-dashboard.api.test.ts: 12 passed |
| Staff global-empty counts/categories/list | Mocked transaction aggregate snapshot; real empty PostgreSQL database not available under current permissions |
| Requester zero-count/empty-list scope | Real PostgreSQL fixtures, passed |
| Repeatable Read snapshot configuration | Verified in both endpoint suites |

Legacy plan rows not exercised by this issue remain Planned. Do not infer full-Lab completion from dashboard test results. Both suites use UUID fixtures and exact-ID cleanup; no existing rows are reset or deleted. See tests.md#verification-dashboard-api for complete commands, SQL, results and limitations.

## Rubric Actions Taken extension: actual coverage

This scope was explicitly added by the user to the Lab4.7 branch to address grading Parts 6?7; it is not described as a minor change.

| Requirement | Test path | Evidence |
| --- | --- | --- |
| AC-AT-01 / FR-AT-01/02 | server/tests/lab-04/action-lifecycle.api.test.ts | Full four-state graph for Staff/Admin; assignment defaults/reassignment, inactive/non-staff rejection, unassigned legacy rules, terminal immutability |
| AC-AT-02 / FR-AT-03 | server/tests/lab-04/action-lifecycle.api.test.ts | Requester isolation, immutable performer, before/after snapshots, no history mutation endpoint, stable ordering |
| AC-AT-03 / FR-AT-04 | server/tests/lab-04/action-lifecycle.api.test.ts | Missing/malformed/stale tokens, concurrent requests and rollback on audit failure |
| Assignment/lifecycle/history UI | client/tests/lab-04/ActionLifecycle.test.tsx | Active assignee form, original recorder, start/complete/cancel, terminal controls, read-only Requester, history/retry, conflict, failed/duplicate saves |
| Previous Actions Taken behavior | server/tests/lab-04/actions-taken.api.test.ts and client/tests/lab-04/ActionsTaken.test.tsx | Retained assertions; client payload contract intentionally extends with assigneeId/version while preserving performer/ticket immutability |

See tests.md#verification-actions-lifecycle for actual final results and migration/data preservation checks. Do not infer rendered responsive/browser evidence from component tests.

## Lab4.8 dashboard UI traceability (2026-10-31)

RequesterDashboard.test.tsx verifies exact scoped API values, zeros/loading/error/retry, detail/quick-action links, role/session protection and stale account-response isolation. StaffDashboard.test.tsx additionally verifies Administrator presentation, every metric destination, actual destination API filter arguments, direct-entry/remount filters, back/forward, recent-ticket Detail/back navigation and mocked API clients. New requester dashboard API cases verify grouped-open count equality, owned results, invalid/conflicting groups and all eight individual statuses against PostgreSQL. Frontend tests use mocks only. Rendered responsive QA and browser E2E are not claimed as passed; see ui-spec.md#verification-dashboard-ui.

## Lab4.9 actual browser evidence (2026-11-01)

Three real-backend Playwright specs contain four independent browser journeys. Final verification: all together 4/4; independently 1/1 + 1/1 + 2/2; repeat-each=3 12/12; zero retries and no observed final flakiness. Debugging before final verification had 3 failed executions (datetime serialization and performer locator), fixed in test code. No UI/API mocking is used by these browser specs. E2E-06 concurrent conflict remains Planned at browser level; existing API/component conflict coverage does not imply browser coverage. Lab4 API tests 320/320 and client tests 133/133 passed. Full Labs1-3/main regression, headed/cross-browser/mobile runs were not executed in this issue. See [tests.md#verification-e2e](tests.md#verification-e2e) for handout p9-10 mapping, safe local environment setup, exact evidence paths and preservation checks.


## Consolidated verification records

Historical results below apply to the stated issue/branch/date. They do not replace the latest execution summary or establish final main-branch acceptance.


<a id="verification-database"></a>

### database-verification

#### Lab 4.3 database verification (2026-10-29)

Scope: Prisma schema, migrations, seed and read-only verification. No UI/API changes.
Repository README and Lab 4 specifications were consulted; the broader UI/API work in those documents is outside this issue.

##### Implementation

- `ActionTaken`: String/CUID IDs for new records; PostgreSQL Text fields; Ticket Cascade and performer Restrict; indexes on ticket, performer, action date and creation date.
- The existing `20261029000000_add_actions_taken` migration was already applied locally before this task. Its original checksum and SQL are preserved.
- `20261029070000_action_taken_string_id` converts existing integer IDs to their text representation without replacing rows/tables. It removes the serial default and the database default on `updatedAt` to match Prisma.
- Seed uses email/category/ticket unique keys with empty updates to preserve existing account credentials and ticket workflow. Actions use stable IDs and adopt matching legacy actions. Attachments/comments/notes are inserted only when absent; comments/notes match author as well as ticket and content. Fixture action dates are fixed.
- Nine fixture tickets cover all eight statuses, all four priorities, and 0/1/multiple actions. Existing tickets and actions retain any previously edited contents.
- Root package scripts were merged to remove duplicate `scripts` keys while retaining existing test commands. `npm run seed` delegates to the server seed. `npm run check:actions` uses the server client and environment and only reads data.

##### Results

- Prisma format, validate, generate: passed (client 6.19.3).
- `npx.cmd --offline --no-install prisma migrate dev --name add_actions_taken` from `server`: blocked by P3014, database role cannot create a shadow database. No reset was attempted.
- Reviewed forward SQL applied successfully with `prisma migrate deploy`; five migrations now applied.
- Live database versus Prisma schema diff: no difference.
- Seed completed twice. Complete row snapshots after each successful run were identical, including timestamps.
- All original rows were compared using normalized-ID SHA-256 row hashes before migration and after both seeds: unchanged. No original rows were removed; total counts also matched.

| Data | Before | After first seed | After second seed |
| --- | ---: | ---: | ---: |
| Users | 29 | 29 | 29 |
| Categories | 4 | 4 | 4 |
| Tickets | 459 | 459 | 459 |
| Attachments | 5 | 5 | 5 |
| Comments | 129 | 129 | 129 |
| Internal notes | 46 | 46 | 46 |
| Actions taken | 9 | 9 | 9 |

- Fixture tickets 0001 through 0009 have respectively 2, 0, 1, 1, 3, 0, 1, 1, 0 actions. Ticket/performer relations and required follow-up notes passed verification.
- Existing dashboard query shapes: Michael has 4 assigned tickets; John has 0. Alex has 3 requested tickets; Emily has 0. This provides nonzero and zero scoped dashboards without changing global counts.
- Backend TypeScript build passed.
- Lab 1 health/category regression tests: 2/2 passed. Full Lab 2/3 integration suites were not run against the shared development database because they contain data deletion/cleanup operations.
- Windows sandbox `tsx` initially failed with `uv_os_get_passwd ENOMEM`; both successful seed runs used approved execution outside the sandbox.

##### Repeat checks

From repository root:

```powershell
npm.cmd run seed
npm.cmd run seed
npm.cmd run check:actions
npm.cmd --prefix server run build
```

From `server`:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate status
npx.cmd prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
```

No remaining migration or seed action is required for this development database. To use `migrate dev` for future migrations, configure an authorized separate shadow database (`shadowDatabaseUrl`) or ask the database administrator for development-only CREATEDB access, then rerun `npx.cmd prisma migrate dev --name add_actions_taken`. Do not reset this database.



<a id="verification-actions-api"></a>

### actions-taken-api-verification

#### Lab 4.4 Actions Taken API verification

Date: 2026-10-29 (Asia/Bangkok)
Branch: `feat/lab4-4-actions-taken-api`
Base: `lab4-staging` at `cdc4a23` (includes merged Lab 4.3 PR #71).

##### Implemented contract

| Endpoint | Access | Success |
| --- | --- | --- |
| `GET /api/tickets/:id/actions` | Requester for own ticket; IT Staff/Administrator for any ticket under the existing shared staff policy | 200, `{ ticketId, ticketNumber, totalActions, actions }` |
| `POST /api/tickets/:id/actions` | IT Staff/Administrator | 201, `{ message, action }` |
| `PATCH /api/tickets/:id/actions/:actionId` | IT Staff/Administrator | 200, `{ message, action }` |

- `:id` is a positive PostgreSQL integer ticket ID. `:actionId` is the String ID from Lab 4.3, including legacy numeric strings.
- Signed session cookies and Bearer tokens use the existing session authentication. Legacy Lab 2 identity headers cannot authenticate these new endpoints. Inactive accounts are rejected; the existing mandatory password-change restriction remains enforced.
- Creator identity always comes from the authenticated user. Updates ignore IDs, ticket/performer relations, createdAt and updatedAt; only actionDateTime, description, result, followUpRequired, followUpNote and attachmentNotes can be edited.
- PATCH merges editable fields with the stored action before validation. It cannot update an action under another ticket; Prisma manages updatedAt.
- Description: trimmed 5-3000 characters; result: trimmed 3-3000 characters. POST requires boolean followUpRequired. If true, the final trimmed followUpNote must contain at least 3 characters; if false, the note is cleared to null. Attachment notes are nullable, at most 1000 characters.
- actionDateTime is optional on POST (defaults to server time); supplied values must be valid ISO timestamps with timezone, including calendar-date validation.
- Lists have deterministic order: actionDateTime descending, createdAt descending, ID ascending. Existing tickets without actions return an empty array. Performer projection contains only id, name and role.
- Statuses: 401 missing/invalid signed session; 403 Requester writes or reads another requester's ticket; 400 invalid input; 404 missing ticket/action or mismatched parent.

##### Decisions where prior documents differ

The current issue request takes precedence. Existing Lab 4 api-spec.md describes PUT and validation 422; this issue uses PATCH (consistent with existing staff update routes) and validation 400. Existing ticket/comment routes sometimes conceal foreign requester tickets with 404; this issue explicitly requires 403. Only the new Actions Taken endpoints use that 403 policy. Existing routes and shared authentication behavior are unchanged.

No UI, schema or migration changes were needed. GET action detail and PUT are outside this issue's requested endpoints.

##### Verification

- Backend TypeScript build: passed.
- `server/tests/lab-04/actions-taken.api.test.ts`: **84/84 passed**.
- Selected Lab 1 health/category regressions: **2/2 passed**, separate from Lab 4.4 tests.
- Combined run: **86/86 passed**.
- `git diff --check`: passed.

Tests used the configured development PostgreSQL target `localhost:5432/toktickit`, with unique UUID fixture namespaces. They create their own category, users, tickets and actions. Cleanup deletes only primary-key IDs returned by this suite's create calls; no reset, truncate or broad deleteMany is used. Existing seeded users/tickets are neither reused nor modified.

SHA-256 hashes of all original rows and table counts were compared before and after the test runs. Every original row remained unchanged, and all created fixtures were removed:

| Table | Before | After |
| --- | ---: | ---: |
| users | 29 | 29 |
| categories | 4 | 4 |
| tickets | 459 | 459 |
| attachments | 5 | 5 |
| comments | 129 | 129 |
| internal_notes | 46 | 46 |
| actions_taken | 9 | 9 |

Full Labs 2-3 suites were not run against the shared development database because their existing cleanup includes data deletion operations. They are not claimed as passed. No push, PR or merge was performed during implementation; the changes are prepared for review on the feature branch.

##### Commands (repository root, PowerShell)

```powershell
npm.cmd --prefix server run test -- tests/lab-04/actions-taken.api.test.ts --fileParallelism=false
npm.cmd --prefix server run build
npm.cmd --prefix server run test -- tests/lab-04/actions-taken.api.test.ts tests/lab-01 --fileParallelism=false
```

Requires the configured server/.env PostgreSQL DATABASE_URL, the Lab 4.3 migrations already applied, a generated Prisma client, and permission to insert/delete the suite's own fixtures. A separate test database can be selected through DATABASE_URL without changing these tests. Future PRs must target lab4-staging; do not merge into master.



<a id="verification-actions-lifecycle"></a>

### actions-taken-lifecycle-verification

#### Actions Taken lifecycle extension — contract before schema changes

Date: 2026-10-30. Branch: feat/lab4-7-dashboard-api. Included with Issue #65 at the user's request as a rubric-driven scope extension, not a minor patch. No new GitHub issue is created without separate authorization to do so.

##### Defined states and permissions

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

##### API and history

- POST /api/tickets/:id/actions adds optional assigneeId. Caller-supplied status/history/performer fields cannot alter initial state or identity.
- PATCH /api/tickets/:id/actions/:actionId permits existing content fields and assigneeId. Existing performer/ticket immutability remains. Optional currentUpdatedAt enables stale-edit checks for the new UI; old clients remain compatible.
- PATCH /api/tickets/:id/actions/:actionId/status accepts status and mandatory currentUpdatedAt.
- GET /api/tickets/:id/actions/:actionId/history returns chronologically ordered history, with only public actor fields. No history update/delete endpoint exists.
- Every successful create/edit/assignment/transition appends a history event with actor, before/after snapshots and creation time in the same transaction. Rejected requests append nothing. History is append-only through the application APIs. Direct privileged SQL is outside this API guarantee.
- Legacy rows get no fabricated past events; the first subsequent mutation records its full prior snapshot. Snapshot history preserves earlier content while current action rows remain editable until terminal.
- Use an additive migration: new enum, nullable assignee FK/index, default status and new history table. No table replacement, reset, destructive backfill or fabricated creator/time.

##### Required verification

API tests: roles, active/inactive/requester assignees, immutable performer/parent, complete/cancel matrix, legacy null assignment, terminal edits, version/conflicts, ordered immutable history and rollback/no extra events on rejection. UI tests: assignment loading/error, controls by role/status, original performer, failed/duplicate saves, status success/conflict and history display. Run previous Actions Taken, dashboard/workflow regressions and both builds. Responsive screenshots remain a later evidence step, not a claimed result.

##### Implementation / final verification

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

###### Migration and preservation

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

###### Remaining limitations / rubric evidence

- Statuses/permissions are the explicitly documented implementation decision for grading Parts 6–7; no claim is made that the handout prescribes these exact enum names.
- History is append-only through application APIs, not protected from privileged SQL. Parent deletion follows existing Cascade cleanup; there is no public Action/history deletion endpoint.
- Legacy records are not retrospectively assigned, completed or given fabricated history; users assign them explicitly before starting/completing.
- Content updates accept optional versions for previous-client compatibility; the new UI always submits a version. Lifecycle transitions always require one.
- Rendered browser/responsive screenshots and full browser E2E remain unverified/deferred, as the user requested evidence collection later. Component tests are not presented as visual proof.
- Dashboard UI and its current-user Actions Taken view remain in the later dashboard UI issue. This extension does not claim to implement all grading Parts 5/8/9.
- No configured lint scripts; no lint pass is claimed.

###### Proposed combined PR rationale

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



<a id="verification-ticket-workflow"></a>

### ticket-workflow-verification

#### Lab 4.6 Ticket workflow verification

Date: 2026-10-30 (Asia/Bangkok)
Branch: `feat/lab4-6-ticket-workflow`
Base: `lab4-staging` at `4448713` (merged Labs 4.3, 4.4 and 4.5).

##### Workflow matrix and decisions

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

##### Backend contract and bypass review

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

##### Frontend behavior

- Ticket Detail now uses `client/src/ticketWorkflow.ts` instead of handwritten JSX branches. Backend and frontend definitions are separate to avoid changing server output paths/project boundaries; both are tested against the same independently specified BR-06 graph.
- Only Staff/Admin controls are displayed once auth loading finishes. Requester advisory controls remain separate from formal resolution.
- Requests include the ticket's current updatedAt. Successful status, claim, reassign and priority responses merge the returned ticket fields/token into local state.
- Status updates have a synchronous submission guard plus disabled controls while pending. Success immediately updates the summary badge, current selection, permitted destinations and version for the next request.
- HTTP 409 preserves existing user input, locks the status control, explains that the change was not saved and offers **Load latest ticket**. There is no automatic retry or overwrite. Explicit refresh replaces ticket state/token, clears stale status selection and asks the user to review the latest details before selecting another transition. A failed refresh keeps the lock and retry action.

##### Automated verification

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

##### Manual browser verification limitation

Browser inventory was checked for this task and returned `The browser access host is unavailable`. Consequently, manual browser verification of status controls and the two-user conflict flow was not performed. Automated Supertest/Testing Library coverage passed; it is not presented as manual browser evidence.

Suggested manual follow-up: open the same ticket in two authenticated staff sessions, change status in session A, then submit from session B. B should show the conflict message without overwriting A; load latest, review the new status and choose a permitted transition manually. As Requester, confirm only advisory feedback is available.

##### Repeat commands (repository root, PowerShell)

```powershell
npm.cmd --prefix server run test -- tests/lab-04/ticket-workflow.api.test.ts --fileParallelism=false
npm.cmd --prefix client run test -- tests/lab-04/TicketWorkflow.test.tsx
npm.cmd --prefix server run test -- tests/lab-04/ticket-workflow.api.test.ts tests/lab-04/actions-taken.api.test.ts tests/lab-02/database.test.ts tests/lab-01 --fileParallelism=false
npm.cmd --prefix client run test
npm.cmd --prefix server run build
npm.cmd --prefix client run build
```

The user subsequently authorized commit, push and a review PR for Lab4.6 targeting `lab4-staging`. No merge is authorized; do not merge into master. Manual browser verification remains unperformed as documented above.



<a id="verification-dashboard-api"></a>

### dashboard-api-verification

#### Lab 4.7 Dashboard API verification

Date: 2026-10-30 (Asia/Bangkok)
Branch: feat/lab4-7-dashboard-api
Base: lab4-staging at 6484cce (Labs 4.3–4.6 merged).

##### Metric definitions agreed before query implementation

The user delegated the recent-window decision; use 7 rolling days.

- Open: NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED, as specified in the existing API documentation. This is not merely status OPEN.
- Recent metrics: one reference time per request, with updatedAt in the inclusive UTC interval [referenceTime minus 7 * 24 hours, referenceTime]. Not Bangkok calendar-day boundaries. Future-dated records do not count toward recent metrics.
- Recently resolved: currently RESOLVED tickets whose updatedAt falls in the recent interval. There is no reliable resolvedAt/event history, and optional resolution-summary comments are not authoritative resolution events. This metric must not be described as a count of resolution events.
- Recent lists: up to 5 most recently updated tickets across all time within the actor's permitted scope, ordered updatedAt DESC, id DESC. This follows the existing documented list rather than applying the metric window to the list.
- Requester: every query is scoped to requesterId from the signed authenticated session. Query/body identity overrides are ignored.
- Staff: existing shared staff queue policy permits IT_STAFF/ADMINISTRATOR access to every ticket. Unassigned means ownerId IS NULL; assigned-to-me means ownerId equals the session user's ID. Both counts include all statuses, consistent with existing queue queries.
- Status breakdown: all eight real statuses. Priority breakdown: all four values of itPriority, not requester priority. Categories with no tickets return numeric zero.
- Administrator user statistics: all accounts, including inactive accounts, for totalUsers and per-role counts; activeUsers means isActive=true, inactiveUsers means isActive=false. Role counts are requesterCount, itStaffCount, adminCount, as in the existing API document. Statistics are returned only to ADMINISTRATOR callers of /staff.
- Daily deltas implement BR-12 creation-cohort comparisons: today UTC midnight through referenceTime inclusive versus previous UTC midnight through today midnight exclusive, grouped by current status/current ownerId. Return numeric today-minus-yesterday, with neutral 0 if yesterday is empty per Decision 1. These are not historical queue changes.
- Snapshot consistency: all counts, groupings and lists within each response use one PostgreSQL Repeatable Read transaction. The response includes the single reference time and window start for reproducible independent verification.
- No optional filters or limits: list size is fixed at 5. Unknown query parameters (including identity and limit parameters) do not alter the result or access scope.

Implementation and verification results follow below.

##### Implementation and response contracts

- `server/src/services/dashboard.ts`: authoritative count/groupBy queries, bounded projections, one reference time, Repeatable Read transaction per response.
- `server/src/routes/dashboard.ts`: signed-session authentication, role enforcement and safe errors. Legacy x-user-id/x-requester-id headers cannot authenticate these endpoints.
- `server/src/app.ts`: mounts /api/dashboard.
- `server/tests/lab-04/dashboardFixtures.ts`: reusable UUID fixture factory with exact-ID cleanup.
- `server/tests/lab-04/requester-dashboard.api.test.ts` and `staff-dashboard.api.test.ts`: isolated fixtures, explicit expectations and independent raw PostgreSQL verification.

Requester response:

```json
{
  "referenceTime": "2026-10-30T12:00:00.000Z",
  "windowStart": "2026-10-23T12:00:00.000Z",
  "metrics": {
    "myOpenTickets": 0,
    "waitingForRequester": 0,
    "recentlyUpdated": 0,
    "recentlyResolved": 0,
    "inProgress": 0,
    "resolved": 0,
    "closed": 0
  },
  "recentTickets": []
}
```

Staff response:

```json
{
  "referenceTime": "2026-10-30T12:00:00.000Z",
  "windowStart": "2026-10-23T12:00:00.000Z",
  "metrics": {
    "unassignedCount": 0,
    "myAssignedCount": 0,
    "newDelta": 0,
    "openDelta": 0,
    "inProgressDelta": 0,
    "waitingRequesterDelta": 0,
    "myAssignedDelta": 0,
    "newCount": 0,
    "openCount": 0,
    "inProgressCount": 0,
    "waitingRequesterCount": 0
  },
  "breakdowns": {
    "byStatus": { "NEW": 0, "OPEN": 0, "IN_PROGRESS": 0, "WAITING_FOR_REQUESTER": 0, "RESOLVED": 0, "CLOSED": 0, "REOPENED": 0, "CANCELLED": 0 },
    "byPriority": { "LOW": 0, "MEDIUM": 0, "HIGH": 0, "URGENT": 0 }
  },
  "recentTickets": []
}
```

`byPriority` is explicitly calculated from **itPriority**. For ADMINISTRATOR only, the staff response additionally contains `userMetrics` with numeric totalUsers, activeUsers, inactiveUsers, requesterCount, itStaffCount and adminCount. IT Staff receive no userMetrics property. No account rows, email addresses, passwords, hashes or session data are returned.

Every recent-ticket item contains exactly `id`, `ticketNumber`, `title`, `status`, `updatedAt`. No ticket descriptions, ownership data or child records are returned. Multiple children cannot inflate counts because the queries do not join child tables.

401: missing/invalid signed session or inactive account under existing authentication. 403: wrong role or mandatory password-change restriction. These GET routes introduce no supported input parameters; there is no filter/limit validation to bypass. Unsupported query/body values are ignored. Unexpected failures return existing-style 500 `{ error, message }` responses without returning database error details.

##### Reference material and scope

Read the supplied `SE+Lab+4.pdf`, particularly sections 4.6 and 6.2, as reference material. They require explicit metric definitions and authoritative concise data but do not impose a specific recent window. The seven-day choice above follows the user's delegation of that decision. GitHub Issue #65 matches the two requested endpoints and administrator statistics on /staff.

The main specification, API contract and test traceability were synchronized with this implementation. Issue #65 combines administrator statistics into /staff, superseding the earlier draft /admin route. Daily deltas from BR-12 are implemented using createdAt cohorts; the earlier report that these required unavailable history was incorrect and has been corrected. The dashboard endpoints themselves require no workflow, schema or UI changes. The user subsequently expanded this same branch with the Actions Taken assignment/lifecycle/history feature, documented separately in tests.md#verification-actions-lifecycle. Document instructions about final release/merging/submitting a PDF do not authorize those actions for this issue.

Drill-down alignment for the later dashboard UI issue: open metrics map to the listed open statuses, waiting to WAITING_FOR_REQUESTER, assignment cards to ownerId=null or the authenticated staff user's ID, and breakdowns to status/itPriority filters. Recent-window drill-down requires matching time-window support in a detailed list; this issue does not add unsupported list filters or misleading URLs.

##### Independent PostgreSQL verification

The tests do not call the production aggregation helper to derive expectations. They use explicit fixture expectations plus read-only raw SQL. In the following prepared query bind `$1` to the authenticated requester ID, `$2` to response windowStart and `$3` to response referenceTime:

```sql
SELECT
  (COUNT(*) FILTER (WHERE status::text IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')))::int AS "myOpenTickets",
  (COUNT(*) FILTER (WHERE status::text='WAITING_FOR_REQUESTER'))::int AS "waitingForRequester",
  (COUNT(*) FILTER (WHERE "updatedAt" >= ($2::timestamptz AT TIME ZONE 'UTC')
    AND "updatedAt" <= ($3::timestamptz AT TIME ZONE 'UTC')))::int AS "recentlyUpdated",
  (COUNT(*) FILTER (WHERE status::text='RESOLVED'
    AND "updatedAt" >= ($2::timestamptz AT TIME ZONE 'UTC')
    AND "updatedAt" <= ($3::timestamptz AT TIME ZONE 'UTC')))::int AS "recentlyResolved"
FROM tickets WHERE "requesterId"=$1;
```

The configured PostgreSQL session timezone is Asia/Bangkok, while Prisma DateTime columns are timestamp without time zone containing UTC values. Prisma raw-query Date parameters are timestamptz. Therefore raw verification must explicitly use `AT TIME ZONE 'UTC'`; relying on implicit timestamp/timestamptz comparison would shift boundaries by seven hours. ORM date filters and explicitly normalized raw SQL match at exact start/end boundaries, including one millisecond outside each boundary.

Independent staff queries (bind `$1` to the current staff user's ID):

```sql
SELECT
  (COUNT(*) FILTER (WHERE "ownerId" IS NULL))::int AS "unassignedCount",
  (COUNT(*) FILTER (WHERE "ownerId"=$1))::int AS "myAssignedCount"
FROM tickets;
SELECT status, COUNT(*)::int AS count FROM tickets GROUP BY status;
SELECT "itPriority", COUNT(*)::int AS count FROM tickets GROUP BY "itPriority";
SELECT id,"ticketNumber",title,status,"updatedAt"
FROM tickets ORDER BY "updatedAt" DESC,id DESC LIMIT 5;
SELECT COUNT(*)::int AS "totalUsers",
  (COUNT(*) FILTER (WHERE "isActive"))::int AS "activeUsers",
  (COUNT(*) FILTER (WHERE NOT "isActive"))::int AS "inactiveUsers",
  (COUNT(*) FILTER (WHERE role::text='REQUESTER'))::int AS "requesterCount",
  (COUNT(*) FILTER (WHERE role::text='IT_STAFF'))::int AS "itStaffCount",
  (COUNT(*) FILTER (WHERE role::text='ADMINISTRATOR'))::int AS "adminCount"
FROM users;
```

Requester recent-list verification adds `WHERE "requesterId"=$1` to the recent-list SQL. Staff SQL intentionally includes all tickets to match the existing access policy, rather than incorrectly restricting to assigned tickets.

##### Results and limitations

| Check | Result |
| --- | --- |
| Requester dashboard API tests | **15/15 passed** |
| Staff dashboard API tests | **12/12 passed** |
| Both new suites | **27/27 passed** |
| Selected safe backend suites including new dashboards | **272/272 passed across 7 files** |
| Backend TypeScript build | Passed |
| `git diff --check` | Passed |
| Lint | Not run: no configured backend lint script |
| Frontend tests/build | Combined branch extension: 169/169 frontend tests and production build passed; see lifecycle report |

Tests control Date.now at 2090-10-30T12:00:00.000Z without replacing timers needed by Prisma. They verify ownership, query/body/header spoof attempts, exact open/recent metrics, inclusive boundaries/future exclusion, deterministic ordering, fixed list limits, public-field projection, authenticated role restrictions, child-record non-duplication, IT-priority semantics, exact admin counts, daily creation-cohort deltas (positive/negative/zero, neutral zero with no yesterday rows, midnight, 1 ms outside boundaries and future exclusion), and Repeatable Read configuration.

The live database target is localhost:5432/toktickit. The configured role lacks CREATE DATABASE and database CREATE permission for a separate schema. New tests therefore create uniquely named accounts/category/tickets and remove only IDs returned by their own create calls. Original rows are not reused or updated. No reset, truncate or broad deleteMany is used.

A genuine zero-ticket Requester scope is tested against PostgreSQL. A genuinely empty staff database cannot be created under current permissions, because staff policy includes all development tickets. **The all-zero staff/admin snapshot test uses a mocked transaction aggregate client**, keeping real authentication, to verify zero categories/empty lists without deleting existing records. Live staff/admin nonempty counts are independently verified against SQL. Empty-global-database SQL behavior remains unverified in a separate database; a role with an isolated test database is needed for that additional check.

Before/after SHA-256 hashes and counts for every original row were compared around the selected safe regression run; all matched and fixtures were cleaned:

| Table | Before | After |
| --- | ---: | ---: |
| users | 29 | 29 |
| categories | 4 | 4 |
| tickets | 482 | 482 |
| attachments | 5 | 5 |
| comments | 135 | 135 |
| internal_notes | 48 | 48 |
| actions_taken | 9 | 9 |

The 272-test run includes dashboard suites (27), Lab4.4 Actions Taken (84), Lab4.6 Workflow (155), isolated Lab2 database tests (4) and Lab1 health/categories (2). Full legacy backend suites were not run because some setup/cleanup mutates shared fixtures. No claims are made about unexecuted tests.

Repeat from repository root, PowerShell:

```powershell
npm.cmd --prefix server run test -- tests/lab-04/requester-dashboard.api.test.ts tests/lab-04/staff-dashboard.api.test.ts --fileParallelism=false
npm.cmd --prefix server run build
```

The user subsequently authorized committing, pushing and opening a review PR targeting lab4-staging. No merge is authorized. No work on Lab4.8 or later issues was started.

##### Additional daily-delta SQL evidence

The staff suite compares every numeric delta with independent PostgreSQL creation-cohort aggregates. Bind $1 to the response referenceTime (ISO timestamp with Z):

```sql
WITH bounds AS (
 SELECT ($1::timestamptz AT TIME ZONE 'UTC') AS now_utc,
 date_trunc('day', $1::timestamptz AT TIME ZONE 'UTC') AS today_start
), cohorts AS (
 SELECT status,
 (COUNT(*) FILTER (WHERE "createdAt" >= today_start AND "createdAt" <= now_utc))::int AS today,
 (COUNT(*) FILTER (WHERE "createdAt" >= today_start - interval '1 day' AND "createdAt" < today_start))::int AS yesterday
 FROM tickets CROSS JOIN bounds GROUP BY status
)
SELECT status, today, yesterday, CASE WHEN yesterday=0 THEN 0 ELSE today-yesterday END AS delta
FROM cohorts;
```

For myAssignedDelta apply the same two time predicates with ownerId equal to the authenticated staff ID. Current owner/status are used, so neither reassignment events nor historical queue changes are claimed. UI presentation strings from the old draft contract were replaced with signed numeric delta fields.

##### Combined-branch scope after rubric review

At the user's explicit request, Actions Taken assignment, start/complete/cancel, concurrency and append-only API history were added to this dashboard branch. The dashboard-only safe suite above was 272 tests; the final combined run is **324/324 backend tests**, with **169/169 frontend tests** and both builds passing. The additive migration and data-preservation proof are in tests.md#verification-actions-lifecycle. Proposed PR reason: "Align grading Parts 6?7 by adding Action assignees, lifecycle controls and atomic audit history alongside the dashboard API." No screenshots or UI visual acceptance are claimed.



<a id="verification-e2e"></a>

### e2e-verification

#### Lab4.9 E2E verification

Branch: `test/lab4-9-e2e`, based on `lab4-staging` after Labs 4.3-4.8 were merged. No commit, push, PR or merge is part of this delivery.

##### Scope and handout traceability

Read the supplied `SE+Lab+4.pdf`: physical page 9, section 12 lists the required E2E folder, Actions Taken and ticket resolution files; `dashboards.spec.ts` continues on physical page 10. Page 9 is repository structure evidence, not a claim that every final grading criterion is covered by these four journeys. Final main-branch regression, reviewer approvals, responsive/accessibility evidence and submission screenshots remain separate work.

| Issue / reference | Spec and test name | Key assertions | Evidence |
| --- | --- | --- | --- |
| Actions Taken journey; handout p9 section 12 | `e2e/lab-04/actions-taken-flow.spec.ts`: IT Staff creates/edits an action; the owning Requester sees persisted read-only details | Real UI login; datetime, description, result, follow-up validation/note and attachment notes; edit/reload; UI and DB original performer; separate owner context has no mutation controls | `staff-created-edited-action`, `requester-action-read-only` PNG attachments |
| Resolution journey; handout p9 section 12 | `e2e/lab-04/ticket-resolution.spec.ts`: Requester advisory preserves OPEN; Staff records final work then resolves and closes via valid transitions | Advisory and public comment persist while exact OPEN remains; Staff reads comment, records final action, OPEN -> RESOLVED -> CLOSED; DB and both UI contexts verify persisted status | `requester-advisory-open`, `staff-formally-resolved`, `requester-final-closed` PNG attachments |
| Staff Dashboard; handout p9-10 section 12 | `e2e/lab-04/dashboards.spec.ts`: Staff Dashboard SQL metrics, recent ordering, card filters and Quick Actions | Five cards equal independent SQL; latest five updatedAt DESC/id DESC; real queue response totals/status/owner and rendered fixture rows; Create Ticket/Search Tickets/My Queue | `staff-dashboard` PNG; HTML/JSON assertion result |
| Requester Dashboard; handout p9-10 section 12 | Same spec: Requester Dashboard owned SQL metrics, filtered lists, navigation and cross-owner denial | Four counts equal scoped SQL; recent owned IDs/order; all card destination URLs, filters and rendered results; separate Requester denied foreign detail; both Quick Actions | `requester-dashboard` PNG; HTML/JSON assertion result |

No application API is mocked or intercepted. Fixture preparation and independent DB assertions use Prisma/raw parameterized PostgreSQL SQL. This does not add a universal mandatory-final-action resolution rule. These tests deliberately record an action as part of the resolution journey.

##### Safe setup (PowerShell, repository root)

```powershell
npm.cmd ci --include=dev
npm.cmd --prefix server ci --include=dev
npm.cmd --prefix client ci --include=dev
npx.cmd playwright install chromium
```

Configure a local, already migrated test database in an ignored `.env.e2e`, following `.env.e2e.example`. Generate the matching server Prisma Client when needed. `E2E_DATABASE_URL` must target loopback PostgreSQL and a database name containing test/e2e. The suite never creates a database, applies migrations, resets, truncates or seeds existing data. If migrations are needed, review their SQL and target before applying them separately. No credentials or authentication state are checked in.

For the existing local development DB, the explicit alternative is:

```powershell
$env:E2E_ALLOW_SHARED_DEV_DB = '1'
#### Optional: installed Chrome instead of downloaded Playwright Chromium
$env:E2E_BROWSER_CHANNEL = 'chrome'
```

Without a test URL or explicit shared-dev opt-in, configuration fails before starting servers. Remote URLs are refused. `.env.e2e` overrides are optional; do not expose its contents in screenshots/logs.

Ports default to API 3109 and web 5189 (`E2E_API_PORT`, `E2E_WEB_PORT` override). Playwright owns both servers and refuses to reuse occupied endpoints. The only product configuration change is the Vite API proxy environment override; ordinary development still defaults to port 3000.

##### Commands and reports

```powershell
npm.cmd run typecheck:e2e:lab4
$env:E2E_RUN_LABEL = 'together'
npm.cmd run test:e2e:lab4
$env:E2E_RUN_LABEL = 'actions-taken-flow-only'
npm.cmd run test:e2e:lab4 -- actions-taken-flow.spec.ts
$env:E2E_RUN_LABEL = 'ticket-resolution-only'
npm.cmd run test:e2e:lab4 -- ticket-resolution.spec.ts
$env:E2E_RUN_LABEL = 'dashboards-only'
npm.cmd run test:e2e:lab4 -- dashboards.spec.ts
$env:E2E_RUN_LABEL = 'repeat3'
npm.cmd run test:e2e:lab4 -- --repeat-each=3
#### Optional visible browser for manual observation:
npm.cmd run test:e2e:lab4:headed
```

Reports: `artifacts/lab-04/e2e-report/<label>/index.html`; machine result, PNG attachments and failure traces: `artifacts/lab-04/e2e-results/<label>/`. These are ignored, local runtime evidence; export selected final passing PNGs for submission after inspection. Run `npx.cmd playwright show-report artifacts/lab-04/e2e-report/together` to inspect locally.

Each test creates a UUID namespace, a category, Requester/Staff/second-Requester accounts with random in-memory passwords and known tickets. Teardown checks namespace and deletes exact recorded ticket IDs (relation cascade), then exact user IDs, then its category. A crashed/killed process can leave fixtures; inspect those exact IDs before manual cleanup, never broad-delete by prefix. Tests are independent and do not share auth sessions or depend on file order.

One worker is intentional on the shared local database: Staff cards use global totals, so concurrent fixture creation/deletion from another test would invalidate SQL-to-UI comparisons. Do not use the application or run other DB-writing tests while verifying global counts. There is no serial suite annotation and retries are zero. Recent fixtures use fixed 2090 timestamps, safely away from rolling-day boundaries; the tested recent list is all-time latest five, not the separate seven-day API counters. Cards are current-status/current-owner all-time counts. Seven-day API counter boundaries remain covered by existing API tests.

Failure screenshots mask login fields, unrelated global queue rows, assignee choices and unrelated recent rows. Action-only traces start after successful login, with screenshots, sources and DOM/network snapshots disabled; they sacrifice network/DOM replay to avoid tokens and personal data. Automatic unmasked error DOM prompts are disabled for this Playwright version. Login credentials are neither attached nor stored as storageState. Inspect all artifacts before sharing; debug runs are not submission evidence.

##### Actual execution

Verified 2026-11-01 on Windows, local PostgreSQL, installed Google Chrome in headless mode, one worker, retries=0. All four requirement rows above passed.

| Verification | Actual result | Report label |
| --- | --- | --- |
| All three files together | 4 passed, 0 failed, 0 skipped | together |
| Actions Taken independently | 1 passed | actions-taken-flow-only |
| Resolution independently | 1 passed | ticket-resolution-only |
| Dashboards independently | 2 passed | dashboards-only |
| All files repeated three times | 12 passed, 0 failed, 0 skipped | repeat3 |
| Total final verification | 20 successful test executions across 5 invocations; 0 retries | labels above |
| E2E TypeScript | passed | npm run typecheck:e2e:lab4 |
| Server build / client production build | both passed | npm --prefix server/client run build |
| Lab4 server API regression | 5 files, 320/320 passed | npm --prefix server run test -- tests/lab-04/ --fileParallelism=false |
| Lab4 client component regression | 5 files, 133/133 passed | npm --prefix client run test -- tests/lab-04/ |
| Git diff whitespace check | passed | git diff --check |

Before final verification, two debugging invocations ran 6 tests: 3 passed and 3 failed. Two failures came from a datetime-local fill containing redundant zero fractional seconds rejected by Chrome; one came from assuming performer/assignee names had identical DOM markup. Corrected the date serialization and targeted the Performed By definition directly, retaining the performer assertion. No product defect or behavior change was needed for these failures. Final runs observed no flakiness; this does not prove flakiness is impossible.

Read-only preservation checks compared SHA-256 digests of every original row before and after final E2E verification, then after API regression. Every original row was unchanged and every table returned to its original count: User 29, Category 4, Ticket 482, Comment 135, InternalNote 48, Attachment 5, ActionTaken 10, ActionTakenHistory 1. Runtime preservation data is local under artifacts/lab-04/e2e-results; it contains IDs/digests, not row contents. Sequence values advance naturally when fixtures are inserted/deleted. No reset, truncate, broad delete or update of pre-existing rows was used.

Inspected a generated failure trace ZIP: zero nonempty network files and zero resource snapshots. Inspected the selected Staff Dashboard PNG: synthetic fixture recent rows and global aggregate counts only.

Not run: headed, tablet/mobile, other browsers, production/main-branch E2E, full Labs1-3 regression, and browser-level concurrent-conflict journey (legacy E2E-06 plan). These are not part of this issue's required three journeys and are not claimed as passing. This verification does not establish every final rubric criterion or replace final main-branch tests/review approvals. The AI-use and reviewer documents require the author/reviewer to supply their own reflection and review evidence.
