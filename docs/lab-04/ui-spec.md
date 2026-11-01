# TokTickIT Lab 4 — UI Specification (Zen Green Design System)

**Document Version:** 1.0.0  
**Status:** Approved for Implementation (Spec-DD Deliverable)  
**Target Platform:** Web (Desktop 1440px+, Tablet 768px - 1023px, Mobile 375px - 767px)  
**Design Theme:** Zen Green Design Language  
**Authors:** Sorawit Chaitong (@DEV4952)  
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**Target Sprint:** Lab 4 — TokTickIT Actions Taken, Dashboards, and Final Regression  

---

## 1. Information Architecture & Navigation

```text
TokTickIT Application (Zen Green Theme)
├── Top Navigation Bar (Global / Role-Based)
│   ├── Brand Logo ("TokTickIT" with brand mark)
│   ├── Role Navigation:
│   │   ├── [Requester]: [Dashboard]* [My Tickets] [Create Ticket]
│   │   ├── [IT Staff]:  [Dashboard]* [Ticket Queue] [Create Ticket]
│   │   └── [Admin]:     [Dashboard]* [Ticket Queue] [User Management] [Create Ticket]
│   └── Profile & Account Dropdown (Top Right)
│       ├── User Name & Role Pill
│       ├── Change Password Action
│       └── Logout Action
│
├── Views & Screens:
│   ├── /dashboard (Role-based entry: dynamically renders RequesterDashboard or StaffDashboard)
│   ├── /tickets (Requester Ticket List — Preserved from Labs 2 & 3)
│   ├── /tickets/:id (Requester Ticket Detail + Public Comments + Actions Taken Read-Only)
│   ├── /staff/queue (IT Staff Ticket Queue — Filterable, Sortable, Paginated)
│   ├── /tickets/:id (Shared Ticket Detail for permitted IT Staff/Admin + Actions Taken CRUD + Notes & Comments)
│   └── /admin/users (Admin User Management — Preserved from Lab 3)
```
*\*Note: Authenticated users landing on `/` or `/dashboard` are routed directly to their role-appropriate dashboard.*

---

## 2. Zen Green Design Tokens & Component Styles

### 2.1. Color Tokens
All styling strictly adheres to the established Zen Green CSS tokens:

| Token | CSS Variable | Hex / RGBA | Semantic Usage |
|---|---|---|---|
| **Primary Green** | `--color-zen-primary` | `#0f5132` | Top nav bar, brand badges, primary action buttons |
| **Primary Hover** | `--color-zen-primary-hover` | `#0a3622` | Button hover, active navigation highlight |
| **Accent Emerald**| `--color-zen-accent` | `#198754` | Secondary green accent, success confirmations, positive deltas |
| **Canvas Background**| `--color-zen-bg` | `#f4f7f5` | Main page canvas background (soft warm-neutral green) |
| **Surface Card** | `--color-zen-surface` | `#ffffff` | Content cards, metric containers, table rows, modals |
| **Border Divider**| `--color-zen-border` | `#d8e2dc` | Metric card borders, table dividers, form inputs |
| **Text Primary** | `--color-zen-text-main` | `#1a2e26` | Deep charcoal headings and body text |
| **Text Muted** | `--color-zen-text-muted` | `#52796f` | Subheadings, timestamps, secondary labels |
| **Danger Coral** | `--color-zen-danger` | `#dc3545` | Rejection alerts, cancel states, destructive actions |
| **Warning Amber** | `--color-zen-warning` | `#f59e0b` | "Waiting for Requester" cues, follow-up flags |
| **Focus Ring** | `--color-zen-focus` | `rgba(25, 135, 84, 0.4)` | Accessible keyboard focus outline (3px glow) |

### 2.2. Metric Cards Design
- **Card Surface:** White (`#ffffff`), rounded corners (`border-radius: 0.5rem`), subtle border (`1px solid #d8e2dc`).
- **Interactive State:** Hover elevation (`box-shadow: 0 4px 12px rgba(15, 81, 50, 0.08)`), subtle translateY (-2px), and cursor pointer indicating drill-down availability.
- **Card Content Structure:**
  - Label: Small uppercase tracking (12px, font-weight 600, color `#52796f`).
  - Value: Prominent bold typography (32px, font-weight 700, color `#1a2e26`).
  - Delta / Subtext: 12px indicator (e.g. `+2 from yesterday` in green `#198754` or `View all →` in `#0f5132`).

### 2.3. Status Badges
| Status | Background Color | Text Color | Icon / Visual Cue |
|---|---|---|---|
| `NEW` | `#e0e7ff` | `#3730a3` | Indigo Pill |
| `OPEN` | `#e0f2fe` | `#0369a1` | Sky Blue Pill |
| `IN_PROGRESS` | `#dcfce7` | `#15803d` | Emerald Pill |
| `WAITING_FOR_REQUESTER` | `#fef3c7` | `#b45309` | Amber Pill with Clock Icon |
| `RESOLVED` | `#d1fae5` | `#047857` | Green Pill with Checkmark Icon |
| `CLOSED` | `#f1f5f9` | `#475569` | Slate Grey Pill |
| `REOPENED` | `#fae8ff` | `#86198f` | Fuchsia Pill |
| `CANCELLED` | `#fee2e2` | `#b91c1c` | Crimson Rose Pill |

