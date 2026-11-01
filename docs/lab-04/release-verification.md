# Lab4.10 Release verification

## Revision, environment and boundaries

Audit date: 2026-11-01. Active branch: `feature/lab4-visual-qa`. Base: `e1c98ca` (merged Lab4.9 PR #77). Results apply to the uncommitted hardening working tree, **not main**. Source fingerprint: `8363411911819f415f852103ca0ef5dc5320a22d477256e8dcb84a2094d96d55` (SHA-256 across 53 application/audit/configuration files; local inventory metadata in ignored QA results).

Fetched remote and confirmed Labs4.3-4.9 are present in lab4-staging before creating this branch. `origin/HEAD` points to `origin/main`; `origin/master` also exists. No branch was renamed, no main branch was created, and no release merge was performed.

Windows/PowerShell; Node24.14.0, npm11.9.0, Chrome156.0.8078.76, Playwright1.63.0, axe-core4.14.0; PostgreSQL 18 disposable cluster owned by the current OS user, bound to `127.0.0.1:55439`; database `lab4_qa_test`, user `lab4qa`, workspace data under ignored `artifacts/lab-04/e2e-results/disposable-postgres`. Application servers run on API3109/web5189; browser is installed Chrome in headless mode. Development port5432 is not the regression target.

The supplied handout was inspected. Page9-10 section12 defines the test/document increment; Parts3/9 require complete regression and visual/accessibility evidence. ui-spec.md specifies WCAG2.1 AA; axe checks include WCAG2/2.1 AA plus available WCAG2.2 AA rules. This is a focused audit, not certification of complete accessibility.

The user explicitly approved adding this seventh Markdown document, superseding the earlier six-document limit.

## Findings and fixes

| Finding | Focused fix | Verification |
| --- | --- | --- |
| Small green/muted text and outline controls missed contrast on light surfaces; dim nav text failed on dark green | Reuse darker Zen text tokens and lighter nav text | Real axe contrast checks on all audited viewports |
| Dashboard card visible text/delta did not match overridden accessible name | Separate delta description from the actionable link; keep label/count name and visible separator | Axe label-content-name checks; existing drill-down API/UI/E2E assertions retained |
| Brand/account controls used non-keyboard div/span buttons | Native buttons, expanded state, Escape handling; wrapping navbar | Real Enter/Escape checks; full UI regression |
| Assignee select omitted from modal focus trap; background interactive during dialog; focus clearance in the scrolled last field needed explicit verification | Include select and make root inert while portal dialog is active; restore background/focus; reserve scroll margin/padding for focused fields | Tab/Shift+Tab, select-to-date order, cycle boundaries, Escape and opener restoration |
| Communication list claimed tablist but lacked valid tab semantics | Named group of pressed buttons, preserving existing content switching | Real axe and existing communication tests |
| Triage owner/priority selects lacked programmatic labels; conflict/success feedback was not live | Associate labels/IDs, alert/status roles; add semantic Ticket heading | Real scan, keyboard workflow and stale-update 409 feedback |
| Browser requested nonexistent favicon.ico | Add real Zen favicon.svg and link it | Runtime monitor now rejects unknown console errors successfully |
| Legacy regression could mutate seed users/delete fixtures on development | Fail during Vitest setup before importing legacy suites unless disposable URL, opt-in and DB marker match | Full suite on isolated cluster; negative guard probe rejected with zero test bodies collected |

No API policy, schema or migration changes were required. Validation and conflict assertions were retained. Earlier debug runs exposed the above findings, a conflict-message wording assertion, dev duplicate-request accounting, a transient JSX edit error, and an over-strict assumption that native focus scrolls the complete textarea (it only guarantees caret visibility). The final scroll check explicitly brings the entire field into view and retains the non-overlap assertion. Intermediate runs were interrupted during editing and while diagnosing a loading-gate wait; they are not final evidence. The final loading probe waits for DOMContentLoaded and always releases its paused real request in finally. Final passing reports are listed below; no failed run is silently represented as a pass.

## Visual, keyboard and accessibility coverage

| Screen/state | 375x812 | 768x1024 | 1440x900 |
| --- | --- | --- | --- |
| Staff Dashboard populated/loading/safe-failure/drill-down | Passed | Passed | Passed |
| Requester Dashboard empty/populated/safe-failure/forbidden navigation | Passed | Passed | Passed |
| Ticket Detail: zero actions, multiple long actions, Requester read-only | Passed | Passed | Passed |
| Create Action: keyboard focus, validation, scrollable body/fixed footer | Passed | Passed | Passed |
| Edit Action with long values | Passed | Passed | Passed |
| Ticket workflow controls, real stale 409, reload/unlock | Passed | Passed | Passed |
| Document horizontal overflow, long titles/notes/names, native navigation | Passed | Passed | Passed |
| Axe scans: empty/populated dashboards, action list/read-only and create modal | Passed | Passed | Passed |

Additional 320px CSS viewport reflow and a twelve-digit synthetic metric typography probe passed. The probe restores real values before screenshots; it does not assert that such counts exist in the database. Desktop/mobile/tablet are Chrome viewport emulations, not physical iPad/phone tests. Agent-driven real key presses are distinct from a human/assistive-technology-user assessment. Actual browser zoom and screen-reader testing remain unperformed.

Full-page screenshots can be taller than the viewport; modal screenshots are component crops at the stated viewport. Grey blocks are intentional privacy masks over unrelated global recent/queue data and assignee choices, not missing content or layout defects. Dashboard 2090 dates are synthetic deterministic all-time recent fixtures. Four older desktop screenshots remain as historical Lab4.9 evidence; the 48 viewport/state-named files are the final hardening set.

See [ui-spec.md](ui-spec.md#lab410-visual-accessibility-audit) for the screenshot inventory and checklist.

## Console and runtime

Audit listeners cover console errors, page exceptions, HTTP failures and request failures. Successful final runs have no unexplained errors. The suite deliberately injects dashboard503 responses to inspect safe-failure/retry UI, and generates one actual409 through a stale version. All events/URLs are retained in runtime attachments; duplicate controlled dashboard requests from auth restoration/dev execution are recorded, not hidden. Unexpected HTTP endpoints/statuses, other console errors, uncaught exceptions and non-navigation request failures fail the audit. Navigation ERR_ABORTED events, when present, are retained and classified. No logging is disabled.

Fault injection is limited to the visual hardening suite; the original Lab4.9 suite still uses real successful backend requests with no application API mocks. Global Staff counts and Requester ownership are independently checked there.

## Full regression matrix and actual results

| Lab / layer | Location | Result |
| --- | --- | --- |
| Lab1 backend health/categories | server/tests/lab-01 | 2 passed |
| Lab2 backend validators/schema/requesters/ticket create/list/attachments | server/tests/lab-02 | 54 passed |
| Lab3 backend auth/RBAC/DB/staff queue/detail/comments/notes/admin | server/tests/lab-03 | 64 passed |
| Lab4 backend Actions Taken/lifecycle/workflow/dashboards | server/tests/lab-04 | 323 passed |
| All backend | 20 test files, serial file execution on disposable DB | **443/443 passed**, no skipped tests |
| Lab1 frontend | client/tests/lab-01 | 7 passed |
| Lab2 frontend (including mocked RequesterWorkflow.e2e) | client/tests/lab-02 | 43 passed |
| Lab3 frontend | client/tests/lab-03 | 32 passed |
| Lab4 frontend | client/tests/lab-04 | 138 passed |
| All frontend | 20 test files | **220/220 passed**, no skipped tests |
| Real Lab4 browser E2E | three existing Lab4.9 specs | **4/4 passed**, retries0; report dashboard-extension-e2e |
| Visual/keyboard/axe browser audit | release-audit.spec.ts | **3/3 passed**, retries0; reports qa-final-clean and qa-submission |
| Builds/typechecks | server build; client tsc+Vite; E2E/QA tsc | Passed |
| Lint | root/server/client package scripts | No lint script configured; not claimed as run |
| Safety guard negative probe | invalid URL at closed port1, no opt-in | Expected setup rejection; no test bodies/legacy cleanup imported |

No backend or frontend regression tests were removed, skipped or weakened. Browser checks were refined to test the actual documented message and classify duplicate intentional failures; assertions still reject unexpected errors. Repeated Lab4.9 stability counts from the previous issue are historical evidence, not an additional repeat-each run in this issue.

## Reproduction and fixture safety

Read all legacy setup/cleanup routines before execution. They use fixed seeded accounts and targeted deletions; consequently they must never run against development. The helper verifies actual server data_directory, not just database name. The Vitest setup guard checks the local port/user/database, explicit opt-in and a database comment marker before suite import. Fresh-cluster preparation applied all six existing migrations using migrate deploy and seeded four categories, twelve users and nine tickets. No reset/truncate or deletion of original development data occurred. QA/browser fixtures use their existing UUID/exact-ID cleanup; regression leftovers stay only in the disposable cluster.

From repository root, with PostgreSQL18 binaries installed (override -PostgresBin if needed):

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/lab4-test-environment.ps1 -Action Server
npm.cmd --prefix client run test
$env:E2E_DATABASE_URL = 'postgresql://lab4qa@127.0.0.1:55439/lab4_qa_test'
$env:E2E_BROWSER_CHANNEL = 'chrome'
$env:E2E_RUN_LABEL = 'release-e2e'
npm.cmd run test:e2e:lab4
$env:E2E_RUN_LABEL = 'qa-submission'
npm.cmd run test:qa:lab4
node scripts/collect-lab4-screenshots.cjs qa-submission
npm.cmd run typecheck:e2e:lab4
npm.cmd --prefix server run build
npm.cmd --prefix client run build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/lab4-test-environment.ps1 -Action Stop
```

Root/server/client dependencies and Chrome (or installed Playwright Chromium without the channel variable) are prerequisites. Start prepares the disposable cluster without running tests; Server prepares it and runs the full backend suite. The helper is Windows/PowerShell-specific. Do not run browser/global-metric checks concurrently with other database-writing suites. Local trust authentication is restricted to the disposable loopback cluster, which is stopped when verification ends. Data is retained ignored for inspection; no recursive data deletion is part of the helper.

Reports, network classifications, axe findings, JSON results and temporary cluster files remain ignored under artifacts/lab-04/e2e-results and e2e-report. Only selected screenshots are included for source control. No auth state, token or environment secret is included.

## Documentation, acceptance and proposed integration

- AC-01: passed for the stated screens/viewports/browser and controlled scenarios; no unexplained runtime/console/layout errors in final runs. Does not imply all possible layouts or accessibility compliance.
- AC-02: **pending**. Tests passed on this feature working tree; no final-main revision has been merged or tested.
- AC-03: historical reviewer evidence and AI prompt summaries are populated accurately. **Pending**: reviewer approval of hardening and student review/personalization of My Reflection, followed by final PDF preparation.
- reviewer.md includes actual yiiipunn approvals and DEV4952 responses for PRs71-77. Those approvals apply to their historical revisions, not this branch. No reviewers were contacted and no comments/approval requests were posted.
- ai-use.md contains ten clearly labelled prompt summaries, known tool/model limits and a reflection draft, not an invented personal statement.
- specification.md/api-spec.md include the authorized additive dashboard contract; tests.md/ui-spec.md point to this report and current evidence.

Proposed sequence, requiring later explicit authorization: review the concrete diff/evidence; commit/push and open feature/lab4-visual-qa -> lab4-staging; obtain actual review/check approvals and merge under protections; confirm main as the intended release target (not substitute master); open/review staging -> main; authorize final merge; check out the actual merged main SHA in safe checkout/CI and repeat isolated full regression, builds, E2E and targeted visual checks before claiming AC-02. Record that SHA, checks and final review in these documents. No force-push or branch-protection bypass is proposed.

Remaining limitations: Chrome-only viewport emulation, no physical devices/other engines, no screen-reader-user audit or actual browser zoom test, no final-main verification, no hardening approval, unconfirmed student reflection, and no rendered final PDF submission. These do not prevent review of the prepared implementation but prevent claiming final release/submission completion.

## Dashboard rubric gaps completed by user authorization

The user explicitly authorized adding My Actions Taken and Requester Attention Required in the hardening branch. Both former gaps are now implemented and documented as AC-DASH-01/02; they are no longer pending product decisions.

Staff summary uses signed-session performedById, not Ticket owner/assignee; all-time total and all four status counts, latest five ordered actionDateTime DESC/createdAt DESC/id ASC, and Ticket Detail links. Requester attention-required uses owned WAITING_FOR_REQUESTER only, exact existing waiting count, latest-five minimal public summaries and a real filtered View all destination. API responses remain one RepeatableRead snapshot. No schema/migration/new route changes were needed.

New tests cover recorder-vs-assignee isolation, admin/zero state, SQL counts/order/limit, safe field projection, Requester ownership/tie order/drill-down count, empty UI and account/role changes. Lab4 dashboard API tests are now32; all Lab4 API tests323. Lab4 UI tests138; full backend443 and frontend220 passed. Browser dashboard journeys now verify populated My Actions Taken and real attention-required drill-down; viewport QA includes populated/empty new sections.

One initial full-backend rerun passed442/443 because two UUID categories remained from previously interrupted QA runs in the disposable cluster. Removed only verified category IDs17/45 and their exact fixture ticket/user IDs after checking the disposable marker, then reran the full suite443/443. No development cleanup, broad deletion, test skipping or assertion weakening occurred.

ai-use.md now contains ten selected actual prompt summaries and a substantive Thai My Reflection draft. Student confirmation/personalization and hardening review remain pending; no personal experience or new approval is fabricated.

## Handout grading audit (2026-11-01)

Re-read the supplied SE+Lab+4.pdf, physical pages2-11, including section14 on pages10-11. Document requirements are assessment criteria, not authorization to merge/publish/submit. No numeric grade or full-mark guarantee is claimed.

| Answer Part / points | Current implementation/evidence | Remaining submission condition |
| --- | --- | --- |
| 1 Git workflow /10 | Feature branch; previous PR71-77 approval/comment links in reviewer.md; README/gitignore and directory structure exist | Commit/review/integrate current work when authorized; staging -> actual main history; final Project/Kanban all Done has not been verified |
| 2 Spec DD /5 | Numbered FR/BR/AC, migration/design decisions, workflow/metrics/DoD; original specification commit8f5025a dated2026-10-28 precedes implementation PRs | Render/link the specification and its early Git revision in the submission; new dashboard additions are documented as authorized scope |
| 3 Test DD/traceability /10 | Actual paths and tests: backend443, frontend220, real E2E4, visual audit3 on feature working tree; SQL/security/lifecycle/conflict coverage | Complete passing output from the actual merged main revision; reconcile historical Planned rows with final traceability/evidence rather than claiming every planned browser scenario was run |
| 4 AI use/reflection /5 | Named Codex/GPT-6 family with exact-variant limitation;10 actual prompt summaries; Thai reflection draft | Student must review/personalize/confirm reflection and include rendered document; no invented personal experience |
| 5 IT Staff Dashboard /5 | Operational cards, current-user recorder Action totals/statuses/recent links, recent Tickets, actual filters, SQL comparisons and viewport/failure checks | Select readable final metric-to-SQL and UI state evidence for PDF; no feature gap identified in the inspected approved contract |
| 6 Actions Taken UI /10 | List/create/assign/edit/start/complete/cancel; follow-up validation, inactive-assignee/RBAC/safe-failure tests; multiple Actions on a Ticket; responsive PNGs | Select live UI evidence of assignment, start/complete/cancel, inactive rejection and safe failure. API/component tests prove tested behavior but are not screenshots of each interaction |
| 7 Ticket workflow /5 | Backend transition matrix, advisory separation, immutable recorder/history, stable order; real resolution journey and409 feedback | Select permitted-transition/history/role visibility evidence; existing QA PNGs primarily show list/conflict, not every successful transition/history panel |
| 8 Requester Dashboard/regression /5 | Owned metrics/recent/attention-required Tickets, real waiting-status drill-down/ownership; complete earlier-lab API/UI regression on disposable DB | Select representative authentication/My Tickets/Detail/Attachments/Comments/Staff/Internal Notes/Admin demonstration evidence; current real browser journeys do not exercise every legacy screen |
| 9 Zen Green/responsive/accessibility /5 | ui-spec checklist and48 viewport/state PNGs covering375x812,768x1024,1440x900; real keyboard/axe/runtime/layout assertions | Render checklist and select readable final images; checks are Chrome viewport emulations, not a guarantee of complete accessibility across devices/assistive technologies |

Section14 requires exactly one concise PDF, with Answer Part1 through Answer Part9 in that exact order and working links. Repository/final main remain the source of truth. A folder of screenshots or passing feature-branch tests alone does not meet this submission rule. The PDF has not been created or visually verified in this task.

Overall: the inspected core functional scope is implemented and backed by current tests. Final submission acceptance remains pending the integration/review/student-reflection/main-test/Kanban/PDF conditions above. Some UI behaviors have automated coverage but still need selected demonstration evidence; do not equate that evidence gap with a missing implementation or silently claim it is complete.
