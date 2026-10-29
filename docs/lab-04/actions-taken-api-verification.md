# Lab 4.4 Actions Taken API verification

Date: 2026-10-29 (Asia/Bangkok)
Branch: `feat/lab4-4-actions-taken-api`
Base: `lab4-staging` at `cdc4a23` (includes merged Lab 4.3 PR #71).

## Implemented contract

| Endpoint | Access | Success |
| --- | --- | --- |
| `GET /api/tickets/:id/actions` | Requester for own ticket; IT Staff/Administrator for any ticket under the existing shared staff policy | 200, `{ ticketId, ticketNumber, totalActions, actions }` |
| `POST /api/tickets/:id/actions` | IT Staff/Administrator | 201, `{ message, action }` |
| `PATCH /api/tickets/:id/actions/:actionId` | IT Staff/Administrator | 200, `{ message, action }` |

- `:id` is a positive PostgreSQL integer ticket ID. `:actionId` is the String ID from Lab 4.3, including legacy numeric strings.
- Signed session cookies and Bearer tokens use the existing session authentication. Legacy Lab 2 identity headers cannot authenticate these new endpoints. Inactive accounts are rejected; the existing mandatory password-change restriction remains enforced.
- Creator identity always comes from the authenticated user. Updates ignore IDs, ticket/performer relations, createdAt and updatedAt; only actionDateTime, description, result, followUpRequired, followUpNote and attachmentNotes can be edited.
- PATCH merges editable fields with the stored action before validation. It cannot update an action under another ticket; Prisma manages updatedAt.
- Description: trimmed 5-3000 characters; result: trimmed 3-3000 characters. POST requires boolean followUpRequired. If true, the final trimmed followUpNote must contain at least 3 characters; if false, the note is cleared to null. Attachment notes are nullable, at most 1000 characters.
- actionDateTime is optional on POST (defaults to server time); supplied values must be valid ISO timestamps with timezone, including calendar-date validation.
- Lists have deterministic order: actionDateTime descending, createdAt descending, ID ascending. Existing tickets without actions return an empty array. Performer projection contains only id, name and role.
- Statuses: 401 missing/invalid signed session; 403 Requester writes or reads another requester's ticket; 400 invalid input; 404 missing ticket/action or mismatched parent.

## Decisions where prior documents differ

The current issue request takes precedence. Existing Lab 4 api-spec.md describes PUT and validation 422; this issue uses PATCH (consistent with existing staff update routes) and validation 400. Existing ticket/comment routes sometimes conceal foreign requester tickets with 404; this issue explicitly requires 403. Only the new Actions Taken endpoints use that 403 policy. Existing routes and shared authentication behavior are unchanged.

No UI, schema or migration changes were needed. GET action detail and PUT are outside this issue's requested endpoints.

## Verification

- Backend TypeScript build: passed.
- `server/tests/lab-04/actions-taken.api.test.ts`: **84/84 passed**.
- Selected Lab 1 health/category regressions: **2/2 passed**, separate from Lab 4.4 tests.
- Combined run: **86/86 passed**.
- `git diff --check`: passed.

Tests used the configured development PostgreSQL target `localhost:5432/toktickit`, with unique UUID fixture namespaces. They create their own category, users, tickets and actions. Cleanup deletes only primary-key IDs returned by this suite's create calls; no reset, truncate or broad deleteMany is used. Existing seeded users/tickets are neither reused nor modified.

SHA-256 hashes of all original rows and table counts were compared before and after the test runs. Every original row remained unchanged, and all created fixtures were removed:

| Table | Before | After |
| --- | ---: | ---: |
| users | 29 | 29 |
| categories | 4 | 4 |
| tickets | 459 | 459 |
| attachments | 5 | 5 |
| comments | 129 | 129 |
| internal_notes | 46 | 46 |
| actions_taken | 9 | 9 |

Full Labs 2-3 suites were not run against the shared development database because their existing cleanup includes data deletion operations. They are not claimed as passed. No push, PR or merge was performed during implementation; the changes are prepared for review on the feature branch.

## Commands (repository root, PowerShell)

```powershell
npm.cmd --prefix server run test -- tests/lab-04/actions-taken.api.test.ts --fileParallelism=false
npm.cmd --prefix server run build
npm.cmd --prefix server run test -- tests/lab-04/actions-taken.api.test.ts tests/lab-01 --fileParallelism=false
```

Requires the configured server/.env PostgreSQL DATABASE_URL, the Lab 4.3 migrations already applied, a generated Prisma client, and permission to insert/delete the suite's own fixtures. A separate test database can be selected through DATABASE_URL without changing these tests. Future PRs must target lab4-staging; do not merge into master.
