import { Prisma, ActionTakenStatus } from "@prisma/client";
import { getPrisma } from "../prisma.js";
export class ActionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const ACTION_TRANSITIONS: Record<ActionTakenStatus, readonly ActionTakenStatus[]> = {
  RECORDED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"], IN_PROGRESS: ["COMPLETED", "CANCELLED"], COMPLETED: [], CANCELLED: [],
};
export const actionPeople = {
  performedBy: { select: { id: true, name: true, role: true } },
  assignee: { select: { id: true, name: true, role: true } },
} as const;
const snapshot = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
export function actionVersion(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw new ActionError(400, "Supply the currentUpdatedAt token returned by the action API.");
  return value;
}
async function assignee(tx: Prisma.TransactionClient, value: unknown) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 2147483647) throw new ActionError(400, "Invalid assignee ID.");
  // Lock the account through commit so concurrent deactivation cannot pass validation.
  const rows = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT id FROM users WHERE id=${value} AND "isActive"=true AND role::text IN ('IT_STAFF','ADMINISTRATOR') FOR SHARE`);
  if (!rows.length) throw new ActionError(400, "Assignee must be an active IT Staff member or Administrator.");
  return value;
}
export async function createRecordedAction(data: Prisma.ActionTakenUncheckedCreateInput, chosenAssignee: unknown, actorId: number) {
  return getPrisma().$transaction(async tx => {
    const assigneeId = await assignee(tx, chosenAssignee);
    const action = await tx.actionTaken.create({ data: { ...data, assigneeId, status: "RECORDED" }, include: actionPeople });
    // Scalar snapshots do not leak account credentials or mutable profile data.
    const row = await tx.actionTaken.findUniqueOrThrow({ where: { id: action.id } });
    await tx.actionTakenHistory.create({ data: { actionId: action.id, actorId, event: "CREATED", after: snapshot(row) } });
    return action;
  });
}
export async function mutateAction(id: string, ticketId: number, actorId: number, data: Prisma.ActionTakenUncheckedUpdateInput, version?: string, transition = false) {
  return getPrisma().$transaction(async tx => {
    const before = await tx.actionTaken.findFirst({ where: { id, ticketId } });
    if (!before) throw new ActionError(404, "Action not found for this ticket.");
    if (version !== undefined && before.updatedAt.toISOString() !== version) throw new ActionError(409, "Action was updated by another user. Reload actions before trying again.");
    if (!ACTION_TRANSITIONS[before.status].length) throw new ActionError(400, "Completed or cancelled actions cannot be changed.");
    if (Object.hasOwn(data, "assigneeId")) data.assigneeId = await assignee(tx, data.assigneeId);
    if (transition) {
      if (typeof data.status !== "string" || !ACTION_TRANSITIONS[before.status].includes(data.status)) throw new ActionError(400, "Disallowed action status transition.");
      if (data.status !== "CANCELLED") {
        if (before.assigneeId === null) throw new ActionError(400, "Assign an active staff member before starting or completing this action.");
        await assignee(tx, before.assigneeId);
      }
    }
    const changed = await tx.actionTaken.updateMany({ where: { id, ticketId, updatedAt: before.updatedAt }, data: { ...data, updatedAt: new Date(Math.max(Date.now(), before.updatedAt.getTime() + 1)) } });
    if (changed.count !== 1) throw new ActionError(409, "Action changed concurrently. Reload actions before trying again.");
    const after = await tx.actionTaken.findUniqueOrThrow({ where: { id } });
    await tx.actionTakenHistory.create({ data: { actionId: id, actorId, event: transition ? "STATUS_CHANGED" : Object.hasOwn(data, "assigneeId") && before.assigneeId !== after.assigneeId ? "ASSIGNED" : "UPDATED", before: snapshot(before), after: snapshot(after) } });
    return tx.actionTaken.findUniqueOrThrow({ where: { id }, include: actionPeople });
  });
}
