# TokTickIT Lab 2 — UI Specification

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Target Platform:** Web (Desktop, Tablet, Mobile)  
**Design System:** Bootstrap 5.3 + Custom TokTickIT CSS Theme  
**Authors:** Sorawit Chaitong (@DEV4952), Phurithip Paisanworajit (@yiiipunn)  

---

## 1. Information Architecture & Navigation

```text
TokTickIT Application
├── Top Navigation Bar (Global)
│   ├── Brand Logo ("TokTickIT")
│   ├── Navigation Tabs: [My Tickets] [New Ticket] [System Health]
│   └── Dev Requester Switcher (Active persona, department, status)
│
├── Views / Routes:
│   ├── /tickets (Default / Dashboard)
│   │   ├── Metric Cards (Total, Open, In Progress, Resolved)
│   │   ├── Search & Filter Toolbar (Search input, Category, Priority, Status, Reset)
│   │   ├── Ticket Data Table (Desktop) / Ticket Card List (Mobile)
│   │   └── Pagination Controller
│   │
│   ├── /tickets/new (Create Ticket)
│   │   ├── Form Card (Title, Category, Priority, Description)
│   │   ├── Attachment Dropzone & File List
│   │   └── Action Buttons (Cancel, Submit Ticket)
│   │
│   └── /tickets/:id (Ticket Details)
│       ├── Header & Metadata Badges
│       ├── Requester Profile Card
│       ├── Full Description Block
│       ├── Diagnostic Attachments List
│       └── Navigation Back Link
```

---

## 2. Design System & Visual Tokens

### 2.1. Color Palette

| Token | Hex Value | Semantic Usage |
|---|---|---|
| `--color-primary` | `#0d6efd` | Primary actions, branding, active navigation links. |
| `--color-primary-dark` | `#0a58ca` | Button hover, focused states. |
| `--color-bg-canvas` | `#f8f9fa` | Page background. |
| `--color-bg-surface` | `#ffffff` | Card and modal surfaces. |
| `--color-border` | `#dee2e6` | Form inputs, table borders, card dividing lines. |
| `--color-text-main` | `#212529` | Primary typography. |
| `--color-text-muted` | `#6c757d` | Secondary metadata, placeholders, helper text. |

### 2.2. Priority & Status Badges

| Entity | Value | Badge Style | Background | Text Color |
|---|---|---|---|---|
| **Priority** | `LOW` | `badge bg-secondary` | `#6c757d` | `#ffffff` |
| | `MEDIUM` | `badge bg-info text-dark` | `#0dcaf0` | `#000000` |
| | `HIGH` | `badge bg-warning text-dark` | `#ffc107` | `#000000` |
| | `URGENT` | `badge bg-danger` | `#dc3545` | `#ffffff` |
| **Status** | `OPEN` | `badge bg-primary` | `#0d6efd` | `#ffffff` |
| | `IN_PROGRESS` | `badge bg-warning text-dark` | `#ffc107` | `#000000` |
| | `RESOLVED` | `badge bg-success` | `#198754` | `#ffffff` |
| | `CLOSED` | `badge bg-secondary` | `#6c757d` | `#ffffff` |

