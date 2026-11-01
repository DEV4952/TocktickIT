# TokTickIT — IT Service Desk

TokTickIT is an enterprise full-stack IT Service Desk and ticketing web application designed for IT service requests, ticket tracking, diagnostic attachment management, multi-role access control, and operational triage.

Developed as part of **CPE 334 Introduction to Software Engineering in the Age of AI Agents**, KMUTT.

---

## Lab 3 — User Management, Authentication, RBAC & Operational Triage

In Lab 3, TokTickIT transitions from simulated identities to a production-grade multi-role application featuring secure authentication, role-based access control (RBAC), shared IT staff queue management, confidential internal notes, and administrative safety safeguards.

### Key Features (Lab 3)

- **Secure Authentication & Session Management:**
  - Password hashing with bcrypt, secure HTTP-only session cookies, and bearer token support.
  - First-login mandatory password change enforcement (`mustChangePassword = true`) blocking access to normal business APIs until complexity requirements (min 8 chars, mixed case, number, symbol) are met.
- **Role-Based Access Control (RBAC):**
  - Explicit three-role architecture: `REQUESTER`, `IT_STAFF`, and `ADMINISTRATOR`.
  - Server-side middleware (`requireAuth`, `requireRole`) enforcing zero data leakage.
  - Anti-tampering protection on ticket creation, binding ticket ownership strictly to the authenticated session user.
  - Ownership isolation preventing Requesters from accessing foreign tickets (HTTP 404).
- **IT Staff Ticket Queue & Operational Triage:**
  - Shared IT queue with real-time operational metrics cards (Total, Unassigned, Assigned to Me, In Progress).
  - Multi-criteria filtering (Status, Priority, Owner, Category) with debounced search.
  - One-click ticket claiming and staff reassignment with validation preventing assignment to non-staff.
  - Independent IT Priority triage preserving the requester's original requested priority.
  - Enforced status state machine preventing invalid transitions (e.g. `NEW` -> `RESOLVED` or transitions from terminal `CANCELLED`).
- **Ticket Communications (Public Comments vs. Confidential Internal Notes):**
  - Public comments visible to both requesters and staff.
  - Role-restricted Internal Notes strictly inaccessible to Requesters (HTTP 403) with distinct visual confidentiality indicators.
  - Requester "Problem Appears Resolved" indication workflow posting automated system comments.
- **Administrator User Management & Safety Guards:**
  - Dedicated User Management Console for provisioning and updating accounts.
  - Self-deactivation and self-demotion safety blocks (HTTP 403).
  - Last active administrator protection rule preventing lockout (HTTP 409).
  - Administrative password reset flow generating initial credentials with mandatory change flag.
- **Zen Green Responsive Polish & Tablet Optimizations:**
  - Full WCAG AA contrast compliance (6.2:1 contrast ratio on role badges).
  - Native **Zen Green Card View** on Tablet (iPad Mini 768px, iPad Air 820px portrait) and Mobile (< 768px), preventing table horizontal clipping and preserving immediate access to Action buttons.

---

## Documentation Index

### Lab 3 Documentation ([docs/lab-03/](docs/lab-03/))

