import * as database from "../../src/prisma.js";
﻿import "dotenv/config";
import { Prisma, User } from "@prisma/client";
import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../../src/utils/auth.js";
import { dashboardFixtures, REFERENCE, START } from "./dashboardFixtures.js";

describe("Lab 4.7 requester dashboard API", () => {
  const p = getPrisma();
  const fixtures = dashboardFixtures(p);
  let requester: User, other: User, empty: User, staff: User, admin: User, inactive: User, firstLogin: User;
  const auth = (u: User) => `Bearer ${createSessionToken(u)}`;
  const get = (u: User, query = "") => request(app).get('/api/dashboard/requester' + query).set("Authorization", auth(u));
  const ownIds: number[] = [];
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL!);
    console.info(`Requester dashboard test DB: ${target.hostname}${target.pathname}; isolated owned fixtures only.`);
    await p.$connect(); await fixtures.setup();
    requester = await fixtures.user("requester", "REQUESTER"); other = await fixtures.user("other", "REQUESTER");
    empty = await fixtures.user("empty", "REQUESTER"); staff = await fixtures.user("staff", "IT_STAFF"); admin = await fixtures.user("admin", "ADMINISTRATOR");
    inactive = await fixtures.user("inactive", "REQUESTER", { isActive: false }); firstLogin = await fixtures.user("first", "REQUESTER", { mustChangePassword: true });
    const rows = [
      ["NEW", START], ["OPEN", new Date(START.getTime() - 1)], ["IN_PROGRESS", REFERENCE],
      ["WAITING_FOR_REQUESTER", new Date(REFERENCE.getTime() - 1)], ["REOPENED", new Date(REFERENCE.getTime() - 2)],
      ["RESOLVED", START], ["RESOLVED", new Date(START.getTime() - 1)], ["RESOLVED", new Date(REFERENCE.getTime() + 1)],
      ["CLOSED", new Date(REFERENCE.getTime() - 3)], ["CANCELLED", new Date(REFERENCE.getTime() - 4)],
      ["OPEN", new Date(REFERENCE.getTime() - 1)], ["OPEN", new Date(REFERENCE.getTime() - 1)],
    ] as const;
    for (const [status, updatedAt] of rows) ownIds.push((await fixtures.ticket(requester.id, status, updatedAt)).id);
    await fixtures.ticket(other.id, "OPEN", REFERENCE); await fixtures.ticket(other.id, "RESOLVED", REFERENCE);
    await fixtures.children(ownIds[0], staff.id);
  });
  beforeEach(() => { vi.spyOn(Date, "now").mockReturnValue(REFERENCE.getTime()); });
  afterEach(() => { vi.restoreAllMocks(); });
  afterAll(() => fixtures.cleanup());

  it("returns exact fixture counts, bounded by one seven-day UTC interval", async () => {
    const res = await get(requester); expect(res.status).toBe(200);
    expect(res.body.referenceTime).toBe(REFERENCE.toISOString()); expect(res.body.windowStart).toBe(START.toISOString());
    expect(res.body.metrics).toEqual({ myOpenTickets: 7, waitingForRequester: 1, recentlyUpdated: 9, recentlyResolved: 1, inProgress: 1, resolved: 3, closed: 1 });
  });
  it("matches independent PostgreSQL aggregate queries including both boundaries", async () => {
    const expected = await p.$queryRaw<Array<Record<string, number>>>(Prisma.sql`
      SELECT
        (COUNT(*) FILTER (WHERE status::text IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')))::int AS "myOpenTickets",
        (COUNT(*) FILTER (WHERE status::text='WAITING_FOR_REQUESTER'))::int AS "waitingForRequester",
        (COUNT(*) FILTER (WHERE "updatedAt" >= (${START} AT TIME ZONE 'UTC') AND "updatedAt" <= (${REFERENCE} AT TIME ZONE 'UTC')))::int AS "recentlyUpdated",
        (COUNT(*) FILTER (WHERE status::text='RESOLVED' AND "updatedAt" >= (${START} AT TIME ZONE 'UTC') AND "updatedAt" <= (${REFERENCE} AT TIME ZONE 'UTC')))::int AS "recentlyResolved",
        (COUNT(*) FILTER (WHERE status::text='IN_PROGRESS'))::int AS "inProgress",
        (COUNT(*) FILTER (WHERE status::text='RESOLVED'))::int AS "resolved",
        (COUNT(*) FILTER (WHERE status::text='CLOSED'))::int AS "closed"
      FROM tickets WHERE "requesterId" = ${requester.id}`);
    const res = await get(requester); expect(res.body.metrics).toEqual(expected[0]);
  });
  it("applies the same ownership scope to every metric and recent summary", async () => {
    const a = await get(requester); const b = await get(other);
    expect(b.body.metrics).toEqual({ myOpenTickets: 1, waitingForRequester: 0, recentlyUpdated: 2, recentlyResolved: 1, inProgress: 0, resolved: 1, closed: 0 });
    expect(a.body.recentTickets.every((ticket: { id: number }) => ownIds.includes(ticket.id))).toBe(true);
    expect(b.body.recentTickets.every((ticket: { id: number }) => !ownIds.includes(ticket.id))).toBe(true);
  });
  it("ignores query/body identity overrides and forged legacy headers", async () => {
    const res = await get(requester, `?requesterId=${other.id}&userId=${other.id}&limit=999&status=RESOLVED`)
      .set("x-requester-id", String(other.id)).set("x-user-id", String(other.id)).send({ requesterId: other.id });
    expect(res.status).toBe(200); expect(res.body.metrics.myOpenTickets).toBe(7);
    expect(res.body.recentTickets).toHaveLength(5);
    expect(res.body.recentTickets.every((ticket: { id: number }) => ownIds.includes(ticket.id))).toBe(true);
  });
  it("returns numeric zeros and an empty list for a requester with no tickets", async () => {
    const res = await get(empty); expect(res.status).toBe(200);
    expect(Object.values(res.body.metrics)).toEqual([0, 0, 0, 0, 0, 0, 0]); expect(res.body.recentTickets).toEqual([]);
  });
  it("uses deterministic updatedAt DESC/id DESC order, not an unbounded recent list", async () => {
    const res = await get(requester);
    expect(res.body.recentTickets.map((t: { id: number }) => t.id)).toEqual([ownIds[7], ownIds[2], ownIds[11], ownIds[10], ownIds[3]]);
    const expected = await p.$queryRaw(Prisma.sql`SELECT id,"ticketNumber",title,status,"updatedAt" FROM tickets WHERE "requesterId"=${requester.id} ORDER BY "updatedAt" DESC,id DESC LIMIT 5`);
    expect(res.body.recentTickets).toEqual(JSON.parse(JSON.stringify(expected)));
  });
  it("returns only approved summary fields and no secret or child data", async () => {
    const res = await get(requester);
    for (const row of res.body.recentTickets) expect(Object.keys(row).sort()).toEqual(["id", "ticketNumber", "title", "status", "updatedAt"].sort());
    expect(res.body).not.toHaveProperty("userMetrics");
  });
  it("counts tickets with multiple child rows only once", async () => {
    expect(await p.comment.count({ where: { ticketId: ownIds[0] } })).toBe(2);
    expect(await p.actionTaken.count({ where: { ticketId: ownIds[0] } })).toBe(2);
    const res = await get(requester); expect(res.body.metrics.myOpenTickets).toBe(7); expect(res.body.metrics.recentlyUpdated).toBe(9);
  });
  it("retains latest-five summaries for old tickets, outside the metric window", async () => {
    await fixtures.ticket(empty.id, "CLOSED", new Date(START.getTime() - 1));
    const res = await get(empty); expect(res.body.metrics.recentlyUpdated).toBe(0); expect(res.body.recentTickets).toHaveLength(1);
  });
  it("allows the existing signed session cookie", async () => {
    expect((await request(app).get('/api/dashboard/requester').set("Cookie", `${SESSION_COOKIE_NAME}=${createSessionToken(requester)}`)).status).toBe(200);
  });
  for (const role of ["staff", "admin"] as const) it(`rejects ${role} with 403`, async () => { expect((await get(role === "staff" ? staff : admin)).status).toBe(403); });
  it("requires authentication and rejects invalid tokens and unsigned identity headers", async () => {
    expect((await request(app).get('/api/dashboard/requester')).status).toBe(401);
    expect((await request(app).get('/api/dashboard/requester').set("Authorization", "Bearer invalid")).status).toBe(401);
    expect((await request(app).get('/api/dashboard/requester').set("x-requester-id", String(requester.id))).status).toBe(401);
  });
  it("rejects inactive and password-change-required accounts", async () => { expect((await get(inactive)).status).toBe(401); expect((await get(firstLogin)).status).toBe(403); });
  it("uses RepeatableRead for one consistent response snapshot", async () => {
    const spy = vi.fn(p.$transaction.bind(p));
    vi.spyOn(database, "getPrisma").mockReturnValue(new Proxy(p, { get: (target, key) => key === "$transaction" ? spy : Reflect.get(target, key) })); await get(requester);
    expect(spy).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" });
  });
});
