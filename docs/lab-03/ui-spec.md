# TokTickIT Lab 3 — UI Specification (Zen Green Design System)

**Document Version:** 1.0.0  
**Status:** Approved for Implementation (Spec-DD Deliverable)  
**Target Platform:** Web (Desktop 1440px+, Tablet 768px - 1023px, Mobile 375px - 767px)  
**Design Theme:** Zen Green Design Language  
**Authors:** Sorawit Chaitong (@DEV4952) 

---

## 1. Information Architecture & Navigation

```text
TokTickIT Application (Zen Green Theme)
├── Top Navigation Bar (Global / Role-Based)
│   ├── Brand Logo ("TokTickIT" with leaf/tick icon)
│   ├── Role Navigation:
│   │   ├── [Requester]: [My Tickets] [Create Ticket]
│   │   ├── [IT Staff]:  [My Queue] [Create Ticket]
│   │   └── [Admin]:     [Admin (User Management)] [My Queue] [Create Ticket]
│   └── Profile & Account Dropdown (Top Right)
│       ├── User Name & Role Badge
│       ├── Change Password Option
│       └── Logout Action
│
├── Views & Screens:
│   ├── /login (Login Screen & Mandatory First-Login Password Change)
│   ├── /tickets (Requester Ticket List — Preserved from Lab 2)
│   ├── /tickets/new (Create Ticket — Preserved from Lab 2)
│   ├── /tickets/:id (Requester Ticket Detail + Public Comments + "Problem Appears Resolved")
│   ├── /staff/queue (IT Staff Ticket Queue Table/Cards + Filters + Pagination)
│   ├── /staff/tickets/:id (IT Staff Operational Detail + Public Comments & Internal Notes tabs)
│   └── /admin/users (Administrator User Management Table + Create/Edit User Drawer/Modal)
```

---

## 2. Zen Green Design Tokens & Badge Conventions

### 2.1. Color Tokens
| Token | Hex Value | Semantic Usage |
|---|---|---|
| `--color-zen-primary` | `#0f5132` | Top navigation bar background, brand headers, primary solid buttons. |
| `--color-zen-primary-hover`| `#0a3622` | Button hover state, active navigation item highlight. |
| `--color-zen-accent` | `#198754` | Secondary green accent, success confirmations, "Active" toggles. |
| `--color-zen-bg` | `#f4f7f5` | Main application canvas background (soft warm-neutral green-tinted grey). |
| `--color-zen-surface` | `#ffffff` | Content cards, data tables, modals, flyout drawers. |
| `--color-zen-border` | `#d8e2dc` | Subtle card borders, table dividers, input borders. |
| `--color-zen-text-main` | `#1a2e26` | High-contrast dark charcoal headings and primary text. |
| `--color-zen-text-muted`| `#52796f` | Secondary metadata labels, timestamps, placeholder text. |
| `--color-zen-danger` | `#dc3545` | Deactivate actions, error alerts, cancellation warnings. |

### 2.2. Badge Conventions

#### Status Badges
| Status | Background Color | Text Color | Border Style |
|---|---|---|---|
| `NEW` | `#e0e7ff` (Indigo-50) | `#3730a3` | Rounded Pill |
| `OPEN` | `#e0f2fe` (Sky-50) | `#0369a1` | Rounded Pill |
| `IN_PROGRESS` | `#dcfce7` (Emerald-50) | `#15803d` | Rounded Pill |
| `WAITING_FOR_REQUESTER`| `#fef3c7` (Amber-50) | `#b45309` | Rounded Pill |
| `RESOLVED` | `#d1fae5` (Green-50) | `#047857` | Rounded Pill |
| `CLOSED` | `#f1f5f9` (Slate-100) | `#475569` | Rounded Pill |
| `REOPENED` | `#fae8ff` (Fuchsia-50) | `#86198f` | Rounded Pill |
| `CANCELLED` | `#fee2e2` (Rose-50) | `#b91c1c` | Rounded Pill |

#### Priority Badges
| Priority | Background Color | Text Color | Icon / Visual Cue |
|---|---|---|---|
| `LOW` | `#f0fdf4` | `#166534` | Soft Green |
| `MEDIUM` | `#fffbeb` | `#b45309` | Warm Amber |
| `HIGH` | `#fff1f2` | `#be123c` | Vibrant Coral |
| `URGENT` | `#fef2f2` | `#991b1b` | Crimson Red Bold |

#### Role Badges
| Role | Badge Appearance | Placement |
|---|---|---|
| `Requester` | Light Blue Pill (`#e0f2fe`, text `#0369a1`) | Header Profile, User Table, Ticket Detail |
| `IT Staff` | Emerald Tint Pill (`#dcfce7`, text `#15803d`) | Header Profile, User Table, Ticket Detail |
| `Administrator`| Soft Violet Pill (`#ede9fe`, text `#6d28d9`) | Header Profile, User Table, Ticket Detail |

---

