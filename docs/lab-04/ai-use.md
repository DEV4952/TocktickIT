# Lab 4 - AI Use and Reflection

## 1. AI Tools and Scope

**AI assistant:** OpenAI Codex, identified in this session as part of the GPT-6 family. The exact model variant was not recorded.

AI assisted with requirements analysis, Prisma schema and migrations, idempotent seed data, REST APIs, authorization, Actions Taken interfaces, Ticket workflow, role dashboards, automated tests, visual and accessibility checks, and documentation.

The supporting tools included PostgreSQL and Prisma, Vitest and Supertest, React Testing Library, Playwright with Chrome, axe-core, Git, read-only GitHub review retrieval, and inspection of the supplied Lab 4 PDF. The PDF was treated as a requirements reference, not permission to merge branches or submit work.

## 2. Selected Key Prompts

These are summaries of ten actual requests available in the development conversation. They are not presented as verbatim quotations or as a complete conversation transcript.

| No. | Selected prompt summary | Use of the response and verification |
| --- | --- | --- |
| 1 | Implement Lab4.3: add the ActionTaken data model, an additive migration, and an idempotent seed while preserving Labs 1-3 data. Never reset the database. | Extended the existing database structure and documented migration and repeated-seed checks. Used migrate deploy when migrate dev was blocked by shadow-database permissions. |
| 2 | Implement Lab4.4: create Actions Taken APIs with backend authorization, immutable performer identity, follow-up validation, and automated tests. | Enforced Staff/Admin writes, Requester ownership restrictions, authenticated performer assignment, and validation of the final merged update state. Tested roles, invalid inputs, missing records, and relationship protection. |
| 3 | Implement Lab4.5: provide the Actions Taken list and create/edit modal, and explain how to run and inspect the local application. | Added Staff editing and Requester read-only views. Investigated local dependency problems using terminal output. The user confirmed that Actions Taken became visible; this was not treated as full acceptance of every UI state. |
| 4 | Implement Lab4.6: enforce the Ticket transition matrix and distinguish Requester resolution feedback from formal IT Staff resolution. | Kept the Requester indication advisory, enforced permitted transitions on the backend, and tested stale-update conflicts and status persistence. |
| 5 | Implement Lab4.7 and compare the implementation with the grading rubric; add the missing Actions Taken assignment and lifecycle behavior. | Added assignment, start/complete/cancel behavior, concurrency protection, and append-only history. Documented metric definitions and the limitations of the recentlyResolved calculation. |
| 6 | Implement Lab4.8: build role dashboards and check the expected Create Ticket, Search Tickets, and My Queue Quick Actions. | Connected dashboard cards and navigation to real list filters. Tested ownership, account changes, loading, empty states, and safe failures. |
| 7 | Implement Lab4.9: write three real-backend Playwright specs, run them together, independently, and repeatedly, and use safe fixture cleanup. | Verified Actions Taken, Ticket resolution, and dashboard journeys. Corrected datetime serialization and locator assumptions, and reported the earlier failures separately from final passing runs. |
| 8 | Consolidate the Lab 4 Markdown documents without losing verification records, and capture screenshots from the running application. | Moved verification records into the main documents, repaired references, and captured browser evidence using synthetic fixtures. The later addition of release-verification.md was explicitly approved by the user. |
| 9 | Implement Lab4.10: audit responsive layout, accessibility, runtime errors, and complete regression safely; prepare release evidence without merging. | Created a disposable PostgreSQL test cluster and a guard for legacy database tests. Fixed confirmed contrast, semantics, keyboard/focus, and favicon issues. Collected real GitHub review records without inventing approvals. |
| 10 | Close the remaining dashboard rubric gaps: show current-user Actions Taken and Requester attention-required Tickets, and document AI use. | Added recorder-scoped Action totals/statuses/recent items and an owned WAITING_FOR_REQUESTER list with real drill-down. Added API, UI, browser, and viewport checks. |


## 3. My Reflection

### Specification-Agent Use

I asked the AI to inspect the existing repository and requirements before making changes and to compare the implementation with the actual Lab 4 handout. This made the specification useful as an engineering contract rather than just a list of screens. Important examples were separating the original Action recorder from the assignee and Ticket owner, defining permitted Ticket transitions, and giving attention-required Tickets a precise ownership and status rule. These definitions allowed the API, UI, database queries, and tests to use the same meaning.

### Coding-Agent Use

The AI helped develop the implementation and automated checks, but its first output was not sufficient evidence of correctness. The recorded work included browser-test input and locator problems, contrast and ARIA findings, keyboard/focus issues, and a missing favicon. Each required investigation and another relevant check. Independent SQL expectations were especially useful for dashboard verification because comparing the UI only with the same dashboard response would not independently validate the calculation.