### 2.3. Typography
- **Font Family:** System Font Stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`)
- **Heading 1:** `1.75rem (28px)`, Semi-bold (`600`)
- **Heading 2:** `1.35rem (21.6px)`, Semi-bold (`600`)
- **Body:** `1.0rem (16px)`, Regular (`400`), Line-height `1.5`
- **Caption / Meta:** `0.875rem (14px)`, Regular (`400`)

---

## 3. Screen Layouts & Detailed Specifications

---

### Screen 1: Global Navigation & Dev Requester Switcher

#### Layout Wireframe
```text
+-----------------------------------------------------------------------------------+
| [TokTickIT Logo]   [My Tickets]  [+ New Ticket]      [Persona: Alex Rivera (Eng) v] |
+-----------------------------------------------------------------------------------+
```

#### Behavior & Interactions:
1. **Brand Link:** Clicking "TokTickIT" routes to `/tickets`.
2. **Navigation Tabs:** Active view receives `.active` class with visual bottom border.
3. **Requester Dropdown:**
   - Displays avatar, name, and department.
   - If user is inactive, an amber `[Suspended]` badge is appended.
   - Clicking opens dropdown showing all seeded users:
     - `Alex Rivera` (Engineering) - Active
     - `Samantha Chen` (Marketing) - Active
     - `Jordan Taylor` (Operations) - Inactive
   - Selecting a new user updates global context, invalidates cached queries, and re-fetches tickets for the selected persona.

---

### Screen 2: Submit New Ticket Form (`/tickets/new`)

#### Layout Wireframe
```text
+-----------------------------------------------------------------------------------+
| < Back to My Tickets                                                              |
|                                                                                   |
| Submit an IT Support Request                                                      |
| Fill in the details below. Our IT team will review and respond promptly.          |
|                                                                                   |
| +-------------------------------------------------------------------------------+ |
| | Title *                                                                       | |
| | [ e.g., Cannot connect to internal VPN gateway                             ] | |
| | Min 5, Max 150 characters (38/150)                                            | |
| |                                                                               | |
| | Category *                                  Priority *                        | |
| | [ Select a category...                   v] ( ) Low  (*) Medium  ( ) High ( ) | |
| |                                                                               | |
| | Description *                                                                 | |
| | +---------------------------------------------------------------------------+ | |
| | | Please describe the issue in detail...                                    | | |
| | |                                                                           | | |
| | +---------------------------------------------------------------------------+ | |
| | Min 10, Max 2000 characters                                                   | |
| |                                                                               | |
| | Attachments (Optional, max 3 files, 5MB each - PNG, JPG, PDF, TXT)             | |
| | +---------------------------------------------------------------------------+ | |
| | | [ Drag & drop files here or Browse Files ]                                | | |
| | +---------------------------------------------------------------------------+ | |
| | [x] error-log.txt (12 KB)   [x] screenshot.png (450 KB)                       | |
| |                                                                               | |
| | [ Cancel ]                                            [ Submit Ticket -> ]    | |
| +-------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

#### Form Field Validations:
- **Title:** Required. Real-time validation shows red border if `< 5` or `> 150` chars when dirty.
- **Category:** Required select dropdown. Shows `"Please select a category"` validation error if unselected.
- **Priority:** Segmented radio button group. Defaults to `Medium`.
- **Description:** Required textarea. Real-time character counter. Red border if `< 10` or `> 2000` chars when dirty.
- **Attachments:** File picker input with format filtering (`.png,.jpg,.jpeg,.pdf,.txt`). Files > 5MB or exceeding 3 files trigger an alert toast.
- **Submit Button:**
  - Disabled and displays `<span class="spinner-border spinner-border-sm"></span> Submitting...` while request is in-flight.
  - If current requester is inactive (`isActive: false`), the entire form is disabled and displays an alert: `Your account is currently inactive. You cannot submit new tickets.`

---

### Screen 3: "My Tickets" Dashboard (`/tickets`)

#### Layout Wireframe
```text
+-----------------------------------------------------------------------------------+
| My IT Tickets                                                [+ Submit New Ticket] |
|                                                                                   |
| [ Total: 8 ]       [ Open: 3 ]       [ In Progress: 2 ]       [ Resolved: 3 ]     |
|                                                                                   |
| +-------------------------------------------------------------------------------+ |
| | [Q Search by number, title...] [Category: All v] [Priority: All v] [Status: All v] | [Reset Filters] |
| +-------------------------------------------------------------------------------+ |
|                                                                                   |
| +-------------------------------------------------------------------------------+ |
| | Ticket #       | Title                     | Category | Priority | Status | Date| |
| |----------------|---------------------------|----------|----------|--------|-----| |
| | TIC-20260829-01| Cannot connect to VPN     | Network  | High     | OPEN   | Aug | |
| | TIC-20260828-02| Laptop monitor flickers   | Hardware | Medium   | IN_PRG | Aug | |
| | TIC-20260827-01| Request Figma License     | Software | Low      | RESOLV | Aug | |
| +-------------------------------------------------------------------------------+ |
|                                                                                   |
| Showing 1 - 3 of 8 tickets                   [Rows per page: 10 v]  [< Prev] [Next >] |
+-----------------------------------------------------------------------------------+
```

#### Interactive Behaviors:
- **Metrics Bar:** Clickable quick-filters (e.g. clicking `[ Open: 3 ]` automatically sets Status filter to `OPEN`).
- **Search Bar:** Real-time search with 300ms debounce.
- **Filter Dropdowns:** Instantly trigger re-query with page reset to `1`.
- **Sortable Columns:** Clicking column header toggles `ASC` / `DESC` indicator arrow and updates query parameter.
- **Row Click:** Clicking a row navigates to `/tickets/:id`.

---

