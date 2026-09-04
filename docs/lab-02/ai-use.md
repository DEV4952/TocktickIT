# Lab 2 — AI Use and Reflection

**LLM/agent used:** Antigravity (using Gemini 2.5 / Gemini 3.7)

---

## Selected key prompts (6–10)

| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | You are software engineer can you read all of lab 2 doc file and explain to me what I need to do step by step | Broke down Lab 2 specifications into 10 structured agile issues and established API/UI contracts. |
| 2 | How to design Ticket and Attachment Prisma models, relations, migration, and seed data for Lab 2 | Implemented Prisma schema, ran database migrations, and wrote idempotent seed scripts for categories and requesters. |
| 3 | How to create Requester context switcher with dropdown, active filter, and `x-requester-id` Axios headers | Created `RequesterContext`, local storage persistence, and header injection for requester identification. |
| 4 | How to build ticket creation API with collision-resistant number generator `TK-YYYYMMDD-XXXX` and validation | Implemented `POST /api/tickets` route, request schema validation, and unique sequence generation logic. |
| 5 | How to build Create Ticket and My Tickets UI using Zen Green theme without any emojis | Designed responsive React screens with clean badges, form validation, filter toolbars, and pagination. |
| 6 | How to handle attachment upload with 5MB limit, download streaming, and soft deletion with reason | Implemented Multer file upload backend endpoints and attachment management UI in Ticket Detail. |
| 7 | Fix mobile and iPad responsiveness where email overflows and navbar menu wraps awkwardly | Refactored CSS with `.text-break`, added bottom navigation bar for mobile, and tuned tablet grid breakpoints. |
| 8 | Add confirmation modal with optional reason input and success alert banner when removing attachments | Implemented confirmation modal dialogs and success feedback alerts on both Create Ticket and Ticket Detail screens. |
| 9 | Debug Vitest E2E workflow test failure where `app-shell` element was not found | Fixed default selection race condition in `RequesterSelectScreen` so automated E2E tests pass smoothly. |
| 10 | How to structure Lab 2 peer review records (`reviewer.md`), commit messages, and PR descriptions | Documented exact PR reviews, feedback exchanges, and verified release readiness with peer reviewer. |

---

## Reflection

In Lab 2, using an AI pair-programmer helped accelerate full-stack development, test automation, and responsive UI refinement. I started prompts by defining the engineering role with clear acceptance criteria from specifications, and when errors or test failures occurred, I fed the full terminal stack trace to quickly isolate root causes. For mobile and iPad responsiveness, I described specific layout defects to iteratively tune CSS utilities and grid layouts, and rather than trusting AI outputs blindly, I independently tested across multiple screen viewports and verified that all 106 automated tests passed cleanly before committing and opening PRs.