### 2.4. Actions Taken Follow-Up Badges
- **Follow-Up Required:** Amber Pill (`#fef3c7`, text `#b45309`) with label `Follow-Up Needed`.
- **No Follow-Up:** Neutral Pale Green (`#f0fdf4`, text `#166534`) with label `Complete`.

---

## 3. Screen 1: IT Staff Dashboard (`/dashboard` ? IT_STAFF/ADMINISTRATOR)

### 3.1. Wireframe (Matching Lab 4 Handout Page 5)
```text
+----------------------------------------------------------------------------------------------------+
| (o) TokTickIT     [Dashboard]  [Ticket Queue]  [Create Ticket]                 [ Profile (Michael) v ]|
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  Welcome back, Michael!                                                             [ Refresh ]    |
|  Here's what's happening with your queue today.                                                    |
|                                                                                                    |
|  +--------------+  +--------------+  +--------------+  +--------------+  +--------------+          |
|  | New          |  | Open         |  | In Progress  |  | Waiting for  |  | My Assigned  |          |
|  |              |  |              |  |              |  | Requester    |  |              |          |
|  | 14           |  | 23           |  | 18           |  | 7            |  | 16           |          |
|  | +2 yesterday |  | -1 yesterday |  | +4 yesterday |  | +1 yesterday |  | +1 yesterday |          |
|  +--------------+  +--------------+  +--------------+  +--------------+  +--------------+          |
|                                                                                                    |
|  +--------------------------------------------------------+   +---------------------------------+  |
|  | My Recent Tickets                             View all |   | Quick Actions                   |  |
|  |--------------------------------------------------------|   |---------------------------------|  |
|  | TKT-2026-00054  Laptop battery drains quickly          |   |  [+] Create Ticket              |  |
|  |                 [In Progress]       May 12, 09:14 AM   |   |      Submit a new request       |  |
|  |                                                        |   |                                 |  |
|  | TKT-2026-00053  Printer large drawing offline          |   |  [Q] Search Tickets             |  |
|  |                 [Open]              May 10, 08:12 PM   |   |      Find by ID or title        |  |
|  |                                                        |   |                                 |  |
|  | TKT-2026-00052  Outlook freezing intermittently        |   |  [=] My Queue                   |  |
|  |                 [In Progress]       May 8, 05:22 PM    |   |      View assigned work (16)    |  |
|  |                                                        |   +---------------------------------+  |
|  | TKT-2026-00051  Phone not receiving calls              |                                        |
|  |                 [Open]              May 5, 10:01 AM    |                                        |
|  |                                                        |                                        |
|  | TKT-2026-00050  VPN disconnects randomly               |                                        |
|  |                 [Resolved]          May 4, 04:15 PM    |                                        |
|  +--------------------------------------------------------+                                        |
+----------------------------------------------------------------------------------------------------+
```

### 3.2. Behavioral Specifications
- **Metric Cards Drill-Down:**
  - `New`: routes to `/staff/queue?status=NEW`.
  - `Open`: routes to `/staff/queue?status=OPEN`.
  - `In Progress`: routes to `/staff/queue?status=IN_PROGRESS`.
  - `Waiting for Requester`: routes to `/staff/queue?status=WAITING_FOR_REQUESTER`.
  - `My Assigned`: routes to `/staff/queue?ownerId=me`.
- **Recent Tickets Row Interaction:** Clicking any row navigates to that ticket's detailed operational screen (`/staff/tickets/:id`).
- **Quick Action Triggers:**
  - `Create Ticket`: opens `/tickets/new`.
  - `Search Tickets`: navigates to `/staff/queue` with the search bar auto-focused.
  - `My Queue`: routes to `/staff/queue?ownerId=me`.

---

## 4. Screen 2: Requester Dashboard (`/dashboard` ? REQUESTER)

### 4.1. Wireframe (Matching Lab 4 Handout Page 6)
```text
+----------------------------------------------------------------------------------------------------+
| (o) TokTickIT     [Dashboard]  [My Tickets]  [Create Ticket]                  [ Profile (Jennifer) v]|
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  Welcome, Jennifer!                                                                                |
|  Here's the latest on your requests.                                                               |
|                                                                                                    |
|  +------------------+  +------------------+  +------------------+  +------------------+            |
|  | My Open Tickets  |  | In Progress      |  | Resolved         |  | Closed           |            |
|  |                  |  |                  |  |                  |  |                  |            |
|  | 3                |  | 2                |  | 5                |  | 12               |            |
|  | View all ->      |  | View all ->      |  | View all ->      |  | View all ->      |            |
|  +------------------+  +------------------+  +------------------+  +------------------+            |
|                                                                                                    |
|  +--------------------------------------------------------+   +---------------------------------+  |
|  | My Recent Tickets                             View all |   | Quick Actions                   |  |
|  |--------------------------------------------------------|   |---------------------------------|  |
|  | TKT-2026-00045  Laptop battery drains quickly          |   |  [+] Create Ticket              |  |
|  |                 [In Progress]       May 12, 09:14 AM   |   |      Submit a new request       |  |
|  |                                                        |   |                                 |  |
|  | TKT-2026-00042  Request software access                |   |  [=] View My Tickets            |  |
|  |                 [Resolved]          May 11, 02:30 PM   |   |      Track existing requests    |  |
|  |                                                        |   +---------------------------------+  |
|  | TKT-2026-00038  Need new monitor                       |                                        |
|  |                 [Resolved]          May 9, 11:05 AM    |                                        |
|  |                                                        |                                        |
|  | TKT-2026-00031  Email not syncing                      |                                        |
|  |                 [Resolved]          May 7, 08:20 PM    |                                        |
|  |                                                        |                                        |
|  | TKT-2026-00020  Password reset                         |                                        |
|  |                 [Closed]            May 1, 02:00 PM    |                                        |
|  +--------------------------------------------------------+                                        |
+----------------------------------------------------------------------------------------------------+
```

