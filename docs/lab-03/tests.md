# TokTickIT Lab 3 — Test-Driven Design (Test DD) & Traceability Matrix

**Document Version:** 2.0.0  
**Status:** Approved & Verified (All 100% Passed)  
**Target Sprint:** Lab 3 — TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens  
**Authors:** Sorawit Chaitong (@DEV4952)  
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  

---

## 1. Executive Summary & Testing Strategy

This document establishes the **Test-Driven Design (Test DD)** deliverable and **Traceability Matrix** for TokTickIT Sprint 3. In accordance with course guidelines, this test plan validates strict traceability from Business Rules (`BR-01` to `BR-15`) and Acceptance Criteria (`AC-01` to `AC-15`) to automated test suites.

```text
                           / \
                          /   \
                         / E2E \       (Complete User Workflows: Auth, Password Change, IT Triage, Admin User Mgmt)
                        /-------\
                       /   UI    \     (React Testing Library: Login, Change Password, Queue, Staff Detail, Admin Users)
                      /-----------\
                     / Integration \   (Supertest API + Prisma DB: Auth, RBAC, Queue Query, Claim, Notes, Admin CRUD)
                    /---------------\
                   /      Unit       \ (Password Hasher/Validators, Role Guards, Status Transition Machine, Queue Math)
                  /-------------------\
```

---

## 2. Test Suite Architecture & Verification Summary

| Layer | Test Directory / File | Target Domain & Scope | Runner | Tests | Status |
|---|---|---|---|---|---|
| **Server API** | `server/tests/lab-03/auth.api.test.ts` | Login, Logout, Current User `/api/auth/me`, First-login password change | Vitest + Supertest | 10 | **PASSED** |
| **Server API** | `server/tests/lab-03/authorization.api.test.ts` | Server-side RBAC, 401/403 status codes, ownership isolation, anti-tampering | Vitest + Supertest | 12 | **PASSED** |
| **Server API** | `server/tests/lab-03/staff.queue.test.ts` | IT Queue retrieval, search, filter (status/priority/owner), sort, pagination | Vitest + Supertest | 13 | **PASSED** |
| **Server API** | `server/tests/lab-03/comments.notes.test.ts` | Public comments (all roles), Internal Notes (Staff/Admin only), append-only | Vitest + Supertest | 10 | **PASSED** |
| **Server API** | `server/tests/lab-03/admin.users.test.ts` | Admin user CRUD, active/inactive toggle, password reset, safety locks | Vitest + Supertest | 12 | **PASSED** |
| **Server DB**  | `server/tests/lab-03/database.test.ts` | User model, roles, seed verification, ticket relations | Vitest + Prisma | 7 | **PASSED** |
| **Client UI** | `client/tests/lab-03/Login.test.tsx` | Login screen modes, email/password validation, busy state, invalid alert | Vitest + RTL | 5 | **PASSED** |
| **Client UI** | `client/tests/lab-03/ChangePassword.test.tsx` | First-login password change screen, complexity validation, password matching | Vitest + RTL | 3 | **PASSED** |
| **Client UI** | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Queue table, search bar, filter dropdowns, badges, pagination controls | Vitest + RTL | 5 | **PASSED** |
| **Client UI** | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Operational controls, claim button, public comments vs internal notes tabs | Vitest + RTL | 5 | **PASSED** |
| **Client UI** | `client/tests/lab-03/UserManagement.test.tsx` | Admin user table, search/filter, create/edit drawer/modal, safety warnings | Vitest + RTL | 10 | **PASSED** |
| **Client UI** | `client/tests/lab-03/CommentsNotes.test.tsx` | Communications UI, tab restrictions, public comment submission, resolution flag | Vitest + RTL | 4 | **PASSED** |

**Total Lab 3 Automated Suite:** **12 test suites, 96 tests — 100% Passed Cleanly.**  
**Zero Regressions on Lab 2:** Server (54/54 passed) + Client (43/43 passed).

---

