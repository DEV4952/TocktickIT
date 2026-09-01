import { describe, it, expect, afterAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 — Ticketing Database Schema & Lifecycle", () => {
  const prisma = getPrisma();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Ticket & Relations", () => {
    it("fetches tickets with category, requester, and active attachments", async () => {
      const ticket = await prisma.ticket.findFirst({
        where: { ticketNumber: "TIC-20260901-0001" },
        include: {
          category: true,
          requester: true,
          attachments: {
            where: { isDeleted: false },
          },
        },
      });

      expect(ticket).not.toBeNull();
      expect(ticket?.title).toBe("Cannot connect to internal VPN gateway");
      expect(ticket?.category.name).toBe("Network");
      expect(ticket?.requester.email).toBe("alex.rivera@toktick.it");
      expect(ticket?.priority).toBe("HIGH");
      expect(ticket?.status).toBe("OPEN");
      expect(ticket?.relatedSystem).toBe("Cisco AnyConnect VPN");
      expect(ticket?.attachments.length).toBeGreaterThanOrEqual(1);
      expect(ticket?.attachments[0].isDeleted).toBe(false);
    });

    it("enforces unique ticket number constraint", async () => {
      const category = await prisma.category.findFirst();
      const user = await prisma.user.findFirst({ where: { isActive: true } });

      expect(category).not.toBeNull();
      expect(user).not.toBeNull();

      await expect(
        prisma.ticket.create({
          data: {
            ticketNumber: "TIC-20260901-0001", // Duplicate number
            title: "Duplicate ticket test",
            description: "Testing unique constraint on ticketNumber",
            categoryId: category!.id,
            requesterId: user!.id,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("Attachment Lifecycle (Active / Soft-Removed)", () => {
    it("supports soft-removing attachments with isDeleted and deletedAt timestamp", async () => {
      const ticket = await prisma.ticket.findFirst({
        where: { ticketNumber: "TIC-20260901-0003" },
        include: {
          attachments: true,
        },
      });

      expect(ticket).not.toBeNull();
      const softDeleted = ticket?.attachments.find((a) => a.isDeleted);
      expect(softDeleted).toBeDefined();
      expect(softDeleted?.isDeleted).toBe(true);
      expect(softDeleted?.deletedAt).toBeInstanceOf(Date);

      // Verify active-only filtering excludes soft-deleted attachments
      const activeOnly = await prisma.attachment.findMany({
        where: {
          ticketId: ticket!.id,
          isDeleted: false,
        },
      });
      expect(activeOnly.some((a) => a.id === softDeleted?.id)).toBe(false);
    });

    it("allows transitioning an active attachment to soft-deleted", async () => {
      const ticket = await prisma.ticket.findFirst({
        where: { ticketNumber: "TIC-20260901-0002" },
      });
      expect(ticket).not.toBeNull();

      // Create a new attachment
      const newAttachment = await prisma.attachment.create({
        data: {
          fileName: "temporary-debug.log",
          fileSize: 4096,
          fileType: "text/plain",
          fileUrl: "/uploads/attachments/temporary-debug.log",
          ticketId: ticket!.id,
          isDeleted: false,
        },
      });
      expect(newAttachment.isDeleted).toBe(false);
      expect(newAttachment.deletedAt).toBeNull();

      // Soft-delete the attachment
      const deleted = await prisma.attachment.update({
        where: { id: newAttachment.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
      expect(deleted.isDeleted).toBe(true);
      expect(deleted.deletedAt).not.toBeNull();

      // Clean up test record
      await prisma.attachment.delete({ where: { id: newAttachment.id } });
    });
  });
});
