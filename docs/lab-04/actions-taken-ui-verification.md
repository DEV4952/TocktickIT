# Lab 4.5 Actions Taken UI verification

Date: 2026-10-30 (Asia/Bangkok)
Branch: `feat/lab4-5-actions-taken-ui`
Base: `lab4-staging` at `57d4a1b`, including merged Lab4.3 PR #71 and Lab4.4 PR #72.

## Changes

- `client/src/types.ts`: typed action records and editable input contract.
- `client/src/api.ts`: GET, POST and PATCH helpers using existing cookie/Bearer authentication; explicit editable-field payload projection and useful 400/401/403/404 errors.
- `client/src/components/ActionsTaken.tsx`: chronological list, loading/empty/error/retry states, read-only performer badges, and accessible create/edit modal. Integrated into the real Ticket Detail screen with its resolved numeric ticket ID.
- `client/src/components/TicketDetailScreen.tsx`: mounts the new section without changing comments, notes, attachments or triage.
- `client/src/index.css`: Zen Green wrapping cards and responsive, internally scrollable modal.
- `client/tests/lab-04/ActionsTaken.test.tsx`: 37 component/API-client tests with isolated session/API/fetch mocks; no real database.

## Behavior and contract

- List order is actionDateTime ascending, createdAt ascending, then ID ascending. Dates use browser-local `toLocaleString()`, consistent with existing comments. datetime-local input is converted to UTC ISO for the API.
- Display includes description, result, performer name/role badge, follow-up status/note and attachment notes. Multiline text uses pre-wrap, long unbroken text uses overflow-wrap, and content is rendered as text.
- Only authenticated, active IT_STAFF/ADMINISTRATOR users whose session is ready and does not require a password change see create/edit controls. Requesters receive no editable UI. No privileged controls appear during session loading.
- Create displays the current user; edit displays the original performer. Requests include only actionDateTime, description, result, followUpRequired, followUpNote and attachmentNotes. No identity, ticket or performer mutations are submitted.
- POST/PATCH validation follows the implemented Lab4.4 contract: description 5-3000 trimmed characters, result 3-3000, required follow-up note at least 3 trimmed characters, attachment notes at most 1000, and a valid date. Disabled follow-up sends null note.
- Save uses a synchronous submission guard and disabled fields/buttons. Failures preserve entered values; success updates and reorders the local list without a page reload.
- Modal uses a portal, labelled controls, initial focus, Tab/Shift+Tab trapping, Escape dismissal outside saving, body scroll lock and focus restoration. It uses the existing modal styling pattern with explicit focus management, since existing inline modals have no reusable focus-managed component.
- UI guards supplement the existing backend authorization; no schema or backend API changes were made.

## Automated verification

| Check | Result |
| --- | --- |
| `npm.cmd --prefix client run test -- tests/lab-04/ActionsTaken.test.tsx` | Passed 37/37 |
| `npm.cmd --prefix client run test` | Passed 119/119 across 16 files, including frontend regression tests for Labs 1-3 |
| `npm.cmd --prefix client run build` | Passed TypeScript checking and Vite production build |
| `git diff --check` | Passed |
| Separate lint | Not run: no lint script or configured lint tool in client/package.json |

Tests cover list details/order, loading/empty/error/retry, read-only Requester access, Staff/Admin create/edit, payload allowlists, original performer preservation, follow-up validation, attachment notes, duplicate-submission prevention, local list updates/reordering, API failure preservation, 400/401/403/404 handling, focus/keyboard interactions, stale request isolation and integration into Ticket Detail.

## Responsive visual verification: blocked, not claimed as passed

CSS is designed for 375, 768 and 1280 px: minmax grid columns, wrapping card content, mobile single-column layout, bounded modal width/height and internal scrolling. Component tests alone do not verify layout correctness.

An attempt was made to inspect the actual Ticket Detail component with mock API data in a temporary local QA page, including long unbroken descriptions and attachment notes. Browser inventory returned `The browser access host is unavailable`. The native Chrome fallback was then stopped by Computer Use because it could not determine the current browser URL on Windows with enough confidence to enforce policy. No browser inputs were sent through that fallback. Temporary QA files were removed.

Consequently, rendered verification and supporting screenshots at **375, 768 and 1280 px remain unverified**. AC-02 (read-only Requester UI) and AC-03 (mocked component tests) are verified; AC-01 still needs a rendered browser check. No screenshot evidence is included or claimed.

Manual follow-up with the development frontend/backend running:

1. Open an accessible Ticket Detail as IT Staff/Admin in browser responsive mode at each width (375, 768, 1280 px).
2. Inspect the Actions Taken list with multiline/long text, create modal and edit modal. Check no horizontal scrolling or clipping, internal modal scrolling, labels, focus, Tab/Shift+Tab and Escape.
3. Confirm edit shows the original performer, save errors preserve values, and successful saves reorder the list.
4. Repeat as Requester: list only, with no Add/Edit controls.
5. Capture list and modal screenshots at all three widths for PR evidence.

The user subsequently authorized commit, push and a review PR targeting `lab4-staging`. No merge is authorized. The user opened the local application and located the Add Action control; no complete viewport-specific visual verification or screenshot evidence was reported. The responsive verification limitation above remains open.
