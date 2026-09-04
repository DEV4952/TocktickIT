# TokTickIT — IT Service Desk

TokTickIT is a full-stack IT Service Desk and ticketing web application designed for enterprise IT service requests, ticket tracking, diagnostic attachment management, and multi-user requester workflows.

Developed as part of **CPE 334 Introduction to Software Engineering in the Age of AI Agents**, KMUTT.

---

## Lab 2 — Requester-Facing Ticketing MVP

In Lab 2, TokTickIT implements the complete end-to-end Requester (end-user) experience using a **Development Requester** persona context switcher, **Zen Green Design System**, PostgreSQL database persistence, and a comprehensive automated test suite.

### Key Features (Lab 2)

- **Development Requester Context Switcher:** Simulated multi-user testing identity selection (`RequesterContext`), header injection (`x-requester-id`), and persistent session state.
- **Create Ticket Workflow:** Validated ticket creation with collision-resistant ticket number generation (`TK-YYYYMMDD-XXXX`), category and related system selectors, requested priority badges, and immediate attachment staging.
- **My Tickets Dashboard:** Paginated, searchable, filterable (by Category, Status, Priority), and sortable table with strict Requester ownership isolation.
- **Ticket Detail & Diagnostic Attachments:** Read-only ticket information view with live attachment management (up to 5 active files, max 5MB/file, JPG/PNG/WEBP/PDF), secure download streaming, and soft removal with reason capture.
- **Confirmation Modals & Feedback Alerts:** Interactive removal dialogs with reason recording and success feedback banners across screens.
- **Responsive Zen Green UI:** Optimized for Desktop (≥992px), Tablet/iPad (768px–991px), and Mobile (<768px) with mobile navigation bar, zero emojis, and accessible color tokens.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Bootstrap 5, Zen Green CSS Tokens |
| **Backend** | Node.js, Express.js, TypeScript, Multer, Prisma ORM |
| **Database** | PostgreSQL 14+ |
| **Testing** | Vitest, React Testing Library, Supertest, JSDOM (106 / 106 tests passing) |

---

## Documentation Index

All engineering contracts, specifications, test matrices, and sprint evidence are located in [`docs/lab-02/`](docs/lab-02/):

| Document | Path | Purpose |
|---|---|---|
| **Engineering Specification** | [`docs/lab-02/specification.md`](docs/lab-02/specification.md) | Sprint goal, scope, Functional Requirements (FR-01–09), Business Rules (BR-01–15), Acceptance Criteria (AC-01–09), DoD |
| **REST API Specification** | [`docs/lab-02/api-spec.md`](docs/lab-02/api-spec.md) | Endpoint contracts, request/response JSON schemas, error handling, query params, ownership rules |
| **UI Specification** | [`docs/lab-02/ui-spec.md`](docs/lab-02/ui-spec.md) | Zen Green design system tokens, screen layouts, responsive behavior, validation styles |
| **Automated Testing & Traceability** | [`docs/lab-02/tests.md`](docs/lab-02/tests.md) | Test strategy, planned test matrix, AC-to-test mapping, execution commands, 100% pass verification |
| **Visual QA Checklist** | [`docs/lab-02/visual-qa.md`](docs/lab-02/visual-qa.md) | Desktop, Tablet, and Mobile visual inspection checklist, layout audits, zero-emoji verification |
| **Peer Review Record** | [`docs/lab-02/reviewer.md`](docs/lab-02/reviewer.md) | Review records for 10 authored PRs and 8 partner PRs reviewed with `@yiiipunn` |
| **AI Use & Reflection** | [`docs/lab-02/ai-use.md`](docs/lab-02/ai-use.md) | 10 key prompts logged and reflective engineering summary |

---

## Getting Started

### 1. Prerequisites
- **Node.js:** `v18.0.0` or higher (LTS recommended)
- **npm:** `v9.0.0` or higher
- **PostgreSQL Database:** Running locally on port `5432`

---

### 2. Backend Setup & Database Migration

```bash
cd server
npm install

# Configure environment variables
cp .env.example .env
# Ensure DATABASE_URL in .env points to your PostgreSQL instance

# Run migrations and idempotent seed (Categories, Systems, Requesters)
npx prisma migrate dev
npm run prisma:seed

# Start backend dev server (port 3000)
npm run dev
```

---

### 3. Frontend Setup

```bash
cd client
npm install

# Configure environment variables
cp .env.example .env

# Start frontend dev server (port 5173)
npm run dev
```

---

## Running Automated Tests

TokTickIT includes 106 automated tests covering Unit, API Integration, UI Component, Responsive, and Full E2E workflows.

### Run All Backend Tests (Server)
```bash
cd server
npm test
```
*Executes 56 Supertest + Vitest integration tests for API endpoints, ownership isolation, ticket sequence generation, and attachment lifecycles.*

### Run All Frontend Tests (Client)
```bash
cd client
npm test
```
*Executes 50 Vitest + React Testing Library tests for screens, components, modals, responsive navigation, and full E2E requester workflow.*