### Screen 4: Ticket Detail View (`/tickets/:id`)

#### Layout Wireframe
```text
+-----------------------------------------------------------------------------------+
| < Back to My Tickets                                                              |
|                                                                                   |
| TIC-20260829-0042                                         [ Status: OPEN ]        |
| Cannot connect to internal VPN gateway                                            |
|                                                                                   |
| +-------------------------------------------------------------------------------+ |
| | Metadata                                                                      | |
| | Requester: Alex Rivera (alex.rivera@toktick.it)   Department: Engineering     | |
| | Category: Network                                 Priority: High              | |
| | Submitted: August 29, 2026 at 01:15 UTC           Updated: August 29, 2026    | |
| +-------------------------------------------------------------------------------+ |
|                                                                                   |
| Description                                                                       |
| +-------------------------------------------------------------------------------+ |
| | After updating Cisco AnyConnect, the authentication handshake times out with  | |
| | error 403. Rebooted machine twice.                                            | |
| +-------------------------------------------------------------------------------+ |
|                                                                                   |
| Attachments (1)                                                                   |
| +-------------------------------------------------------------------------------+ |
| | [IMG] vpn-error-screenshot.png (245 KB)                  [ View / Download ]  | |
| +-------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 4. UI States & Edge Cases

### 4.1. Loading State (Skeleton Loaders)
- While `/api/tickets` is fetching, render animated skeleton rows with gray gradient placeholder pulses (`placeholder-glow`) matching table dimensions to avoid layout shifts.

### 4.2. Empty State (Zero Tickets Created)
- **Visual:** IT Helpdesk illustration, heading: *"No tickets submitted yet"*.
- **Subtext:** *"Need help with hardware, software, or account access? Submit your first support request."*
- **CTA:** Primary button `[+ Create Ticket]` linking to `/tickets/new`.

### 4.3. No-Results State (Filters / Search Yield 0 Records)
- **Visual:** Magnifying glass icon, heading: *"No matching tickets found"*.
- **Subtext:** *"Try adjusting your search keywords or clearing active filters."*
- **CTA:** Secondary button `[ Clear All Filters ]` which resets search and dropdowns to `"ALL"`.

### 4.4. Error & Access Denied States
- **404 / 403 Access Denied:** When a user navigates to an unowned ticket ID, render a prominent alert box:
  ```text
  [!] Ticket Not Found or Access Denied
  You do not have permission to view this ticket, or it may have been removed.
  [ Return to My Tickets ]
  ```
- **Network Disconnection / 500 Server Error:** Display a toast notification: `"Unable to communicate with the TokTickIT server. [ Retry ]"`

---

## 5. Responsive Behavior & Breakpoints

```text
Breakpoint Specifications:
1. Desktop (>= 992px / 1200px):
   - Full 6-column tabular layout for ticket listing.
   - Multi-column form layouts (Category & Priority side-by-side).
   - Horizontal filter toolbar.

2. Tablet (768px - 991px):
   - Compact table with truncated title and icon-only timestamps.
   - 2-row filter toolbar.

3. Mobile (< 768px):
   - Table collapses into stacked vertical Card items:
     +-----------------------------------------+
     | TIC-20260829-0042        [ OPEN ]       |
     | Cannot connect to internal VPN...       |
     | Category: Network     Priority: High    |
     | 29 Aug 2026, 01:15                      |
     +-----------------------------------------+
   - Filter bar collapses into a full-width accordion or offcanvas drawer.
   - Form inputs stack to 100% width.
   - Minimum touch target: 44px x 44px for buttons, links, and form inputs.
```

---

## 6. Accessibility (a11y) Requirements

1. **Semantic HTML:** Use proper `<main>`, `<nav>`, `<header>`, `<section>`, `<table>`, `<form>`, `<label>`, and `<button>` elements.
2. **Keyboard Navigation:** All interactive elements must have visible `:focus-visible` outlines and support full Tab / Shift-Tab / Enter / Space navigation.
3. **Form Association:** Every input, select, and textarea element has a strictly associated `<label for="inputId">`.
4. **ARIA Attributes:**
   - `aria-live="polite"` on search results and filter status counters.
   - `aria-expanded` on persona dropdown and filter collapse.
   - `aria-invalid="true"` and `aria-describedby="errorId"` on invalid form inputs.
5. **Contrast Ratio:** Text and UI controls adhere to WCAG 2.1 AA minimum contrast ratio (4.5:1 for normal text, 3:0:1 for large text and interactive boundaries).