| Document | Path | Purpose |
|---|---|---|
| **Engineering Specification** | [`docs/lab-03/specification.md`](docs/lab-03/specification.md) | Sprint 3 goal, scope, Functional Requirements (FR-01–15), Business Rules (BR-01–15), Acceptance Criteria (AC-01–14), Authorization Matrix, Definition of Done |
| **REST API Specification** | [`docs/lab-03/api-spec.md`](docs/lab-03/api-spec.md) | Endpoint contracts for Auth, Staff Queue, Triage, Notes, Comments, and Admin User APIs with error schemas |
| **UI Specification** | [`docs/lab-03/ui-spec.md`](docs/lab-03/ui-spec.md) | Zen Green design tokens, screen contracts (UI-01 to UI-06), role badges, and component layouts |
| **Development Credentials** | [`docs/lab-03/development-credentials.md`](docs/lab-03/development-credentials.md) | Seed user accounts, default passwords, and persona testing reference |
| **Automated Testing & Traceability** | [`docs/lab-03/tests.md`](docs/lab-03/tests.md) | TDD test matrix mapping AC-01–14 to 33 API/UI test suites, execution commands, and DoD checklist |
| **Visual QA Checklist** | [`docs/lab-03/visual-qa.md`](docs/lab-03/visual-qa.md) | Multi-viewport responsive audit (1440px, 768px iPad Mini, 820px iPad Air, 375px), WCAG AA badge contrast audit |
| **Peer Review Record** | [`docs/lab-03/reviewer.md`](docs/lab-03/reviewer.md) | Formal peer review log for 10 authored PRs (#38, #48–#56) with review comments and partner approvals |
| **AI Use & Reflection** | [`docs/lab-03/ai-use.md`](docs/lab-03/ai-use.md) | 10 key prompts logged and reflective engineering summary across Spec-Agent and Coding-Agent workflows |

### Lab 2 Documentation ([docs/lab-02/](docs/lab-02/))
Refer to [`docs/lab-02/`](docs/lab-02/) for earlier Sprint 2 requester ticketing deliverables.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Bootstrap 5, Zen Green CSS Tokens |
| **Backend** | Node.js, Express.js, TypeScript, Multer, bcryptjs, Prisma ORM |
| **Database** | PostgreSQL 14+ |
| **Testing** | Vitest, React Testing Library, Supertest, JSDOM (193 / 193 tests passing, 100%) |

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

# Run migrations and idempotent seed (Users, Roles, Categories, Systems, Tickets)
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

Lab4 hardening verified 443 backend tests and 220 frontend tests on the feature branch; this is not final-main release acceptance. Current results and limitations are in [tests.md](docs/lab-04/tests.md#release-verification). Browser evidence and accessibility findings are in [ui-spec.md](docs/lab-04/ui-spec.md#lab410-visual-accessibility-audit).

### Safe full backend regression (Windows/PowerShell)

Legacy Labs2-3 tests modify fixed seed accounts and delete fixture data. They are blocked on development/production databases. Use a disposable PostgreSQL cluster; the helper requires locally installed PostgreSQL binaries (default PostgreSQL18 path, overridable with -PostgresBin).

```powershell
# Repository root; install root/server/client dependencies first.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/lab4-test-environment.ps1 -Action Server
```

The helper creates/reuses only the verified workspace QA cluster, bound to 127.0.0.1:55439, migrates and seeds lab4_qa_test, then runs all backend tests. It checks the actual data_directory; the Vitest guard checks URL, explicit opt-in and database marker before importing legacy suites. It never resets/truncates the development database. Generated QA data stays ignored under artifacts/lab-04/e2e-results/. Do not expose this trust-authentication QA cluster on a network.

### Frontend, real browser E2E and hardening audit

```powershell
npm.cmd --prefix client run test
$env:E2E_DATABASE_URL = 'postgresql://lab4qa@127.0.0.1:55439/lab4_qa_test'
$env:E2E_BROWSER_CHANNEL = 'chrome'
$env:E2E_RUN_LABEL = 'local-e2e'
npm.cmd run test:e2e:lab4
$env:E2E_RUN_LABEL = 'local-qa'
npm.cmd run test:qa:lab4
npm.cmd run typecheck:e2e:lab4
npm.cmd --prefix server run build
npm.cmd --prefix client run build
# Stop only the workspace disposable QA server when finished:
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/lab4-test-environment.ps1 -Action Stop
```

The three Lab4.9 specs stay separate from the Lab4.10 audit. QA covers 375x812, 768x1024 and 1440x900 with real keyboard and axe checks; its explicitly injected service failures are visual safe-failure tests, not mocked evidence of backend correctness. Use installed Chrome, or install Playwright Chromium and omit E2E_BROWSER_CHANNEL. Do not run other DB-writing suites concurrently with browser checks of global queue counts.
