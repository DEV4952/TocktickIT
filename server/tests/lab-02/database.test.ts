import "dotenv/config";
import { randomUUID } from "node:crypto";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 — Ticketing Database Schema & Lifecycle", () => {
  const prisma = getPrisma();
  const namespace = `lab2-db-${randomUUID()}`;
  let categoryId: number | undefined;
  let requesterId: number | undefined;
  let ticketId: number | undefined;

  beforeAll(async () => {
    // Own fixtures: never assume mutable seed tickets retain their original state.
    categoryId = (await prisma.category.create({ data: { name: namespace } })).id;
    requesterId = (await prisma.user.create({ data: {
      name: "Database Test Requester", email: `${namespace}@example.test`,
      passwordHash: "unused-test-password-hash", role: "REQUESTER",
    } })).id;
    ticketId = (await prisma.ticket.create({ data: {
      ticketNumber: namespace, title: "VPN database relation fixture",
      description: "Isolated database schema and lifecycle fixture",
      categoryId, requesterId, priority: "HIGH", status: "OPEN", relatedSystem: "Cisco AnyConnect VPN",
      attachments: { create: [
        { fileName: "active.log", fileSize: 1024, fileType: "text/plain", fileUrl: "/uploads/attachments/fixture-active.log" },
        { fileName: "removed.log", fileSize: 1024, fileType: "text/plain", fileUrl: "/uploads/attachments/fixture-removed.log", isDeleted: true, deletedAt: new Date() },
      ] },
    } })).id;
  });

  afterAll(async () => {
    try {
      // Delete only IDs returned by this suite's create calls; ticket cascades attachments.
      if (ticketId !== undefined) await prisma.ticket.delete({ where: { id: ticketId } });
      if (requesterId !== undefined) await prisma.user.delete({ where: { id: requesterId } });
      if (categoryId !== undefined) await prisma.category.delete({ where: { id: categoryId } });
    } finally { await prisma.$disconnect(); }
  });

  describe("Ticket & Relations", () => {
    it("fetches tickets with category, requester, and active attachments", async () => {
      const ticket = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticketId! },
        include: { category: true, requester: true, attachments: { where: { isDeleted: false } } },
      });
      expect(ticket.title).toBe("VPN database relation fixture");
      expect(ticket.category.id).toBe(categoryId);
      expect(ticket.category.name).toBe(namespace);
      expect(ticket.requester.id).toBe(requesterId);
      expect(ticket.requester.email).toBe(`${namespace}@example.test`);
      expect(ticket.priority).toBe("HIGH");
      expect(ticket.status).toBe("OPEN");
      expect(ticket.relatedSystem).toBe("Cisco AnyConnect VPN");
      expect(ticket.attachments).toHaveLength(1);
      expect(ticket.attachments[0]).toMatchObject({ fileName: "active.log", isDeleted: false });
    });

    it("enforces unique ticket number constraint", async () => {
      await expect(prisma.ticket.create({ data: {
        ticketNumber: namespace, title: "Duplicate ticket test",
        description: "Testing unique constraint on ticketNumber", categoryId: categoryId!, requesterId: requesterId!,
      } })).rejects.toMatchObject({ code: "P2002" });
    });
  });

  describe("Attachment Lifecycle (Active / Soft-Removed)", () => {
    it("supports soft-removing attachments with isDeleted and deletedAt timestamp", async () => {
      const attachments = await prisma.attachment.findMany({ where: { ticketId: ticketId! } });
      const softDeleted = attachments.find(a => a.isDeleted);
      expect(softDeleted).toBeDefined();
      expect(softDeleted?.deletedAt).toBeInstanceOf(Date);
      const activeOnly = await prisma.attachment.findMany({ where: { ticketId: ticketId!, isDeleted: false } });
      expect(activeOnly.some(a => a.id === softDeleted?.id)).toBe(false);
    });

    it("allows transitioning an active attachment to soft-deleted", async () => {
      const attachment = await prisma.attachment.create({ data: {
        fileName: "temporary-debug.log", fileSize: 4096, fileType: "text/plain",
        fileUrl: "/uploads/attachments/temporary-debug.log", ticketId: ticketId!,
      } });
      try {
        expect(attachment.isDeleted).toBe(false);
        expect(attachment.deletedAt).toBeNull();
        const deleted = await prisma.attachment.update({ where: { id: attachment.id }, data: { isDeleted: true, deletedAt: new Date() } });
        expect(deleted.isDeleted).toBe(true);
        expect(deleted.deletedAt).toBeInstanceOf(Date);
      } finally { await prisma.attachment.delete({ where: { id: attachment.id } }); }
    });
  });
});
