# TokTickIT Lab 2 — Engineering Specification

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Target Sprint:** Lab 2 — Requester-Facing Ticketing MVP  
**Authors:** Sorawit Chaitong (@DEV4952), Phurithip Paisanworajit (@yiiipunn)  
**Course:** CPE 334 Software Engineering Laboratory  

---

## 1. Sprint Goal

Deliver a robust, secure, and intuitive **Requester-Facing Ticketing Minimum Viable Product (MVP)** for the TokTickIT Service Desk. The system must enable authenticated or simulated Requesters to create IT support tickets, track the status of their submitted tickets, search/filter/sort their ticket history, view detailed ticket timelines, and manage file attachments—while establishing strict data isolation, server-side validation, and an extensible architecture prepared for full authentication in Lab 3.

---

## 2. Stakeholder Request Interpretation

The IT Support Department at TokTickIT requires a self-service portal to alleviate manual email-based issue reporting. Stakeholders articulated the following core expectations:

1. **Self-Service Ticket Logging:** Requesters must independently submit IT service requests categorized under standard domain classifications (Account & Access, Hardware, Software, Network).
2. **Issue Categorization & Prioritization:** Requesters must specify the urgency (Priority: Low, Medium, High, Urgent) to help IT support triage incidents effectively.
3. **Traceability:** Every ticket must receive a unique, human-readable ticket identifier (e.g., `TIC-20260829-0001`) that can be cited during follow-ups.
4. **Visibility & Tracking:** Requesters should view a personal dashboard displaying all tickets they created, showing real-time lifecycle statuses (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).
5. **Fast Retrieval:** Requesters need search, filtering, and sorting capabilities to quickly locate past tickets without paging through irrelevant entries.
6. **Ticket Detail & Evidence:** Requesters must be able to view the full details of any ticket they submitted, including description text and attached diagnostic logs or screenshots.
7. **Privacy & Data Isolation:** A requester must never see or access tickets submitted by other users.
8. **Development Simulation (Lab 2 Constraint):** Prior to full SSO/OAuth authentication (scheduled for Lab 3), the application must provide a switchable Development Requester selector to test multiple user personas (including active and inactive users) deterministically.

---

## 3. Scope

### 3.1. In-Scope
- **User Personas & Context:** Seeded Development Requesters with an active/inactive status and department affiliation; a dedicated UI switcher to toggle between personas.
- **Ticket Submission:** Requester form with category selection, title, detailed description, priority selection, and optional file attachments.
- **Ticket Identification:** Deterministic, collision-resistant, human-readable Ticket Number generation (`TIC-YYYYMMDD-XXXX`).
- **Dashboard & List View:** Paginated "My Tickets" list with multi-column sorting, multi-attribute filtering (status, priority, category), and full-text substring search.
- **Ticket Details View:** Single-ticket view displaying metadata, category badge, priority badge, status timeline, description, and attachments.
- **Access Control & Ownership:** Strict backend filtering ensuring requesters only retrieve and access their own tickets.
- **File Attachments:** Attachment upload and association (metadata stored in DB, size/type validation).
- **Error & State Handling:** Robust feedback for empty states, no-result searches, network failures, and validation errors.

### 3.2. Out-of-Scope (Deferred to Future Labs)
- Admin / IT Agent triage dashboard, ticket assignment, and status updates (Lab 3/4).
- Production authentication, JWT token issuance, password reset, and OAuth2 SSO (Lab 3).
- Ticket commenting, threaded discussions, and requester-agent chat (Lab 3/4).
- Email and SMS notification dispatchers (Lab 4).
- External S3 / Cloud Blob Storage integration (Lab 2 uses local disk or structured simulated attachment repository).
- SLA countdown timers and escalation rules (Lab 4).

---

## 4. Functional Requirements

