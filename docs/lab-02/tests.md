# TokTickIT Lab 2 — Test Plan & Traceability Matrix

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Target Sprint:** Lab 2 — Requester-Facing Ticketing MVP  
**Authors:** Sorawit Chaitong (@DEV4952), Phurithip Paisanworajit (@yiiipunn)  

---

## 1. Test Strategy Overview

The testing strategy for TokTickIT Lab 2 guarantees high software quality, security, and contract compliance across both client and server tiers through automated test pyramids:

```text
               / \
              /   \
             / E2E \       (Playwright / Workflow Tests)
            /-------\
           /   UI    \     (Vitest + React Testing Library + Style/Responsive)
          /-----------\
         / Integration \   (Supertest + PostgreSQL DB Integration)
        /---------------\
       /      Unit       \ (Vitest Pure Functions & Validation Helpers)
      /-------------------\
```

### Test Frameworks & Tools:
- **Unit & UI Component Tests:** Vitest, React Testing Library, JSDOM.
- **API & Integration Tests:** Supertest, Vitest, PostgreSQL (Test DB via Prisma).
- **Responsive & Visual Checks:** Vitest with viewport mocking, Playwright / Browser Subagent validation.

---

## 2. Planned Test Suite Catalog

### 2.1. Unit Tests (UT)

| Test ID | Component / Module | Test Description | Expected Result |
|---|---|---|---|
| **UT-01** | `server/utils/ticketNumber.ts` | Generate ticket number with date prefix | Returns `TIC-YYYYMMDD-XXXX` format with valid UTC date and zero-padded sequence. |
| **UT-02** | `server/validators/ticket.ts` | Validate title length (min 5, max 150 chars) | Passes for 5-150 chars; fails for 4 chars or 151 chars. |
| **UT-03** | `server/validators/ticket.ts` | Validate description length (min 10, max 2000 chars) | Passes for 10-2000 chars; fails for 9 chars or 2001 chars. |
| **UT-04** | `server/validators/ticket.ts` | Validate priority enum values | Accepts `LOW`, `MEDIUM`, `HIGH`, `URGENT`; rejects invalid string `CRITICAL`. |
| **UT-05** | `server/utils/pagination.ts` | Calculate pagination metadata (total, totalPages, hasNext, hasPrev) | Computes correct `totalPages` and boolean flags for boundary page inputs. |
| **UT-06** | `client/utils/formatters.ts` | Format ISO dates into localized readable timestamps | Formats `2026-08-29T01:15:30.000Z` to `"Aug 29, 2026, 01:15 UTC"`. |
| **UT-07** | `client/utils/badges.ts` | Map status and priority enums to Bootstrap badge classes | Returns accurate CSS classes (`bg-primary`, `bg-danger`, etc.). |
| **UT-08** | `client/utils/attachmentValidation.ts` | Validate attachment file size (< 5MB) and MIME type | Returns `true` for 2MB PNG; returns `false` with error for 6MB file or `.exe`. |

---

### 2.2. API / Integration Tests (IT)

| Test ID | HTTP Method & Route | Test Scenario | Expected Status & Response |
|---|---|---|---|
| **IT-01** | `GET /api/requesters` | Fetch all seeded development users | `200 OK`, returns array of 3 users with active/inactive status. |
| **IT-02** | `GET /api/categories` | Fetch IT request categories | `200 OK`, returns 4 seeded categories in ID order. |
| **IT-03** | `POST /api/tickets` | Create ticket with valid data and `x-requester-id: 1` | `201 Created`, returns new ticket with generated `ticketNumber` and `status: OPEN`. |
| **IT-04** | `POST /api/tickets` | Create ticket with invalid title (< 5 chars) | `400 Bad Request`, returns error envelope with field details. |
| **IT-05** | `POST /api/tickets` | Create ticket with non-existent `categoryId` | `400 Bad Request`, returns category validation error. |
| **IT-06** | `POST /api/tickets` | Create ticket with missing `x-requester-id` header | `401 Unauthorized`, returns missing requester context error. |
| **IT-07** | `POST /api/tickets` | Create ticket with inactive requester (`x-requester-id: 3`) | `403 Forbidden`, returns account inactive error message. |
| **IT-08** | `POST /api/tickets` | Create ticket including valid attachment metadata | `201 Created`, ticket contains associated attachments in database. |
| **IT-09** | `POST /api/tickets` | Send duplicate ticket payload within 3 seconds | `409 Conflict`, rejects rapid duplicate creation. |
| **IT-10** | `GET /api/tickets` | Fetch tickets for `x-requester-id: 1` | `200 OK`, returns only tickets created by Requester 1. |
| **IT-11** | `GET /api/tickets?page=2&limit=5` | Paginate ticket results | `200 OK`, returns exactly 5 items and `page: 2` in metadata. |
| **IT-12** | `GET /api/tickets?search=vpn` | Substring search across title and description | `200 OK`, returns only records containing "vpn" (case-insensitive). |
| **IT-13** | `GET /api/tickets?status=OPEN&priority=HIGH` | Multi-attribute combined filtering | `200 OK`, returns only tickets where `status == OPEN` AND `priority == HIGH`. |
| **IT-14** | `GET /api/tickets?sortBy=priority&sortOrder=desc` | Sort tickets by priority severity | `200 OK`, returns tickets sorted `URGENT` -> `HIGH` -> `MEDIUM` -> `LOW`. |
| **IT-15** | `GET /api/tickets/:id` | Fetch owned ticket detail by ID or `ticketNumber` | `200 OK`, returns full ticket model, category, requester, attachments. |
| **IT-16** | `GET /api/tickets/:id` | Fetch ticket owned by another requester | `404 Not Found` (or `403 Forbidden`), prevents unauthorized data leak. |

