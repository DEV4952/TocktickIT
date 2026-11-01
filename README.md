# TokTickIT - IT Service Desk

TokTickIT is a full-stack IT service desk application developed for **CPE 334 Introduction to Software Engineering in the Age of AI Agents, KMUTT**. Lab 4 extends the earlier ticketing, authentication and staff workflows with Actions Taken, role dashboards, concurrency protection and final hardening.

## Current Features

- **Requester workspace:** create and track owned Tickets, manage diagnostic attachments, read Public Comments and Actions Taken, and indicate that a problem appears resolved without changing its formal status.
- **IT Staff workspace:** shared searchable/filterable Ticket queue, claiming/reassignment, independent IT Priority, Public Comments and confidential Internal Notes.
- **Actions Taken:** create/edit, assign active Staff/Admin users, start/complete/cancel, conditional follow-up validation, immutable authenticated recorder, optimistic concurrency and append-only change history. Requesters have owned-Ticket read access only.
- **Ticket workflow:** backend-enforced transitions across NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED and CANCELLED; stale changes require explicit refresh.
- **Staff/Admin Dashboard:** operational Ticket metrics, recent Tickets, real queue drill-downs, Create/Search/My Queue Quick Actions and My Actions Taken totals/statuses/latest five records. Action summaries use the original recorder, not Ticket ownership or assignment.
- **Requester Dashboard:** owned metrics/recent Tickets and Attention Required for owned WAITING_FOR_REQUESTER Tickets, with matching filtered-list navigation.
- **Administrator workspace:** user provisioning, account updates and password reset, mandatory first-login password change, self-deactivation/demotion and last-active-admin safeguards.
- **Zen Green UI:** responsive layouts, loading/empty/error/conflict feedback, keyboard controls and accessibility fixes verified within the documented audit scope.

## Technology

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 6, Bootstrap 5, Zen Green CSS |
| Backend | Node.js, Express 4, TypeScript, Prisma 6, Multer, bcryptjs |
| Database | PostgreSQL |
| Automated verification | Vitest, Supertest, React Testing Library, JSDOM, Playwright, axe-core |

Dependency versions are pinned by the root, server and client lockfiles. This is a course development application; the recorded checks are not a production-readiness or complete accessibility certification.

## Documentation

### Lab 4

| Document | Contents |
| --- | --- |
| [specification.md](docs/lab-04/specification.md) | Scope, numbered requirements/business rules, authorization, transitions, metrics, migration decisions and Product Definition of Done |
| [api-spec.md](docs/lab-04/api-spec.md) | Actions Taken, workflow and dashboard API contracts, validation, ownership and conflict behavior |
| [ui-spec.md](docs/lab-04/ui-spec.md) | Screen contracts, Zen Green conventions, visual/accessibility checklist and screenshot inventory |
| [tests.md](docs/lab-04/tests.md) | Planned tests, acceptance traceability, actual test paths, commands and recorded results |
| [reviewer.md](docs/lab-04/reviewer.md) | Ten authored and ten partner PRs, actual review statements, replies, dates, revisions and approvals |
| [ai-use.md](docs/lab-04/ai-use.md) | AI tools, ten selected prompt summaries and reflection |
| [release-verification.md](docs/lab-04/release-verification.md) | Audit environment, findings/fixes, complete regression matrix, handout grading audit and remaining release conditions |

Earlier deliverables remain available in [Lab 1](docs/lab-01/), [Lab 2](docs/lab-02/) and [Lab 3](docs/lab-03/). The seventh Lab 4 document, release-verification.md, was explicitly approved for the hardening report.

## Repository Layout

```text
client/                         React UI, Vite configuration and Labs 1-4 component tests
server/src/                     Express application, routes, services and authentication
server/prisma/                  PostgreSQL schema, additive migrations and idempotent seed
server/tests/                   Labs 1-4 unit/API/integration tests and disposable-DB guard
e2e/lab-04/                     Real-backend browser journeys, fixtures and visual/axe audit
scripts/                        Seed verification, disposable QA environment and screenshot collection
docs/lab-01/ ... docs/lab-04/     Engineering contracts, test plans and submission records
artifacts/lab-04/screenshots/    Selected Staff/Requester/Actions Taken evidence
```

## Local Setup (Windows / PowerShell)

