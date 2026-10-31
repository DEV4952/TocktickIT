# Lab 4.7 Dashboard API verification

Date: 2026-10-30 (Asia/Bangkok)
Branch: feat/lab4-7-dashboard-api
Base: lab4-staging at 6484cce (Labs 4.3–4.6 merged).

## Metric definitions agreed before query implementation

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

## Implementation and response contracts

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

## Reference material and scope

Read the supplied `SE+Lab+4.pdf`, particularly sections 4.6 and 6.2, as reference material. They require explicit metric definitions and authoritative concise data but do not impose a specific recent window. The seven-day choice above follows the user's delegation of that decision. GitHub Issue #65 matches the two requested endpoints and administrator statistics on /staff.

The main specification, API contract and test traceability were synchronized with this implementation. Issue #65 combines administrator statistics into /staff, superseding the earlier draft /admin route. Daily deltas from BR-12 are implemented using createdAt cohorts; the earlier report that these required unavailable history was incorrect and has been corrected. The dashboard endpoints themselves require no workflow, schema or UI changes. The user subsequently expanded this same branch with the Actions Taken assignment/lifecycle/history feature, documented separately in actions-taken-lifecycle-verification.md. Document instructions about final release/merging/submitting a PDF do not authorize those actions for this issue.

Drill-down alignment for the later dashboard UI issue: open metrics map to the listed open statuses, waiting to WAITING_FOR_REQUESTER, assignment cards to ownerId=null or the authenticated staff user's ID, and breakdowns to status/itPriority filters. Recent-window drill-down requires matching time-window support in a detailed list; this issue does not add unsupported list filters or misleading URLs.

## Independent PostgreSQL verification

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

## Results and limitations

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

## Additional daily-delta SQL evidence

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

## Combined-branch scope after rubric review

At the user's explicit request, Actions Taken assignment, start/complete/cancel, concurrency and append-only API history were added to this dashboard branch. The dashboard-only safe suite above was 272 tests; the final combined run is **324/324 backend tests**, with **169/169 frontend tests** and both builds passing. The additive migration and data-preservation proof are in actions-taken-lifecycle-verification.md. Proposed PR reason: "Align grading Parts 6?7 by adding Action assignees, lifecycle controls and atomic audit history alongside the dashboard API." No screenshots or UI visual acceptance are claimed.
