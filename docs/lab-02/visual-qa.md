# TokTickIT Lab 2 — Visual QA & Release Verification

**Document Version:** 1.0.0  
**Status:** Approved & Verified for Final Release  
**Target Sprint:** Lab 2 — Visual QA & Release Integration (Issue #10)  
**QA Lead & Author:** Sorawit Chaitong (@DEV4952), Phurithip Paisanworajit (@yiiipunn)  

---

## 1. Executive Summary

This document serves as the final **Visual Quality Assurance (QA) and Integration Release Verification Report** for the **TokTickIT Lab 2 Requester-Facing Ticketing MVP**.

All functional workflows across **Issue #1 to Issue #9** have been integrated into `lab2-staging` and validated against the Zen Green UI Specification (`ui-spec.md`), API Contract (`api-spec.md`), and automated test suite.

---

## 2. Visual QA & Functional Checklist

### 2.1. Screen 1: Create Ticket Screen

| Check Item | Desktop (1280px) | Tablet (768px) | Mobile (375px) | Status | Notes |
|---|:---:|:---:|:---:|:---:|---|
| **Requester Context** | [x] | [x] | [x] | PASS | Shows active user badge & avatar pill in navbar/sidebar |
| **Category Selection** | [x] | [x] | [x] | PASS | Dynamic dropdown populated from `GET /api/categories` |
| **Priority Selector** | [x] | [x] | [x] | PASS | Zen Green button group (`Low`, `Medium`, `High`, `Urgent`) |
| **Related System Input**| [x] | [x] | [x] | PASS | Optional input with placeholder |
| **Title / Summary** | [x] | [x] | [x] | PASS | Character counter (`0/150`), inline error if < 5 chars |
| **Description** | [x] | [x] | [x] | PASS | Multiline textarea (`0/2000`), inline error if < 10 chars |
| **Attachment Selector** | [x] | [x] | [x] | PASS | Supports JPG, PNG, WEBP, PDF, TXT (≤ 5MB) |
| **Submit Action & Spin** | [x] | [x] | [x] | PASS | Loading spinner and button disabled during submit |
| **Success State** | [x] | [x] | [x] | PASS | Displays generated `ticketNumber` and CTA buttons |
| **Error Handling (500)**| [x] | [x] | [x] | PASS | Preserves user input and shows error alert |
| **Zero Clipping/Overlap**| [x] | [x] | [x] | PASS | Responsive stack on mobile |

---

### 2.2. Screen 2: My Tickets Dashboard

| Check Item | Desktop (1280px) | Tablet (768px) | Mobile (375px) | Status | Notes |
|---|:---:|:---:|:---:|:---:|---|
| **Metrics Summary Bar** | [x] | [x] | [x] | PASS | Realtime counters: Total, Open, In Progress, Resolved, Closed |
| **Search Bar** | [x] | [x] | [x] | PASS | Live query search with debounce |
| **Category Filter** | [x] | [x] | [x] | PASS | Filters records by category ID |
| **Priority Filter** | [x] | [x] | [x] | PASS | Filters records by priority severity |
| **Status Filter** | [x] | [x] | [x] | PASS | Filters records by ticket lifecycle status |
| **Sort Direction** | [x] | [x] | [x] | PASS | Sort by `createdAt`, `priority`, or `title` (`asc`/`desc`) |
| **Pagination Bar** | [x] | [x] | [x] | PASS | Slices items cleanly, displays `Page X of Y`, Prev/Next |
| **Empty State** | [x] | [x] | [x] | PASS | Renders "No tickets submitted yet" with Create Ticket CTA |
| **No-Results State** | [x] | [x] | [x] | PASS | Renders "No matching tickets found" with Clear Filters CTA |
| **Desktop Table View** | [x] | [x] | N/A | PASS | Clean tabular layout with priority and status chips |
| **Mobile Card View** | N/A | N/A | [x] | PASS | Touch-friendly cards on mobile viewport |
| **Ownership Isolation** | [x] | [x] | [x] | PASS | Only tickets created by active persona are visible |

---

### 2.3. Screen 3: Ticket Detail & Attachment Management

| Check Item | Desktop (1280px) | Tablet (768px) | Mobile (375px) | Status | Notes |
|---|:---:|:---:|:---:|:---:|---|
| **Header & Back Nav** | [x] | [x] | [x] | PASS | `Back to My Tickets` returns to ticket list |
| **Ticket Identifier** | [x] | [x] | [x] | PASS | Prominently displays `TIC-YYYYMMDD-XXXX` |
| **Status Badges** | [x] | [x] | [x] | PASS | Status (`OPEN`, etc.) & Priority (`HIGH Priority`, etc.) |
| **Read-Only Grid** | [x] | [x] | [x] | PASS | Number, Date, Requester & Dept, Category, System, Priority |
| **Summary & Description**| [x] | [x] | [x] | PASS | Preserves format/newlines (`white-space: pre-wrap`) |
| **Active Attachments** | [x] | [x] | [x] | PASS | Displays file name, size (MB), Download and Remove actions |
| **Upload Flow** | [x] | [x] | [x] | PASS | Client validation (≤5MB, supported format, max 5 active) |
| **Download Action** | [x] | [x] | [x] | PASS | Triggers browser download with correct filename |
| **Soft Remove Modal** | [x] | [x] | [x] | PASS | Prompts confirmation and captures removal reason |
| **Removed File State** | [x] | [x] | [x] | PASS | Shows `Removed` badge + Reason. Download strictly disabled |
| **Unauthorized State** | [x] | [x] | [x] | PASS | Shows "Access Denied" if accessing another user's ticket |
| **Loading & Error State**| [x] | [x] | [x] | PASS | Minimalist spinner, clear error alerts with retry |

---

## 3. Zen Green Design System Compliance

- [x] **Zero Emojis:** Verified 100% emoji-free codebase across all UI components and tests.
- [x] **Color Palette:**
  - Primary Green: `#2e7d32` / `#1b5e20`
  - Mint / Sage Green Accents: `#e8f5e9` / `#c8e6c9`
  - Clean Background: `#f8f9fa` / Off-White
  - Contrasting Text: Deep Charcoal `#212529`
- [x] **Typography:** Clean sans-serif typography with distinct hierarchy (`h4`, `h5`, `h6`, uppercase section labels).
- [x] **Card Slide Layout:** Clean sectioned cards with soft border radii (`12px`) and subtle drop shadows (`shadow-sm`).
- [x] **Interactive Micro-Animations:** Smooth hover transitions (`0.2s ease-in-out`) on buttons and ticket cards.

---

## 4. Responsive Verification Matrix

| Viewport | Dimensions | Breakpoint | Validation Results |
|---|---|---|---|
| **Desktop** | 1280px × 800px | `col-md-4` / `col-md-8` | Dual-column sidebar + workspace, Full data table, Navbar tabs visible. |
| **Tablet** | 768px × 1024px | Fluid grid | Fluid card adaptation, no clipping, legible typography. |
| **Mobile** | 375px × 667px | Single column stack | Stacked cards view, avatar initials fallback, zero horizontal overflow. |

---

## 5. Acceptance Criteria Sign-Off (AC-10.1 – AC-10.10)

- [x] **AC-10.1 (Feature Integration):** Issues #1 to #9 integrate seamlessly without conflict.
- [x] **AC-10.2 (Create Ticket Workflow):** Select Requester → Create Ticket → Success Screen → My Tickets.
- [x] **AC-10.3 (My Tickets Workflow):** Search, Filter, Sort, Pagination, and Details navigation functioning.
- [x] **AC-10.4 (Ticket Detail Workflow):** Open Ticket → View Details → Upload File → Download → Soft-Remove with Reason.
- [x] **AC-10.5 (Visual Consistency):** Zen Green design principles applied across all views.
- [x] **AC-10.6 (Responsive):** Zero clipping, zero overlap, zero horizontal overflow across all viewports.
- [x] **AC-10.7 (UI States):** All 4 UI states (Loading, Empty, Error, Success) verified.
- [x] **AC-10.8 (Regression Testing):** 106 / 106 automated tests passing 100%.
- [x] **AC-10.9 (Peer Review):** Peer review completed with all feedback addressed.
- [x] **AC-10.10 (Final Release):** Release documentation and evidence prepared for merge to `master`.
