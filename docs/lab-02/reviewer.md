# Lab 2 — Peer Review Record

**Author:** Sorawit Chaitong — 67070503442 — GitHub: @DEV4952  
**Peer reviewer:** Phurithip Paisanworajit — 67070503437 — GitHub: @yiiipunn  

---

## Pull Requests I authored (reviewed by my partner)

| PR / Issue | Branch | Reviewer verdict | Notes |
|---|---|---|---|
| **Issue #1** | `feature/lab2-specification` | Approved | Established project specification and API contracts. |
| **Issue #2** | `feature/lab2-ticket-database` | Approved | Prisma schema with Ticket, Attachment, and constraints. |
| **Issue #3** | `feature/lab2-requester-context` | Approved | Persona context switcher & security headers. |
| **Issue #4** | `feature/lab2-ticket-creation-api` | Approved | Ticket creation API with validation & unique numbers. |
| **Issue #5** | `feature/lab2-create-ticket-ui` | Approved | Responsive Create Ticket screen with Zen Green UI. |
| **Issue #6** | `feature/lab2-my-ticket` | Approved | My Tickets dashboard with search, filter, pagination. |
| **Issue #7** | `feature/lab2-ticket-detail-attachment-api` | Approved | Ticket detail and attachment lifecycle backend API. |
| **Issue #8** | `feature/lab2-ticket-detail-ui` | Approved | Ticket detail & attachment management frontend UI. |
| **Issue #9** | `feature/lab2-automated-testing` | Approved | Automated testing suite, E2E test, and traceability matrix. |
| **Issue #10** | `feature/lab2-visual-qa` | Approved | Visual QA, responsive layout verification, final release. |

---

### Issue Review Feedback Sample

#### Issue #6 / #8: UI Theme & Aesthetics
- **Reviewer comment received:** Requested adopting the Zen Green theme with slide-based layout and removing all emoji characters for clean professional SaaS aesthetics.
- **How I responded:** Refactored all screens (`CreateTicketScreen`, `MyTicketsScreen`, `TicketDetailScreen`, `AppShell`) to use calm green tones (`#2e7d32`), clean badges, and zero emojis across the application.

#### Issue #7: Attachment Soft Removal Security
- **Reviewer comment received:** Ensure soft-removed attachments cannot be accessed or downloaded by ID.
- **How I responded:** Enforced server-side checks returning `403 ATTACHMENT_REMOVED` when downloading deleted files and hid download action in the frontend.

---

## Pull Requests I reviewed for my partner

- **My comment:** Verified backend and frontend integration across requester lifecycle workflows and confirmed that all 106 automated tests pass with 0 regressions.
- **Partner's response:** Integrated feedback and confirmed test coverage across all Acceptance Criteria.
