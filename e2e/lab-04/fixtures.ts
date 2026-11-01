import { test as base, expect, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import type { PrismaClient as PrismaType, User, Ticket, TicketStatus, TicketPriority } from "../../server/node_modules/@prisma/client";
const serverRequire = createRequire(path.resolve("server/package.json"));
const { PrismaClient, Prisma } = serverRequire("@prisma/client");
const bcrypt = serverRequire("bcryptjs");
export class FixtureData {
 readonly prefix = `E2E-${randomUUID()}`;
 readonly password = randomBytes(24).toString("base64url") + "Aa1!";
 readonly p: PrismaType = new PrismaClient({ datasources: { db: { url: process.env.E2E_DATABASE_URL } } });
 readonly users: User[] = [];
 readonly tickets: Ticket[] = [];
 categoryId?: number;
 requester!: User; staff!: User; other!: User;
 async setup() {
  await this.p.$connect();
  try { await this.p.actionTakenHistory.count(); } catch { throw new Error("E2E target is not migrated: apply Prisma migrations and generate the server client before running. No reset will be attempted."); }
  this.categoryId = (await this.p.category.create({ data: { name: this.prefix } })).id;
  for (const [label, role] of [["Requester", "REQUESTER"], ["Staff", "IT_STAFF"], ["Other", "REQUESTER"]] as const) {
   this.users.push(await this.p.user.create({ data: { email: `${this.prefix}-${label}@example.test`, name: `E2E ${label} ${this.prefix.slice(-8)}`, role, passwordHash: bcrypt.hashSync(this.password, 10), mustChangePassword: false, isActive: true } }));
  }
  [this.requester, this.staff, this.other] = this.users;
 }
 async ticket(label: string, status: TicketStatus = "OPEN", ownerId: number | null = null, requester = this.requester, updatedAt = new Date(), priority: TicketPriority = "MEDIUM") {
  const ticket = await this.p.ticket.create({ data: { ticketNumber: `${this.prefix}-${this.tickets.length + 1}`, title: `${this.prefix} ${label}`, description: `Synthetic E2E fixture: ${label}`, status, ownerId, requesterId: requester.id, categoryId: this.categoryId!, priority, itPriority: priority, updatedAt } });
  this.tickets.push(ticket); return ticket;
 }
 async staffCounts() {
  const [row] = await this.p.$queryRaw<Array<Record<string, number>>>(Prisma.sql`SELECT
   (COUNT(*) FILTER(WHERE status::text='NEW'))::int AS "New",
   (COUNT(*) FILTER(WHERE status::text='OPEN'))::int AS "Open",
   (COUNT(*) FILTER(WHERE status::text='IN_PROGRESS'))::int AS "In Progress",
   (COUNT(*) FILTER(WHERE status::text='WAITING_FOR_REQUESTER'))::int AS "Waiting for Requester",
   (COUNT(*) FILTER(WHERE "ownerId"=${this.staff.id}))::int AS "My Assigned" FROM tickets`);
  return row;
 }
 async requesterCounts() {
  const [row] = await this.p.$queryRaw<Array<Record<string, number>>>(Prisma.sql`SELECT
   (COUNT(*) FILTER(WHERE status::text IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')))::int AS "My Open Tickets",
   (COUNT(*) FILTER(WHERE status::text='IN_PROGRESS'))::int AS "In Progress",
   (COUNT(*) FILTER(WHERE status::text='RESOLVED'))::int AS "Resolved",
   (COUNT(*) FILTER(WHERE status::text='CLOSED'))::int AS "Closed" FROM tickets WHERE "requesterId"=${this.requester.id}`);
  return row;
 }
 async recent(requesterId?: number) {
  return this.p.$queryRaw<Array<{ id: number; ticketNumber: string; status: TicketStatus }>>(requesterId === undefined
   ? Prisma.sql`SELECT id,"ticketNumber",status FROM tickets ORDER BY "updatedAt" DESC,id DESC LIMIT 5`
   : Prisma.sql`SELECT id,"ticketNumber",status FROM tickets WHERE "requesterId"=${requesterId} ORDER BY "updatedAt" DESC,id DESC LIMIT 5`);
 }
 async cleanup() {
  try {
   // Exact IDs returned by create(), after ownership checks. Never reset/truncate.
   for (const ticket of this.tickets) {
    const row = await this.p.ticket.findUnique({ where: { id: ticket.id }, select: { ticketNumber: true } });
    if (row && row.ticketNumber.startsWith(this.prefix)) await this.p.ticket.delete({ where: { id: ticket.id } });
    else if (row) throw new Error("Refusing to clean a ticket outside this fixture namespace");
   }
   for (const user of this.users) {
    const row = await this.p.user.findUnique({ where: { id: user.id }, select: { email: true } });
    if (row?.email.startsWith(this.prefix)) await this.p.user.delete({ where: { id: user.id } });
    else if (row) throw new Error("Refusing to clean an account outside this fixture namespace");
   }
   if (this.categoryId !== undefined) await this.p.category.delete({ where: { id: this.categoryId } });
  } finally { await this.p.$disconnect(); }
 }
}
export async function login(page: Page, user: User, password: string) {
 await page.goto("/");
 await page.getByLabel("Email address").fill(user.email);
 await page.getByLabel("Password", { exact: true }).fill(password);
 await page.getByRole("button", { name: "Sign In", exact: true }).click();
 await expect(page.getByRole("heading", { name: user.role === "REQUESTER" ? "Requester Dashboard" : "Staff Dashboard" })).toBeVisible();
 // Traces begin only after login. No DOM/network snapshots or screenshots:
 // action-only traces cannot contain login passwords or authenticated headers.
 await page.context().tracing.start({ screenshots: false, snapshots: false, sources: false });
}
export async function capture(page: Page, testInfo: TestInfo, name: string, prefix: string, selector?: string) {
 const target = selector ? page.locator(selector) : page.locator("body");
 const mask = [page.locator('#login-email'), page.locator('#login-password'), page.locator('#action-assignee'), page.locator('.dashboard-recent-list li').filter({ hasNot: page.getByText(prefix, { exact: false }) }), page.getByTestId('staff-ticket-table'), page.getByTestId('staff-queue-mobile-list')];
 const file = testInfo.outputPath(`${name}.png`);
 await target.screenshot({ path: file, mask, animations: "disabled" });
 await testInfo.attach(name, { path: file, contentType: "image/png" });
}
export const test = base.extend<{ data: FixtureData; roles: { requester: Page; staff: Page; other: Page } }>({
 data: async ({}, use) => {
  const data = new FixtureData();
  try { await data.setup(); await use(data); } finally { await data.cleanup(); }
 },
 roles: async ({ browser, baseURL, data }, use, info) => {
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  try {
   for (let i = 0; i < 3; i++) { const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 } }); contexts.push(context); pages.push(await context.newPage()); }
   await use({ requester: pages[0], staff: pages[1], other: pages[2] });
  } finally {
   for (let i = 0; i < contexts.length; i++) {
    if (info.status !== info.expectedStatus) {
     await capture(pages[i], info, `failure-context-${i}`, data.prefix).catch(() => {});
     const trace = info.outputPath(`context-${i}-trace.zip`);
     try { await contexts[i].tracing.stop({ path: trace }); await info.attach(`context-${i}-trace`, { path: trace, contentType: "application/zip" }); } catch { /* login might fail before tracing starts */ }
    } else await contexts[i].tracing.stop().catch(() => {});
    await contexts[i].close();
   }
  }
 },
});
export { expect };
export async function openTicket(page: Page, id: number) {
 await page.goto(`/tickets/${id}`);
 await expect(page.getByTestId("ticket-detail-screen")).toBeVisible();
 await expect(page.getByRole("heading", { name: "Actions Taken", exact: true })).toBeVisible();
}
export async function saveAction(page: Page, description: string, followUp = false) {
 await page.getByRole("button", { name: "Add Action", exact: true }).click();
 const dialog = page.getByRole("dialog", { name: "Add Action Taken" });
 await expect(dialog.getByLabel("Assigned To")).toBeEnabled();
 await dialog.getByLabel("Action Date/Time").fill("2026-10-30T12:30");
 await dialog.getByLabel("Description", { exact: true }).fill(description);
 await dialog.getByLabel("Result", { exact: true }).fill("Synthetic resolution verified successfully");
 await dialog.getByLabel("Attachment Notes").fill("Refer to synthetic-e2e-log.txt");
 if (followUp) {
  await dialog.getByLabel("Follow-Up Required?").check();
  await dialog.getByRole("button", { name: "Save Action", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Follow-up note");
  await dialog.getByLabel("Follow-up Note (required)").fill("Monitor the synthetic connection tomorrow");
 }
 await dialog.getByRole("button", { name: "Save Action", exact: true }).click();
 await expect(dialog).toBeHidden();
 await expect(page.locator(".actions-entry").filter({ has: page.getByText(description, { exact: true }) })).toBeVisible();
}