Commands below start in the repository root unless a directory change is shown. Node.js **20+** is required by the installed Playwright package; verification used Node 24.14.0 and npm 11.9.0. An existing local PostgreSQL database and its credentials are required for development. The disposable regression helper separately expects PostgreSQL binaries, with a default PostgreSQL 18 installation path.

### 1. Install dependencies and configure the development database

```powershell
npm.cmd ci --include=dev
npm.cmd --prefix server ci --include=dev
npm.cmd --prefix client ci --include=dev

# Preserve an existing local configuration.
if (!(Test-Path -LiteralPath server/.env)) {
    Copy-Item -LiteralPath server/.env.example -Destination server/.env
}
```

Edit `server/.env` so DATABASE_URL points to the intended local development database. [server/.env.example](server/.env.example) contains an example, not proof that the database/user already exist. Do not commit the real environment file.

### 2. Apply existing migrations, generate the client and seed

Review the SQL under [server/prisma/migrations](server/prisma/migrations/) before applying it, particularly when reusing earlier-lab data.

```powershell
Push-Location server
npx.cmd prisma validate
npx.cmd prisma migrate deploy
npx.cmd prisma migrate status
npx.cmd prisma generate
npm.cmd run prisma:seed
Pop-Location

# Read-only check of seeded Ticket -> Actions Taken examples and relations:
npm.cmd run check:actions
```

The seed is idempotent and includes Tickets with zero, one and multiple Actions Taken, all eight Ticket statuses, the four priorities and assigned/unassigned examples. It preserves existing credentials, account state and Ticket workflow changes. Repeating the seed therefore does not restore manually changed passwords or statuses.

These commands apply committed migrations without a database reset. If authoring a new migration requires migrate dev and it fails with P3014, the database role lacks shadow-database permissions; the existing Lab 4 migrations were applied with migrate deploy. Do not resolve that error by resetting earlier-lab data.

### 3. Start the API and web UI in separate terminals

**Terminal A - backend**

```powershell
npm.cmd --prefix server run dev
```

**Terminal B - frontend**

```powershell
npm.cmd --prefix client run dev
```

