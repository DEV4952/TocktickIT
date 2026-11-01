import { expect } from "vitest";
import { PrismaClient } from "@prisma/client";

// Fail during setup, before importing legacy suites or registering their cleanup.
// Those suites modify fixed seed accounts and cannot safely run on development.
const file = expect.getState().testPath?.replaceAll("\\", "/") || "";
if (/\/lab-0[23]\//.test(file) && !file.endsWith("validators.test.ts")) {
  const url = new URL(process.env.DATABASE_URL || "postgresql://invalid/invalid");
  if (process.env.LAB4_DISPOSABLE_REGRESSION !== "1" || url.hostname !== "127.0.0.1" || url.port !== "55439" || url.pathname !== "/lab4_qa_test" || url.username !== "lab4qa") {
    throw new Error("Legacy Lab2/3 DB suites require the disposable Lab4 QA cluster (127.0.0.1:55439/lab4_qa_test). See tests.md release verification. Development cleanup is refused.");
  }
  const p = new PrismaClient();
  try {
    const [row] = await p.$queryRaw<Array<{ marker: string }>>`SELECT shobj_description(oid, 'pg_database') AS marker FROM pg_database WHERE datname=current_database()`;
    if (row?.marker !== "TocktickIT disposable regression lab4.10") throw new Error("Disposable database marker missing; refusing legacy setup/cleanup.");
  } finally { await p.$disconnect(); }
}
