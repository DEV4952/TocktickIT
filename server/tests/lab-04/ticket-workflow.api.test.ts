import "dotenv/config";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { User, Ticket, TicketStatus } from "@prisma/client";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSessionToken } from "../../src/utils/auth.js";
import { changeTicketStatus, TICKET_TRANSITIONS } from "../../src/services/ticketWorkflow.js";

// Independent expectation from BR-06, rather than deriving the expected graph from implementation.
const matrix: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"], OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"], REOPENED: ["IN_PROGRESS", "RESOLVED"], CANCELLED: [],
};
describe("Lab 4.6 ticket workflow", () => {
  const p = getPrisma();
  const prefix = `lab46-${randomUUID()}`;
  const users: User[] = [];
  const ticketIds: number[] = [];
  let categoryId: number | undefined;
  let staff: User, admin: User, requester: User, outsider: User;
  let ticket: Ticket;
  const auth = (user: User) => `Bearer ${createSessionToken(user)}`;
  const path = () => `/api/staff/tickets/${ticket.id}/status`;
  const send = (user: User, body: unknown) => request(app).patch(path()).set("Authorization", auth(user)).send(body as object);
  beforeAll(async () => {
    await p.$connect();
    categoryId = (await p.category.create({ data: { name: prefix } })).id;
    for (const [name, role] of [["staff", "IT_STAFF"], ["admin", "ADMINISTRATOR"], ["requester", "REQUESTER"], ["outsider", "REQUESTER"]] as const) {
      users.push(await p.user.create({ data: { email: `${name}-${prefix}@example.test`, name, role, passwordHash: "unused-fixture-hash" } }));
    }
    [staff, admin, requester, outsider] = users;
  });
  beforeEach(async () => {
    ticket = await p.ticket.create({ data: {
      ticketNumber: `${prefix}-${randomUUID()}`, title: "Workflow fixture", description: "Isolated workflow API fixture", categoryId: categoryId!, requesterId: requester.id,
      status: "OPEN", updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    } });
    ticketIds.push(ticket.id);
  });
  async function cleanupTickets() {
    for (const id of [...ticketIds]) { await p.ticket.delete({ where: { id } }); ticketIds.splice(ticketIds.indexOf(id), 1); }
  }
  afterEach(cleanupTickets);
  afterAll(async () => {
    try { await cleanupTickets(); for (const user of users) await p.user.delete({ where: { id: user.id } }); if (categoryId !== undefined) await p.category.delete({ where: { id: categoryId } }); }
    finally { await p.$disconnect(); }
  });
  it("uses exactly the BR-06 matrix", () => { expect(TICKET_TRANSITIONS).toEqual(matrix); });
  for (const role of ["staff", "admin"] as const) for (const from of Object.keys(matrix) as TicketStatus[]) for (const to of Object.keys(matrix) as TicketStatus[]) {
    it(`${role}: ${from} → ${to} ${matrix[from].includes(to) ? "allowed" : "rejected"}`, async () => {
      ticket = await p.ticket.update({ where: { id: ticket.id }, data: { status: from } });
      const before = ticket;
      const res = await send(role === "staff" ? staff : admin, { status: to, currentUpdatedAt: ticket.updatedAt.toISOString(), resolutionSummary: "Test transition audit" });
      if (matrix[from].includes(to)) {
        expect(res.status).toBe(200); expect(res.body.ticket.status).toBe(to);
        expect(Date.parse(res.body.ticket.updatedAt)).toBeGreaterThan(before.updatedAt.getTime());
        expect(await p.comment.count({ where: { ticketId: ticket.id } })).toBe(1);
      } else {
        expect(res.status).toBe(400); expect(res.body.error).toBe("INVALID_STATUS_TRANSITION");
        expect(await p.ticket.findUnique({ where: { id: ticket.id } })).toEqual(before);
        expect(await p.comment.count({ where: { ticketId: ticket.id } })).toBe(0);
      }
    });
  }
  it("rejects Requester status updates before validation or record disclosure", async () => {
    for (const user of [requester, outsider]) {
      expect((await send(user, { status: "RESOLVED", currentUpdatedAt: ticket.updatedAt.toISOString() })).status).toBe(403);
      expect((await request(app).patch('/api/staff/tickets/2147483647/status').set("Authorization", auth(user)).send({})).status).toBe(403);
    }
    expect(await p.ticket.findUnique({ where: { id: ticket.id } })).toEqual(ticket);
    expect(await p.comment.count({ where: { ticketId: ticket.id } })).toBe(0);
  });
  it("has no general ticket update endpoint that bypasses workflow", async () => {
    for (const method of ["patch", "put"] as const) {
      const res = await request(app)[method](`/api/tickets/${ticket.id}`).set("Authorization", auth(requester)).send({ status: "RESOLVED" });
      expect(res.status).toBe(404); // No general ticket update route exists.
    }
    expect(await p.ticket.findUnique({ where: { id: ticket.id } })).toEqual(ticket);
  });
  it("requester advisory is feedback only, ignoring forged status and preserving ownership isolation", async () => {
    const forbidden = await request(app).post(`/api/tickets/${ticket.id}/resolve-indication`).set("Authorization", auth(outsider)).send({ status: "RESOLVED" });
    expect(forbidden.status).toBe(404);
    const res = await request(app).post(`/api/tickets/${ticket.id}/resolve-indication`).set("Authorization", auth(requester)).send({ status: "RESOLVED", comment: "Appears fixed" });
    expect(res.status).toBe(200);
    expect(await p.ticket.findUnique({ where: { id: ticket.id } })).toMatchObject({ status: "OPEN", problemAppearsResolved: true });
    expect(await p.comment.findMany({ where: { ticketId: ticket.id } })).toEqual([expect.objectContaining({ body: "Appears fixed", authorId: requester.id })]);
    expect((await send(staff, { status: "RESOLVED", currentUpdatedAt: ticket.updatedAt.toISOString() })).status).toBe(409);
  });
  for (const version of [undefined, null, 123, "", "yesterday", "2026-01-01", "2026-02-30T00:00:00.000Z", "2026-01-01T00:00:00Z", {}, []]) {
    it(`rejects missing/malformed concurrency token ${JSON.stringify(version)}`, async () => {
      const res = await send(staff, { status: "RESOLVED", currentUpdatedAt: version }); expect(res.status).toBe(400); expect(res.body.error).toBe("INVALID_VERSION");
      expect(await p.ticket.findUnique({ where: { id: ticket.id } })).toEqual(ticket);
    });
  }
  it("resolves without requiring an Action Taken and accepts optional resolutionNote alias", async () => {
    const res = await send(admin, { status: "RESOLVED", currentUpdatedAt: ticket.updatedAt.toISOString(), resolutionNote: "  Verified fix  " });
    expect(res.status).toBe(200); expect(res.body.ticket.status).toBe("RESOLVED");
    expect(await p.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);
    expect(await p.comment.findFirst({ where: { ticketId: ticket.id } })).toMatchObject({ body: "[Resolution Summary]: Verified fix", authorId: admin.id });
  });
  it("stale valid tokens return 409 with latest ticket, no mutation and no extra audit", async () => {
    const res = await send(staff, { status: "IN_PROGRESS", currentUpdatedAt: ticket.updatedAt.toISOString(), resolutionSummary: "First change" });
    expect(res.status).toBe(200);
    const latest = await p.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    const stale = await send(admin, { status: "RESOLVED", currentUpdatedAt: ticket.updatedAt.toISOString(), resolutionSummary: "Stale change" });
    expect(stale.status).toBe(409); expect(stale.body.ticket).toMatchObject({ status: "IN_PROGRESS", updatedAt: latest.updatedAt.toISOString() });
    expect(await p.ticket.findUnique({ where: { id: ticket.id } })).toEqual(latest);
    expect(await p.comment.count({ where: { ticketId: ticket.id } })).toBe(1);
  });
  it("rolls back the status update if audit insertion fails", async () => {
    const deletedActor = await p.user.create({ data: { email: "deleted-" + prefix + "@example.test", name: "Deleted actor fixture", passwordHash: "unused" } });
    users.push(deletedActor);
    await p.user.delete({ where: { id: deletedActor.id } });
    users.pop();
    // Simulate an actor removed after authorization but before audit insertion.
    await expect(changeTicketStatus(String(ticket.id), { status: "RESOLVED", currentUpdatedAt: ticket.updatedAt.toISOString(), resolutionSummary: "Must roll back" }, deletedActor.id)).rejects.toMatchObject({ code: "P2003" });
    expect(await p.ticket.findUnique({ where: { id: ticket.id } })).toEqual(ticket);
    expect(await p.comment.count({ where: { ticketId: ticket.id } })).toBe(0);
  });
  it("two concurrent submissions of one token produce exactly one success and one conflict", async () => {
    const initial = ticket.updatedAt.toISOString();
    const responses = await Promise.all([
      send(staff, { status: "IN_PROGRESS", currentUpdatedAt: initial, resolutionSummary: "Staff update" }),
      send(admin, { status: "RESOLVED", currentUpdatedAt: initial, resolutionSummary: "Admin update" }),
    ]);
    expect(responses.map(res => res.status).sort()).toEqual([200, 409]);
    const success = responses.find(res => res.status === 200)!;
    const failed = responses.find(res => res.status === 409)!;
    expect(failed.body.ticket.status).toBe(success.body.ticket.status);
    expect(await p.comment.count({ where: { ticketId: ticket.id } })).toBe(1);
  });
  it("advances tokens monotonically even if the previous token is in the future", async () => {
    ticket = await p.ticket.update({ where: { id: ticket.id }, data: { updatedAt: new Date("2099-01-01T00:00:00.000Z") } });
    const res = await send(staff, { status: "IN_PROGRESS", currentUpdatedAt: ticket.updatedAt.toISOString() });
    expect(res.status).toBe(200); expect(Date.parse(res.body.ticket.updatedAt)).toBe(ticket.updatedAt.getTime() + 1);
  });
  it("rejects unauthenticated updates", async () => { expect((await request(app).patch(path()).send({ status: "RESOLVED" })).status).toBe(401); });
  for (const status of [null, 1, "UNKNOWN", "__proto__", {}]) {
    it(`rejects invalid status ${JSON.stringify(status)}`, async () => { expect((await send(staff, { status, currentUpdatedAt: ticket.updatedAt.toISOString() })).status).toBe(400); });
  }
  it("returns 404 for a missing ticket", async () => {
    const id = ticket.id; await p.ticket.delete({ where: { id } }); ticketIds.splice(ticketIds.indexOf(id), 1);
    expect((await send(staff, { status: "RESOLVED", currentUpdatedAt: ticket.updatedAt.toISOString() })).status).toBe(404);
  });
  it("preserves ticket-number addressing", async () => {
    expect((await request(app).patch(`/api/staff/tickets/${ticket.ticketNumber}/status`).set("Authorization", auth(staff)).send({ status: "RESOLVED", currentUpdatedAt: ticket.updatedAt.toISOString() })).status).toBe(200);
  });
});
