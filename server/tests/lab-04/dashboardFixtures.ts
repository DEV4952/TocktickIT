import { randomUUID } from "node:crypto";
import type { PrismaClient, TicketPriority, TicketStatus, User } from "@prisma/client";
export const REFERENCE = new Date("2090-10-30T12:00:00.000Z");
export const START = new Date(REFERENCE.getTime() - 7 * 86400000);
export function dashboardFixtures(p: PrismaClient) {
  const prefix = `lab47-${randomUUID()}`;
  const userIds: number[] = [];
  const ticketIds: number[] = [];
  let categoryId: number | undefined;
  return {
    async setup() { categoryId = (await p.category.create({ data: { name: prefix } })).id; },
    async user(label: string, role: User["role"], extra: Partial<Pick<User, "isActive" | "mustChangePassword">> = {}) {
      const user = await p.user.create({ data: { email: `${label}-${prefix}@example.test`, name: label, role, passwordHash: "unused-fixture-hash", ...extra } });
      userIds.push(user.id); return user;
    },
    async ticket(requesterId: number, status: TicketStatus, updatedAt: Date, ownerId: number | null = null, itPriority: TicketPriority = "MEDIUM", createdAt?: Date) {
      const ticket = await p.ticket.create({ data: { ticketNumber: `${prefix}-${randomUUID()}`, title: "Dashboard fixture", description: "Private fixture description must not appear in summaries", categoryId: categoryId!, requesterId, ownerId, status, priority: "LOW", itPriority, updatedAt, ...(createdAt ? { createdAt } : {}) } });
      ticketIds.push(ticket.id); return ticket;
    },
    async removeTicket(id: number) {
      const index = ticketIds.indexOf(id);
      if (index < 0) throw new Error("Refusing to remove a non-fixture ticket");
      await p.ticket.delete({ where: { id } });
      ticketIds.splice(index, 1);
    },
    async children(ticketId: number, userId: number) {
      for (let i = 0; i < 2; i++) {
        await p.comment.create({ data: { ticketId, authorId: userId, body: "Dashboard fixture comment" } });
        await p.internalNote.create({ data: { ticketId, authorId: userId, body: "Dashboard private note" } });
        await p.attachment.create({ data: { ticketId, fileName: `fixture-${i}.txt`, fileSize: 10, fileType: "text/plain", fileUrl: "/uploads/fixture.txt" } });
        await p.actionTaken.create({ data: { ticketId, performedById: userId, description: "Dashboard fixture action", result: "Fixture outcome" } });
      }
    },
    async cleanup() {
      try {
        // Only exact IDs returned by this fixture factory are deleted.
        for (const id of ticketIds) await p.ticket.delete({ where: { id } });
        for (const id of userIds) await p.user.delete({ where: { id } });
        if (categoryId !== undefined) await p.category.delete({ where: { id: categoryId } });
      } finally { await p.$disconnect(); }
    },
  };
}
