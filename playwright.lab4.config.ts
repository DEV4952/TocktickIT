import { defineConfig } from "@playwright/test";
import { e2eEnvironment } from "./e2e/environment";
const environment = e2eEnvironment();
// Disable unmasked automatic DOM error snapshots. Failure evidence is captured
// explicitly by our fixture with unrelated queue rows/assignee options masked.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = process.env.E2E_RUN_LABEL || "latest";
if (!/^[a-zA-Z0-9-]+$/.test(run)) throw new Error("Invalid E2E_RUN_LABEL");
export default defineConfig({
 testDir: "./e2e/lab-04",
 testMatch: ["actions-taken-flow.spec.ts", "ticket-resolution.spec.ts", "dashboards.spec.ts"],
 fullyParallel: true,
 // Global staff metrics share the existing development DB. One worker avoids
 // another spec changing global queue totals between independent SQL and UI.
 workers: 1, retries: 0,
 timeout: 60000, expect: { timeout: 15000 },
 outputDir: `artifacts/lab-04/e2e-results/${run}`,
 reporter: [["list"], ["html", { outputFolder: `artifacts/lab-04/e2e-report/${run}`, open: "never" }], ["json", { outputFile: `artifacts/lab-04/e2e-results/${run}/results.json` }]],
 use: { baseURL: environment.baseURL, viewport: { width: 1280, height: 900 }, headless: true,
  channel: process.env.E2E_BROWSER_CHANNEL || undefined,
  screenshot: "off", video: "off", trace: "off" },
 webServer: [
  { command: `${npm} run dev`, cwd: "server", url: environment.apiURL + "/api/health", reuseExistingServer: false, timeout: 60000,
    env: { DATABASE_URL: environment.databaseUrl, PORT: String(environment.backendPort), NODE_ENV: "test" } },
  { command: `${npm} run dev -- --host 127.0.0.1 --port ${environment.frontendPort} --strictPort`, cwd: "client", url: environment.baseURL, reuseExistingServer: false, timeout: 60000,
    env: { VITE_API_PROXY_TARGET: environment.apiURL } },
 ],
});
