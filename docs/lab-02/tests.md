# TokTickIT Lab 2 — Automated Testing Plan & Traceability Matrix

**Document Version:** 2.0.0  
**Status:** Complete & Verified  
**Target Sprint:** Lab 2 — Requester-Facing Ticketing MVP (Issue #9)  
**Authors:** Sorawit Chaitong (@DEV4952), Phurithip Paisanworajit (@yiiipunn)  

---

## 1. Executive Summary

This document establishes the **Automated Testing Strategy, Traceability Matrix, and Verification Suite** for TokTickIT Lab 2. Every functional requirement and Acceptance Criterion (AC) across the Ticket Creation (Issue #5), My Tickets Dashboard (Issue #6), Ticket Detail & Attachment API (Issue #7), and Ticket Detail UI (Issue #8) is mapped to dedicated, repeatable automated tests.

```text
                           / \
                          /   \
                         / E2E \       (Complete Requester Lifecycle: Select -> Create -> List -> Detail -> Attach -> Download -> Soft-Remove)
                        /-------\
                       /   UI    \     (React Testing Library + Responsive Layout Viewports + 4 UI States)
                      /-----------\
                     / Integration \   (Supertest API + Prisma Database + Ownership Isolation + Multer)
                    /---------------\
                   /      Unit       \ (Pure Validators, Ticket Number Regex, Enums, Pagination Math)
                  /-------------------\
```

---

## 2. Test Execution & Coverage Summary

| Tier | Test Suite Location | Test Files | Total Tests | Status |
|---|---|---|---|---|
| **Server Tests** | `server/tests/` | 8 files | **52 tests** | **100% Passed** |
| **Client Tests** | `client/tests/` | 9 files | **50 tests** | **100% Passed** |
| **Total Test Suite** | Full Stack | **17 files** | **102 tests** | **100% Passed** |

---

## 3. Acceptance Criteria Traceability Matrix

| Test ID | Test Type | Target AC / Req | Test Suite File | Test Scenario & Verification Description | Result |
|---|---|---|---|---|---|
| **T-001** | Unit | AC-09.1 | `server/tests/lab-02/validators.test.ts` | Validates Ticket Number regex pattern `^TIC-\d{8}-[A-Za-z0-9]+$` | PASSED |
| **T-002** | Unit | AC-09.1 | `server/tests/lab-02/validators.test.ts` | Validates title length constraints (min 5, max 150 characters) | PASSED |
| **T-003** | Unit | AC-09.1 | `server/tests/lab-02/validators.test.ts` | Validates description length constraints (min 10, max 2000 characters) | PASSED |
| **T-004** | Unit | AC-09.1 | `server/tests/lab-02/validators.test.ts` | Validates Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) and Status enums | PASSED |
| **T-005** | Unit | AC-09.6 | `server/tests/lab-02/validators.test.ts` | Validates allowed MIME/extensions (JPG, PNG, WEBP, PDF, TXT) and 5MB limit | PASSED |
| **T-006** | Unit | AC-09.4 | `server/tests/lab-02/validators.test.ts` | Validates pagination metadata math (`page`, `limit`, `totalPages`, `hasNext`, `hasPrev`) | PASSED |
| **T-007** | Integration | AC-09.2, AC-09.3 | `server/tests/lab-02/tickets.create.test.ts` | Creates ticket with auto-generated collision-resistant `ticketNumber` and default status `OPEN` | PASSED |
| **T-008** | Integration | AC-09.3 | `server/tests/lab-02/tickets.create.test.ts` | Rejects ticket creation when required title or description is missing/empty | PASSED |
| **T-009** | Integration | AC-09.3 | `server/tests/lab-02/tickets.create.test.ts` | Rejects ticket creation with title length < 5 characters or > 150 characters | PASSED |
| **T-010** | Integration | AC-09.3 | `server/tests/lab-02/tickets.create.test.ts` | Rejects ticket creation with invalid / non-existent `categoryId` | PASSED |
| **T-011** | Integration | AC-09.3 | `server/tests/lab-02/tickets.create.test.ts` | Rejects ticket creation when `x-requester-id` header is missing or non-numeric | PASSED |
| **T-012** | Integration | AC-09.3 | `server/tests/lab-02/tickets.create.test.ts` | Rejects ticket creation when requester is inactive/suspended (`isActive: false`) | PASSED |
| **T-013** | Integration | AC-09.3 | `server/tests/lab-02/tickets.create.test.ts` | Creates ticket with pre-attached diagnostic attachments in a single transaction | PASSED |
| **T-014** | Integration | AC-09.5 | `server/tests/lab-02/tickets.list.test.ts` | **Ownership Isolation:** `GET /api/tickets` returns ONLY tickets owned by requester | PASSED |
| **T-015** | Integration | AC-09.4 | `server/tests/lab-02/tickets.list.test.ts` | Substring search across ticket number, title, description, and related system | PASSED |
| **T-016** | Integration | AC-09.4 | `server/tests/lab-02/tickets.list.test.ts` | Filter tickets by status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`) | PASSED |
| **T-017** | Integration | AC-09.4 | `server/tests/lab-02/tickets.list.test.ts` | Filter tickets by priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) | PASSED |
| **T-018** | Integration | AC-09.4 | `server/tests/lab-02/tickets.list.test.ts` | Multi-criteria combined filtering (Status + Priority + Category) | PASSED |
| **T-019** | Integration | AC-09.4 | `server/tests/lab-02/tickets.list.test.ts` | Sorting tickets by `createdAt`, `priority`, or `title` in `asc`/`desc` | PASSED |
| **T-020** | Integration | AC-09.4 | `server/tests/lab-02/tickets.list.test.ts` | Pagination slices records correctly and returns accurate `meta` pagination flags | PASSED |
| **T-021** | Integration | AC-09.4 | `server/tests/lab-02/tickets.list.test.ts` | Calculates dashboard ticket metrics (`total`, `open`, `inProgress`, `resolved`, `closed`) | PASSED |
| **T-022** | Integration | AC-07.1, AC-09.2 | `server/tests/lab-02/tickets.attachment.test.ts` | `GET /api/tickets/:id` returns full detail when accessed by ticket owner | PASSED |
| **T-023** | Integration | AC-07.2, AC-09.5 | `server/tests/lab-02/tickets.attachment.test.ts` | `GET /api/tickets/:id` rejects unauthorized access to another requester's ticket (`404`) | PASSED |
| **T-024** | Integration | AC-07.2 | `server/tests/lab-02/tickets.attachment.test.ts` | `GET /api/tickets/:id/attachments` returns metadata list including soft-deleted files | PASSED |
| **T-025** | Integration | AC-07.3, AC-09.6 | `server/tests/lab-02/tickets.attachment.test.ts` | `POST /api/tickets/:id/attachments` uploads valid JPG, PNG, and PDF files | PASSED |
| **T-026** | Integration | AC-07.4, AC-09.6 | `server/tests/lab-02/tickets.attachment.test.ts` | Rejects unsupported file types (e.g. `.exe`, `.zip`) with `415 / 400` | PASSED |
| **T-027** | Integration | AC-07.4, AC-09.6 | `server/tests/lab-02/tickets.attachment.test.ts` | Rejects file upload exceeding maximum size of 5 MB (`400 FILE_TOO_LARGE`) | PASSED |
| **T-028** | Integration | AC-07.5, AC-09.6 | `server/tests/lab-02/tickets.attachment.test.ts` | Rejects upload when ticket already has 5 active attachments (`400 MAX_ATTACHMENTS_EXCEEDED`) | PASSED |
| **T-029** | Integration | AC-07.6, AC-09.7 | `server/tests/lab-02/tickets.attachment.test.ts` | Downloads active attachment belonging to owned ticket with correct headers | PASSED |
| **T-030** | Integration | AC-07.7, AC-09.7 | `server/tests/lab-02/tickets.attachment.test.ts` | Soft-removes attachment setting `isDeleted: true` and `deletedAt` without deleting record | PASSED |
| **T-031** | Integration | AC-07.8, AC-09.7 | `server/tests/lab-02/tickets.attachment.test.ts` | Blocks download attempts of soft-removed attachments (`403 ATTACHMENT_REMOVED`) | PASSED |
| **T-032** | Integration | AC-07.9, AC-09.5 | `server/tests/lab-02/tickets.attachment.test.ts` | Rejects download and deletion attempts of attachments owned by another requester | PASSED |
| **T-033** | UI Component | AC-08.1, AC-09.8 | `client/tests/lab-02/CreateTicketScreen.test.tsx` | Validates client-side constraints (title < 5, desc < 10) and character counters | PASSED |
| **T-034** | UI Component | AC-08.1, AC-09.8 | `client/tests/lab-02/CreateTicketScreen.test.tsx` | Submits valid form, preserves data on 500 error, and renders Success Confirmation Screen | PASSED |
| **T-035** | UI Component | AC-08.1, AC-09.8 | `client/tests/lab-02/MyTicketsScreen.test.tsx` | Renders all 4 UI states: Loading, Empty, No-Results, and Table with metrics bar | PASSED |
| **T-036** | UI Component | AC-08.1, AC-09.8 | `client/tests/lab-02/TicketDetailScreen.test.tsx` | Displays all ticket information in read-only mode with Zen status badges | PASSED |
| **T-037** | UI Component | AC-08.2, AC-09.5 | `client/tests/lab-02/TicketDetailScreen.test.tsx` | Renders Unauthorized "Access Denied" state when accessing unowned ticket | PASSED |
| **T-038** | UI Component | AC-08.7, AC-09.7 | `client/tests/lab-02/TicketDetailScreen.test.tsx` | Opens confirmation modal, captures removal reason, and soft-removes attachment | PASSED |
| **T-039** | UI Component | AC-08.8, AC-09.7 | `client/tests/lab-02/TicketDetailScreen.test.tsx` | Displays removed attachment metadata and disables download/preview actions | PASSED |
| **T-040** | Responsive | AC-08.10, AC-09.8 | `client/tests/lab-02/ResponsiveLayout.test.tsx` | Renders Desktop (1280px), Tablet (768px), and Mobile (375px) without horizontal scroll | PASSED |
| **T-041** | E2E Workflow | AC-09.9 | `client/tests/lab-02/RequesterWorkflow.e2e.test.tsx` | **Complete E2E Workflow:** Select Persona -> Create Ticket -> My Tickets -> Detail -> Upload -> Download -> Soft-Remove | PASSED |

---

## 4. How to Run Automated Tests

### 1. Run All Server Integration & Unit Tests:
```bash
cd server
npm test
```
*Expected Output:* `8 test files passed (52/52 tests passed)`

### 2. Run All Client UI, Responsive & E2E Tests:
```bash
cd client
npm test
```
*Expected Output:* `9 test files passed (50/50 tests passed)`

### 3. Run Full Project Verification:
```bash
npm --prefix server test && npm --prefix client test
```
*Expected Output:* `102/102 tests passing 100% across all suites.`
