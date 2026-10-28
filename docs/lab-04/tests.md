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
| **Server API** | `server/tests/lab-04/requester-dashboard.api.test.ts` | Requester metrics (`myOpen`, `waiting`, `inProgress`, `resolved`, `closed`), customer data isolation, recent tickets | Vitest + Supertest | 6 |
| **Server API** | `server/tests/lab-04/staff-dashboard.api.test.ts` | IT Staff queue metrics (`new`, `open`, `inProgress`, `waiting`, `myAssigned`, `unassigned`), deltas, status/priority breakdowns, admin counts | Vitest + Supertest | 8 |
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
| **API-03** | API | AC-02, FR-03, BR-04 | Follow-up required without follow-up note | HTTP 422 Unprocessable Entity; descriptive error stating note is mandatory | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-04** | API | FR-03, BR-04 | Follow-up required = false with empty note | HTTP 201 Created; `followUpNote` saved as null or empty without validation error | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-05** | API | AC-03, FR-05, BR-05 | Requester attempts to create Action Taken | HTTP 403 Forbidden; zero records created; permission rejected | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-06** | API | AC-04, FR-05, BR-05 | Requester lists Actions Taken on owned ticket | HTTP 200 OK; returns list of actions recorded by IT staff for viewing | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-07** | API | AC-05, FR-04 | IT Staff updates an existing Action Taken | HTTP 200 OK; updates description/result; refreshes `updatedAt`; preserves original performer | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-08** | API | AC-12, FR-06, BR-11 | Action attributed to inactive user (`isActive = false`)| HTTP 422 Unprocessable Entity; rejects inactive user action | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-09** | API | FR-07, BR-12 | Action Taken with attachment notes reference | HTTP 201 Created; persists `attachmentNotes` without altering attachment storage | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| **API-10** | API | AC-09, FR-08, BR-06 | Permitted status transition (`OPEN` ➔ `IN_PROGRESS`) | HTTP 200 OK; updates ticket status; updates `updatedAt` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-11** | API | AC-09, FR-08, BR-06 | Disallowed status transition (`NEW` ➔ `RESOLVED`) | HTTP 422 Unprocessable Entity; rejects illegal jump; returns permitted list | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-12** | API | AC-11, FR-09, BR-07 | Requester submits advisory solved flag | HTTP 200 OK; sets `problemAppearsResolved = true`; leaves `status` unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-13** | API | BR-07 | Requester attempts direct status change to `RESOLVED` | HTTP 403 Forbidden; requester cannot bypass resolution gate | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-14** | API | AC-10, FR-10, BR-08 | Optimistic concurrency: update with current timestamp | HTTP 200 OK; status transitions cleanly when client timestamp matches DB | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-15** | API | AC-10, FR-10, BR-08 | Optimistic concurrency: update with stale timestamp | HTTP 409 Conflict; returns current server state; prevents silent overwrite | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| **API-16** | API | AC-06, FR-11, BR-09 | Requester dashboard metrics query | HTTP 200 OK; returns `myOpenTickets`, `waitingForRequester`, `inProgress`, `resolved`, `closed` | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-17** | API | AC-06, BR-09 | Requester dashboard data isolation | HTTP 200 OK; strictly verifies counts include only tickets where `requesterId = session.userId` | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-18** | API | FR-11, BR-10 | Requester dashboard empty state | HTTP 200 OK; user with zero tickets receives all metric counts as `0` and empty recent array `[]` | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| **API-19** | API | AC-07, FR-12, BR-10 | IT Staff dashboard operational queue metrics | HTTP 200 OK; returns `new`, `open`, `inProgress`, `waiting`, `myAssigned`, `unassigned` counts | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-20** | API | FR-12, BR-12 | IT Staff dashboard daily delta computation | HTTP 200 OK; computes net delta compared to records created previous calendar day (UTC) | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-21** | API | FR-12 | IT Staff dashboard status and priority breakdowns | HTTP 200 OK; returns counts grouped by `status` and `itPriority` | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **API-22** | API | FR-13 | Administrator dashboard user account counts | HTTP 200 OK; returns user breakdown (`totalUsers`, `activeUsers`, `requesters`, `staff`, `admins`) | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| **UI-01** | UI | AC-01, FR-04 | Actions Taken table rendering in Ticket Detail | Renders actions table with Date/Time, Description, Result, Performer, and Follow-Up pill | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-02** | UI | AC-02, BR-04 | Actions Taken form conditional follow-up note | Checking "Follow-Up Required" dynamically displays and enforces required `followUpNote` input | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-03** | UI | AC-04, FR-05 | Actions Taken Requester read-only mode | Displays action history; omits `+ Add Action Taken` and `Edit` buttons from the DOM | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-04** | UI | AC-05, FR-04 | Actions Taken Edit modal pre-population | Clicking "Edit" opens modal populated with existing values; saves updates successfully | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-05** | UI | AC-06, FR-11 | Requester Dashboard layout & metric cards | Renders 4 customer metric cards, welcome greeting, recent tickets list, and quick actions | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| **UI-06** | UI | AC-07, FR-12 | IT Staff Dashboard operational metric cards | Renders 5 operational cards with daily deltas (`+2 yesterday`), recent tickets table, quick actions | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **UI-07** | UI | AC-08, FR-15 | Dashboard metric card drill-down navigation | Clicking card navigates to `/staff/queue?status=NEW` or `/staff/queue?assignedToMe=true` | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| **UI-08** | UI | AC-09, BR-06 | Permitted transition dropdown options | Status select contains only valid next transitions according to current status state machine | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-09** | UI | AC-10, BR-08 | Concurrency conflict alert modal (`409`) | Displays conflict modal when 409 is returned; offers `Refresh` action to fetch latest state | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-10** | UI | AC-11, BR-07 | Advisory resolution indicator display | Displays "Requester indicated problem resolved" banner on ticket detail; status stays open | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| **UI-11** | UI | FR-17 | Double-click / In-flight submission protection | Disables submit button during active API call; displays loading spinner | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **UI-12** | UI | FR-17 | Form state preservation on recoverable error | Preserves entered text in modal textarea when backend validation failure occurs | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| **E2E-01** | E2E | AC-01, AC-04 | End-to-end Actions Taken creation & viewing | IT Staff logs action with follow-up note; Requester logs in and views action in read-only | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| **E2E-02** | E2E | AC-03 | Requester action creation prohibition | Verifies Requester UI cannot access action submission; direct API invocation returns 403 | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| **E2E-03** | E2E | AC-06, AC-07 | Role Dashboard metrics verification | Compares metric numbers shown on Requester and Staff dashboards against database counts | `e2e/lab-04/dashboards.spec.ts` | Planned |
| **E2E-04** | E2E | AC-08 | Dashboard drill-down end-to-end | Clicks "My Assigned" card ➔ lands on Ticket Queue filtered to current user tickets | `e2e/lab-04/dashboards.spec.ts` | Planned |
| **E2E-05** | E2E | AC-09, AC-11 | Requester advisory solved ➔ IT formal resolution | Requester clicks solved flag; IT Staff inspects ticket, updates status to `RESOLVED` | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
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
npx playwright test e2e/lab-04/
```

### 4.4. Run Complete Regression Test Suite (Labs 1, 2, 3, and 4)
```bash
npm --prefix server test && npm --prefix client test
```
*Expected: 100% of tests passing with zero regressions across all server and client test suites.*