### 4.2. Behavioral Specifications
- **Data Isolation:** Strictly scoped to the authenticated customer (`requesterId = user.id`).
- **Drill-Down Links:**
  - `My Open Tickets`: navigates to `/tickets?statusGroup=open`.
  - `In Progress`: navigates to `/tickets?status=IN_PROGRESS`.
  - `Resolved`: navigates to `/tickets?status=RESOLVED`.
  - `Closed`: navigates to `/tickets?status=CLOSED`.
- **Row Interaction:** Clicking any row opens `/tickets/:id` in requester view mode.

---

## 5. Screen 3: Ticket Detail with Actions Taken (`/staff/tickets/:id` & `/tickets/:id`)

### 5.1. Actions Taken Section Wireframe (IT Staff View)
```text
+----------------------------------------------------------------------------------------------------+
| Actions Taken (2)                                                      [ + Add Action Taken ]      |
+----------------------------------------------------------------------------------------------------+
| Action Date/Time    Description & Result             Performed By    Follow-Up?       Actions      |
|----------------------------------------------------------------------------------------------------|
| 2026-10-28 14:30    Inspected AP-04 PoE switch port  Sarah Connor    [Needed]         [ Edit ]     |
|                     Result: SSIDs broadcasting                       Note: Check Wi-Fi             |
|                     Attachment: ping-log.txt                         at 10 AM tomorrow             |
|----------------------------------------------------------------------------------------------------|
| 2026-10-28 10:15    Remote traceroute and ping       Alex Mercer     [Complete]       [ Edit ]     |
|                     Result: 40% packet loss found                    Note: None                    |
+----------------------------------------------------------------------------------------------------+
```

### 5.2. Modal Wireframe: Add / Edit Action Taken
```text
+-------------------------------------------------------------------+
| Record Action Taken                                           [X] |
+-------------------------------------------------------------------+
|                                                                   |
| Action Date/Time *                                                |
| [ 2026-10-28 14:30                                           [#] ]|
|                                                                   |
| Action Description *                                              |
| [ Inspected access point AP-04 in North Building...             ] |
| [                                                               ] |
|                                                                   |
| Result *                                                          |
| [ Access point rebooted successfully and SSIDs are active.      ] |
|                                                                   |
| Performed By (auto-assigned)                                      |
| [ Sarah Connor (IT Operations)                               (i)] |
|                                                                   |
| [X] Follow-Up Required?                                           |
|                                                                   |
| Follow-Up Note * (required when follow-up is checked)             |
| [ Monitor Wi-Fi signal strength during peak hours tomorrow.     ] |
|                                                                   |
| Attachment Notes                                                  |
| [ Refer to ping-test-log.txt in ticket attachments.            ] |
|                                                                   |
+-------------------------------------------------------------------+
|                                          [ Cancel ]  [ Save Action ]|
+-------------------------------------------------------------------+
```

### 5.3. Requester View Mode
- Embedded on `/tickets/:id` under the ticket description.
- Renders identical data (Date/Time, Description, Result, Performed By, Follow-Up Status/Note, Attachment Notes).
- **Prohibitions:** The `[+ Add Action Taken]` and `[ Edit ]` buttons are completely removed from the DOM.

---

## 6. Ticket Status Lifecycle & Concurrency Feedback

### 6.1. Permitted Transition Select
In the IT Staff ticket detail header, the Status dropdown only populates options permitted by the state transition matrix (BR-06):
- If `NEW`: `[NEW (current), OPEN, IN_PROGRESS, CANCELLED]`.
- If `OPEN`: `[OPEN (current), IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED]`.
- If `IN_PROGRESS`: `[IN_PROGRESS (current), WAITING_FOR_REQUESTER, RESOLVED, CANCELLED]`.
- If `WAITING_FOR_REQUESTER`: `[WAITING_FOR_REQUESTER (current), IN_PROGRESS, RESOLVED, CANCELLED]`.
- If `RESOLVED`: `[RESOLVED (current), CLOSED, REOPENED]`.
- If `CLOSED`: `[CLOSED (current), REOPENED]`.
- If `REOPENED`: `[REOPENED (current), IN_PROGRESS, RESOLVED]`.
- If `CANCELLED`: Select disabled (`CANCELLED (Terminal)`).

