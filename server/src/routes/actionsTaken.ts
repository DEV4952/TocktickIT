import { Router, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireRole, SESSION_COOKIE_NAME, verifySessionToken } from "../utils/auth.js";

type ActionFields = {
  actionDateTime: Date;
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
};
class ActionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const performer = { performedBy: { select: { id: true, name: true, role: true } } };
export const actionsTakenRouter = Router({ mergeParams: true });
actionsTakenRouter.use(requireAuth, (req: Request, res: Response, next: NextFunction) => {
  // Actions require a real signed session, never the legacy Lab 2 identity headers.
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers.authorization?.slice(7);
  const session = typeof token === "string" ? verifySessionToken(token) : null;
  if (!session || session.id !== req.user!.id) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "A signed session is required." });
  }
  if (!req.user!.isActive) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Inactive users cannot access actions." });
  }
  next();
});

function endpoint(handler: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try { await handler(req, res); }
    catch (error) {
      const status = error instanceof ActionError ? error.status
        : error instanceof Prisma.PrismaClientKnownRequestError && ["P2025", "P2003"].includes(error.code) ? 404 : 500;
      if (status === 500) console.error("Actions Taken request failed:", error);
      res.status(status).json({
        error: status === 400 ? "BAD_REQUEST" : status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
        message: error instanceof ActionError ? error.message : status === 404 ? "Ticket or action not found." : "Failed to process actions taken.",
      });
    }
  };
}
async function accessibleTicket(req: Request) {
  const value = req.params.id;
  const id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
    throw new ActionError(400, "Invalid ticket ID.");
  }
  const ticket = await getPrisma().ticket.findUnique({ where: { id } });
  if (!ticket) throw new ActionError(404, "Ticket not found.");
  if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
    throw new ActionError(403, "You do not have permission to access this ticket.");
  }
  return ticket;
}
function parseDate(value: unknown): Date {
  if (typeof value !== "string") throw new ActionError(400, "actionDateTime must be an ISO-8601 timestamp.");
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
  const date = new Date(value);
  if (!match || !Number.isFinite(date.getTime())) throw new ActionError(400, "Invalid actionDateTime.");
  const [, year, month, day] = match;
  const days = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  if (Number(year) < 1 || Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > days) {
    throw new ActionError(400, "Invalid calendar date.");
  }
  return date;
}
function actionInput(body: unknown, existing?: ActionFields): ActionFields {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ActionError(400, "Expected a JSON object.");
  const input = body as Record<string, unknown>;
  const fields = ["actionDateTime", "description", "result", "followUpRequired", "followUpNote", "attachmentNotes"] as const;
  if (existing && !fields.some(field => Object.hasOwn(input, field))) throw new ActionError(400, "No editable fields supplied.");
  const merged: Record<string, unknown> = { actionDateTime: new Date(), followUpNote: null, attachmentNotes: null };
  if (existing) for (const field of fields) merged[field] = existing[field];
  // Allowlist: ticketId, performedById, IDs, timestamps and nested relations are ignored.
  for (const field of fields) if (Object.hasOwn(input, field)) merged[field] = input[field];
  for (const [field, min, max] of [["description", 5, 3000], ["result", 3, 3000]] as const) {
    const value = merged[field];
    if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw new ActionError(400, `${field} must contain ${min}-${max} characters.`);
    merged[field] = value.trim();
  }
  if (typeof merged.followUpRequired !== "boolean") throw new ActionError(400, "followUpRequired must be a boolean.");
  for (const field of ["followUpNote", "attachmentNotes"] as const) {
    const value = merged[field];
    if (value !== null && typeof value !== "string") throw new ActionError(400, `${field} must be a string or null.`);
    merged[field] = typeof value === "string" ? value.trim() || null : null;
  }
  if (merged.followUpRequired && (typeof merged.followUpNote !== "string" || merged.followUpNote.length < 3)) throw new ActionError(400, "followUpNote must contain at least 3 characters when follow-up is required.");
  if (typeof merged.attachmentNotes === "string" && merged.attachmentNotes.length > 1000) throw new ActionError(400, "attachmentNotes must not exceed 1000 characters.");
  if (!merged.followUpRequired) merged.followUpNote = null;
  merged.actionDateTime = Object.hasOwn(input, "actionDateTime") ? parseDate(input.actionDateTime) : merged.actionDateTime;
  return merged as ActionFields;
}

actionsTakenRouter.get("/", endpoint(async (req, res) => {
  const ticket = await accessibleTicket(req);
  const actions = await getPrisma().actionTaken.findMany({
    where: { ticketId: ticket.id }, include: performer,
    orderBy: [{ actionDateTime: "desc" }, { createdAt: "desc" }, { id: "asc" }],
  });
  return res.json({ ticketId: ticket.id, ticketNumber: ticket.ticketNumber, totalActions: actions.length, actions });
}));
actionsTakenRouter.post("/", requireRole("IT_STAFF", "ADMINISTRATOR"), endpoint(async (req, res) => {
  const ticket = await accessibleTicket(req);
  const data = actionInput(req.body);
  const action = await getPrisma().actionTaken.create({
    data: { ...data, ticketId: ticket.id, performedById: req.user!.id }, include: performer,
  });
  return res.status(201).json({ message: "Action taken recorded successfully", action });
}));
actionsTakenRouter.patch("/:actionId", requireRole("IT_STAFF", "ADMINISTRATOR"), endpoint(async (req, res) => {
  const ticket = await accessibleTicket(req);
  const existing = await getPrisma().actionTaken.findFirst({ where: { id: req.params.actionId, ticketId: ticket.id } });
  if (!existing) throw new ActionError(404, "Action not found for this ticket.");
  const data = actionInput(req.body, existing);
  const action = await getPrisma().actionTaken.update({
    where: { id: existing.id, ticketId: ticket.id }, data, include: performer,
  });
  return res.json({ message: "Action taken updated successfully", action });
}));
