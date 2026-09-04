# Lab 2 — AI Use and Reflection

**LLM/agent used:** Antigravity (using Gemini 2.5 / Gemini 3.7)

---

## Selected key prompts (6–10)

| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | You are software engineer can you read all of lab 2 doc file and explain to me what I need to do step by step | Broke down Lab 2 specifications into 10 structured agile issues and established API/UI contracts. |
| 2 | Implement Development Requester context switcher and persistence | Created `RequesterContext`, local storage persistence, and `x-requester-id` Axios interceptors. |
| 3 | Implement Ticket Creation API and collision-resistant ticket number generation | Developed `POST /api/tickets` endpoint, validation schemas, and unit tests. |
| 4 | Redesign frontend to Zen Green template with slide-based layout and remove all emojis | Refactored CSS design tokens, Bootstrap components, and replaced emoji icons with clean text badges. |
| 5 | Implement My Tickets dashboard with search, filter, sort, and pagination | Developed `GET /api/tickets` query engine and interactive client dashboard table. |
| 6 | Implement Ticket Detail & Diagnostic Attachment lifecycle API | Built multer upload, 5MB limit check, download streaming, and soft-delete endpoints. |
| 7 | Implement Requester Ticket Detail UI with attachment management and modal dialogs | Built `TicketDetailScreen` with upload, download, and soft-removal reason modal. |
| 8 | Implement automated test suite, E2E requester workflow, and Traceability Matrix | Created 106 automated tests covering Unit, API Integration, UI, Responsive, and E2E tiers. |

---

## Reflection

Using an AI pair-programmer in Lab 2 significantly accelerated full-stack development while enforcing strict discipline in test-driven development (TDD) and architectural design. Key takeaways include:

1. **Contract-First Development:** Defining exact schemas in `api-spec.md` and `ui-spec.md` before coding eliminated integration friction between React frontend and Express/Prisma backend.
2. **Strict Test Coverage:** Automating unit, integration, responsive, and E2E tests ensured that edge cases (ownership isolation, attachment size limits, soft-deletion access blocks) were guaranteed across iterations.
3. **Consistent UI Design System:** Standardizing the "Zen Green" design tokens maintained cohesive visual hierarchy, legible contrast, and clean layout without visual bugs across viewports.