### 6.2. Concurrency Conflict Alert Modal (`409 Conflict`)
Triggered when an update is submitted with a stale `currentUpdatedAt` timestamp:
```text
+-------------------------------------------------------------------+
| (!) Concurrency Conflict Detected                             [X] |
+-------------------------------------------------------------------+
| This ticket was recently modified by another user while you were  |
| viewing it. To prevent overwriting their changes, your update     |
| was paused.                                                       |
|                                                                   |
| Latest Status on Server: IN_PROGRESS                              |
| Updated by: Dwight Schrute at 14:38:10 UTC                        |
|                                                                   |
| Please refresh the ticket to review their latest notes and        |
| actions taken before continuing.                                  |
+-------------------------------------------------------------------+
|                                            [ Close ]  [ Refresh ] |
+-------------------------------------------------------------------+
```

---

## 7. Responsive Breakpoint Layouts

### 7.1. Desktop (>= 1024px)
- **Top Bar:** Horizontal flex container with brand mark, role navigation pills, and right-aligned user profile.
- **Dashboards:**
  - Metric cards: 5-column grid for IT Staff (`grid-template-columns: repeat(5, 1fr)`), 4-column grid for Requester (`repeat(4, 1fr)`).
  - Main body: 2-column split (70% Recent Tickets table, 30% Quick Actions card).
- **Actions Taken:** Full 5-column data table with inline badges and action buttons.

### 7.2. Tablet (768px - 1023px)
- **Top Bar:** Horizontal layout with compressed navigation spacing.
- **Dashboards:**
  - Metric cards: 3-column + 2-column wrapping grid.
  - Main body: Recent tickets stacked directly above Quick Actions.
- **Actions Taken:** Responsive data table with horizontal scroll container or card-cell wrapping.

### 7.3. Mobile (375px - 767px)
- **Top Bar:** Hamburger dropdown menu containing navigation links and profile options.
- **Dashboards:**
  - Metric cards: 2-column grid (`display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem`).
  - Recent tickets: Rendered as stacked cards instead of wide table rows.
  - Quick Actions: Full-width stacked buttons at the bottom.
- **Actions Taken:** Vertical timeline/card list with clear visual divider lines (`border-bottom: 1px solid #d8e2dc`).
- **Modals:** Full-screen sheet modal with sticky footer containing `Cancel` and `Save Action`.

---

## 8. Accessibility & Quality Checklist

1. **Focus Management:** Modals trap keyboard focus (`Tab` and `Shift+Tab`) and close on `Escape`. Focus automatically returns to the triggering button upon dismissal.
2. **Accessible Contrast:** All text tokens meet WCAG 2.1 AA standards (minimum 4.5:1 contrast against surface backgrounds).
3. **Form Error Association:** Form validation errors are explicitly tied to their input fields via `aria-describedby` and render in high-contrast red (`#dc3545`).
4. **Non-Color Status Indicators:** Every status badge combines distinct text labels, background hues, and icon shapes so that color-blind users can distinguish statuses immediately.
5. **No Layout Overflow:** All tables, long descriptions, and file attachment titles use `word-break: break-word` or `text-overflow: ellipsis` to prevent horizontal viewport blowout.

## Actions Taken rubric extension (2026-10-30)

Ticket Detail Actions Taken cards additionally show current action status and assignee separately from the original Performed By recorder. Create/Edit modal loads active IT Staff/Admin choices, offers Unassigned and keeps Performed By read-only. An unavailable current assignee is labelled unavailable; saving a chosen unavailable assignee is blocked. Loading/failure of choices prevents unsafe saves while preserving entered content.

Staff/Admin controls follow RECORDED ? IN_PROGRESS/COMPLETED/CANCELLED and IN_PROGRESS ? COMPLETED/CANCELLED. Start/Complete require assignment; inactive assignment is authoritatively rejected by the backend. Completed/cancelled cards have no Edit or transition controls. Requesters see no write controls and may read public history only for accessible tickets.

View history shows chronological actor/event/time entries and expandable before/after snapshots. No update/delete history control exists. History failures support retry. Transitions disable duplicate submissions; a 409 shows a reload instruction and locks transitions until explicit Reload actions. Modal 409 keeps values visible and disables further stale saves; cancel/close then reload retrieves the latest record. Existing wrapping cards, portal modal, focus trap and body-scroll rules remain; rendered checks and screenshots were subsequently completed in Lab4.10; see the final audit section below.

## Lab4.8 implemented navigation contract (2026-10-31)

/dashboard renders the dashboard for the authenticated role; / also starts authenticated users on their dashboard. The legacy Lab2 requester-selector fallback retains its existing workspace when no signed-in auth user exists. One shared dashboard route avoids duplicate role routes. Dashboard links exist in desktop/mobile navigation with aria-current. The unfiltered staff navigation label is Ticket Queue; My Assigned and the My Queue quick action both use ownerId=me with no hidden status restriction.

Requester My Open Tickets uses statusGroup=open (NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED) and a dedicated matching queue filter option. Other metric links use their exact status. Recent ticket links use /tickets/:id for all permitted roles. Queue search/status/priority/category and staff owner filters are read from URL state; filters survive direct entry, remount and back/forward. Profile data, route selection and authorization are independent of user-controlled identity parameters.

