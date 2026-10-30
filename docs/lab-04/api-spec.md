# TokTickIT Lab 4 — REST API Specification

**Document Version:** 1.0.0  
**Status:** Approved for Implementation (Spec-DD Deliverable)  
**Base URL:** `http://localhost:3000/api`  
**Authors:** Sorawit Chaitong (@DEV4952)  
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**Target Sprint:** Lab 4 — TokTickIT Actions Taken, Dashboards, and Final Regression  

---

## 1. Global Conventions & Standards

### 1.1. Protocol & Transport
- All requests are transmitted over HTTP/HTTPS.
- Request payload format: `Content-Type: application/json`.
- Response payload format: `Content-Type: application/json; charset=utf-8`.
- Date and time representations conform to ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).

### 1.2. Authentication & Session Resolution
- Client identity is determined via signed server-side session cookies (`toktick_session`) or `Bearer` tokens established in Lab 3.
- All endpoints extract authenticated user attributes: `{ id, email, role, isActive, mustChangePassword }`.
- If unauthenticated, endpoints reject the request with `401 Unauthorized`.
- If the authenticated account is inactive (`isActive: false`), endpoints return `403 Forbidden` (`ACCOUNT_INACTIVE`).
- If `mustChangePassword === true`, requests to business endpoints return `403 Forbidden` with error code `PASSWORD_CHANGE_REQUIRED`.