## 3. Acceptance Criteria Traceability Matrix

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Status |
|---|---|---|---|---|---|---|
| **API-01** | API | AC-01, BR-01 | Valid credentials login | HTTP 200; sets session cookie/token; returns user profile (id, email, fullName, role) | `server/tests/lab-03/auth.api.test.ts` | **PASSED** |
| **API-02** | API | AC-01, BR-01 | Invalid password login attempt | HTTP 401 Unauthorized; safe error message; no session established | `server/tests/lab-03/auth.api.test.ts` | **PASSED** |
| **API-03** | API | AC-01, BR-01 | Inactive user account login attempt (`isActive = false`) | HTTP 403 Forbidden; uninformative error; blocks session creation | `server/tests/lab-03/auth.api.test.ts` | **PASSED** |
| **API-04** | API | AC-02, BR-02 | Login with initial password (`mustChangePassword = true`) | HTTP 200; flags `mustChangePassword = true`; blocks business APIs | `server/tests/lab-03/auth.api.test.ts` | **PASSED** |
| **API-05** | API | AC-02, BR-02 | Password change fulfilling complexity rules | HTTP 200; updates password hash; clears `mustChangePassword` to false | `server/tests/lab-03/auth.api.test.ts` | **PASSED** |
| **API-06** | API | AC-02, BR-02 | Password change failing complexity or mismatch | HTTP 400 Bad Request; returns field validation details | `server/tests/lab-03/auth.api.test.ts` | **PASSED** |
| **API-07** | API | FR-03, BR-15 | Current user session retrieval (`GET /api/auth/me`) | HTTP 200 with authenticated user info; HTTP 401 if unauthenticated | `server/tests/lab-03/auth.api.test.ts` | **PASSED** |
| **API-08** | API | FR-03 | Logout endpoint (`POST /api/auth/logout`) | HTTP 200; clears session cookie; subsequent calls return 401 | `server/tests/lab-03/auth.api.test.ts` | **PASSED** |
| **API-09** | API | AC-03, BR-03 | Requester ticket creation with client `requesterId` injection | HTTP 201; backend ignores body `requesterId` and binds session user | `server/tests/lab-03/authorization.api.test.ts` | **PASSED** |
| **API-10** | API | AC-03, BR-03 | Requester queries ticket owned by another user | HTTP 404 Not Found (or 403); zero foreign ticket data leaked | `server/tests/lab-03/authorization.api.test.ts` | **PASSED** |
| **API-11** | API | AC-04, BR-04 | Requester requests Internal Notes endpoint | HTTP 403 Forbidden; zero internal note content returned | `server/tests/lab-03/authorization.api.test.ts` | **PASSED** |
| **API-12** | API | FR-12, BR-15 | Non-Admin requests Admin User endpoints | HTTP 403 Forbidden; blocked access | `server/tests/lab-03/authorization.api.test.ts` | **PASSED** |
| **API-13** | API | AC-05, FR-06 | IT Queue query with search parameter | HTTP 200; returns matching tickets across ticket number, summary, requester | `server/tests/lab-03/staff.queue.test.ts` | **PASSED** |
| **API-14** | API | AC-05, FR-06 | IT Queue query with Status and Priority filters | HTTP 200; returns filtered subset with accurate total count | `server/tests/lab-03/staff.queue.test.ts` | **PASSED** |
| **API-15** | API | AC-05, FR-06 | IT Queue query with unassigned filter (`ownerId=unassigned`) | HTTP 200; returns only tickets where `ownerId === null` | `server/tests/lab-03/staff.queue.test.ts` | **PASSED** |
| **API-16** | API | AC-05, FR-06 | IT Queue query pagination and sorting | HTTP 200; returns requested page with `totalPages` and sorted records | `server/tests/lab-03/staff.queue.test.ts` | **PASSED** |
| **API-17** | API | AC-06, FR-07 | IT Staff claims unassigned ticket (`PATCH /claim`) | HTTP 200; updates `ownerId` to authenticated staff user | `server/tests/lab-03/staff.queue.test.ts` | **PASSED** |
| **API-18** | API | AC-06, FR-07 | IT Staff reassigns ticket to another active IT Staff | HTTP 200; updates `ownerId` to target user ID | `server/tests/lab-03/staff.queue.test.ts` | **PASSED** |
| **API-19** | API | AC-06, BR-07 | IT Staff reassigns ticket to a Requester or Inactive user | HTTP 400 Bad Request; rejects invalid assignment | `server/tests/lab-03/staff.queue.test.ts` | **PASSED** |
| **API-20** | API | AC-07, BR-08 | IT Staff updates `itPriority` | HTTP 200; sets `itPriority`; preserves original `requestedPriority` | `server/tests/lab-03/staff.queue.test.ts` | **PASSED** |
| **API-21** | API | AC-08, BR-09 | Permitted status transition (`OPEN` -> `IN_PROGRESS`) | HTTP 200; updates status and sets timestamp | `server/tests/lab-03/staff.queue.test.ts` | **PASSED** |
| **API-22** | API | AC-08, BR-09 | Disallowed status transition (`CANCELLED` -> `OPEN`) | HTTP 400 Bad Request; rejects invalid state transition | `server/tests/lab-03/staff.queue.test.ts` | **PASSED** |
| **API-23** | API | AC-09, FR-05 | Requester indicates "Problem Appears Resolved" | HTTP 200; sets `problemAppearsResolved = true`; posts automated system comment | `server/tests/lab-03/comments.notes.test.ts` | **PASSED** |
| **API-24** | API | AC-10, BR-10 | Post Public Comment on ticket | HTTP 201 Created; persists comment with session author ID and timestamp | `server/tests/lab-03/comments.notes.test.ts` | **PASSED** |
| **API-25** | API | AC-10, BR-10 | Reject empty or whitespace-only Public Comment | HTTP 400 Bad Request; rejected | `server/tests/lab-03/comments.notes.test.ts` | **PASSED** |
| **API-26** | API | BR-04, FR-11 | IT Staff posts Internal Note on ticket | HTTP 201 Created; persists note with author and timestamp | `server/tests/lab-03/comments.notes.test.ts` | **PASSED** |
| **API-27** | API | AC-11, FR-12 | Admin retrieves user list with search & role filter | HTTP 200; returns users matching criteria with active states | `server/tests/lab-03/admin.users.test.ts` | **PASSED** |
| **API-28** | API | AC-12, FR-13 | Admin creates new user with initial password | HTTP 201 Created; hashes password; sets `mustChangePassword = true` | `server/tests/lab-03/admin.users.test.ts` | **PASSED** |
| **API-29** | API | BR-11 | Admin creates user with existing duplicate email | HTTP 409 Conflict; rejects duplicate email | `server/tests/lab-03/admin.users.test.ts` | **PASSED** |
| **API-30** | API | FR-14 | Admin edits user details and toggles `isActive` | HTTP 200; updates name, email, role, and active status | `server/tests/lab-03/admin.users.test.ts` | **PASSED** |
| **API-31** | API | AC-13, BR-12 | Admin attempts self-deactivation | HTTP 403 Forbidden; blocks self-deactivation with safety message | `server/tests/lab-03/admin.users.test.ts` | **PASSED** |
| **API-32** | API | AC-14, BR-13 | Admin attempts to deactivate sole remaining active Admin | HTTP 409 Conflict; blocks removing the last active Admin | `server/tests/lab-03/admin.users.test.ts` | **PASSED** |
| **API-33** | API | FR-15 | Admin resets user initial password | HTTP 200; hashes new temporary password; sets `mustChangePassword = true` | `server/tests/lab-03/admin.users.test.ts` | **PASSED** |
| **UI-01** | UI | AC-01 | Login Screen form validation & submission | Submits valid credentials, handles invalid credentials banner, disables button while submitting | `client/tests/lab-03/Login.test.tsx` | **PASSED** |
| **UI-02** | UI | AC-02 | Change Password Screen validation | Enforces min 8 chars, complexity rules, password matching, and submission flow | `client/tests/lab-03/ChangePassword.test.tsx` | **PASSED** |
| **UI-03** | UI | AC-05 | IT Staff Queue table & filter rendering | Renders Zen Green badges, filters by status/priority, updates on search debounce | `client/tests/lab-03/StaffTicketQueue.test.tsx` | **PASSED** |
| **UI-04** | UI | AC-06, AC-07 | IT Staff Ticket Detail operational controls | Renders Claim button, IT Priority dropdown, and permitted Status dropdown | `client/tests/lab-03/StaffTicketDetail.test.tsx` | **PASSED** |
| **UI-05** | UI | AC-10, BR-04 | Ticket Detail Comments vs Notes tab switching | Renders distinct tabs for Public Comments and Internal Notes for IT Staff | `client/tests/lab-03/StaffTicketDetail.test.tsx` | **PASSED** |
| **UI-06** | UI | AC-11, AC-12 | Admin User Management screen & modal | Renders user list, opens Create User modal, displays safety confirmation on deactivate | `client/tests/lab-03/UserManagement.test.tsx` | **PASSED** |

---

## 4. How to Execute Automated Tests

### 4.1. Run Server API & Integration Tests
```bash
npm --prefix server test -- tests/lab-03/
```
*Output: 6 test suites, 64 tests passed (100%).*

### 4.2. Run Client Component & UI Tests
```bash
npm --prefix client test -- tests/lab-03/
```
*Output: 6 test suites, 32 tests passed (100%).*

### 4.3. Run Full Regression Test Suite (Lab 1 + Lab 2 + Lab 3)
```bash
npm --prefix server test && npm --prefix client test
```
*Output: All 193 automated tests passing cleanly across server and client.*