## 3. Screen Specifications & Wireframes

### Screen 1: Login & Mandatory Password Change (`/login`)

#### 1.1 Login Screen Mode
```text
+-------------------------------------------------------------------+
|                           [TokTickIT]                             |
|                                                                   |
|              +-------------------------------------+              |
|              |         Sign in to your account     |              |
|              |                                     |              |
|              | Email address                       |              |
|              | [ janderson@toktick.it            ] |              |
|              |                                     |              |
|              | Password                            |              |
|              | [ **********                      ] |              |
|              |                                     |              |
|              | (x) Invalid email or password.      |              |
|              |                                     |              |
|              | [            Sign In              ] |              |
|              |                                     |              |
|              |           Forgot your password?     |              |
|              +-------------------------------------+              |
+-------------------------------------------------------------------+
```

#### 1.2 Mandatory First-Login Change Password Screen Mode
- Triggered automatically when user account has `mustChangePassword === true`.
- Cannot be bypassed or navigated away from.
```text
+-------------------------------------------------------------------+
|              +-------------------------------------+              |
|              |         Change Your Password        |              |
|              | You must change your password to    |              |
|              | continue.                           |              |
|              |                                     |              |
|              | Current (temporary) password        |              |
|              | [ *******                         ] |              |
|              |                                     |              |
|              | New password                        |              |
|              | [ **********                      ] |              |
|              |                                     |              |
|              | Confirm new password                |              |
|              | [ **********                      ] |              |
|              |                                     |              |
|              | Password must:                      |              |
|              |  [v] Be at least 8 characters       |              |
|              |  [v] Include upper and lower case   |              |
|              |  [v] Include a number & special char|              |
|              |                                     |              |
|              | [            Continue             ] |              |
|              +-------------------------------------+              |
+-------------------------------------------------------------------+
```

---

### Screen 2: IT Staff Ticket Queue (`/staff/queue`)

```text
+-------------------------------------------------------------------------------------------------------------+
| [TokTickIT]   [My Queue]   [+ Create Ticket]                                          (Profile: Michael [IT])|
+-------------------------------------------------------------------------------------------------------------+
|                                                                                                             |
|  [Q Search by ticket number, summary, requester...  ]   [ Filters v ]   [ Sort: Newest v ]                  |
|                                                                                                             |
|  Showing 1 to 10 of 87 tickets                                                                              |
|  +-------------------------------------------------------------------------------------------------------+  |
|  | Ticket No.     | Created Date    | Summary                 | Category | Req. Pri | IT Pri | Status | Owner|  |
|  |----------------|-----------------|-------------------------|----------|----------|--------|--------|------|  |
|  | TKT-2026-001234| May 12, 09:14 AM| Laptop battery drains   | Hardware | [Medium] | [Med]  | [InProg]| M.B. |  |
|  | TKT-2026-001233| May 12, 08:02 AM| Cannot connect to VPN   | Network  | [High]   | [High] | [Open]  | Sarah|  |
|  | TKT-2026-001232| May 11, 04:45 PM| Email not syncing       | Software | [Medium] | [Med]  | [InProg]| D.L. |  |
|  | TKT-2026-001231| May 11, 11:30 AM| New employee setup req  | Access   | [Low]    | [Low]  | [Resolv]| Jenn |  |
|  | TKT-2026-001230| May 10, 02:10 PM| Printer keeps offline   | Hardware | [Medium] | [Low]  | [Open]  | Unass|  |
|  +-------------------------------------------------------------------------------------------------------+  |
|                                                                                                             |
|                                     < Previous   [1]  2  3  4  5 ... 9   Next >                             |
+-------------------------------------------------------------------------------------------------------------+
```

---

### Screen 3: IT Staff Ticket Detail (`/staff/tickets/:id`)

```text
+-------------------------------------------------------------------------------------------------------------+
| [TokTickIT]   [My Queue]   [+ Create Ticket]                                          (Profile: Michael [IT])|
+-------------------------------------------------------------------------------------------------------------+
|  < Back to Queue                                                                                            |
|                                                                                                             |
|  Ticket No.           Category           Related System                                                     |
|  TKT-2026-001234      Hardware           Corporate Laptop                                                   |
|                                                                                                             |
|  Requester            Requested Priority Current Status                                                     |
|  Jennifer Anderson    [Medium]           [ In Progress      v ]                                             |
|                                                                                                             |
|  Ticket Owner         IT Priority                                                                           |
|  [ Michael Brown  v ] [ Medium        v ]                                                                   |
|                                                                                                             |
|  Summary                                                                                                    |
|  [ Laptop battery drains quickly                                                                          ] |
|                                                                                                             |
|  Description                                                                                                |
|  [ My laptop battery is draining much faster than usual even when the system is idle.                    ] |
|                                                                                                             |
|  +-------------------------------------------------------------------------------------------------------+  |
|  | [v Public Comments (3)]   [ Internal Notes (2) ]   [ Attachments (2) ]                                |  |
|  |-------------------------------------------------------------------------------------------------------|  |
|  |  Add Public Comment                                                                                   |  |
|  |  [ Type your comment here...                                                                        ] |  |
|  |                                                                                  [ Post Comment ]     |  |
|  |                                                                                                       |  |
|  |  (JA) Jennifer Anderson [Requester]                          May 13, 2026 11:45 AM                   |  |
|  |       Thank you for the update. Please let me know if you need any additional diagnostic files.       |  |
|  |                                                                                                       |  |
|  |  (MB) Michael Brown [IT Staff]                               May 13, 2026 10:30 AM                   |  |
|  |       We are investigating the issue on your device. We will update you shortly.                      |  |
|  +-------------------------------------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------------------------------------+
```