### 1.3. Standard Error Envelope
All error responses adhere to a consistent contract:
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable explanation of failure condition.",
  "details": []
}
```

---

## 2. Role-Based Authorization Matrix

| Endpoint | Method | Requester (Owner) | Requester (Other) | IT Staff | Administrator | Unauthenticated |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `/api/tickets/:ticketId/actions` | `POST` | ❌ 403 | ❌ 403 | ✅ 201 | ✅ 201 | ❌ 401 |
| `/api/tickets/:ticketId/actions` | `GET` | ✅ 200 | ❌ 403 | ✅ 200 | ✅ 200 | ❌ 401 |
| `/api/tickets/:ticketId/actions/:id` | `GET` | ✅ 200 | ❌ 403 | ✅ 200 | ✅ 200 | ❌ 401 |
| `/api/tickets/:ticketId/actions/:id` | `PATCH` | ❌ 403 | ❌ 403 | ✅ 200 | ✅ 200 | ❌ 401 |
| `/api/dashboard/requester` | `GET` | ✅ 200 | ✅ 200* | ❌ 403 | ❌ 403 | ❌ 401 |
| `/api/dashboard/staff` | `GET` | ❌ 403 | ❌ 403 | ✅ 200 | ✅ 200 | ❌ 401 |
| `/api/staff/tickets/:id/status` | `PATCH` | ❌ 403 | ❌ 403 | ✅ 200 | ✅ 200 | ❌ 401 |
| `/api/tickets/:id/resolve-indication`| `POST` | ✅ 200 | ❌ 403 | ✅ 200 | ✅ 200 | ❌ 401 |

*\*Note: `/api/dashboard/requester` aggregates strictly data owned by the authenticated requester (`requesterId = session.userId`).*

---

## 3. Actions Taken APIs (rubric-aligned extension)

All endpoints require signed authentication. IT_STAFF and ADMINISTRATOR share existing ticket access; REQUESTER can read only owned Ticket actions/history (foreign access: 403). Requesters cannot create, edit, assign or transition actions (403). Missing authentication is 401; missing record/wrong action parent is 404. Public account projections contain only id/name/role.

### 3.1. Create and update

- POST /api/tickets/:id/actions creates RECORDED; performedById is exclusively the authenticated creator and immutable.
- PATCH /api/tickets/:id/actions/:actionId updates nonterminal content/assignment. PUT is not supported.
- Fields: actionDateTime (optional server time on create, valid ISO timestamp), description (trimmed 5?3000 chars), result (trimmed 3?3000), followUpRequired (required boolean on create), followUpNote (at least 3 trimmed chars when required, otherwise null), attachmentNotes (nullable, at most 1000 chars).
- Optional assigneeId: active IT_STAFF/ADMINISTRATOR ID or null. Create omission defaults to creator; legacy rows remain null until assigned. Assignee is independent of performedBy and Ticket owner.
- PATCH optionally accepts currentUpdatedAt for stale-edit detection. New UI always sends it; older clients remain compatible. IDs, ticket/performer relations, supplied status/history and audit timestamps are not writable through content updates.
- 201/200 returns { message, action }; action includes scalar fields plus performedBy and nullable assignee projections. Input/assignee/follow-up errors return 400. A supplied stale token returns 409; optimistic checks and history insertion are atomic.

### 3.2. List and history

- GET /api/tickets/:id/actions returns { ticketId, ticketNumber, totalActions, actions }. Empty list is successful. Backend orders actionDateTime DESC, createdAt DESC, ID ASC; UI presents chronological actionDateTime ASC, createdAt ASC, ID ASC.
- GET /api/tickets/:id/actions/:actionId/history returns { history }, ordered createdAt ASC, ID ASC. Each entry has event, actorId, public actor projection, before/after scalar JSON snapshots and createdAt. Legacy actions have no fabricated history.
- There is no single-action GET, history mutation or action deletion endpoint. History is append-only through application APIs, retained until parent deletion by authorized database/lifecycle operations. Privileged SQL is not covered by this API immutability guarantee.

### 3.3. Action lifecycle (distinct from Ticket lifecycle)

PATCH /api/tickets/:id/actions/:actionId/status accepts { status, currentUpdatedAt }. Token is mandatory UTC ISO including milliseconds, as returned by the API.

| Source | Destinations | Conditions |
| --- | --- | --- |
| RECORDED | IN_PROGRESS, COMPLETED, CANCELLED | Staff/Admin; active assignee for start/complete |
| IN_PROGRESS | COMPLETED, CANCELLED | Staff/Admin; active assignee for complete |
| COMPLETED | none | Content/assignment locked |
| CANCELLED | none | Content/assignment locked |

Fresh same-status/illegal transition and missing/malformed token return 400; stale/concurrent token returns 409 with no partial change/event. Cancellation can be unassigned. Starting/completing revalidates and locks the assignee account through commit. Success returns { message, action } with a newer updatedAt. No automatic Ticket status change occurs.

Every successful API create/content edit/assignment/transition appends CREATED/UPDATED/ASSIGNED/STATUS_CHANGED history in the same transaction. Failed validation/conflicts append nothing; history failure rolls back mutation. The first edit of a legacy action snapshots its previous values. See actions-taken-lifecycle-verification.md for design-before-schema decisions and migration evidence.

---

## 4. Dashboard Analytics Endpoints

Contract synchronized with Issue #65 / Lab4.7 on 2026-10-30. Counts are computed in PostgreSQL, never supplied by the client. Each response uses one Repeatable Read transaction and one referenceTime.

### 4.1. Requester Dashboard Endpoint

- **Method:** GET
- **Endpoint:** /api/dashboard/requester
- **Access:** authenticated REQUESTER with a signed session (cookie or Bearer token).
- Every count and recent-list query uses requesterId from the session. Query/body IDs and legacy identity headers cannot override it.
- No supported filters or custom limit; unknown parameters are ignored.

#### Response 200 OK (empty scope)

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

#### Calculation rules

- myOpenTickets: statuses NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER and REOPENED.
- waitingForRequester, inProgress, resolved, closed: all-time counts of the corresponding current status, restricted to the requester.
- recentlyUpdated: updatedAt in the inclusive UTC interval [referenceTime - 7 * 24 hours, referenceTime]. Future timestamps are excluded.
- recentlyResolved: currently RESOLVED tickets with updatedAt in that same interval. This is not a count of resolution events; no authoritative resolvedAt/history exists.
- recentTickets: up to 5 latest tickets across all time, ordered updatedAt DESC then id DESC. Each item has exactly id, ticketNumber, title, status and updatedAt. Empty results are [].

### 4.2. Staff Dashboard Endpoint

- **Method:** GET
- **Endpoint:** /api/dashboard/staff
- **Access:** authenticated IT_STAFF or ADMINISTRATOR with a signed session.
- Existing staff access policy permits every ticket. Assignment identity is always the session user's ID.

#### Response 200 OK (empty aggregate example)

```json
{
  "referenceTime": "2026-10-30T12:00:00.000Z",
  "windowStart": "2026-10-23T12:00:00.000Z",
  "metrics": {
    "unassignedCount": 0,
    "myAssignedCount": 0,
    "newCount": 0,
    "openCount": 0,
    "inProgressCount": 0,
    "waitingRequesterCount": 0,
    "newDelta": 0,
    "openDelta": 0,
    "inProgressDelta": 0,
    "waitingRequesterDelta": 0,
    "myAssignedDelta": 0
  },
  "breakdowns": {
    "byStatus": {
      "NEW": 0,
      "OPEN": 0,
      "IN_PROGRESS": 0,
      "WAITING_FOR_REQUESTER": 0,
      "RESOLVED": 0,
      "CLOSED": 0,
      "REOPENED": 0,
      "CANCELLED": 0
    },
    "byPriority": {
      "LOW": 0,
      "MEDIUM": 0,
      "HIGH": 0,
      "URGENT": 0
    }
  },
  "recentTickets": []
}
```

- unassignedCount: ownerId IS NULL across all statuses.
- myAssignedCount: ownerId equals the authenticated user, across all statuses.
- newCount, openCount, inProgressCount, waitingRequesterCount: current counts of NEW, OPEN, IN_PROGRESS and WAITING_FOR_REQUESTER.
- byStatus includes all eight statuses with zero categories. byPriority includes all four **itPriority** values; it does not use requester priority.
- recentTickets uses the same five-field projection, fixed limit and deterministic ordering as the Requester endpoint, under the shared staff scope.

#### Daily deltas (BR-12)

newDelta, openDelta, inProgressDelta, waitingRequesterDelta and myAssignedDelta are signed **numbers**, not presentation strings. The UI formats the label/sign.

For each current status group (or current ownerId for myAssignedDelta), compare the number of tickets created today against those created yesterday:

- Today: createdAt >= UTC midnight of referenceTime and createdAt <= referenceTime.
- Yesterday: createdAt >= previous UTC midnight and createdAt < today's UTC midnight.
- Delta = today - yesterday; if yesterday is zero, return neutral 0, preserving specification Decision 1.

Status and owner are their **current snapshot values**. These are creation-cohort comparisons, not historical queue/status/assignment changes. Midnight belongs only to today; fractional seconds before midnight remain in yesterday. Future-created records are excluded. All queries share the response snapshot.

### 4.3. Administrator account statistics on the staff endpoint

ADMINISTRATOR callers of GET /api/dashboard/staff additionally receive:

```json
{
  "userMetrics": {
    "totalUsers": 0,
    "activeUsers": 0,
    "inactiveUsers": 0,
    "requesterCount": 0,
    "itStaffCount": 0,
    "adminCount": 0
  }
}
```

All account/role totals include inactive accounts; activeUsers/inactiveUsers use isActive. IT_STAFF never receive userMetrics. Account rows, password hashes, passwords and session fields are never returned.

There is no separate /api/dashboard/admin endpoint in this contract. Issue #65 explicitly combines the administrator view into /staff; this supersedes the earlier draft route and response examples. No user/staffMetrics wrapper or extra fields in ticket summaries are returned.

### 4.4. Errors, timezone and drill-down

- 401: missing/invalid signed session (inactive accounts are rejected by existing authentication).
- 403: unauthorized role or password change required.
- No supported input parameters require validation; fixed limits and scopes cannot be changed by query/body input.
- 500: safe error/message response for unexpected failures, without database details.
- Prisma timestamp columns contain UTC without a timezone; independent raw SQL comparisons against timestamptz parameters must use AT TIME ZONE 'UTC' to avoid session-timezone shifts.
- UI drill-down is implemented by the later dashboard UI issue using the documented scope/status/owner filters and ticket IDs. API responses do not advertise unimplemented URLs or window filters. Recent-window counts must not be linked to a differently scoped list.

---

## 5. Ticket Workflow Status & Concurrency Conflict API

### 5.1. Advance Ticket Status
Transitions a ticket to a new lifecycle status while enforcing the status transition matrix (BR-06) and verifying that the update is not stale (BR-08).

- **Method:** `PATCH`
- **Endpoint:** `/api/staff/tickets/:id/status`
- **Access:** Authenticated `IT_STAFF` or `ADMINISTRATOR`
- **Path Parameters:**
  - `id` (integer, required): ID of the ticket.

#### Request Body Schema
```json
{
  "status": "RESOLVED",
  "currentUpdatedAt": "2026-10-28T09:14:00.000Z",
  "resolutionNote": "Replaced bad battery cell and verified charging cycle."
}
```

#### Response `200 OK` (Successful Transition)
```json
{
  "message": "Ticket status updated successfully",
  "ticket": {
    "id": 45,
    "ticketNumber": "TKT-2026-00045",
    "status": "RESOLVED",
    "updatedAt": "2026-10-28T14:40:00.000Z"
  }
}
```

#### Error Response `409 Conflict` (Stale / Concurrent Update)
Triggered when the ticket has been modified by another user since `currentUpdatedAt` was loaded:
```json
{
  "error": "CONFLICT",
  "message": "The ticket has been updated by another user since you loaded it. Please refresh and review the latest changes before reapplying your update.",
  "conflictDetails": {
    "clientSuppliedUpdatedAt": "2026-10-28T09:14:00.000Z",
    "serverActualUpdatedAt": "2026-10-28T14:38:10.000Z",
    "currentStatus": "IN_PROGRESS",
    "currentOwner": {
      "id": 4,
      "name": "Dwight Schrute"
    }
  }
}
```

#### Error Response `400 Bad Request` (Illegal Transition)
```json
{
  "error": "INVALID_STATUS_TRANSITION",
  "message": "Cannot transition ticket from NEW to RESOLVED. Permitted transitions from NEW are: OPEN, IN_PROGRESS, CANCELLED.",
  "details": {
    "fromStatus": "NEW",
    "attemptedStatus": "RESOLVED",
    "permittedTransitions": ["OPEN", "IN_PROGRESS", "CANCELLED"]
  }
}
```

---

## 6. Safe Error Envelope Reference

| HTTP Status | Error Code | Example Scenario |
|---|---|---|
| `400 Bad Request` | `BAD_REQUEST` | Malformed JSON body, missing path parameter. |
| `401 Unauthorized` | `UNAUTHORIZED` | User has no active session cookie. |
| `403 Forbidden` | `FORBIDDEN` | Requester attempts to update an Action Taken or access staff dashboard. |
| `404 Not Found` | `NOT_FOUND` | Ticket ID or Action ID does not exist in the database. |
| `409 Conflict` | `CONFLICT` | Concurrent modification detected (`updatedAt` mismatch). |
| `400 Bad Request` | `BAD_REQUEST` | `followUpRequired` is true but `followUpNote` is empty. |
| `400 Bad Request` | `BAD_REQUEST` | Assignee is inactive or has a non-staff role; inactive actors are rejected by authentication with 401. |
| `400 Bad Request` | `INVALID_STATUS_TRANSITION` | Attempted status change violates state machine transition matrix. |
| `500 Internal Server Error`| `INTERNAL_SERVER_ERROR` | Unexpected unhandled database or server exception. |