| Requirement ID | Title | Description |
|---|---|---|
| **FR-01** | **Development Requester Switcher** | The system shall provide a development toolbar/selector allowing users to switch the active Requester context among pre-seeded users. |
| **FR-02** | **Category Selection** | The system shall populate ticket categories dynamically from the database (`/api/categories`) in alphabetical or seeded ID order. |
| **FR-03** | **Ticket Creation Form** | The system shall provide a form allowing the active Requester to submit a ticket with a Title, Category, Priority, Description, and optional Attachments. |
| **FR-04** | **Ticket Number Generation** | Upon successful submission, the system shall automatically generate a unique, human-readable ticket number conforming to `TIC-YYYYMMDD-XXXX`. |
| **FR-05** | **Default Ticket Initialization** | Newly created tickets shall automatically be initialized with status `OPEN`, creation timestamp `NOW()`, and linked to the active `requesterId`. |
| **FR-06** | **Attachment Management** | The system shall allow uploading up to 3 attachments (PNG, JPG, PDF, TXT; max 5MB each) during ticket creation. |
| **FR-07** | **My Tickets List View** | The system shall display a tabular/card view of all tickets submitted by the currently active Requester. |
| **FR-08** | **Search Functionality** | The system shall provide real-time or debounce search over `ticketNumber`, `title`, and `description` for the active Requester's tickets. |
| **FR-09** | **Filter Capabilities** | The system shall allow filtering tickets by `status`, `priority`, and `categoryId`, supporting combinable criteria. |
| **FR-10** | **Sort Capabilities** | The system shall support sorting tickets by `createdAt`, `updatedAt`, `priority`, and `ticketNumber` in ascending or descending order. |
| **FR-11** | **Server-Side Pagination** | The system shall paginate ticket records with customizable page size (5, 10, 20, 50) and return pagination metadata (total, page, totalPages). |
| **FR-12** | **Ticket Detail View** | The system shall render a detailed view for a selected ticket showing complete description, category, priority, status history, and attachment list. |
| **FR-13** | **Ownership Isolation** | The system shall restrict data access such that a Requester cannot view, query, or fetch tickets belonging to another user. |
| **FR-14** | **Active/Inactive State Handling** | The system shall prevent inactive Requesters from submitting new tickets while permitting read-only access to existing ticket history. |

---

## 5. Business Rules

