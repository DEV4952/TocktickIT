import { createRequire } from "node:module";
import path from "node:path";
const serverRequire = createRequire(path.resolve(process.cwd(), "server/package.json"));
serverRequire("dotenv").config({ path: path.resolve(".env.e2e"), quiet: true });
export function e2eEnvironment() {
 if (!process.env.E2E_DATABASE_URL && process.env.E2E_ALLOW_SHARED_DEV_DB !== "1") throw new Error("Set E2E_DATABASE_URL for an isolated test DB, or explicitly set E2E_ALLOW_SHARED_DEV_DB=1 for safe UUID fixtures on local development DB. No database reset is used.");
 const development = serverRequire("dotenv").config({ path: path.resolve("server/.env"), quiet: true }).parsed || {};
 const databaseUrl = process.env.E2E_DATABASE_URL || development.DATABASE_URL;
 if (!databaseUrl) throw new Error("E2E database URL is missing.");
 const database = new URL(databaseUrl);
 if (!["postgres:", "postgresql:"].includes(database.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)) throw new Error("E2E is restricted to local PostgreSQL; production/remote targets are refused.");
 if (process.env.E2E_ALLOW_SHARED_DEV_DB !== "1" && !/(test|e2e)/i.test(database.pathname)) throw new Error("Use a database named for test/e2e or explicitly opt into shared local development fixtures.");
 const backendPort = Number(process.env.E2E_API_PORT || 3109), frontendPort = Number(process.env.E2E_WEB_PORT || 5189);
 for (const port of [backendPort, frontendPort]) if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid E2E port.");
 if (backendPort === frontendPort) throw new Error("E2E backend/frontend ports must differ.");
 process.env.DATABASE_URL = databaseUrl;
 process.env.E2E_DATABASE_URL = databaseUrl;
 return { databaseUrl, backendPort, frontendPort, baseURL: `http://127.0.0.1:${frontendPort}`, apiURL: `http://127.0.0.1:${backendPort}` };
}