---

### 2.3. UI Component Tests (CT)

| Test ID | Component | Test Scenario | Expected Behavior |
|---|---|---|---|
| **CT-01** | `RequesterSwitcher` | Renders user dropdown and triggers context switch on select | Updates selected requester across React Context and headers. |
| **CT-02** | `TicketForm` | Submits valid form data | Calls `createTicket` API and triggers navigation to `/tickets`. |
| **CT-03** | `TicketForm` | Triggers client validation on empty submit | Displays inline error messages under title, category, description. |
| **CT-04** | `TicketForm` | Renders disabled state for inactive user | Disables inputs and renders suspension warning alert. |
| **CT-05** | `TicketForm` | Prevents double click while request is loading | Disables submit button and renders spinner icon. |
| **CT-06** | `TicketForm` | Handles file upload picker and removal | Displays selected attachment chips with remove button. |
| **CT-07** | `TicketList` | Renders ticket rows with proper badge styling | Renders table rows with formatted dates, priority badge, and status badge. |
| **CT-08** | `TicketFilterBar` | Updates search query and filter selections | Debounces search input and propagates filter state to parent list. |
| **CT-09** | `Pagination` | Handles page navigation clicks | Renders page buttons and fires `onPageChange` with target page number. |
| **CT-10** | `EmptyState` | Renders when active requester has 0 tickets | Displays "No tickets submitted yet" with Create Ticket CTA. |
| **CT-11** | `NoResultsState` | Renders when search/filter returns 0 matches | Displays "No matching tickets" with "Clear Filters" button. |
| **CT-12** | `TicketDetail` | Renders complete ticket details and attachments | Displays title, metadata card, description text, and attachment chips. |

---

### 2.4. UI Style Tests (ST)

| Test ID | Component / Element | Test Scenario | Expected Style / CSS |
|---|---|---|---|
| **ST-01** | Priority Badges | Render badge variants | `LOW` -> `bg-secondary`, `MEDIUM` -> `bg-info`, `HIGH` -> `bg-warning`, `URGENT` -> `bg-danger`. |
| **ST-02** | Status Badges | Render status badge variants | `OPEN` -> `bg-primary`, `IN_PROGRESS` -> `bg-warning`, `RESOLVED` -> `bg-success`, `CLOSED` -> `bg-secondary`. |
| **ST-03** | Form Validation State | Input validation failure | Applies Bootstrap `.is-invalid` class with `.invalid-feedback` text. |
| **ST-04** | Loading Placeholder | Table loading state | Renders `.placeholder-glow` skeleton animation rows. |

---

### 2.5. Responsive Tests (RT)

| Test ID | Viewport | Target Element | Expected Responsive Behavior |
|---|---|---|---|
| **RT-01** | Desktop (`1280px`) | `TicketList` | Full 6-column data table rendered with horizontal filter toolbar. |
| **RT-02** | Tablet (`768px`) | `TicketList` | Compact table rendered; filter toolbar wraps into 2 rows. |
| **RT-03** | Mobile (`375px`) | `TicketList` | Data table transforms into stacked ticket card items with clear tap targets. |
| **RT-04** | Mobile (`375px`) | `TicketForm` | Form inputs and buttons expand to 100% viewport width; touch target >= 44px. |

---

### 2.6. End-to-End Workflow Tests (E2E)

