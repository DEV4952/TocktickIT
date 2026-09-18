# Lab 3 — Peer Review Record

**Author:** Sorawit Chaitong — 67070503442 — GitHub: @DEV4952  
**Peer reviewer:** Phurithip Paisanworajit — 67070503437 — GitHub: @yiiipunn  

---

## Pull Requests I authored (reviewed by my partner)

| PR / Issue | Branch | Reviewer verdict | Notes |
|---|---|---|---|
| #38 (Issue #1) | feature/lab3-specification | approved | Sprint 3 engineering contract, specification, UI/API contracts, and acceptance criteria |
| #48 (Issue #2) | feature/lab3-tests-plan | approved | Lab 3 Test DD plan and traceability matrix in docs/lab-03/tests.md |
| #49 (Issue #3) | feature/lab3-db-user-migration | approved | User model, Role enum, ticket workflow fields, and idempotent seed script |
| #50 (Issue #4) | feature/lab3-auth-session | approved | Secure authentication endpoints, bcrypt hashing, session cookies, and login screens |
| #51 (Issue #5) | feature/lab3-rbac-authorization | approved | Server-side RBAC middleware, anti-tampering on creation, and ownership isolation |
| #52 (Issue #6) | feat/staff-ticket-queue | approved | Shared IT Staff Ticket Queue with search, filters, pagination, and claim action |
| #53 (Issue #7) | feat/ticket-comments-notes | approved | Public Comments, role-restricted Internal Notes, and requester resolution indication |
| #54 (Issue #8) | feat/admin-user-management | approved | Minimalist Administrator User Management screen, account safety rules, and password reset |
| #55 (Issue #9) | test/lab3-e2e-automation | approved | Automated test suite execution (193/193 tests passed), zero Lab 2 regressions, and test matrix |

---

## Detailed Peer Review Records by Issue

### Issue #1 : Lab 3 Engineering Specification (PR #38)
- **Reviewer comment received:** Specifications are detailed and comprehensive. Ensure that the Development Requester selector from Lab 2 is completely decoupled once authentication is introduced.
- **How I responded:** Added architectural migration guidelines in `docs/lab-03/specification.md` explicitly defining how the session identity replaces the development persona selector.
- **My comment:** Please verify that the 15 functional requirements and 15 business rules match the assignment constraints.
- **Partner's response:** Verified. The scope boundaries and explicit exclusions match the handout requirements. Approved.

### Issue #2 : Test-Driven Development Plan & Traceability Matrix (PR #48)
- **Reviewer comment received:** Make sure the matrix explicitly maps all API and UI acceptance criteria (AC-01 through AC-14) to planned test files.
- **How I responded:** Structured `docs/lab-03/tests.md` with complete requirement-to-test mapping tables, test execution commands, and DoD criteria.
- **My comment:** Please review test distribution between server integration tests and client component tests.
- **Partner's response:** The test matrix covers all critical paths and safety boundaries cleanly. Approved.

### Issue #3 : User Model, Roles & Database Migration (PR #49)
- **Reviewer comment received:** Database schema correctly implements the `Role` enum. Ensure seed scripts provide the minimum user quotas required by the lab.
- **How I responded:** Implemented idempotent seed script in `server/prisma/seed.ts` seeding 12 realistic users across Requester, IT Staff, and Administrator roles.
- **My comment:** Checked database relations and verified that Lab 2 tickets and attachments remain intact.
- **Partner's response:** Ran `npm run prisma:seed` and verified user counts and relations. Approved.

### Issue #4 : Authentication & Session Management (PR #50)
- **Reviewer comment received:** Login and password change APIs work as expected. Ensure first-login password enforcement strictly blocks access until updated.
- **How I responded:** Added server-side middleware and frontend navigation guard blocking all normal screens if `mustChangePassword === true`.
- **My comment:** Added `LoginScreen` and `ChangePasswordScreen` matching Zen Green theme.
- **Partner's response:** Tested login, first-login password update, and logout cookie invalidation. Approved.

### Issue #5 : RBAC & Authorization Boundaries (PR #51)
- **Reviewer comment received:** Ensure client cannot inject `requesterId` in request bodies to forge ticket ownership.
- **How I responded:** Enforced server-side `req.user.id` binding in `POST /api/tickets` and added 404 ownership isolation for foreign requester queries.
- **My comment:** Added 12 automated tests in `authorization.api.test.ts` covering all RBAC boundaries.
- **Partner's response:** Verified with automated test runs and direct API calls. Approved.

### Issue #6 : IT Staff Ticket Queue & Operational Triage (PR #52)
- **Reviewer comment received:** The queue search and filters are responsive. Check that unassigned tickets can be claimed directly by active IT Staff.
- **How I responded:** Implemented `PATCH /api/staff/tickets/:id/claim` and `PATCH /api/staff/tickets/:id/reassign` with validation preventing reassignment to requesters.
- **My comment:** Added pagination and debounce search on the queue table.
- **Partner's response:** Operational triage controls and status transition matrix behave as required. Approved.

### Issue #7 : Public Comments & Internal Notes (PR #53)
- **Reviewer comment received:** Internal Notes must be strictly inaccessible to Requesters, both via UI tabs and direct API calls.
- **How I responded:** Enforced 403 Forbidden on `/notes` endpoints for non-staff roles and conditioned UI tab rendering strictly on `role !== "REQUESTER"`.
- **My comment:** Added "Problem Appears Resolved" indication for ticket requesters.
- **Partner's response:** Tested note secrecy and comment submission. Approved.

### Issue #8 : Administrator User Management Screen & Safety Rules (PR #54)
- **Reviewer comment received:** Safety rules for self-deactivation and last active admin protection are critical. Ensure they return appropriate HTTP conflict codes.
- **How I responded:** Implemented safety guards returning 403 for self-deactivation/demotion and 409 `LAST_ACTIVE_ADMIN` when attempting to deactivate the sole remaining admin.
- **My comment:** Styled User Management table with Zen Green role badges and per-page select dropdown.
- **Partner's response:** Tested user creation, role assignment, and safety guard boundaries. Approved.

### Issue #9 : Automated & E2E Testing Suite (PR #55)
- **Reviewer comment received:** Ensure 100% of planned tests pass with zero regressions on existing Lab 2 suites.
- **How I responded:** Executed all 25 test suites across Server and Client (193 tests passed, 100% clean) and updated `docs/lab-03/tests.md`.
- **My comment:** Verified that both Lab 2 and Lab 3 suites pass simultaneously without database race conditions.
- **Partner's response:** Verified test execution logs. All DoD items satisfied. Approved.