Skeletons have reserved metric/recent-section space; zero/error/empty states are distinct. Cards and Quick Actions are native links, wrapping recent cards include status text and browser-local dates, and layout uses responsive minmax grids with long-word wrapping. Rendered checks were unavailable at the Lab4.8 snapshot; the later Lab4.10 audit covers 375x812, 768x1024 and 1440x900. See the final audit section below.


## Consolidated verification records

These are historical per-Issue snapshots. Older pending/browser-unavailable statements below apply to those earlier runs; the Lab4.10 audit and screenshot inventory later in this document provide the current recorded coverage.

Historical results below apply to the stated issue/branch/date. They do not replace the latest execution summary or establish final main-branch acceptance.


<a id="verification-actions-ui"></a>

### actions-taken-ui-verification

#### Lab 4.5 Actions Taken UI verification

Date: 2026-10-30 (Asia/Bangkok)
Branch: `feat/lab4-5-actions-taken-ui`
Base: `lab4-staging` at `57d4a1b`, including merged Lab4.3 PR #71 and Lab4.4 PR #72.

##### Changes

- `client/src/types.ts`: typed action records and editable input contract.
- `client/src/api.ts`: GET, POST and PATCH helpers using existing cookie/Bearer authentication; explicit editable-field payload projection and useful 400/401/403/404 errors.
- `client/src/components/ActionsTaken.tsx`: chronological list, loading/empty/error/retry states, read-only performer badges, and accessible create/edit modal. Integrated into the real Ticket Detail screen with its resolved numeric ticket ID.
- `client/src/components/TicketDetailScreen.tsx`: mounts the new section without changing comments, notes, attachments or triage.
- `client/src/index.css`: Zen Green wrapping cards and responsive, internally scrollable modal.
- `client/tests/lab-04/ActionsTaken.test.tsx`: 37 component/API-client tests with isolated session/API/fetch mocks; no real database.

##### Behavior and contract

- List order is actionDateTime ascending, createdAt ascending, then ID ascending. Dates use browser-local `toLocaleString()`, consistent with existing comments. datetime-local input is converted to UTC ISO for the API.
- Display includes description, result, performer name/role badge, follow-up status/note and attachment notes. Multiline text uses pre-wrap, long unbroken text uses overflow-wrap, and content is rendered as text.
- Only authenticated, active IT_STAFF/ADMINISTRATOR users whose session is ready and does not require a password change see create/edit controls. Requesters receive no editable UI. No privileged controls appear during session loading.
- Create displays the current user; edit displays the original performer. Requests include only actionDateTime, description, result, followUpRequired, followUpNote and attachmentNotes. No identity, ticket or performer mutations are submitted.
- POST/PATCH validation follows the implemented Lab4.4 contract: description 5-3000 trimmed characters, result 3-3000, required follow-up note at least 3 trimmed characters, attachment notes at most 1000, and a valid date. Disabled follow-up sends null note.
- Save uses a synchronous submission guard and disabled fields/buttons. Failures preserve entered values; success updates and reorders the local list without a page reload.
- Modal uses a portal, labelled controls, initial focus, Tab/Shift+Tab trapping, Escape dismissal outside saving, body scroll lock and focus restoration. It uses the existing modal styling pattern with explicit focus management, since existing inline modals have no reusable focus-managed component.
- UI guards supplement the existing backend authorization; no schema or backend API changes were made.

##### Automated verification

| Check | Result |
| --- | --- |
| `npm.cmd --prefix client run test -- tests/lab-04/ActionsTaken.test.tsx` | Passed 37/37 |
| `npm.cmd --prefix client run test` | Passed 119/119 across 16 files, including frontend regression tests for Labs 1-3 |
| `npm.cmd --prefix client run build` | Passed TypeScript checking and Vite production build |
| `git diff --check` | Passed |
| Separate lint | Not run: no lint script or configured lint tool in client/package.json |

Tests cover list details/order, loading/empty/error/retry, read-only Requester access, Staff/Admin create/edit, payload allowlists, original performer preservation, follow-up validation, attachment notes, duplicate-submission prevention, local list updates/reordering, API failure preservation, 400/401/403/404 handling, focus/keyboard interactions, stale request isolation and integration into Ticket Detail.

##### Responsive visual verification: blocked, not claimed as passed

CSS is designed for 375, 768 and 1280 px: minmax grid columns, wrapping card content, mobile single-column layout, bounded modal width/height and internal scrolling. Component tests alone do not verify layout correctness.

An attempt was made to inspect the actual Ticket Detail component with mock API data in a temporary local QA page, including long unbroken descriptions and attachment notes. Browser inventory returned `The browser access host is unavailable`. The native Chrome fallback was then stopped by Computer Use because it could not determine the current browser URL on Windows with enough confidence to enforce policy. No browser inputs were sent through that fallback. Temporary QA files were removed.

Consequently, rendered verification and supporting screenshots at **375, 768 and 1280 px remain unverified**. AC-02 (read-only Requester UI) and AC-03 (mocked component tests) are verified; AC-01 still needs a rendered browser check. No screenshot evidence is included or claimed.

