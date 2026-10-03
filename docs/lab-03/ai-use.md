# Lab 3 — AI Use and Reflection

**LLM/agent used:** Antigravity (powered by Gemini 3.7 Flash)

---

## Selected key prompts (6–10)

| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | "Start with Issue #4 in task.md: implement secure authentication with bcrypt hashing, session management, and first-login password change lock." | Implemented full authentication lifecycle: bcrypt password hashing (10 salt rounds), secure HTTP-only cookies, and middleware enforcing mandatory first-login password changes (`mustChangePassword = true`) that strictly blocks access to business endpoints until complexity criteria are satisfied. |
| 2 | "Move to Issue #5: establish server-side RBAC middleware and enforce strict authorization boundaries." | Engineered robust server-side RBAC middleware (`requireAuth`, `requireRole`) across three distinct roles (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), eliminated client tampering by forcing server session user binding on ticket creation, and enforced HTTP 404 ownership isolation to prevent data leaks. |
| 3 | "Issue #6: Build the shared IT Staff Ticket Queue with multi-criteria filtering, operational triage, and ticket claiming." | Developed `StaffTicketQueueScreen.tsx` featuring real-time operational metric cards (Total, Unassigned, Assigned to Me, In Progress), debounced search, multi-filter dropdowns, one-click ticket claiming, and independent IT Priority triage that preserves the requester's original priority. |
| 4 | "Issue #7: Implement append-only Public Comments and role-restricted Confidential Internal Notes with requester resolution workflow." | Constructed backend endpoints and intuitive UI tabs separating public dialogue from confidential internal notes (returning HTTP 403 Forbidden for Requesters), and built the requester "Problem Appears Resolved" indication workflow with automated system audit logging. |
| 5 | "Issue #8: Construct the Administrator User Management console with critical safety rules preventing lockout." | Built `UserManagementScreen.tsx` incorporating user provisioning, status toggles, administrative password reset modals, and backend safety invariants preventing self-deactivation/demotion (HTTP 403) and protecting the last remaining active administrator from removal (HTTP 409). |
| 6 | "Ensure strict compliance with the Zen Green design language: eliminate all emojis across the system and verify accessible contrast." | Performed a full codebase audit to replace casual emojis with clean, professional SVG icons and typography. Redesigned role badges to achieve a verified 6.2:1 contrast ratio (WCAG 2.1 AA compliant) using soft violet (#ede9fe) and deep violet (#6d28d9) for Administrators. |
| 7 | "Investigate and resolve login error behavior: when entering incorrect credentials, the screen refreshes instead of displaying the invalid password alert banner." | Conducted root-cause analysis in `AuthContext.tsx` to resolve a React unmounting race condition during auth rejection. Repositioned a soft-red alert banner between the password field and submit button to match the visual specification precisely without causing layout shifts. |
| 8 | "Issue #9: Execute the complete automated testing suite across server API integration tests, client component tests, and verify zero regressions." | Configured Vitest and Supertest runners to execute 25 test suites comprising 193 automated tests (64 server integration tests, 32 client component tests for Lab 3, plus all Lab 1 and Lab 2 regression suites), achieving a 100% pass rate with zero flaky tests. |
| 9 | "Diagnose and fix tablet responsiveness: ticket tables on iPad Mini (768px) and iPad Air (820px) overflow horizontally and clip the Action column and dropdown labels." | Analyzed CSS grid breakpoints where Bootstrap `md` forced desktop tables onto portrait tablets; upgraded the breakpoint to `lg` (`d-none d-lg-block` / `d-lg-none`) to seamlessly render touch-friendly Zen Green cards, and restructured filter columns to eliminate text truncation on select inputs. |
| 10 | "Synchronize peer review records in reviewer.md with authentic GitHub PR comments and partner review dialogue." | Developed an automated Node.js script querying the GitHub REST API across both repositories (`@DEV4952` and `@yiiipunn`), pulling verbatim review approvals and conversational responses across all 10 issues to guarantee transparent, auditable peer review documentation. |

---

## Reflection

### Specification-Agent

I used AI to define the project specifications and transform the requirements from the given task into **10 individual issues**. During this process, we established **15 Functional Requirements (FR-01 to FR-15)** and **15 Business Rules (BR-01 to BR-15)**, along with a clearly defined **Authorization Matrix**, before starting the application implementation. This process helped prevent **scope creep** and reduce ambiguity in edge cases, particularly regarding **ownership isolation** and the strict separation between **public comments** and **confidential internal notes**.

### Coding-Agent

AI helped accelerate the development of various application components and the creation of test suites following the **TDD (Test-Driven Development)** approach. In particular, I used AI to develop tests for **RBAC authorization boundaries**, **state transition machines**, and security rules, such as preventing users from **deactivating their own accounts (self-deactivation)** and preventing the removal of the **last active administrator**. These tests helped ensure that the backend enforced authorization and validation robustly, rather than relying solely on frontend controls.
