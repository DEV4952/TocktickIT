import "dotenv/config";
import { beforeAll, beforeEach, afterAll, afterEach, describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSessionToken } from "../../src/utils/auth.js";
import { mutateAction } from "../../src/services/actionLifecycle.js";
import { dashboardFixtures } from "./dashboardFixtures.js";
import type { User, ActionTaken, Ticket, ActionTakenStatus } from "@prisma/client";
const matrix: Record<ActionTakenStatus, ActionTakenStatus[]> = { RECORDED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"], IN_PROGRESS: ["COMPLETED", "CANCELLED"], COMPLETED: [], CANCELLED: [] };
describe("Actions Taken assignment, lifecycle and append-only history", () => {
 const p = getPrisma(), fixture = dashboardFixtures(p);
 let staff: User, admin: User, requester: User, outsider: User, inactive: User;
 let ticket: Ticket, action: ActionTaken;
 const base = { description: "Inspected gateway configuration", result: "Gateway restored", followUpRequired: false };
 const auth = (u: User) => `Bearer ${createSessionToken(u)}`;
 const url = () => `/api/tickets/${ticket.id}/actions`;
 const patch = (u: User, data: object) => request(app).patch(`${url()}/${action.id}`).set("Authorization", auth(u)).send(data);
 const change = (u: User, status: unknown, version = action.updatedAt.toISOString()) => request(app).patch(`${url()}/${action.id}/status`).set("Authorization", auth(u)).send({ status, currentUpdatedAt: version });
 beforeAll(async () => { await fixture.setup(); staff = await fixture.user("staff", "IT_STAFF"); admin = await fixture.user("admin", "ADMINISTRATOR"); requester = await fixture.user("requester", "REQUESTER"); outsider = await fixture.user("outsider", "REQUESTER"); inactive = await fixture.user("inactive", "IT_STAFF", { isActive: false }); });
 beforeEach(async () => {
  ticket = await fixture.ticket(requester.id, "OPEN", new Date());
  const res = await request(app).post(url()).set("Authorization", auth(staff)).send(base);
  expect(res.status).toBe(201);
  action = await p.actionTaken.findUniqueOrThrow({ where: { id: res.body.action.id } });
 });
 afterEach(async () => { await fixture.removeTicket(ticket.id); });
 afterAll(() => fixture.cleanup());
 it("defaults assignment to the authenticated creator and appends CREATED, ignoring forged identity/status/history", async () => {
  const res = await request(app).post(url()).set("Authorization", auth(staff)).send({ ...base, performedById: admin.id, status: "COMPLETED", history: [{ event: "FORGED" }], assigneeId: admin.id });
  expect(res.status).toBe(201); expect(res.body.action).toMatchObject({ performedById: staff.id, assigneeId: admin.id, status: "RECORDED" });
  expect(action.assigneeId).toBe(staff.id);
  const history = await p.actionTakenHistory.findMany({ where: { actionId: res.body.action.id } });
  expect(history).toHaveLength(1); expect(history[0]).toMatchObject({ event: "CREATED", actorId: staff.id, before: null });
 });
 for (const role of ["staff", "admin"] as const) for (const from of Object.keys(matrix) as ActionTakenStatus[]) for (const to of Object.keys(matrix) as ActionTakenStatus[]) {
  it(`${role}: ${from} → ${to}`, async () => {
   action = await p.actionTaken.update({ where: { id: action.id }, data: { status: from } });
   const before = action; const count = await p.actionTakenHistory.count({ where: { actionId: action.id } });
   const res = await change(role === "staff" ? staff : admin, to);
   expect(res.status).toBe(matrix[from].includes(to) ? 200 : 400);
   expect(await p.actionTakenHistory.count({ where: { actionId: action.id } })).toBe(count + (matrix[from].includes(to) ? 1 : 0));
   if (res.status === 200) { expect(res.body.action.status).toBe(to); expect(Date.parse(res.body.action.updatedAt)).toBeGreaterThan(before.updatedAt.getTime()); }
   else expect(await p.actionTaken.findUnique({ where: { id: action.id } })).toEqual(before);
  });
 }
 it("assigns/reassigns without changing original performer or Ticket owner, with before/after history", async () => {
  const res = await patch(admin, { assigneeId: admin.id, currentUpdatedAt: action.updatedAt.toISOString() });
  expect(res.status).toBe(200); expect(res.body.action).toMatchObject({ performedById: staff.id, assigneeId: admin.id });
  expect((await p.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).ownerId).toBeNull();
  const history = await p.actionTakenHistory.findMany({ where: { actionId: action.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  expect(history[1]).toMatchObject({ event: "ASSIGNED", actorId: admin.id, before: expect.objectContaining({ assigneeId: staff.id }), after: expect.objectContaining({ assigneeId: admin.id }) });
 });
 for (const invalid of ["inactive", "requester", "missing", "string", "negative"] as const) {
  it(`rejects ${invalid} assignee on create and update without extra history`, async () => {
   const value = invalid === "inactive" ? inactive.id : invalid === "requester" ? requester.id : invalid === "missing" ? 2147483647 : invalid === "string" ? "3" : -1;
   expect((await request(app).post(url()).set("Authorization", auth(staff)).send({ ...base, assigneeId: value })).status).toBe(400);
   expect((await patch(admin, { assigneeId: value })).status).toBe(400);
   expect(await p.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(1);
   expect(await p.actionTakenHistory.count({ where: { actionId: action.id } })).toBe(1);
  });
 }
 it("rejects an assignee deactivated after assignment", async () => {
  action = await p.actionTaken.update({ where: { id: action.id }, data: { assigneeId: inactive.id } });
  expect((await change(staff, "COMPLETED")).status).toBe(400);
 });
 it("legacy unassigned actions must be assigned to start/complete, but may be cancelled", async () => {
  action = await p.actionTaken.update({ where: { id: action.id }, data: { assigneeId: null } });
  expect((await change(staff, "IN_PROGRESS")).status).toBe(400); expect((await change(admin, "COMPLETED")).status).toBe(400);
  expect((await change(staff, "CANCELLED")).status).toBe(200);
 });
 for (const status of ["COMPLETED", "CANCELLED"] as const) it(`terminal ${status} rejects content and assignment edits`, async () => {
  action = await p.actionTaken.update({ where: { id: action.id }, data: { status } });
  expect((await patch(staff, { result: "New result" })).status).toBe(400); expect((await patch(admin, { assigneeId: admin.id })).status).toBe(400);
  expect(await p.actionTaken.findUnique({ where: { id: action.id } })).toEqual(action);
 });
 it("Requester cannot create, edit, assign or transition; can read own history only", async () => {
  expect((await request(app).post(url()).set("Authorization", auth(requester)).send(base)).status).toBe(403);
  expect((await patch(requester, { assigneeId: admin.id })).status).toBe(403); expect((await change(requester, "COMPLETED")).status).toBe(403);
  const res = await request(app).get(`${url()}/${action.id}/history`).set("Authorization", auth(requester));
  expect(res.status).toBe(200); expect(res.body.history[0].actor).toEqual({ id: staff.id, name: staff.name, role: staff.role });
  expect((await request(app).get(`${url()}/${action.id}/history`).set("Authorization", auth(outsider))).status).toBe(403);
  expect(await p.actionTakenHistory.count({ where: { actionId: action.id } })).toBe(1);
 });
 it("preserves previous content in immutable ordered history; no history mutation endpoint", async () => {
  const first = await patch(staff, { result: "Second outcome" }); expect(first.status).toBe(200);
  const second = await patch(admin, { result: "Third outcome" }); expect(second.status).toBe(200);
  const res = await request(app).get(`${url()}/${action.id}/history`).set("Authorization", auth(requester));
  expect(res.body.history.map((h: { event: string }) => h.event)).toEqual(["CREATED", "UPDATED", "UPDATED"]);
  expect(res.body.history[1].before.result).toBe(base.result); expect(res.body.history[1].after.result).toBe("Second outcome");
  const historyId = res.body.history[0].id;
  for (const method of ["patch", "delete"] as const) expect((await request(app)[method](`${url()}/${action.id}/history/${historyId}`).set("Authorization", auth(admin)).send({ event: "FORGED" })).status).toBe(404);
  expect(await p.actionTakenHistory.count({ where: { actionId: action.id } })).toBe(3);
 });
 for (const version of [undefined, null, "bad", "2026-02-30T00:00:00.000Z"]) it(`rejects invalid lifecycle version ${String(version)}`, async () => {
  expect((await request(app).patch(`${url()}/${action.id}/status`).set("Authorization", auth(staff)).send({ status: "COMPLETED", currentUpdatedAt: version })).status).toBe(400);
 });
 it("concurrent requests using one token produce exactly one event and one 409", async () => {
  const responses = await Promise.all([change(staff, "IN_PROGRESS"), change(admin, "CANCELLED")]);
  expect(responses.map(res => res.status).sort()).toEqual([200, 409]); expect(await p.actionTakenHistory.count({ where: { actionId: action.id } })).toBe(2);
  expect((await patch(staff, { result: "Stale result", currentUpdatedAt: action.updatedAt.toISOString() })).status).toBe(409);
 });
 it("rolls back action edits when append-only audit insertion fails", async () => {
  await expect(mutateAction(action.id, ticket.id, 2147483647, { result: "Must roll back" })).rejects.toMatchObject({ code: "P2003" });
  expect(await p.actionTaken.findUnique({ where: { id: action.id } })).toEqual(action); expect(await p.actionTakenHistory.count({ where: { actionId: action.id } })).toBe(1);
 });
 it("checks parent/record existence and authentication on the new endpoints", async () => {
  expect((await request(app).get(`${url()}/${action.id}/history`)).status).toBe(401);
  expect((await request(app).patch(`${url()}/${action.id}/status`).send({ status: "COMPLETED" })).status).toBe(401);
  expect((await request(app).get(`${url()}/missing/history`).set("Authorization", auth(staff))).status).toBe(404);
  const other = await fixture.ticket(outsider.id, "OPEN", new Date());
  expect((await request(app).patch(`/api/tickets/${other.id}/actions/${action.id}/status`).set("Authorization", auth(admin)).send({ status: "COMPLETED", currentUpdatedAt: action.updatedAt.toISOString() })).status).toBe(404);
  await fixture.removeTicket(other.id);
 });
});