Manual follow-up with the development frontend/backend running:

1. Open an accessible Ticket Detail as IT Staff/Admin in browser responsive mode at each width (375, 768, 1280 px).
2. Inspect the Actions Taken list with multiline/long text, create modal and edit modal. Check no horizontal scrolling or clipping, internal modal scrolling, labels, focus, Tab/Shift+Tab and Escape.
3. Confirm edit shows the original performer, save errors preserve values, and successful saves reorder the list.
4. Repeat as Requester: list only, with no Add/Edit controls.
5. Capture list and modal screenshots at all three widths for PR evidence.

The user subsequently authorized commit, push and a review PR targeting `lab4-staging`. No merge is authorized. The user opened the local application and located the Add Action control; no complete viewport-specific visual verification or screenshot evidence was reported. The responsive verification limitation above remains open.



<a id="verification-dashboard-ui"></a>

### dashboard-ui-verification

#### Lab4.8 Dashboard UI verification

Date: 2026-10-31 (Asia/Bangkok)
Branch: `feat/lab4-8-dashboard-ui`
Base: `lab4-staging` at `840d388` (merged PR #75, including dashboard APIs and earlier Lab4 dependencies).

##### Implemented screens and files

- `client/src/components/RequesterDashboard.tsx`, `StaffDashboard.tsx`, `DashboardShared.tsx`: role-appropriate metric cards, recent ticket summaries, Quick Actions and loading/error/retry/zero states with Zen Green components/tokens.
- `client/src/navigation.ts`: internal native-link navigation and popstate-aware URL/filter hooks; Ctrl/Meta/middle-click can retain ordinary browser link behavior.
- `client/src/components/AppShell.tsx`: shared /dashboard route, authenticated root dashboard, desktop/mobile Dashboard navigation and aria-current. Administrators reuse Staff Dashboard; userMetrics render only for Administrators.
- `client/src/components/MyTicketsScreen.tsx`, `StaffTicketQueueScreen.tsx`: initialize/read supported filters from URL, update URL on filter changes, react to back/forward; suppress stale in-flight queue responses. Queue components remount on authenticated account/role changes.
- `client/src/api.ts`, `types.ts`: typed dashboard API requests with existing signed-session headers/cookies and preserved HTTP errors; additive statusGroup option for requester queue requests.
- `client/src/index.css`: wrapping metric grid, reserved loading dimensions, responsive recent-ticket cards, visible link focus and long-title/large-number handling.
- `client/tests/lab-04/RequesterDashboard.test.tsx`, `StaffDashboard.test.tsx`, `dashboardFixtures.tsx`: API/session/fetch mocks only. Tests verify mounted destination filters, not only href generation.
- `client/tests/setup.ts`: reset URL history after each test to isolate existing/new navigation tests.
- Documentation: synchronized specification, UI spec, API compatibility note and relevant test traceability.

##### Exact API metric mappings

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

##### Routing and minimal backend compatibility change

Previously AppShell navigation existed only in React state, and queues did not read URL filters. The new navigation synchronizes the rendered view with URL pathname/query state so direct entry, refresh/remount and history traversal apply the same filters. Recent-ticket Detail returns to the previous Dashboard or filtered queue. The legacy unauthenticated Lab2 requester-selector workspace remains available as before; real signed-in users start on their role dashboard at / or /dashboard.

Queue URL hooks support search, status, priority, categoryId and staff ownerId. Existing sorting/pagination behavior is retained; this issue does not introduce new sort/page URL contracts. Dashboard links specify only the metric predicate, avoiding hidden default filters. Account IDs in query strings do not authorize data access.

The requester API previously supported only four individual status values and no grouped-open filter. A small additive backend change was necessary for honest My Open Tickets drill-down:

- GET /api/tickets?statusGroup=open uses the **same exported OPEN_STATUSES** predicate as the dashboard.
- Requester status filters now accept all eight existing statuses.
- Unsupported statusGroup or simultaneous status and statusGroup=open returns 400.
- Session ownership/RBAC, dashboard responses, schema and workflow are unchanged.
- Added two API tests: exact count/result equality and ownership under a forged requesterId; invalid/conflicting groups plus all individual statuses.

##### Session, state and accessibility

No privileged dashboard navigation is rendered while auth loads. Dashboard state is keyed to user ID, role and token; old data is hidden synchronously when identity changes, and cancelled request generations cannot populate another user's dashboard. Unauthorized roles receive an error without fetching the wrong endpoint. HTTP 401 prompts sign-in; 403 shows forbidden feedback; network failures offer retry. Failed/in-flight requests never masquerade as zero counts or empty lists.

Cards and Quick Actions are native links with meaningful accessible names and no nested interactive controls. Metric/recent skeletons reserve space; loaded zero values remain visible. Recent ticket status text accompanies badges. Wrapping CSS supports long unbroken titles and large counts; account statistics use a wrapping definition list. These design measures are not a claim of completed rendered responsive verification.

##### Actual automated results

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

##### Rendered browser verification: unavailable

Browser inventory was checked and returned **The browser access host is unavailable**. Consequently, both dashboards were not inspected in a real browser at 375/768/1280 px, no real-browser metric clicks were verified, and no screenshots were captured. jsdom integration tests do verify actual destination filter arguments and history behavior, but are not browser E2E or layout proof.

- AC-02: routing/filter behavior verified through component integration plus real API tests.
- AC-03: component tests pass.
- AC-01: rendered smoothness/no horizontal shifts remains pending manual visual QA.

Manual follow-up: sign in as Requester, Staff and Administrator; open Dashboard; inspect loading/zero/error/retry, long titles and large values at each width. Click all metric cards/Quick Actions, verify queue filters/results, refresh and traverse back/forward, open recent Ticket Detail and return. Confirm My Assigned/My Queue include all currently owned statuses and Requester grouped-open includes the five documented statuses. Capture both dashboards at 375/768/1280 with readable focus/status text and no clipping/overflow. Do not change development data merely to force an empty state.

##### Repeat commands (PowerShell, repository root)

```powershell
npm.cmd --prefix client run test -- tests/lab-04/RequesterDashboard.test.tsx tests/lab-04/StaffDashboard.test.tsx
npm.cmd --prefix client run test
npm.cmd --prefix client run build
npm.cmd --prefix server run test -- tests/lab-04/requester-dashboard.api.test.ts tests/lab-04/staff-dashboard.api.test.ts --fileParallelism=false
npm.cmd --prefix server run build
```

On 2026-11-01 the user authorized commit, push and a review PR from feat/lab4-8-dashboard-ui to lab4-staging. No merge is authorized. Rendered responsive/browser verification remains pending as documented above.

## Selected desktop screenshots (2026-11-01)

Captured from the real application using headless Chrome and UUID E2E fixtures, viewport 1280x900; PNGs are component crops, not full-screen images. Visually inspected all four images. No credentials or unrelated personal data appear. The fixed 2090 dashboard fixture dates establish deterministic all-time recent ordering; they are synthetic test values.

| Screen | Selected evidence |
| --- | --- |
| Staff Dashboard | [Desktop](../../artifacts/lab-04/screenshots/staff-dashboard/desktop.png) |
| Requester Dashboard | [Desktop](../../artifacts/lab-04/screenshots/requester-dashboard/desktop.png) |
| Staff Actions Taken after create/edit | [Desktop](../../artifacts/lab-04/screenshots/actions-taken/staff-create-edit-desktop.png) |
| Requester Actions Taken read-only | [Desktop](../../artifacts/lab-04/screenshots/actions-taken/requester-read-only-desktop.png) |

These selected screenshots do not establish tablet/mobile coverage, modal validation coverage or final accessibility acceptance. Original report label: submission-screenshots.


<a id="lab410-visual-accessibility-audit"></a>

## Lab4.10 visual and accessibility audit

Final audit uses real Chrome at Mobile375x812, Tablet768x1024 and Desktop1440x900, with isolated UUID fixtures. All three passed the final axe/keyboard/layout/runtime assertions. See [release-verification.md](release-verification.md) for actual revisions, safe database setup, findings, commands and pending release requirements. Full-page images may exceed the viewport height; dialog images are component crops. Grey blocks mask unrelated data/assignee choices. They are intentional and are not UI defects.

| Checklist | Evidence / final status |
| --- | --- |
| Zen Green contrast and consistent spacing | Darker existing tokens for small text and controls; nav contrast corrected; final axe scans passed |
| Heading/landmark/control names | Semantic Ticket heading; native brand/account buttons; triage labels; metric names match visible text; communication controls form a named pressed-button group |
| Keyboard and visible focus | Real Enter/Tab/Shift+Tab/Escape, assignee/date order, cycle boundaries, opener restoration and account menu; modal background inert |
| Modal scrolling | Long edit values and focus of last field; explicit scroll into view clears footer; Tab reaches Cancel; create validation alert visible |
| Editable/read-only role behavior | Staff controls and Requester read-only actions captured; real permission guard and drill-down applied |
| Long content and overflow | Long title, unbroken action text, notes and performer names; zero document horizontal overflow at target widths and320px probe; twelve-digit typography probe restored real data afterwards |
| Empty/loading/error/populated | Requester empty, both populated, Staff loading, injected503 safe failure/retry on both, forbidden navigation |
| Workflow feedback | Real stale409 shows alert and blocks status changes until explicit latest-version reload |
| Runtime | No unexplained console errors, page exceptions or application HTTP failures; intentional503/409 and any navigation aborts retained/classified |
| Manual visual inspection | Representative dashboard, list, create/edit and conflict PNGs inspected; scroll areas are intentionally clipped at their boundary and scrollable |
| Remaining human/device checks | Physical devices, other browser engines, screen-reader-user testing and actual browser zoom unperformed; automated scans alone do not establish full accessibility compliance |

### Screenshot inventory

All links below are the final hardening set; original four Lab4.9 desktop images remain historical.

| Screen/state | Mobile375x812 | Tablet768x1024 | Desktop1440x900 |
| --- | --- | --- | --- |
| staff populated | [PNG](../../artifacts/lab-04/screenshots/staff-dashboard/staff-mobile-375x812-populated.png) | [PNG](../../artifacts/lab-04/screenshots/staff-dashboard/staff-tablet-768x1024-populated.png) | [PNG](../../artifacts/lab-04/screenshots/staff-dashboard/staff-desktop-1440x900-populated.png) |
| staff loading | [PNG](../../artifacts/lab-04/screenshots/staff-dashboard/staff-mobile-375x812-loading.png) | [PNG](../../artifacts/lab-04/screenshots/staff-dashboard/staff-tablet-768x1024-loading.png) | [PNG](../../artifacts/lab-04/screenshots/staff-dashboard/staff-desktop-1440x900-loading.png) |
| staff safe-failure | [PNG](../../artifacts/lab-04/screenshots/staff-dashboard/staff-mobile-375x812-safe-failure.png) | [PNG](../../artifacts/lab-04/screenshots/staff-dashboard/staff-tablet-768x1024-safe-failure.png) | [PNG](../../artifacts/lab-04/screenshots/staff-dashboard/staff-desktop-1440x900-safe-failure.png) |
| staff drilldown | [PNG](../../artifacts/lab-04/screenshots/staff-dashboard/staff-mobile-375x812-drilldown.png) | [PNG](../../artifacts/lab-04/screenshots/staff-dashboard/staff-tablet-768x1024-drilldown.png) | [PNG](../../artifacts/lab-04/screenshots/staff-dashboard/staff-desktop-1440x900-drilldown.png) |
| requester empty | [PNG](../../artifacts/lab-04/screenshots/requester-dashboard/requester-mobile-375x812-empty.png) | [PNG](../../artifacts/lab-04/screenshots/requester-dashboard/requester-tablet-768x1024-empty.png) | [PNG](../../artifacts/lab-04/screenshots/requester-dashboard/requester-desktop-1440x900-empty.png) |
| requester populated | [PNG](../../artifacts/lab-04/screenshots/requester-dashboard/requester-mobile-375x812-populated.png) | [PNG](../../artifacts/lab-04/screenshots/requester-dashboard/requester-tablet-768x1024-populated.png) | [PNG](../../artifacts/lab-04/screenshots/requester-dashboard/requester-desktop-1440x900-populated.png) |
| requester safe-failure | [PNG](../../artifacts/lab-04/screenshots/requester-dashboard/requester-mobile-375x812-safe-failure.png) | [PNG](../../artifacts/lab-04/screenshots/requester-dashboard/requester-tablet-768x1024-safe-failure.png) | [PNG](../../artifacts/lab-04/screenshots/requester-dashboard/requester-desktop-1440x900-safe-failure.png) |
| requester forbidden | [PNG](../../artifacts/lab-04/screenshots/requester-dashboard/requester-mobile-375x812-forbidden.png) | [PNG](../../artifacts/lab-04/screenshots/requester-dashboard/requester-tablet-768x1024-forbidden.png) | [PNG](../../artifacts/lab-04/screenshots/requester-dashboard/requester-desktop-1440x900-forbidden.png) |
| actions empty | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-mobile-375x812-empty.png) | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-tablet-768x1024-empty.png) | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-desktop-1440x900-empty.png) |
| actions list | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-mobile-375x812-list.png) | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-tablet-768x1024-list.png) | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-desktop-1440x900-list.png) |
| actions keyboard-focus | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-mobile-375x812-keyboard-focus.png) | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-tablet-768x1024-keyboard-focus.png) | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-desktop-1440x900-keyboard-focus.png) |
| actions create-validation | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-mobile-375x812-create-validation.png) | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-tablet-768x1024-create-validation.png) | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-desktop-1440x900-create-validation.png) |
| actions edit | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-mobile-375x812-edit.png) | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-tablet-768x1024-edit.png) | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-desktop-1440x900-edit.png) |
| actions edit-scrolled | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-mobile-375x812-edit-scrolled.png) | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-tablet-768x1024-edit-scrolled.png) | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-desktop-1440x900-edit-scrolled.png) |
| actions workflow-conflict | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-mobile-375x812-workflow-conflict.png) | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-tablet-768x1024-workflow-conflict.png) | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-desktop-1440x900-workflow-conflict.png) |
| actions read-only | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-mobile-375x812-read-only.png) | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-tablet-768x1024-read-only.png) | [PNG](../../artifacts/lab-04/screenshots/actions-taken/actions-desktop-1440x900-read-only.png) |


## Completed dashboard rubric sections

Staff/Admin My Actions Taken is a separate section from Ticket metrics: total and four status values in a wrapping definition list, latest five recorder actions with status/date and links to Ticket Detail. It explicitly labels recorder scope across all dates; no fake queue filter or total-as-Tickets link is introduced. A successful empty scope says You have not recorded any actions yet.

Requester Attention Required shows the signed-in owner's waiting-for-response count, latest five WAITING_FOR_REQUESTER summaries with textual status/date and links, and View all tickets needing your response -> /tickets?status=WAITING_FOR_REQUESTER. Empty, loading, failure and account-change handling follows the shared dashboard state, so stale identity data is hidden immediately.

Both use existing Zen sections, wrapping recent-list layout, semantic headings/regions and native links. The latest qa-submission screenshots replace earlier viewport/state images with these new sections included.
