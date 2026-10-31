# Lab4.8 Dashboard UI verification

Date: 2026-10-31 (Asia/Bangkok)
Branch: `feat/lab4-8-dashboard-ui`
Base: `lab4-staging` at `840d388` (merged PR #75, including dashboard APIs and earlier Lab4 dependencies).

## Implemented screens and files

- `client/src/components/RequesterDashboard.tsx`, `StaffDashboard.tsx`, `DashboardShared.tsx`: role-appropriate metric cards, recent ticket summaries, Quick Actions and loading/error/retry/zero states with Zen Green components/tokens.
- `client/src/navigation.ts`: internal native-link navigation and popstate-aware URL/filter hooks; Ctrl/Meta/middle-click can retain ordinary browser link behavior.
- `client/src/components/AppShell.tsx`: shared /dashboard route, authenticated root dashboard, desktop/mobile Dashboard navigation and aria-current. Administrators reuse Staff Dashboard; userMetrics render only for Administrators.
- `client/src/components/MyTicketsScreen.tsx`, `StaffTicketQueueScreen.tsx`: initialize/read supported filters from URL, update URL on filter changes, react to back/forward; suppress stale in-flight queue responses. Queue components remount on authenticated account/role changes.
- `client/src/api.ts`, `types.ts`: typed dashboard API requests with existing signed-session headers/cookies and preserved HTTP errors; additive statusGroup option for requester queue requests.
- `client/src/index.css`: wrapping metric grid, reserved loading dimensions, responsive recent-ticket cards, visible link focus and long-title/large-number handling.
- `client/tests/lab-04/RequesterDashboard.test.tsx`, `StaffDashboard.test.tsx`, `dashboardFixtures.tsx`: API/session/fetch mocks only. Tests verify mounted destination filters, not only href generation.
- `client/tests/setup.ts`: reset URL history after each test to isolate existing/new navigation tests.
- Documentation: synchronized specification, UI spec, API compatibility note and relevant test traceability.

## Exact API metric mappings

No dashboard response fields needed to be added. Values come directly from Lab4.7, never from the limited recent list.

| Role / label | API field | Definition | Destination |
| --- | --- | --- | --- |
| Staff New | metrics.newCount | Current NEW, shared queue | /staff/queue?status=NEW |
| Staff Open | metrics.openCount | Current OPEN only, shared queue | /staff/queue?status=OPEN |
| Staff In Progress | metrics.inProgressCount | Current IN_PROGRESS | /staff/queue?status=IN_PROGRESS |
| Staff Waiting for Requester | metrics.waitingRequesterCount | Current WAITING_FOR_REQUESTER | /staff/queue?status=WAITING_FOR_REQUESTER |
| Staff My Assigned | metrics.myAssignedCount | ownerId equals session user, across all statuses | /staff/queue?ownerId=me |
| Requester My Open Tickets | metrics.myOpenTickets | Session-owned NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED | /tickets?statusGroup=open |
| Requester In Progress | metrics.inProgress | Session-owned IN_PROGRESS | /tickets?status=IN_PROGRESS |
| Requester Resolved | metrics.resolved | Session-owned RESOLVED, all time | /tickets?status=RESOLVED |
| Requester Closed | metrics.closed | Session-owned CLOSED, all time | /tickets?status=CLOSED |

Staff deltas use newDelta/openDelta/inProgressDelta/waitingRequesterDelta/myAssignedDelta as returned by BR-12 creation-cohort calculations; the UI does not reinterpret them as historical status changes. User-account statistics appear only in the existing Administrator staff view. No separate Admin dashboard endpoint/screen was invented.

Both recent lists render API-provided id/ticketNumber/title/status/updatedAt summaries and link to `/tickets/:id`. Ordering/limit remains the backend's updatedAt DESC/id DESC, up to five all-time recent summaries. Dates use browser-local toLocaleString as existing Ticket Detail comments do.

Quick Actions:

- Staff Create Ticket: /tickets/new; Search Tickets: /staff/queue; My Queue: /staff/queue?ownerId=me.
- Requester Create Ticket: /tickets/new; View My Tickets: /tickets.
- The generic staff navigation is labelled **Ticket Queue** because it is unfiltered; **My Queue** is reserved for the ownerId=me action.

## Routing and minimal backend compatibility change

Previously AppShell navigation existed only in React state, and queues did not read URL filters. The new navigation synchronizes the rendered view with URL pathname/query state so direct entry, refresh/remount and history traversal apply the same filters. Recent-ticket Detail returns to the previous Dashboard or filtered queue. The legacy unauthenticated Lab2 requester-selector workspace remains available as before; real signed-in users start on their role dashboard at / or /dashboard.

Queue URL hooks support search, status, priority, categoryId and staff ownerId. Existing sorting/pagination behavior is retained; this issue does not introduce new sort/page URL contracts. Dashboard links specify only the metric predicate, avoiding hidden default filters. Account IDs in query strings do not authorize data access.

The requester API previously supported only four individual status values and no grouped-open filter. A small additive backend change was necessary for honest My Open Tickets drill-down:

- GET /api/tickets?statusGroup=open uses the **same exported OPEN_STATUSES** predicate as the dashboard.
- Requester status filters now accept all eight existing statuses.
- Unsupported statusGroup or simultaneous status and statusGroup=open returns 400.
- Session ownership/RBAC, dashboard responses, schema and workflow are unchanged.
- Added two API tests: exact count/result equality and ownership under a forged requesterId; invalid/conflicting groups plus all individual statuses.

## Session, state and accessibility

No privileged dashboard navigation is rendered while auth loads. Dashboard state is keyed to user ID, role and token; old data is hidden synchronously when identity changes, and cancelled request generations cannot populate another user's dashboard. Unauthorized roles receive an error without fetching the wrong endpoint. HTTP 401 prompts sign-in; 403 shows forbidden feedback; network failures offer retry. Failed/in-flight requests never masquerade as zero counts or empty lists.

Cards and Quick Actions are native links with meaningful accessible names and no nested interactive controls. Metric/recent skeletons reserve space; loaded zero values remain visible. Recent ticket status text accompanies badges. Wrapping CSS supports long unbroken titles and large counts; account statistics use a wrapping definition list. These design measures are not a claim of completed rendered responsive verification.

## Actual automated results

| Check | Result |
| --- | --- |
| RequesterDashboard.test.tsx | **12/12 passed** |
| StaffDashboard.test.tsx, including navigation/filter integration and client contracts | **34/34 passed** |
| New frontend tests | **46/46 passed** |
| Entire frontend suite including Labs1–4 regressions | **215/215 passed across 20 files** |
| Requester dashboard API with additive filter tests | **17/17 passed** |
| Staff dashboard API regression | **12/12 passed** |
| Selected safe backend suites including prior Actions/workflow/lifecycle | **326/326 passed across 8 files** |
| Frontend TypeScript + Vite production build | Passed |
| Backend TypeScript build | Passed |
| git diff --check | Passed |
| Separate lint | Not run: neither project has configured lint scripts |

Tests cover metric values, successful zeros, recent summary links/status dates, loading/error/retry, 401/403, role/session loading/account changes, stale response isolation, long titles/large values, accessible keyboard activation, every card/Quick Action destination, My Queue ownership scope, actual queue API arguments, direct-entry/remount filters, browser back/forward in jsdom, detail/back navigation and API client authentication.

Frontend tests use mocks and do not touch a database. The selected backend suites use UUID fixture creation and cleanup restricted to their own returned IDs. No reset, truncate or broad deletion of existing development data was performed. Full legacy backend suites with shared-data cleanup were not run and are not claimed as passed.

## Rendered browser verification: unavailable

Browser inventory was checked and returned **The browser access host is unavailable**. Consequently, both dashboards were not inspected in a real browser at 375/768/1280 px, no real-browser metric clicks were verified, and no screenshots were captured. jsdom integration tests do verify actual destination filter arguments and history behavior, but are not browser E2E or layout proof.

- AC-02: routing/filter behavior verified through component integration plus real API tests.
- AC-03: component tests pass.
- AC-01: rendered smoothness/no horizontal shifts remains pending manual visual QA.

Manual follow-up: sign in as Requester, Staff and Administrator; open Dashboard; inspect loading/zero/error/retry, long titles and large values at each width. Click all metric cards/Quick Actions, verify queue filters/results, refresh and traverse back/forward, open recent Ticket Detail and return. Confirm My Assigned/My Queue include all currently owned statuses and Requester grouped-open includes the five documented statuses. Capture both dashboards at 375/768/1280 with readable focus/status text and no clipping/overflow. Do not change development data merely to force an empty state.

## Repeat commands (PowerShell, repository root)

```powershell
npm.cmd --prefix client run test -- tests/lab-04/RequesterDashboard.test.tsx tests/lab-04/StaffDashboard.test.tsx
npm.cmd --prefix client run test
npm.cmd --prefix client run build
npm.cmd --prefix server run test -- tests/lab-04/requester-dashboard.api.test.ts tests/lab-04/staff-dashboard.api.test.ts --fileParallelism=false
npm.cmd --prefix server run build
```

On 2026-11-01 the user authorized commit, push and a review PR from feat/lab4-8-dashboard-ui to lab4-staging. No merge is authorized. Rendered responsive/browser verification remains pending as documented above.