---

### Screen 4: Requester Ticket Detail (Enhanced with Comments & Resolution)

- **Differences from IT Staff View:**
  - Status, IT Priority, and Owner are strictly **Read-Only**.
  - **Internal Notes tab is completely hidden/removed.**
  - **"Problem Appears Resolved"** button is visible when ticket is in active states (`OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`).
  - Clicking "Problem Appears Resolved" prompts confirmation and notifies IT Staff.

---

### Screen 5: Administrator User Management (`/admin/users`)

```text
+-------------------------------------------------------------------------------------------------------------+
| [TokTickIT]   [Admin]   [My Queue]                                                      (Profile: Admin [AD])|
+-------------------------------------------------------------------------------------------------------------+
|                                                                                                             |
|  Users                                                                                   [+ Create User]    |
|                                                                                                             |
|  [Q Search users by name or email...    ]   [ Role: All Roles v ]   [ Status: All v ]                       |
|                                                                                                             |
|  +-------------------------------------------------------------------------------------------------------+  |
|  | Name               | Email                     | Role        | Status    | Action                     |  |
|  |--------------------|---------------------------|-------------|-----------|----------------------------|  |
|  | Jennifer Anderson  | janderson@toktick.it      | [Requester] | [Active]  | [Edit]                     |  |
|  | Michael Brown      | mbrown@toktick.it         | [IT Staff]  | [Active]  | [Edit]                     |  |
|  | Sarah Johnson      | sjohnson@toktick.it       | [IT Staff]  | [Active]  | [Edit]                     |  |
|  | John Smith         | jsmith@toktick.it         | [Admin]     | [Active]  | [Edit]                     |  |
|  | Kevin Patel        | kpatel@toktick.it         | [IT Staff]  | [Inactive]| [Edit]                     |  |
|  +-------------------------------------------------------------------------------------------------------+  |
|                                                                                                             |
|                                        [ Create / Edit User Drawer / Modal ]                                |
|                                       +-------------------------------------+                               |
|                                       | Full Name *                         |                               |
|                                       | [ Alex Thompson                   ] |                               |
|                                       | Email Address *                     |                               |
|                                       | [ alex.thompson@toktick.it        ] |                               |
|                                       | Role *                              |                               |
|                                       | [ IT Staff                        v]|                               |
|                                       | Active                              |                               |
|                                       | [ (Yes) Toggle                    ] |                               |
|                                       | Initial Password                    |                               |
|                                       | [ TemporaryPass123!               ] |                               |
|                                       | [v] User will set password at login |                               |
|                                       |                                     |                               |
|                                       | [             Save User           ] |                               |
|                                       | [          Deactivate User        ] |                               |
|                                       | [               Cancel            ] |                               |
|                                       +-------------------------------------+                               |
+-------------------------------------------------------------------------------------------------------------+
```

---

## 4. Responsive Layout & Accessibility Rules

### 4.1. Breakpoint Specifications
1. **Desktop (≥ 1024px):**
   - Full tabular layouts with multi-column headers.
   - Drawer/modal overlays for Admin User creation and Password resets.
   - Side-by-side metadata columns in Ticket Detail.
2. **Tablet (768px - 1023px):**
   - Adaptive grid reducing non-essential columns (e.g., hiding summary preview or created date in dense tables).
   - Touch-friendly tap targets (minimum 44x44px for buttons and dropdown triggers).
3. **Mobile (< 768px):**
   - Tables convert into individual responsive cards.
   - Tabs (Public Comments vs Attachments) wrap cleanly without horizontal scroll.
   - Form controls stack vertically with full width inputs.
   - Zero horizontal overflow (`overflow-x: hidden` on viewport body).

### 4.2. UI State & Feedback Checklist
- **Loading State:** Skeleton loaders for queue tables and disabled submit buttons with spinner icons.
- **Empty State:** Clean illustration with message (e.g., "No tickets in your queue").
- **No Results State:** "No matching results found for '[query]'" with a quick "Reset Filters" action button.
- **Validation Errors:** Inline alert text placed directly below input fields in red font (`--color-zen-danger`).
- **Forbidden Feedback:** Clean error banner explaining authorization denial without exposing system stack traces.
