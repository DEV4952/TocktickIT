import { type Page } from "@playwright/test";
import { test, expect, login, capture, type FixtureData } from "./fixtures";
const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED", "RESOLVED", "CLOSED", "CANCELLED"] as const;
async function prepare(data: FixtureData) {
 for (const [index, status] of statuses.entries()) await data.ticket(`Dashboard ${status}`, status, index % 2 ? data.staff.id : null, data.requester, new Date(Date.UTC(2090, 0, 1, 0, index)), index % 2 ? "HIGH" : "LOW");
 await data.ticket("Other requester OPEN", "OPEN", null, data.other, new Date("2090-01-02T00:00:00Z"));
 await data.ticket("Other requester CLOSED", "CLOSED", null, data.other, new Date("2090-01-03T00:00:00Z"));
}
async function dashboard(page: Page) {
 await page.goto("/dashboard"); await expect(page.locator('.dashboard')).toHaveAttribute("aria-busy", "false");
}
async function recent(page: Page, expected: Awaited<ReturnType<FixtureData["recent"]>>) {
 await expect(page.locator('section[aria-labelledby="dashboard-recent-title"] .dashboard-recent-list a')).toHaveCount(expected.length);
 expect(await page.locator('section[aria-labelledby="dashboard-recent-title"] .dashboard-recent-list a').evaluateAll(links => links.map(link => link.getAttribute("href")))).toEqual(expected.map(ticket => `/tickets/${ticket.id}`));
 for (const ticket of expected) {
  const link = page.locator(`section[aria-labelledby="dashboard-recent-title"] .dashboard-recent-list a[href="/tickets/${ticket.id}"]`);
  await expect(link).toContainText(ticket.ticketNumber); await expect(link).toContainText(ticket.status.replaceAll("_", " "));
 }
}
async function drill(page: Page, label: string, count: number, pathname: string, query: string) {
 const response = page.waitForResponse(res => { const url = new URL(res.url()); return url.pathname === pathname && url.search.includes(query) && res.request().method() === "GET"; });
 await page.getByRole("link", { name: `${label}: ${count} tickets`, exact: true }).click();
 const result = await response; expect(result.status()).toBe(200);
 return result.json();
}
test("Staff Dashboard SQL metrics, recent ordering, card filters and Quick Actions", async ({ data, roles }, info) => {
 await prepare(data); const page = roles.staff; await login(page, data.staff, data.password); await dashboard(page);
 const counts = await data.staffCounts();
 const actionSection=page.getByRole('region',{name:'My Actions Taken',exact:true});
 await expect(actionSection.getByText('You have not recorded any actions yet.',{exact:true})).toBeVisible();
 for(const status of ['RECORDED','IN_PROGRESS','COMPLETED','CANCELLED'] as const) await data.p.actionTaken.create({data:{ticketId:data.tickets[0].id,performedById:data.staff.id,status,description:data.prefix+' dashboard '+status,result:'Synthetic verified result'}});
 await dashboard(page);
 await expect(actionSection.getByText('Total recorded',{exact:true}).locator('..')).toContainText('4');
 const ownActions=await data.p.actionTaken.findMany({where:{performedById:data.staff.id},orderBy:[{actionDateTime:'desc'},{createdAt:'desc'},{id:'asc'}],take:5});
 for(const action of ownActions) await expect(actionSection.getByRole('link',{name:new RegExp(action.description)})).toHaveAttribute('href','/tickets/'+action.ticketId);
 for (const [label, count] of Object.entries(counts)) await expect(page.getByRole("link", { name: `${label}: ${count} tickets`, exact: true })).toBeVisible();
 await recent(page, await data.recent()); await capture(page, info, "staff-dashboard", data.prefix, ".dashboard");
 for (const [label, status] of [["New", "NEW"], ["Open", "OPEN"], ["In Progress", "IN_PROGRESS"], ["Waiting for Requester", "WAITING_FOR_REQUESTER"]]) {
  const body = await drill(page, label, counts[label], "/api/staff/tickets", `status=${status}`);
  await expect(page).toHaveURL(new RegExp(`/staff/queue\\?status=${status}$`));
  await expect(page.getByTestId("queue-status-filter")).toHaveValue(status);
  expect(body.pagination.total).toBe(counts[label]); expect(body.data.length).toBeGreaterThan(0);
  for (const ticket of body.data) expect(ticket.status).toBe(status);
  const fixture = data.tickets.find(ticket => ticket.status === status)!;
  await page.getByTestId("queue-search-input").fill(data.prefix); await page.getByTestId("queue-search-input").press("Enter");
  await expect(page.getByTestId(`queue-row-${fixture.id}`)).toBeVisible();
  await dashboard(page);
 }
 const assigned = await drill(page, "My Assigned", counts["My Assigned"], "/api/staff/tickets", "ownerId=me");
 await expect(page).toHaveURL(/\/staff\/queue\?ownerId=me$/); await expect(page.getByTestId("queue-owner-filter")).toHaveValue("me");
 expect(assigned.pagination.total).toBe(counts["My Assigned"]);
 for (const ticket of assigned.data) expect(ticket.ownerId).toBe(data.staff.id);
 for (const ticket of data.tickets.filter(ticket => ticket.ownerId === data.staff.id)) await expect(page.getByTestId(`queue-row-${ticket.id}`)).toBeVisible();
 await dashboard(page); await page.getByRole("link", { name: "Create Ticket", exact: true }).click(); await expect(page).toHaveURL(/\/tickets\/new$/); await expect(page.getByTestId("ticket-title-input")).toBeVisible();
 await dashboard(page); await page.getByRole("link", { name: "Search Tickets", exact: true }).click(); await expect(page).toHaveURL(/\/staff\/queue$/); await expect(page.getByTestId("queue-status-filter")).toHaveValue("ALL");
 await dashboard(page); await page.getByRole("link", { name: "My Queue", exact: true }).click(); await expect(page).toHaveURL(/\/staff\/queue\?ownerId=me$/); await expect(page.getByTestId("queue-owner-filter")).toHaveValue("me");
 for (const ticket of data.tickets.filter(ticket => ticket.ownerId === data.staff.id)) await expect(page.getByTestId(`queue-row-${ticket.id}`)).toBeVisible();
});
test("Requester Dashboard owned SQL metrics, filtered lists, navigation and cross-owner denial", async ({ data, roles }, info) => {
 await prepare(data); const page = roles.requester; await login(page, data.requester, data.password); await dashboard(page);
 const counts = await data.requesterCounts();
 const attention=page.getByRole('region',{name:'Attention Required',exact:true});
 const waiting=data.tickets.find(ticket=>ticket.requesterId===data.requester.id && ticket.status==='WAITING_FOR_REQUESTER')!;
 await expect(attention.getByRole('link',{name:new RegExp(waiting.ticketNumber)})).toHaveAttribute('href','/tickets/'+waiting.id);
 await attention.getByRole('link',{name:'View all tickets needing your response',exact:true}).click();
 await expect(page.getByTestId('filter-status-select')).toHaveValue('WAITING_FOR_REQUESTER');
 await expect(page.getByTestId('ticket-row-'+waiting.id)).toBeVisible();
 await dashboard(page);
 for (const [label, count] of Object.entries(counts)) await expect(page.getByRole("link", { name: `${label}: ${count} tickets`, exact: true })).toBeVisible();
 await recent(page, await data.recent(data.requester.id)); await capture(page, info, "requester-dashboard", data.prefix, ".dashboard");
 const owned = data.tickets.filter(ticket => ticket.requesterId === data.requester.id);
 for (const [label, query, value, accepted] of [
  ["My Open Tickets", "statusGroup=open", "OPEN_GROUP", ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"]],
  ["In Progress", "status=IN_PROGRESS", "IN_PROGRESS", ["IN_PROGRESS"]],
  ["Resolved", "status=RESOLVED", "RESOLVED", ["RESOLVED"]],
  ["Closed", "status=CLOSED", "CLOSED", ["CLOSED"]],
 ] as const) {
  const body = await drill(page, label, counts[label], "/api/tickets", query);
  expect(new URL(page.url()).search.slice(1)).toBe(query); await expect(page.getByTestId("filter-status-select")).toHaveValue(value);
  expect(body.pagination.total).toBe(counts[label]);
  expect(body.data.map((ticket: { id: number }) => ticket.id).sort((a: number,b: number) => a-b)).toEqual(owned.filter(ticket => (accepted as readonly string[]).includes(ticket.status)).map(ticket => ticket.id).sort((a,b) => a-b));
  for (const ticket of body.data) { expect(ticket.requesterId).toBe(data.requester.id); expect(accepted).toContain(ticket.status); await expect(page.getByTestId(`ticket-row-${ticket.id}`)).toBeVisible(); }
  await dashboard(page);
 }
 await page.getByRole("link", { name: "Create Ticket", exact: true }).click(); await expect(page).toHaveURL(/\/tickets\/new$/); await expect(page.getByTestId("ticket-title-input")).toBeVisible();
 await dashboard(page); await page.getByRole("link", { name: "View My Tickets", exact: true }).click(); await expect(page).toHaveURL(/\/tickets$/);
 for (const ticket of owned) await expect(page.getByTestId(`ticket-row-${ticket.id}`)).toBeVisible();
 for (const ticket of data.tickets.filter(ticket => ticket.requesterId === data.other.id)) await expect(page.getByTestId(`ticket-row-${ticket.id}`)).toHaveCount(0);
 await login(roles.other, data.other, data.password); await roles.other.goto(`/tickets/${owned[0].id}`);
 await expect(roles.other.locator('[data-testid="detail-unauthorized-state"], [data-testid="detail-not-found-state"]')).toBeVisible();
 await expect(roles.other.getByTestId("ticket-detail-screen")).toHaveCount(0);
});