Open [http://localhost:5173](http://localhost:5173). API health is available at [http://localhost:3000/api/health](http://localhost:3000/api/health). The frontend proxies /api to port3000 by default. For another backend port, set PORT in its terminal and VITE_API_PROXY_TARGET in the frontend terminal before starting the corresponding process.

If tsx/vite is not recognized, check that dependency installation completed with development dependencies included. If npm ci reports EPERM on esbuild.exe, stop the corresponding running dev server before reinstalling.

### Development demo accounts

The initial password for newly seeded demo accounts is **Password123!**. These are synthetic local-development accounts; existing accounts retain any password/state already changed.

| Role | Example account |
| --- | --- |
| Requester | alex.rivera@toktick.it |
| IT Staff | michael.brown@toktick.it |
| Administrator | admin@toktick.it |

See [seed.ts](server/prisma/seed.ts) and the [earlier development account reference](docs/lab-03/development-credentials.md) for additional personas, including inactive and mandatory-password-change cases.

## Automated Verification

### Recorded results

The following were verified on the Lab 4 feature implementation later committed as `57326a9` and merged into lab4-staging by PR #78. They are **not final-main test results**. Documentation-only edits on branch doc do not imply a new test run.

| Check | Recorded result |
| --- | --- |
| Backend, Labs 1-4 | 443/443 tests, 20 files |
| Frontend, Labs 1-4 | 220/220 tests, 20 files |
| Real-backend Lab 4 E2E | 4/4 journeys across three specs |
| Visual / keyboard / axe audit | 3/3 viewports: 375x812, 768x1024, 1440x900 |
| Builds and E2E/QA typecheck | Passed |

The audit retained 48 viewport/state screenshots in addition to four earlier desktop images. Earlier failed/interrupted debug runs and their corrections are disclosed in [release-verification.md](docs/lab-04/release-verification.md). No lint script is currently configured. Chrome viewport/axe checks do not establish full cross-browser, physical-device or assistive-technology coverage.

### 1. Full backend regression on a disposable database

Legacy Labs 2-3 tests modify fixed seed accounts and delete test data. Their setup is blocked unless the disposable target, explicit opt-in and database marker match. Do not run them against development.

```powershell
# Creates/starts only the workspace QA cluster, migrates/seeds it and runs backend tests.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/lab4-test-environment.ps1 -Action Server
```

The helper uses `127.0.0.1:55439/lab4_qa_test` and verifies the actual PostgreSQL data_directory. Its default binaries are `C:\Program Files\PostgreSQL\18\bin`; use `-PostgresBin` to supply another installation path. `-Action Start` prepares the environment without running tests. Generated QA database files stay ignored under artifacts/lab-04/e2e-results/. Local trust authentication is restricted to this disposable loopback cluster.

### 2. Frontend regression and browser suites

Run after preparing the disposable environment above. Avoid other database-writing tests or manual edits while browser checks compare global Staff metrics.

```powershell
npm.cmd --prefix client run test

$env:E2E_DATABASE_URL = 'postgresql://lab4qa@127.0.0.1:55439/lab4_qa_test'
$env:E2E_BROWSER_CHANNEL = 'chrome'
$env:E2E_RUN_LABEL = 'local-e2e'
npm.cmd run test:e2e:lab4

$env:E2E_RUN_LABEL = 'qa-submission'
npm.cmd run test:qa:lab4
node scripts/collect-lab4-screenshots.cjs qa-submission

npm.cmd run typecheck:e2e:lab4
npm.cmd --prefix server run build
npm.cmd --prefix client run build

# Stop only the workspace disposable PostgreSQL cluster when finished.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/lab4-test-environment.ps1 -Action Stop
```

The example uses installed Chrome. To use Playwright Chromium instead, run `npx.cmd playwright install chromium` and remove E2E_BROWSER_CHANNEL from the terminal environment. The browser scripts own API3109/web5189 and refuse to reuse occupied endpoints. Their ports can be overridden with E2E_API_PORT/E2E_WEB_PORT. [.env.e2e.example](.env.e2e.example) documents optional ignored local configuration.

The original E2E script runs only actions-taken-flow.spec.ts, ticket-resolution.spec.ts and dashboards.spec.ts against real APIs. `test:e2e:lab4:headed` runs those journeys with a visible browser. `test:qa:lab4` runs the separate release-audit.spec.ts, including explicitly injected dashboard503 responses and a real stale409; these are labelled fault scenarios, not hidden runtime failures.

Reports are generated under `artifacts/lab-04/e2e-report/<label>/` and `artifacts/lab-04/e2e-results/<label>/`. For example:

```powershell
npx.cmd playwright show-report artifacts/lab-04/e2e-report/qa-submission
```

The screenshot collector accepts only a fully passing three-viewport audit. If a run is forcibly interrupted, inspect any leftover UUID fixtures in the disposable environment and clean only verified fixture IDs; do not clear development data or relax category-count tests. Runtime reports, traces, authentication states and local environment files remain excluded from Git.

## Suggested Demonstration

1. Sign in as Requester and inspect Dashboard metrics and Attention Required; create/open a Ticket and use its Public Comments/attachments.
2. Sign in separately as Staff, open the Ticket Queue and claim/assign a Ticket. Add/edit an Action with follow-up notes, reassign it, then exercise permitted Action transitions and history.
3. Compare Staff My Actions Taken with the original recorder. Requester views of the same Ticket remain read-only for Actions Taken.
4. Submit Requester advisory resolution feedback and verify that formal Ticket status stays unchanged. Staff then follows permitted resolution/closure transitions. Inspect stale-update feedback and explicit reload behavior.
5. Inspect Administrator user-management safeguards and the three viewport evidence sets in [screenshots](artifacts/lab-04/screenshots/).

## Branch and Submission Status

Lab 4 implementation PRs [#69-#78](docs/lab-04/reviewer.md) are merged into lab4-staging. The current doc branch is for documentation updates. Feature/documentation PRs target lab4-staging; release integration into main requires explicit authorization and normal review/protection checks. Do not substitute master or infer final release completion from staging merges.

Before final submission, record tests on the actual merged main revision, confirm the student's reflection, verify final review and Project/Kanban evidence, and assemble the single readable PDF with `Answer Part 1` through `Answer Part 9` and working links. See the [handout grading audit](docs/lab-04/release-verification.md) for completed work and pending conditions.
