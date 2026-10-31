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
│   ├── /requester/dashboard (Explicit Requester Dashboard)
│   ├── /staff/dashboard (Explicit IT Staff / Admin Operational Dashboard)
│   ├── /tickets (Requester Ticket List — Preserved from Labs 2 & 3)
│   ├── /tickets/:id (Requester Ticket Detail + Public Comments + Actions Taken Read-Only)
│   ├── /staff/queue (IT Staff Ticket Queue — Filterable, Sortable, Paginated)
│   ├── /staff/tickets/:id (IT Staff Ticket Detail + Actions Taken CRUD + Notes & Comments)
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

## 3. Screen 1: IT Staff Dashboard (`/staff/dashboard`)

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
  - `My Assigned`: routes to `/staff/queue?assignedToMe=true`.
- **Recent Tickets Row Interaction:** Clicking any row navigates to that ticket's detailed operational screen (`/staff/tickets/:id`).
- **Quick Action Triggers:**
  - `Create Ticket`: opens `/tickets/new`.
  - `Search Tickets`: navigates to `/staff/queue` with the search bar auto-focused.
  - `My Queue`: routes to `/staff/queue?assignedToMe=true`.

---

## 4. Screen 2: Requester Dashboard (`/requester/dashboard`)

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

View history shows chronological actor/event/time entries and expandable before/after snapshots. No update/delete history control exists. History failures support retry. Transitions disable duplicate submissions; a 409 shows a reload instruction and locks transitions until explicit Reload actions. Modal 409 keeps values visible and disables further stale saves; cancel/close then reload retrieves the latest record. Existing wrapping cards, portal modal, focus trap and body-scroll rules remain; rendered visual checks/screenshots are still pending.
