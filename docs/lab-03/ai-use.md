# Lab 3 — AI Use and Reflection

**LLM/agent used:** Antigravity (powered by Gemini 3.7 Flash)

---

## Selected key prompts (6–10)

| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Decompose Lab 3 specification into structured GitHub Issues with scope, acceptance criteria, and DoD | Defined Sprint 3 Kanban board, milestones, and issue tracking breakdown. |
| 2 | Draft Lab 3 Engineering Contract, Specification, API spec, and Zen Green UI spec (Spec DD deliverable) | Established `docs/lab-03/specification.md`, `docs/lab-03/api-spec.md`, and `docs/lab-03/ui-spec.md`. |
| 3 | How to evolve Prisma schema for User roles, ticket workflow fields, and idempotent seed script | Generated migration adding User model, Role enum, itPriority, and seed data with 12 users and realistic tickets. |
| 4 | Implement bcrypt authentication, session cookie handling, and first-login password change enforcement | Built `POST /api/auth/login`, `POST /api/auth/change-password`, and first-login guard middleware. |
| 5 | Design server-side RBAC middleware and anti-tampering guards on ticket creation and ownership isolation | Added `requireAuth` and `requireRole` middleware ensuring zero data leaks and binding authenticated session user. |
| 6 | Build shared IT Staff Ticket Queue with search, status/priority filtering, pagination, and claim action | Created `StaffTicketQueueScreen.tsx` with Zen Green metrics cards, responsive table, and operational triage. |
| 7 | Implement Public Comments and role-restricted Internal Notes with requester problem resolution | Implemented comment and note APIs and UI tab isolation strictly hiding internal notes from Requesters. |
| 8 | Implement Administrator User Management with self-deactivation protection and last active admin safety rule | Built `UserManagementScreen.tsx` with user creation, status toggle, safety guards (BR-12/13), and password reset. |
| 9 | Develop and execute complete automated test suite across server APIs, client components, and zero regression | Wrote and executed 193 automated tests across Lab 2 and Lab 3 with 100% passing results and updated `docs/lab-03/tests.md`. |
| 10 | Refine Zen Green theme, remove emojis, and align Login error banner layout with specification mockup | Polished UI components, eliminated emojis in favor of clean typography, and styled error banner between password and submit button. |

---

## Reflection

### Specification-Agent Use
Working with the AI agent during the Spec DD phase allowed us to rigorously translate the customer's high-level requirements into formal, testable contracts. We established 15 Functional Requirements (FR-01 to FR-15) and 15 Business Rules (BR-01 to BR-15), along with an explicit Authorization Matrix before any application code was written. This prevented scope creep and ambiguous edge cases, especially regarding ownership isolation and the strict separation between public comments and confidential internal notes.

### Coding-Agent Use
The AI coding agent accelerated component construction and test authoring under the TDD discipline. In particular, developing test suites for RBAC authorization boundaries, state transition machines, and safety rules (such as preventing self-deactivation and preventing the removal of the last active administrator) ensured robust backend validation rather than relying on hidden frontend controls. The pair-programming workflow also helped rapidly identify subtle UI state issues (such as React unmounting during authentication errors) and maintain visual consistency with the Zen Green design system across desktop, tablet, and mobile views.
