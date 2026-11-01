import { getPrisma } from "../prisma.js";
import type { TicketStatus } from "@prisma/client";

export const TICKET_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "RESOLVED"], CANCELLED: [],
};
const include = {
  category: true,
  requester: { select: { id: true, name: true, email: true, department: true } },
  owner: { select: { id: true, name: true, email: true, role: true } },
} as const;
export class WorkflowError extends Error {
  constructor(public status: number, public code: string, message: string, public latest?: unknown) { super(message); }
}
const conflict = (latest: unknown) => new WorkflowError(409, "CONFLICT", "Another update occurred. Your change was not saved. Refresh and review the latest ticket before trying again.", latest);

export async function changeTicketStatus(idOrNumber: string, body: unknown, authorId: number) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new WorkflowError(400, "BAD_REQUEST", "Expected a JSON object.");
  const { status, currentUpdatedAt, resolutionSummary, resolutionNote } = body as Record<string, unknown>;
  if (typeof status !== "string" || !Object.hasOwn(TICKET_TRANSITIONS, status)) throw new WorkflowError(400, "INVALID_STATUS", "Invalid status value.");
  if (typeof currentUpdatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(currentUpdatedAt) || !Number.isFinite(Date.parse(currentUpdatedAt)) || new Date(currentUpdatedAt).toISOString() !== currentUpdatedAt) {
    throw new WorkflowError(400, "INVALID_VERSION", "currentUpdatedAt must be the UTC ISO timestamp returned by the ticket API (including milliseconds).");
  }
  for (const note of [resolutionSummary, resolutionNote]) {
    if (note !== undefined && (typeof note !== "string" || note.trim().length > 2000)) throw new WorkflowError(400, "BAD_REQUEST", "Resolution summary must be text of at most 2000 characters.");
  }
  if (resolutionSummary !== undefined && resolutionNote !== undefined && resolutionSummary !== resolutionNote) throw new WorkflowError(400, "BAD_REQUEST", "Conflicting resolution summary fields.");
  const summary = ((resolutionSummary ?? resolutionNote) as string | undefined)?.trim();
  const numeric = /^\d+$/.test(idOrNumber);
  const id = Number(idOrNumber);
  if (numeric && (!Number.isSafeInteger(id) || id < 1 || id > 2147483647)) throw new WorkflowError(400, "BAD_REQUEST", "Invalid ticket ID.");
  return getPrisma().$transaction(async tx => {
    const ticket = await tx.ticket.findUnique({ where: numeric ? { id } : { ticketNumber: idOrNumber }, include });
    if (!ticket) throw new WorkflowError(404, "NOT_FOUND", "Ticket not found.");
    if (ticket.updatedAt.toISOString() !== currentUpdatedAt) throw conflict(ticket);
    if (!TICKET_TRANSITIONS[ticket.status].includes(status as TicketStatus)) throw new WorkflowError(400, "INVALID_STATUS_TRANSITION", `Disallowed status transition from ${ticket.status} to ${status}.`);
    // Monotonic timestamp prevents two writes within one millisecond reusing a token.
    const updatedAt = new Date(Math.max(Date.now(), ticket.updatedAt.getTime() + 1));
    const changed = await tx.ticket.updateMany({
      where: { id: ticket.id, updatedAt: new Date(currentUpdatedAt), status: ticket.status },
      data: { status: status as TicketStatus, updatedAt },
    });
    if (changed.count !== 1) throw conflict(await tx.ticket.findUnique({ where: { id: ticket.id }, include }));
    // Audit/comment insertion and conditional update commit or roll back together.
    if (summary) await tx.comment.create({ data: { ticketId: ticket.id, authorId, body: `[Resolution Summary]: ${summary}` } });
    return tx.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include });
  });
}
