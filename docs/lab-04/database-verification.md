# Lab 4.3 database verification (2026-10-29)

Scope: Prisma schema, migrations, seed and read-only verification. No UI/API changes.
Repository README and Lab 4 specifications were consulted; the broader UI/API work in those documents is outside this issue.

## Implementation

- `ActionTaken`: String/CUID IDs for new records; PostgreSQL Text fields; Ticket Cascade and performer Restrict; indexes on ticket, performer, action date and creation date.
- The existing `20261029000000_add_actions_taken` migration was already applied locally before this task. Its original checksum and SQL are preserved.
- `20261029070000_action_taken_string_id` converts existing integer IDs to their text representation without replacing rows/tables. It removes the serial default and the database default on `updatedAt` to match Prisma.
- Seed uses email/category/ticket unique keys with empty updates to preserve existing account credentials and ticket workflow. Actions use stable IDs and adopt matching legacy actions. Attachments/comments/notes are inserted only when absent; comments/notes match author as well as ticket and content. Fixture action dates are fixed.
- Nine fixture tickets cover all eight statuses, all four priorities, and 0/1/multiple actions. Existing tickets and actions retain any previously edited contents.
- Root package scripts were merged to remove duplicate `scripts` keys while retaining existing test commands. `npm run seed` delegates to the server seed. `npm run check:actions` uses the server client and environment and only reads data.

## Results

- Prisma format, validate, generate: passed (client 6.19.3).
- `npx.cmd --offline --no-install prisma migrate dev --name add_actions_taken` from `server`: blocked by P3014, database role cannot create a shadow database. No reset was attempted.
- Reviewed forward SQL applied successfully with `prisma migrate deploy`; five migrations now applied.
- Live database versus Prisma schema diff: no difference.
- Seed completed twice. Complete row snapshots after each successful run were identical, including timestamps.
- All original rows were compared using normalized-ID SHA-256 row hashes before migration and after both seeds: unchanged. No original rows were removed; total counts also matched.

| Data | Before | After first seed | After second seed |
| --- | ---: | ---: | ---: |
| Users | 29 | 29 | 29 |
| Categories | 4 | 4 | 4 |
| Tickets | 459 | 459 | 459 |
| Attachments | 5 | 5 | 5 |
| Comments | 129 | 129 | 129 |
| Internal notes | 46 | 46 | 46 |
| Actions taken | 9 | 9 | 9 |

- Fixture tickets 0001 through 0009 have respectively 2, 0, 1, 1, 3, 0, 1, 1, 0 actions. Ticket/performer relations and required follow-up notes passed verification.
- Existing dashboard query shapes: Michael has 4 assigned tickets; John has 0. Alex has 3 requested tickets; Emily has 0. This provides nonzero and zero scoped dashboards without changing global counts.
- Backend TypeScript build passed.
- Lab 1 health/category regression tests: 2/2 passed. Full Lab 2/3 integration suites were not run against the shared development database because they contain data deletion/cleanup operations.
- Windows sandbox `tsx` initially failed with `uv_os_get_passwd ENOMEM`; both successful seed runs used approved execution outside the sandbox.

## Repeat checks

From repository root:

```powershell
npm.cmd run seed
npm.cmd run seed
npm.cmd run check:actions
npm.cmd --prefix server run build
```

From `server`:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate status
npx.cmd prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
```

No remaining migration or seed action is required for this development database. To use `migrate dev` for future migrations, configure an authorized separate shadow database (`shadowDatabaseUrl`) or ask the database administrator for development-only CREATEDB access, then rerun `npx.cmd prisma migrate dev --name add_actions_taken`. Do not reset this database.
