import * as database from "../../src/prisma.js";
﻿import "dotenv/config";
import { Prisma, User } from "@prisma/client";
import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSessionToken } from "../../src/utils/auth.js";
import { dashboardFixtures, REFERENCE } from "./dashboardFixtures.js";
const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
const priorities = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;

describe("Lab 4.7 staff dashboard API", () => {
  const p = getPrisma(); const fixtures = dashboardFixtures(p);
  let staff: User, other: User, admin: User, requester: User, inactive: User, firstLogin: User;
  let baselineUnassigned: number;
  let baselineStatus: Record<string, number>, baselinePriority: Record<string, number>;
  let baselineAccounts: Record<string, number>;
  const ids: number[] = [];
  const transientIds: number[] = [];
  const auth = (u: User) => `Bearer ${createSessionToken(u)}`;
  const get = (u: User, query = "") => request(app).get('/api/dashboard/staff' + query).set("Authorization", auth(u));
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL!);
    console.info(`Staff dashboard test DB: ${target.hostname}${target.pathname}; exact-ID fixture cleanup, no shared-data deletion.`);
    await p.$connect(); await fixtures.setup();
    baselineUnassigned = (await p.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM tickets WHERE "ownerId" IS NULL`)[0].count;
    const s = await p.$queryRaw<Array<{ status: string; count: number }>>`SELECT status,COUNT(*)::int AS count FROM tickets GROUP BY status`;
    const q = await p.$queryRaw<Array<{ priority: string; count: number }>>`SELECT "itPriority" AS priority,COUNT(*)::int AS count FROM tickets GROUP BY "itPriority"`;
    baselineStatus = Object.fromEntries(s.map(row => [row.status, row.count])); baselinePriority = Object.fromEntries(q.map(row => [row.priority, row.count]));
    baselineAccounts = (await p.$queryRaw<Array<Record<string, number>>>`
      SELECT COUNT(*)::int AS "totalUsers",(COUNT(*) FILTER(WHERE "isActive"))::int AS "activeUsers",
      (COUNT(*) FILTER(WHERE NOT "isActive"))::int AS "inactiveUsers",(COUNT(*) FILTER(WHERE role::text='REQUESTER'))::int AS "requesterCount",
      (COUNT(*) FILTER(WHERE role::text='IT_STAFF'))::int AS "itStaffCount",(COUNT(*) FILTER(WHERE role::text='ADMINISTRATOR'))::int AS "adminCount" FROM users`)[0];
    staff = await fixtures.user("staff", "IT_STAFF"); other = await fixtures.user("other", "IT_STAFF");
    admin = await fixtures.user("admin", "ADMINISTRATOR"); requester = await fixtures.user("requester", "REQUESTER");
    inactive = await fixtures.user("inactive", "REQUESTER", { isActive: false }); firstLogin = await fixtures.user("first", "IT_STAFF", { mustChangePassword: true });
    const owners = [staff.id, other.id, null, null, admin.id, staff.id, other.id, null];
    for (let i = 0; i < statuses.length; i++) ids.push((await fixtures.ticket(requester.id, statuses[i], REFERENCE, owners[i], priorities[i % 4])).id);
    await fixtures.children(ids[2], staff.id);
  });
  beforeEach(() => { vi.spyOn(Date, "now").mockReturnValue(REFERENCE.getTime()); });
  afterEach(async () => {
    try { for (const id of transientIds.splice(0)) await fixtures.removeTicket(id); }
    finally { vi.restoreAllMocks(); }
  });
  afterAll(() => fixtures.cleanup());

  it("returns exact unassigned and session-user ownership counts with all statuses included", async () => {
    const a = await get(staff); const b = await get(other); const c = await get(admin);
    expect(a.status).toBe(200); expect(b.status).toBe(200); expect(c.status).toBe(200);
    expect(a.body.metrics.unassignedCount).toBe(baselineUnassigned + 3);
    expect(a.body.metrics.myAssignedCount).toBe(2); expect(b.body.metrics.myAssignedCount).toBe(2); expect(c.body.metrics.myAssignedCount).toBe(1);
    // Includes staff-owned CLOSED ticket and admin-owned RESOLVED ticket, matching queue policy.
  });
  it("matches independent PostgreSQL unassigned and ownership queries", async () => {
    const [expected] = await p.$queryRaw<Array<Record<string, number>>>(Prisma.sql`SELECT
      (COUNT(*) FILTER(WHERE "ownerId" IS NULL))::int AS "unassignedCount",
      (COUNT(*) FILTER(WHERE "ownerId"=${staff.id}))::int AS "myAssignedCount" FROM tickets`);
    const res = await get(staff);
    expect(res.body.metrics.unassignedCount).toBe(expected.unassignedCount); expect(res.body.metrics.myAssignedCount).toBe(expected.myAssignedCount);
  });
  it("aggregates status and real IT priority, rather than requester priority", async () => {
    const res = await get(staff);
    for (const status of statuses) expect(res.body.breakdowns.byStatus[status]).toBe((baselineStatus[status] || 0) + 1);
    for (const priority of priorities) expect(res.body.breakdowns.byPriority[priority]).toBe((baselinePriority[priority] || 0) + 2);
    expect(res.body.metrics).toMatchObject({ newCount: (baselineStatus.NEW || 0) + 1, openCount: (baselineStatus.OPEN || 0) + 1, inProgressCount: (baselineStatus.IN_PROGRESS || 0) + 1, waitingRequesterCount: (baselineStatus.WAITING_FOR_REQUESTER || 0) + 1 });
    const sqlStatuses = await p.$queryRaw<Array<{ status: string; count: number }>>`SELECT status,COUNT(*)::int AS count FROM tickets GROUP BY status`;
    const sqlPriority = await p.$queryRaw<Array<{ priority: string; count: number }>>`SELECT "itPriority" AS priority,COUNT(*)::int AS count FROM tickets GROUP BY "itPriority"`;
    for (const row of sqlStatuses) expect(res.body.breakdowns.byStatus[row.status]).toBe(row.count);
    for (const row of sqlPriority) expect(res.body.breakdowns.byPriority[row.priority]).toBe(row.count);
  });
  it("uses deterministic bounded recent-ticket summaries across the shared staff queue", async () => {
    const expected = await p.$queryRaw`SELECT id,"ticketNumber",title,status,"updatedAt" FROM tickets ORDER BY "updatedAt" DESC,id DESC LIMIT 5`;
    const res = await get(staff);
    expect(res.body.recentTickets).toEqual(JSON.parse(JSON.stringify(expected))); expect(res.body.recentTickets).toHaveLength(5);
    // All eight fixtures have identical timestamps; SQL id DESC resolves their ties.
    for (const row of res.body.recentTickets) expect(Object.keys(row).sort()).toEqual(["id", "ticketNumber", "title", "status", "updatedAt"].sort());
  });
  it("ignores query/body identity and limit overrides", async () => {
    const normal = await get(staff);
    const forged = await get(staff, `?userId=${other.id}&ownerId=${other.id}&requesterId=${requester.id}&limit=999`).set("x-user-id", String(admin.id)).send({ userId: other.id });
    expect(forged.body).toEqual(normal.body); expect(forged.body.metrics.myAssignedCount).toBe(2); expect(forged.body).not.toHaveProperty("userMetrics");
  });
  it("administrator receives exact account statistics, including inactive accounts", async () => {
    const res = await get(admin);
    expect(res.body.userMetrics).toEqual({
      totalUsers: baselineAccounts.totalUsers + 6, activeUsers: baselineAccounts.activeUsers + 5, inactiveUsers: baselineAccounts.inactiveUsers + 1,
      requesterCount: baselineAccounts.requesterCount + 2, itStaffCount: baselineAccounts.itStaffCount + 3, adminCount: baselineAccounts.adminCount + 1,
    });
    const [expected] = await p.$queryRaw<Array<Record<string, number>>>`SELECT COUNT(*)::int AS "totalUsers",
      (COUNT(*) FILTER(WHERE "isActive"))::int AS "activeUsers",(COUNT(*) FILTER(WHERE NOT "isActive"))::int AS "inactiveUsers",
      (COUNT(*) FILTER(WHERE role::text='REQUESTER'))::int AS "requesterCount",(COUNT(*) FILTER(WHERE role::text='IT_STAFF'))::int AS "itStaffCount",
      (COUNT(*) FILTER(WHERE role::text='ADMINISTRATOR'))::int AS "adminCount" FROM users`;
    expect(res.body.userMetrics).toEqual(expected);
    expect(Object.values(res.body.userMetrics).every(value => typeof value === "number")).toBe(true);
  });
  it("does not expose account statistics or secrets to staff", async () => {
    const res = await get(staff); expect(res.body).not.toHaveProperty("userMetrics");
    for (const key of ["password", "passwordHash", "session", "token", "email"]) expect(JSON.stringify(res.body)).not.toContain(`"${key}":`);
  });
  it("counts tickets with several children once, with no join multiplication", async () => {
    expect(await p.actionTaken.count({ where: { ticketId: ids[2] } })).toBe(2);
    expect(await p.comment.count({ where: { ticketId: ids[2] } })).toBe(2);
    const res = await get(staff);
    expect(res.body.metrics.unassignedCount).toBe(baselineUnassigned + 3);
    expect(res.body.breakdowns.byStatus.IN_PROGRESS).toBe((baselineStatus.IN_PROGRESS || 0) + 1);
  });
  it("rejects Requesters and unauthenticated callers", async () => {
    expect((await get(requester)).status).toBe(403);
    expect((await request(app).get('/api/dashboard/staff')).status).toBe(401);
    expect((await request(app).get('/api/dashboard/staff').set("Authorization", "Bearer invalid")).status).toBe(401);
    expect((await request(app).get('/api/dashboard/staff').set("x-user-id", String(staff.id))).status).toBe(401);
    expect((await get(firstLogin)).status).toBe(403);
  });
  it("uses RepeatableRead so metrics, list and admin statistics share one snapshot", async () => {
    const spy = vi.fn(p.$transaction.bind(p));
    vi.spyOn(database, "getPrisma").mockReturnValue(new Proxy(p, { get: (target, key) => key === "$transaction" ? spy : Reflect.get(target, key) })); await get(admin);
    expect(spy).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" });
  });
  it("matches independent SQL for all daily deltas using UTC creation cohorts", async () => {
    const dayStart = new Date("2090-10-30T00:00:00.000Z");
    const previousStart = new Date("2090-10-29T00:00:00.000Z");
    const rows = [
      ["NEW", previousStart], ["NEW", dayStart], ["NEW", REFERENCE], // +1
      ["OPEN", previousStart], ["OPEN", new Date(dayStart.getTime() - 1)], ["OPEN", dayStart], // -1
      ["IN_PROGRESS", previousStart], ["IN_PROGRESS", dayStart], // 0
      ["WAITING_FOR_REQUESTER", dayStart], // neutral 0: no yesterday records
      ["NEW", new Date(previousStart.getTime() - 1)], // exclude before yesterday
      ["NEW", new Date(REFERENCE.getTime() + 1)], // exclude future today
    ] as const;
    for (const [status, createdAt] of rows) transientIds.push((await fixtures.ticket(requester.id, status, REFERENCE, staff.id, "HIGH", createdAt)).id);
    const res = await get(staff);
    expect(res.body.metrics).toMatchObject({ newDelta: 1, openDelta: -1, inProgressDelta: 0, waitingRequesterDelta: 0, myAssignedDelta: 1 });
    const sql = await p.$queryRaw<Array<{ status: string; today: number; yesterday: number }>>(Prisma.sql`
      SELECT status,
        (COUNT(*) FILTER(WHERE "createdAt" >= (${dayStart} AT TIME ZONE 'UTC') AND "createdAt" <= (${REFERENCE} AT TIME ZONE 'UTC')))::int AS today,
        (COUNT(*) FILTER(WHERE "createdAt" >= (${previousStart} AT TIME ZONE 'UTC') AND "createdAt" < (${dayStart} AT TIME ZONE 'UTC')))::int AS yesterday
      FROM tickets GROUP BY status`);
    for (const [status, field] of [["NEW", "newDelta"], ["OPEN", "openDelta"], ["IN_PROGRESS", "inProgressDelta"], ["WAITING_FOR_REQUESTER", "waitingRequesterDelta"]]) {
      const row = sql.find(row => row.status === status);
      expect(res.body.metrics[field]).toBe(row?.yesterday ? row.today - row.yesterday : 0);
    }
    const assigned = await p.$queryRaw<Array<{ today: number; yesterday: number }>>(Prisma.sql`
      SELECT (COUNT(*) FILTER(WHERE "createdAt" >= (${dayStart} AT TIME ZONE 'UTC') AND "createdAt" <= (${REFERENCE} AT TIME ZONE 'UTC')))::int AS today,
        (COUNT(*) FILTER(WHERE "createdAt" >= (${previousStart} AT TIME ZONE 'UTC') AND "createdAt" < (${dayStart} AT TIME ZONE 'UTC')))::int AS yesterday
      FROM tickets WHERE "ownerId"=${staff.id}`);
    expect(res.body.metrics.myAssignedDelta).toBe(assigned[0].yesterday ? assigned[0].today - assigned[0].yesterday : 0);
    expect((await get(admin)).body.metrics.myAssignedDelta).toBe(0);
  });
  it("returns every zero category and empty list for an isolated empty aggregate snapshot (mocked)", async () => {
    // DB role cannot CREATE DATABASE/SCHEMA, and staff policy is global. Never
    // empty the shared DB or add a production filter just to simulate this case.
    const snapshot = { ticket: { count: vi.fn().mockResolvedValue(0), groupBy: vi.fn().mockResolvedValue([]), findMany: vi.fn().mockResolvedValue([]) },
      user: { count: vi.fn().mockResolvedValue(0), groupBy: vi.fn().mockResolvedValue([]) } };
    vi.spyOn(database, "getPrisma").mockReturnValue(new Proxy(p, { get: (target, key) => key === "$transaction" ? async (callback: (tx: unknown) => Promise<unknown>) => callback(snapshot) : Reflect.get(target, key) }));
    for (const u of [staff, admin]) {
      const res = await get(u); expect(res.status).toBe(200);
      expect(Object.values(res.body.metrics).every(value => value === 0)).toBe(true); expect(res.body.recentTickets).toEqual([]);
      expect(res.body.breakdowns.byStatus).toEqual(Object.fromEntries(statuses.map(s => [s, 0])));
      expect(res.body.breakdowns.byPriority).toEqual(Object.fromEntries(priorities.map(s => [s, 0])));
      if (u === admin) expect(Object.values(res.body.userMetrics).every(value => value === 0)).toBe(true);
    }
  });
});
