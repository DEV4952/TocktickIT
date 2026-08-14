# Lab 1 — Test Plan and Evidence  (fill this in)

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | Passed |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | Passed |
| 3 | Vitest | Heading renders | Passed |
| 4 | Vitest | Success state shows Online + category list | Passed |
| 5 | Vitest | Error state shows Offline + message | Passed |

Paste your passing terminal output / screenshot below.

```text
# Backend Supertest / Vitest (server)
✓ tests/lab-01/health.test.ts (1 test)
✓ tests/lab-01/categories.test.ts (1 test)
Test Files  2 passed (2)
Tests       2 passed (2)

# Frontend Vitest (client)
✓ tests/lab-01/api.test.tsx (3 tests)
✓ tests/lab-01/App.test.tsx (4 tests)
Test Files  2 passed (2)
Tests       7 passed (7)
```