| Rule ID | Category | Rule Definition |
|---|---|---|
| **BR-01** | **Ticket Defaults** | When a ticket is created without explicit status, it defaults to `OPEN`. If priority is omitted in client requests, it defaults to `MEDIUM`. `createdAt` and `updatedAt` default to server UTC timestamp. |
| **BR-02** | **Ticket Number Generation** | Ticket numbers must follow the format `TIC-YYYYMMDD-XXXX`, where `YYYYMMDD` is the UTC date of creation and `XXXX` is a 4-digit zero-padded sequence (or collision-resistant cryptographic hex/alphanumeric sequence). Ticket numbers are immutable once generated. |
| **BR-03** | **Development Requester Selection** | In development mode, the active requester identity is supplied via the HTTP header `x-requester-id`. If missing or invalid, the backend rejects write operations with `401 Unauthorized` or `400 Bad Request`. |
| **BR-04** | **Requester Switching** | When the user switches the active requester in the UI, all in-memory ticket lists, search filters, and active views must immediately refresh to reflect the new requester's dataset. Unsaved form drafts must prompt a discard warning. |
| **BR-05** | **Ticket Ownership** | A ticket is permanently owned by the `requesterId` that created it. Querying `/api/tickets` or `/api/tickets/:id` must strictly scope results to `where: { requesterId: currentRequesterId }`. |
| **BR-06** | **Field Validation** | - **Title:** String, required, trimmed, min 5 characters, max 150 characters.<br>- **Description:** String, required, trimmed, min 10 characters, max 2000 characters.<br>- **CategoryId:** Integer, required, must reference an existing `Category.id`.<br>- **Priority:** Enum string, required, one of `LOW`, `MEDIUM`, `HIGH`, `URGENT`. |
| **BR-07** | **Duplicate Submission Prevention** | The UI must immediately disable the submit button and display a loading spinner upon click. The backend must enforce idempotency or rate-limiting preventing duplicate ticket creations within 3 seconds for identical title+requester. |
| **BR-08** | **Search Rules** | Search queries must be trimmed. Searches match substrings case-insensitively across `ticketNumber`, `title`, and `description`. An empty search query returns all owned tickets without text filtering. |
| **BR-09** | **Filtering Rules** | Filtering criteria (`status`, `priority`, `categoryId`) are applied conjunctively (logical `AND`). Supplying `"ALL"` or omitting a filter parameter disables filtering for that dimension. |
| **BR-10** | **Sorting Rules** | Default sort order is `createdAt` descending (`DESC`). Allowed sort fields: `createdAt`, `updatedAt`, `priority`, `ticketNumber`. Allowed directions: `asc`, `desc`. Priority sort follows severity weight (`URGENT` > `HIGH` > `MEDIUM` > `LOW`). |
| **BR-11** | **Pagination Rules** | Default `page=1`, default `limit=10`. Permitted limit values: 5, 10, 20, 50. If `page` exceeds `totalPages`, the system returns an empty `data` array with accurate pagination metadata. |
| **BR-12** | **Failure Handling** | All server errors must return standardized JSON `{ error: string, message: string, details?: any[] }`. Client must present non-blocking alert toasts for transient errors and inline form errors for validation failures. |
| **BR-13** | **Attachment Lifecycle** | Allowed file types: `image/jpeg`, `image/png`, `application/pdf`, `text/plain`. Maximum file size: 5 MB per file. Maximum files per ticket: 3. Files are stored securely and metadata is linked to the ticket upon ticket creation. |
| **BR-14** | **Inactive Requesters** | Requesters with `isActive = false` cannot submit new tickets (backend returns `403 Forbidden`). The frontend disables the creation form and presents an informational banner explaining the account suspension. |
| **BR-15** | **Empty and No-Result States** | - **Empty State:** Displayed when a requester has 0 total tickets. Displays an inviting graphic and a "Submit Your First Ticket" button.<br>- **No-Results State:** Displayed when filters/search return 0 matches. Displays a "No tickets found matching your criteria" message with a "Clear Filters" action. |
| **BR-16** | **Ticket Detail Ownership Enforcement** | Direct navigation to `/tickets/:id` or `/api/tickets/:id` for a ticket owned by a different requester must return `404 Not Found` (or `403 Forbidden`) to prevent unauthorized probing of ticket existence. |
| **BR-17** | **Transition to Lab 3 Authentication** | The requester resolution logic must reside behind an Express middleware (`authenticateRequester`) and React context (`useAuth`/`useRequester`). In Lab 3, replacing header inspection with JWT token validation must require zero changes to business route logic. |

---

## 6. UI Specification Summary

The TokTickIT frontend is built with React 18, TypeScript, and Bootstrap 5, featuring a clean modern IT Service Desk aesthetic.

### Key Views:
1. **Top Navigation & Persona Bar:**
   - Global brand header (`TokTickIT`).
   - Development Persona Dropdown showing active user name, avatar badge, email, department, and active/inactive status pill.
   - Navigation links: **My Tickets** and **New Ticket**.
2. **New Ticket Screen (`/tickets/new`):**
   - Clean card layout with floating labels.
   - Category selector with descriptive helper text.
   - Priority selector with color-coded radio badges (Green: Low, Blue: Medium, Orange: High, Red: Urgent).
   - Character counters for Title and Description.
   - Drag-and-drop or file picker attachment zone with preview chips and size indicators.
   - Sticky action bar with "Cancel" and "Submit Ticket" (with spinner).
3. **My Tickets Dashboard (`/tickets`):**
   - Metrics header: Total Tickets, Open, In Progress, Resolved counts.
   - Interactive Toolbar: Substring Search box, Category dropdown, Priority dropdown, Status dropdown, and Reset Filters button.
   - Responsive Ticket Table (Desktop) / Ticket Cards (Mobile) with sortable column headers, status badges, and direct links to details.
   - Pagination Bar with page size selector, page indicator, and Previous/Next buttons.
