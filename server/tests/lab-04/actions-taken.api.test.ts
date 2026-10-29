import "dotenv/config";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { User, Ticket, ActionTaken, Role } from "@prisma/client";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSessionToken, SESSION_COOKIE_NAME } from "../../src/utils/auth.js";

// Real DB integration tests. Only newly created, random-namespaced fixture IDs
// are deleted; no reset, truncate, upsert or broad deleteMany is used.
describe("Lab 4.4 Actions Taken REST API", () => {
  const prisma = getPrisma();
  const namespace = `lab44-${randomUUID()}`;
  const users: User[] = [];
  const ticketIds: number[] = [];
  let categoryId: number | undefined;
  let requester: User, otherRequester: User, staff: User, admin: User, inactive: User, firstLogin: User;
  let ticket: Ticket, otherTicket: Ticket, action: ActionTaken;
  const valid = { description: "Inspected VPN gateway configuration", result: "Connection restored", followUpRequired: false };
  const auth = (user: User) => `Bearer ${createSessionToken(user)}`;
  const url = () => `/api/tickets/${ticket.id}/actions`;
  const editUrl = () => `${url()}/${action.id}`;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.startsWith("postgresql")) throw new Error("Configure a PostgreSQL DATABASE_URL before running integration tests.");
    await prisma.$connect();
    console.info(`Actions API fixture namespace: ${namespace}; cleanup restricted to IDs created by this suite.`);
    categoryId = (await prisma.category.create({ data: { name: namespace } })).id;
    async function user(label: string, role: Role, extra = {}) {
      const created = await prisma.user.create({ data: {
        email: `${label}-${namespace}@example.test`, name: `Lab44 ${label}`, role,
        passwordHash: "unused-test-password-hash", ...extra,
      } });
      users.push(created);
      return created;
    }
    requester = await user("requester", "REQUESTER");
    otherRequester = await user("other", "REQUESTER");
    staff = await user("staff", "IT_STAFF");
    admin = await user("admin", "ADMINISTRATOR");
    inactive = await user("inactive", "IT_STAFF", { isActive: false });
    firstLogin = await user("first-login", "IT_STAFF", { mustChangePassword: true });
  });
  beforeEach(async () => {
    async function createTicket(owner: User) {
      const created = await prisma.ticket.create({ data: {
        ticketNumber: `${namespace}-${randomUUID()}`, title: "Actions API fixture",
        description: "Isolated integration test fixture", categoryId: categoryId!, requesterId: owner.id,
      } });
      ticketIds.push(created.id);
      return created;
    }
    ticket = await createTicket(requester);
    otherTicket = await createTicket(otherRequester);
    action = await prisma.actionTaken.create({ data: {
      ...valid, ticketId: ticket.id, performedById: staff.id,
      followUpRequired: true, followUpNote: "Check connection tomorrow",
      actionDateTime: new Date("2026-10-28T10:00:00.000Z"),
    } });
  });
  async function cleanupTickets() {
    // Each ID is returned by create() above; cascade removes only our actions.
    for (const id of [...ticketIds]) {
      await prisma.ticket.delete({ where: { id } });
      ticketIds.splice(ticketIds.indexOf(id), 1);
    }
  }
  afterEach(cleanupTickets);
  afterAll(async () => {
    try {
      await cleanupTickets();
      for (const user of users) await prisma.user.delete({ where: { id: user.id } });
      if (categoryId !== undefined) await prisma.category.delete({ where: { id: categoryId } });
    } finally { await prisma.$disconnect(); }
  });

  for (const role of ["staff", "admin"] as const) {
    it(`${role} creates and receives the authenticated performer, ignoring forged identity/relations`, async () => {
      const user = role === "staff" ? staff : admin;
      const res = await request(app).post(url()).set("Authorization", auth(user)).send({
        ...valid, performedById: requester.id, ticketId: otherTicket.id,
        performedBy: { connect: { id: requester.id } }, id: "forged-id", createdAt: "2000-01-01T00:00:00Z",
      });
      expect(res.status).toBe(201);
      expect(res.body.action).toMatchObject({ ticketId: ticket.id, performedById: user.id, performedBy: { id: user.id } });
      expect(res.body.action.id).not.toBe("forged-id");
      expect(res.body.action.performedBy).toEqual({ id: user.id, name: user.name, role: user.role });
      expect(await prisma.actionTaken.findUnique({ where: { id: res.body.action.id } })).toMatchObject({ ticketId: ticket.id, performedById: user.id });
    });
    it(`${role} updates an action without moving it or changing its original performer`, async () => {
      const user = role === "staff" ? staff : admin;
      const res = await request(app).patch(editUrl()).set("Authorization", auth(user)).send({
        description: "Updated inspection details", ticketId: otherTicket.id, performedById: admin.id,
        performedBy: { connect: { id: admin.id } }, ticket: { connect: { id: otherTicket.id } }, id: "new-id",
      });
      expect(res.status).toBe(200);
      expect(res.body.action).toMatchObject({ id: action.id, description: "Updated inspection details", ticketId: ticket.id, performedById: staff.id, followUpRequired: true, followUpNote: action.followUpNote });
      expect(await prisma.actionTaken.findUnique({ where: { id: action.id } })).toMatchObject({ ticketId: ticket.id, performedById: staff.id });
    });
    it(`${role} lists any ticket without an owner assignment`, async () => {
      const user = role === "staff" ? staff : admin;
      expect((await request(app).get(url()).set("Authorization", auth(user))).status).toBe(200);
      expect((await request(app).get(`/api/tickets/${otherTicket.id}/actions`).set("Authorization", auth(user))).status).toBe(200);
    });
  }
  it("rejects requester creation and updates with 403 without changing data", async () => {
    const before = await prisma.actionTaken.findMany({ where: { ticketId: ticket.id } });
    for (const user of [requester, otherRequester]) {
      expect((await request(app).post(url()).set("Authorization", auth(user)).send(valid)).status).toBe(403);
      expect((await request(app).patch(editUrl()).set("Authorization", auth(user)).send({ result: "Forged outcome" })).status).toBe(403);
    }
    expect(await prisma.actionTaken.findMany({ where: { ticketId: ticket.id } })).toEqual(before);
  });
  for (const note of [undefined, null, "", "   ", "ab"]) {
    it(`rejects follow-up creation with invalid note ${JSON.stringify(note)}`, async () => {
      const res = await request(app).post(url()).set("Authorization", auth(staff)).send({ ...valid, followUpRequired: true, followUpNote: note });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("BAD_REQUEST");
      expect(await prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(1);
    });
  }
  it("creates and updates valid trimmed follow-up notes", async () => {
    const created = await request(app).post(url()).set("Authorization", auth(staff)).send({ ...valid, followUpRequired: true, followUpNote: "  Monitor tomorrow  " });
    expect(created.status).toBe(201);
    expect(created.body.action.followUpNote).toBe("Monitor tomorrow");
    const updated = await request(app).patch(editUrl()).set("Authorization", auth(admin)).send({ followUpRequired: true, followUpNote: "  Follow up next week  " });
    expect(updated.status).toBe(200);
    expect(updated.body.action.followUpNote).toBe("Follow up next week");
  });
  for (const note of [null, "", "   ", "ab"]) {
    it(`PATCH validates final follow-up state when only note is changed to ${JSON.stringify(note)}`, async () => {
      expect((await request(app).patch(editUrl()).set("Authorization", auth(staff)).send({ followUpNote: note })).status).toBe(400);
      expect(await prisma.actionTaken.findUnique({ where: { id: action.id } })).toEqual(action);
    });
  }
  it("PATCH cannot enable follow-up on an action without a note", async () => {
    await prisma.actionTaken.update({ where: { id: action.id }, data: { followUpRequired: false, followUpNote: null } });
    expect((await request(app).patch(editUrl()).set("Authorization", auth(staff)).send({ followUpRequired: true })).status).toBe(400);
  });
  it("PATCH preserves createdAt and lets Prisma refresh updatedAt", async () => {
    const old = new Date("2026-01-01T00:00:00Z");
    await prisma.actionTaken.update({ where: { id: action.id }, data: { updatedAt: old } });
    const res = await request(app).patch(editUrl()).set("Authorization", auth(admin)).send({
      result: "Verified network connectivity", createdAt: "2000-01-01T00:00:00Z", updatedAt: "2000-01-01T00:00:00Z",
    });
    expect(res.status).toBe(200);
    expect(res.body.action.createdAt).toBe(action.createdAt.toISOString());
    expect(new Date(res.body.action.updatedAt).getTime()).toBeGreaterThan(old.getTime());
  });
  it("PATCH disabling follow-up clears the note", async () => {
    const res = await request(app).patch(editUrl()).set("Authorization", auth(staff)).send({ followUpRequired: false, followUpNote: " " });
    expect(res.status).toBe(200);
    expect(res.body.action).toMatchObject({ followUpRequired: false, followUpNote: null });
  });
  it("requester lists own actions, with only public performer fields", async () => {
    const res = await request(app).get(url()).set("Authorization", auth(requester));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ticketId: ticket.id, totalActions: 1 });
    expect(res.body.actions[0].performedBy).toEqual({ id: staff.id, name: staff.name, role: staff.role });
  });
  it("requester cannot read someone else's ticket (403)", async () => {
    expect((await request(app).get(url()).set("Authorization", auth(otherRequester))).status).toBe(403);
  });
  it("returns an empty successful list for an existing ticket with no actions", async () => {
    const res = await request(app).get(`/api/tickets/${otherTicket.id}/actions`).set("Authorization", auth(otherRequester));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ actions: [], totalActions: 0 });
  });
  it("lists actions in deterministic actionDateTime/createdAt/id order", async () => {
    for (const id of ["b", "a"]) await prisma.actionTaken.create({ data: {
      ...valid, id: `${namespace}-${id}`, ticketId: ticket.id, performedById: staff.id,
      actionDateTime: new Date("2026-10-29T10:00:00Z"), createdAt: new Date("2026-10-29T11:00:00Z"),
    } });
    const res = await request(app).get(url()).set("Authorization", auth(staff));
    expect(res.body.actions.map((a: ActionTaken) => a.id)).toEqual([`${namespace}-a`, `${namespace}-b`, action.id]);
  });
  for (const method of ["get", "post", "patch"] as const) {
    it(`${method} rejects missing and invalid authentication`, async () => {
      const target = method === "patch" ? editUrl() : url();
      for (const token of [undefined, "Bearer invalid-token"]) {
        const req = request(app)[method](target);
        if (token) req.set("Authorization", token);
        expect((await req.send(valid)).status).toBe(401);
      }
    });
    it(`${method} rejects legacy identity header impersonation`, async () => {
      const target = method === "patch" ? editUrl() : url();
      expect((await request(app)[method](target).set("x-user-id", String(staff.id)).send(valid)).status).toBe(401);
    });
    it(`${method} rejects inactive users and first-login accounts`, async () => {
      const target = method === "patch" ? editUrl() : url();
      expect((await request(app)[method](target).set("Authorization", auth(inactive)).send(valid)).status).toBe(401);
      expect((await request(app)[method](target).set("Authorization", auth(firstLogin)).send(valid)).status).toBe(403);
    });
    it(`${method} returns 404 for a missing ticket`, async () => {
      const deleted = otherTicket.id;
      await prisma.ticket.delete({ where: { id: deleted } });
      ticketIds.splice(ticketIds.indexOf(deleted), 1);
      expect((await request(app)[method](`/api/tickets/${deleted}/actions${method === "patch" ? `/${action.id}` : ""}`).set("Authorization", auth(staff)).send(valid)).status).toBe(404);
    });
    for (const id of ["0", "-1", "1abc", "1.5", "2147483648", "999999999999999999999"]) {
      it(`${method} rejects invalid ticket ID ${id} with 400`, async () => {
        expect((await request(app)[method](`/api/tickets/${id}/actions${method === "patch" ? `/${action.id}` : ""}`).set("Authorization", auth(staff)).send(valid)).status).toBe(400);
      });
    }
  }
  it("accepts the existing signed session cookie", async () => {
    expect((await request(app).get(url()).set("Cookie", `${SESSION_COOKIE_NAME}=${createSessionToken(requester)}`)).status).toBe(200);
  });
  it("returns 404 for a missing action or an action under another ticket", async () => {
    expect((await request(app).patch(`${url()}/missing-action`).set("Authorization", auth(staff)).send(valid)).status).toBe(404);
    expect((await request(app).patch(`/api/tickets/${otherTicket.id}/actions/${action.id}`).set("Authorization", auth(admin)).send(valid)).status).toBe(404);
    expect(await prisma.actionTaken.findUnique({ where: { id: action.id } })).toEqual(action);
  });
  for (const patch of [
    { description: null }, { description: 42 }, { description: "    " }, { description: "abcd" }, { description: "x".repeat(3001) },
    { result: [] }, { result: "  " }, { result: "ab" }, { result: "x".repeat(3001) },
    { followUpRequired: "true" }, { followUpRequired: 1 }, { followUpRequired: null },
    { followUpNote: {} }, { attachmentNotes: true }, { attachmentNotes: "x".repeat(1001) },
    { actionDateTime: 0 }, { actionDateTime: null }, { actionDateTime: "not-a-date" },
    { actionDateTime: "2026-02-30T10:00:00Z" }, { actionDateTime: "2026-13-01T10:00:00Z" },
    { actionDateTime: "2026-10-29" }, { actionDateTime: "2026-10-29T25:00:00Z" },
  ]) {
    it(`rejects invalid fields ${JSON.stringify(patch).slice(0, 85)} for POST and PATCH`, async () => {
      expect((await request(app).post(url()).set("Authorization", auth(staff)).send({ ...valid, ...patch })).status).toBe(400);
      expect((await request(app).patch(editUrl()).set("Authorization", auth(staff)).send(patch)).status).toBe(400);
      expect(await prisma.actionTaken.findUnique({ where: { id: action.id } })).toEqual(action);
    });
  }
  for (const field of ["description", "result", "followUpRequired"] as const) {
    it(`rejects missing required POST field ${field}`, async () => {
      const data: Record<string, unknown> = { ...valid }; delete data[field];
      expect((await request(app).post(url()).set("Authorization", auth(staff)).send(data)).status).toBe(400);
    });
  }
  it("rejects empty and unknown-only PATCH bodies", async () => {
    for (const body of [{}, { performedById: admin.id, ticketId: otherTicket.id }]) {
      expect((await request(app).patch(editUrl()).set("Authorization", auth(staff)).send(body)).status).toBe(400);
    }
  });
  it("rejects array bodies and malformed JSON", async () => {
    for (const method of ["post", "patch"] as const) {
      const target = method === "patch" ? editUrl() : url();
      expect((await request(app)[method](target).set("Authorization", auth(staff)).send([])).status).toBe(400);
      expect((await request(app)[method](target).set("Authorization", auth(staff)).set("Content-Type", "application/json").send('{"description":')).status).toBe(400);
    }
  });
  it("accepts valid dates with timezone offsets and trims text", async () => {
    const res = await request(app).post(url()).set("Authorization", auth(staff)).send({
      ...valid, description: "  Inspected network  ", result: "  All clear  ", attachmentNotes: "  See log.txt  ", actionDateTime: "2026-10-29T17:30:00+07:00",
    });
    expect(res.status).toBe(201);
    expect(res.body.action).toMatchObject({ description: "Inspected network", result: "All clear", attachmentNotes: "See log.txt", actionDateTime: "2026-10-29T10:30:00.000Z" });
  });
});