| Test ID | User Journey Flow | Verification Steps |
|---|---|---|
| **E2E-01** | **Complete Ticket Submission Journey** | 1. Select active requester Alex Rivera.<br>2. Click "+ New Ticket".<br>3. Fill out Title, Category, Priority, Description.<br>4. Attach diagnostic screenshot.<br>5. Click "Submit Ticket".<br>6. Verify redirect to `/tickets` showing newly created ticket with status `OPEN`. |
| **E2E-02** | **Search, Filter & Sort Journey** | 1. Navigate to `/tickets`.<br>2. Filter by Category = "Hardware".<br>3. Filter by Status = "OPEN".<br>4. Type search keyword into search bar.<br>5. Sort by Priority descending.<br>6. Verify table displays only matching items in proper order. |
| **E2E-03** | **Multi-User Isolation Journey** | 1. As Alex Rivera, create ticket "Alex Secret Issue".<br>2. Switch Requester to Samantha Chen.<br>3. Verify "Alex Secret Issue" is NOT in Samantha's ticket list.<br>4. Attempt to navigate directly to `/tickets/<AlexTicketId>`.<br>5. Verify access is blocked with 404 / 403 error view. |
| **E2E-04** | **Inactive Persona Restriction Journey** | 1. Switch Requester to Jordan Taylor (`isActive: false`).<br>2. Attempt to open `/tickets/new`.<br>3. Verify form is disabled with suspension warning banner.<br>4. Verify existing tickets for Jordan remain viewable in read-only mode. |

---

## 3. Acceptance Criteria to Test Traceability Matrix

Every Acceptance Criterion defined in `docs/lab-02/specification.md` maps directly to one or more automated tests across our test catalog:

| Acceptance Criterion | Title | Primary Test Mapping | Test Types Covered |
|---|---|---|---|
| **AC-01** | Development Persona Selection | `IT-01`, `CT-01` | Integration, Component |
| **AC-02** | Requester Switching Data Isolation | `IT-10`, `CT-01`, `E2E-03` | Integration, Component, E2E |
| **AC-03** | Category Dropdown Population | `IT-02`, `CT-02` | Integration, Component |
| **AC-04** | Successful Ticket Creation | `UT-01`, `IT-03`, `CT-02`, `E2E-01` | Unit, Integration, Component, E2E |
| **AC-05** | Validation Failure on Invalid Form Input | `UT-02`, `UT-03`, `CT-03`, `ST-03` | Unit, Component, Style |
| **AC-06** | Backend Field Validation Enforcement | `IT-04`, `IT-05` | Integration |
| **AC-07** | Inactive Requester Ticket Creation Block | `IT-07`, `CT-04`, `E2E-04` | Integration, Component, E2E |
| **AC-08** | Attachment Upload and Association | `UT-08`, `IT-08`, `CT-06`, `E2E-01` | Unit, Integration, Component, E2E |
| **AC-09** | Attachment Validation (Size & Type) | `UT-08`, `CT-06` | Unit, Component |
| **AC-10** | Duplicate Submission Prevention | `IT-09`, `CT-05` | Integration, Component |
| **AC-11** | My Tickets List Rendering & Ownership Scoping | `IT-10`, `CT-07`, `ST-01`, `ST-02` | Integration, Component, Style |
| **AC-12** | Substring Search | `IT-12`, `CT-08`, `E2E-02` | Integration, Component, E2E |
| **AC-13** | Combined Multi-Attribute Filtering | `IT-13`, `CT-08`, `E2E-02` | Integration, Component, E2E |
| **AC-14** | Column Sorting | `IT-14`, `CT-07`, `E2E-02` | Integration, Component, E2E |
| **AC-15** | Server-Side Pagination | `UT-05`, `IT-11`, `CT-09` | Unit, Integration, Component |
| **AC-16** | Empty State Display | `CT-10` | Component |
| **AC-17** | No-Results State Display | `CT-11` | Component |
| **AC-18** | Ticket Detail View Access | `UT-06`, `IT-15`, `CT-12` | Unit, Integration, Component |
| **AC-19** | Unauthorized Ticket Access Prevention | `IT-16`, `CT-12`, `E2E-03` | Integration, Component, E2E |
| **AC-20** | Responsive Mobile Layout | `RT-01`, `RT-02`, `RT-03`, `RT-04` | Responsive |

---

## 4. Test Execution Instructions

### Backend Test Suite (Unit & Supertest Integration)
```bash
cd server
npm test
```

### Frontend Test Suite (Vitest & React Testing Library)
```bash
cd client
npm test
```

### Full Test Coverage Verification
```bash
# Run both test suites with coverage report
cd server && npm test -- --coverage
cd ../client && npm test -- --coverage
```