4. **Ticket Detail View (`/tickets/:id`):**
   - Header with Ticket Number, Status pill, Priority badge, Category tag, and Creation Date.
   - Requester info card.
   - Full description block formatted with whitespace preservation.
   - Attachments section with file type icons, file size, and download/preview links.
   - Back to My Tickets navigation button.

*(Full visual wireframes, breakpoints, and states are documented in [`docs/lab-02/ui-spec.md`](file:///c:/toktickit/docs/lab-02/ui-spec.md)).*

---

## 7. Data Changes (Data Model Decisions)

The PostgreSQL database schema is managed via Prisma ORM (`server/prisma/schema.prisma`).

### 7.1. Prisma Schema Additions

```prisma
enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model User {
  id         Int        @id @default(autoincrement())
  email      String     @unique
  name       String
  department String
  avatarUrl  String?
  isActive   Boolean    @default(true)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  tickets    Ticket[]

  @@map("users")
}

model Category {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  createdAt DateTime @default(now())
  tickets   Ticket[]

  @@map("categories")
}

model Ticket {
  id           Int            @id @default(autoincrement())
  ticketNumber String         @unique
  title        String         @db.VarChar(150)
  description  String         @db.Text
  status       TicketStatus   @default(OPEN)
  priority     TicketPriority @default(MEDIUM)
  categoryId   Int
  category     Category       @relation(fields: [categoryId], references: [id])
  requesterId  Int
  requester    User           @relation(fields: [requesterId], references: [id])
  attachments  Attachment[]
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@index([requesterId])
  @@index([status])
  @@index([priority])
  @@index([categoryId])
  @@map("tickets")
}

model Attachment {
  id         Int      @id @default(autoincrement())
  fileName   String
  fileSize   Int      // in bytes
  fileType   String   // MIME type
  fileUrl    String
  ticketId   Int
  ticket     Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@index([ticketId])
  @@map("attachments")
}
```

### 7.2. Seed Data Strategy
The seed script (`server/prisma/seed.ts`) will be extended to idempotently populate:
- **4 Standard Categories:** Account & Access, Hardware, Software, Network.
- **3 Development Users:**
  1. `Alex Rivera` (`alex.rivera@toktick.it`, Engineering, Active) — Primary requester.
  2. `Samantha Chen` (`samantha.chen@toktick.it`, Marketing, Active) — Secondary requester.
  3. `Jordan Taylor` (`jordan.taylor@toktick.it`, Operations, Inactive) — Used for testing suspended user rules.
- **Initial Sample Tickets:** 4-6 historical tickets distributed between Alex and Samantha to validate search, pagination, and ownership filtering immediately upon initial boot.

---

## 8. API Contract Summary

All endpoints conform to RESTful conventions, returning JSON bodies and proper HTTP status codes.

| Method | Endpoint | Description | Auth / Headers | Success Code |
|---|---|---|---|---|
| `GET` | `/api/requesters` | List all available development personas | None | `200 OK` |
| `GET` | `/api/requesters/me` | Get active requester profile | `x-requester-id: <id>` | `200 OK` |
| `GET` | `/api/categories` | List all IT support categories | None | `200 OK` |
| `POST` | `/api/tickets` | Submit a new ticket | `x-requester-id: <id>` | `201 Created` |
| `GET` | `/api/tickets` | Query paginated tickets for active requester | `x-requester-id: <id>` | `200 OK` |
| `GET` | `/api/tickets/:id` | Retrieve single ticket detail by ID or Number | `x-requester-id: <id>` | `200 OK` |
| `POST` | `/api/attachments/upload` | Upload diagnostic attachment | `x-requester-id: <id>` | `201 Created` |

*(Detailed schemas, request/response payloads, and error codes are specified in [`docs/lab-02/api-spec.md`](file:///c:/toktickit/docs/lab-02/api-spec.md)).*

---

## 9. Acceptance Criteria

Acceptance criteria are specified in testable **Given-When-Then** format:

### AC-01: Development Persona Selection
- **Given** the user opens the application,
- **When** the top navigation renders,
- **Then** a Requester Switcher dropdown displays all seeded users, defaulting to the first active user (Alex Rivera), and displaying their name, department, and active status.

### AC-02: Requester Switching Data Isolation
- **Given** the active requester is Alex Rivera viewing the My Tickets list,
- **When** the user switches the active requester to Samantha Chen,
- **Then** the ticket list updates immediately to display only Samantha's tickets, with no remaining tickets belonging to Alex.

### AC-03: Category Dropdown Population
- **Given** the ticket submission form is loaded,
- **When** the Category dropdown is inspected,
- **Then** it contains all active categories fetched from `/api/categories` with default placeholder `"Select a category"`.

### AC-04: Successful Ticket Creation
- **Given** an active requester fills out valid Title ("Cannot access VPN"), Category (Network), Priority (High), and Description ("Getting error 403 on gateway"),
- **When** the user clicks "Submit Ticket",
- **Then** the API returns `201 Created` with a new ticket object containing a generated `ticketNumber` (`TIC-YYYYMMDD-XXXX`), status `OPEN`, and the UI navigates to the ticket list showing a success alert.

### AC-05: Validation Failure on Invalid Form Input
- **Given** the ticket form has an empty title or description shorter than 10 characters,
- **When** the user clicks "Submit Ticket",
- **Then** the client blocks submission, highlighting invalid fields with descriptive error text, and no network request is dispatched.

### AC-06: Backend Field Validation Enforcement
- **Given** a direct API `POST /api/tickets` request with a missing title or invalid `categoryId` (e.g. 9999),
- **When** the request is processed by the server,
- **Then** the server responds with `400 Bad Request` and structured validation error details.

### AC-07: Inactive Requester Ticket Creation Block
- **Given** the active requester is Jordan Taylor (`isActive = false`),
- **When** the user attempts to view the ticket creation form or submit a ticket,
- **Then** the UI disables form inputs with a warning banner, and the backend returns `403 Forbidden` if a `POST /api/tickets` is attempted.

### AC-08: Attachment Upload and Association
- **Given** a requester attaches a valid PNG screenshot (< 5MB) during ticket creation,
- **When** the ticket is submitted,
- **Then** the attachment metadata is persisted in the database linked to the ticket, and the attachment appears in the ticket detail view.

### AC-09: Attachment Validation (File Size & Type)
- **Given** a requester attempts to attach an executable file (`.exe`) or a file exceeding 5MB,
- **When** the file is selected,
- **Then** the UI rejects the file immediately with an error message and does not include it in the submission payload.

### AC-10: Duplicate Submission Prevention
- **Given** the user clicks "Submit Ticket",
- **When** the request is in flight,
- **Then** the submit button is immediately disabled with a loading spinner, preventing accidental double submissions.

### AC-11: My Tickets List Rendering & Ownership Scoping
- **Given** an active requester with 5 submitted tickets navigates to `/tickets`,
- **When** the list loads,
- **Then** exactly 5 tickets are displayed with their Ticket Number, Title, Category, Priority badge, Status badge, and Created Date.

### AC-12: Substring Search
- **Given** a requester has tickets with titles "VPN access failed" and "Laptop screen flicker",
- **When** the requester types "screen" into the search bar,
- **Then** only the "Laptop screen flicker" ticket remains visible in the list.

### AC-13: Combined Multi-Attribute Filtering
- **Given** a requester has tickets with diverse categories and statuses,
- **When** the requester selects Category: "Hardware" and Status: "OPEN",
- **Then** only tickets matching BOTH "Hardware" AND "OPEN" are displayed.

### AC-14: Column Sorting
- **Given** the ticket list is displayed,
- **When** the user clicks the "Priority" column header,
- **Then** the tickets reorder by priority severity (`URGENT` -> `HIGH` -> `MEDIUM` -> `LOW`), and clicking again reverses the sort order.

### AC-15: Server-Side Pagination
- **Given** a requester has 15 total tickets and the page size is set to 10,
- **When** the list is loaded,
- **Then** Page 1 displays 10 tickets with pagination controls showing "Showing 1-10 of 15", and clicking "Next" loads Page 2 with the remaining 5 tickets.

### AC-16: Empty State Display
- **Given** an active requester with 0 submitted tickets navigates to `/tickets`,
- **When** the page loads,
- **Then** an Empty State card is displayed stating "You haven't submitted any tickets yet" with a primary "Submit Ticket" button.

### AC-17: No-Results State Display
- **Given** an active requester performs a search for "nonexistent-keyword-xyz",
- **When** the search query matches 0 tickets,
- **Then** a No-Results view is displayed stating "No tickets match your search criteria" along with a "Clear Search" button.

### AC-18: Ticket Detail View Access
- **Given** a requester clicks on a ticket row (`TIC-20260829-0001`) from their list,
- **When** the detail page loads,
- **Then** all ticket details (Title, Full Description, Category, Priority, Status, Requester info, Attachments, Timestamps) are rendered accurately.

### AC-19: Unauthorized Ticket Access Prevention
- **Given** Alex Rivera is the active requester,
- **When** Alex attempts to navigate directly to `/tickets/:id` for a ticket ID owned by Samantha Chen,
- **Then** the server responds with `404 Not Found` (or `403 Forbidden`) and the UI renders an "Access Denied / Ticket Not Found" error view.

### AC-20: Responsive Mobile Layout
- **Given** the user views the ticket list or submission form on a mobile screen (< 768px),
- **When** the page renders,
- **Then** table rows collapse into legible card items, form controls stack vertically, and touch targets meet minimum 44x44px accessibility guidelines.

---

## 10. Definition of Done (DoD)

A user story or feature in Lab 2 is considered **Done** only when all of the following criteria are satisfied:

1. **Specification Adherence:** Code strictly fulfills the corresponding Functional Requirements (FR-01..FR-14) and Business Rules (BR-01..BR-17).
2. **Database Migrations & Seed:** Prisma migrations run cleanly from scratch; database seed executes idempotently with test personas, categories, and tickets.
3. **Automated Test Coverage:**
   - Unit tests pass for validation, utilities, and ticket number generator.
   - Supertest integration tests pass for all API endpoints (CRUD, validation, pagination, filtering, search, security).
   - Vitest + RTL component tests pass for all UI components and responsive states.
   - All 20 Acceptance Criteria (AC-01..AC-20) have passing automated test evidence.
4. **Code Quality & Typing:** Zero TypeScript compilation errors (`tsc --noEmit` exits with 0); no `any` type escapes in core domain logic.
5. **No Secret Leaks:** No hardcoded passwords, tokens, or environment secrets committed to Git.
6. **Peer Review:** Code reviewed and approved by peer reviewer on a dedicated feature PR; all review feedback addressed.
7. **Documentation Updates:** `tests.md`, `ui-spec.md`, `api-spec.md`, `reviewer.md`, and `ai-use.md` updated with real evidence before final merge into `lab2-staging`.

---

## 11. Assumptions and Technical Decisions

| Decision / Assumption | Rationale | Alternatives Considered |
|---|---|---|
| **Header-Based Dev Auth (`x-requester-id`)** | Allows rapid testing of multiple user personas without building full JWT/Session auth in Lab 2, while maintaining clean separation of concerns. | Cookie-based session (too complex for Lab 2), Hardcoding user 1 (does not allow multi-user testing). |
| **Server-Side Pagination & Filtering** | Scaling to hundreds of tickets requires database-level filtering (`Prisma.findMany` with `where`, `take`, `skip`, `orderBy`). | Client-side filtering (unscalable, leaks data over network). |
| **Attachment Metadata Storage** | Storing file metadata (name, size, type, URL/path) in PostgreSQL with cascading deletion on ticket removal guarantees relational integrity. | Storing binary data directly in PostgreSQL BLOB (slows DB performance). |
| **Prisma Enums for Status & Priority** | Enforces database-level type safety for ticket statuses and priorities, preventing invalid values. | Plain string columns (risk of data corruption). |
| **Format `TIC-YYYYMMDD-XXXX`** | Provides human-friendly, identifiable ticket keys suitable for IT helpdesk communication. | Raw auto-increment integer ID (exposes total ticket volume and lacks branding). |
