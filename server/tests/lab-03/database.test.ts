import { describe, it, expect, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 — User Model, Roles & Database Migration (Issue #3)", () => {
  const prisma = getPrisma();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("User Model & Roles", () => {
    it("persists users with Role enum and passwordHash", async () => {
      const admin = await prisma.user.findUnique({
        where: { email: "admin@toktick.it" },
      });
      const itStaff = await prisma.user.findUnique({
        where: { email: "michael.brown@toktick.it" },
      });
      const requester = await prisma.user.findUnique({
        where: { email: "alex.rivera@toktick.it" },
      });

      expect(admin).not.toBeNull();
      expect(admin?.role).toBe("ADMINISTRATOR");
      expect(admin?.isActive).toBe(true);
      expect(bcrypt.compareSync("Password123!", admin!.passwordHash)).toBe(true);

      expect(itStaff).not.toBeNull();
      expect(itStaff?.role).toBe("IT_STAFF");
      expect(itStaff?.isActive).toBe(true);

      expect(requester).not.toBeNull();
      expect(requester?.role).toBe("REQUESTER");
      expect(requester?.isActive).toBe(true);
    });

    it("supports mustChangePassword flag for first-login enforcement", async () => {
      const newEmployee = await prisma.user.findUnique({
        where: { email: "emily.davis@toktick.it" },
      });

      expect(newEmployee).not.toBeNull();
      expect(newEmployee?.mustChangePassword).toBe(true);
    });

    it("verifies required seed counts for Lab 3", async () => {
      const activeRequesters = await prisma.user.count({
        where: { role: "REQUESTER", isActive: true },
      });
      const inactiveRequesters = await prisma.user.count({
        where: { role: "REQUESTER", isActive: false },
      });
      const activeStaff = await prisma.user.count({
        where: { role: "IT_STAFF", isActive: true },
      });
      const inactiveStaff = await prisma.user.count({
        where: { role: "IT_STAFF", isActive: false },
      });
      const activeAdmins = await prisma.user.count({
        where: { role: "ADMINISTRATOR", isActive: true },
      });

      expect(activeRequesters).toBeGreaterThanOrEqual(4);
      expect(inactiveRequesters).toBeGreaterThanOrEqual(1);
      expect(activeStaff).toBeGreaterThanOrEqual(3);
      expect(inactiveStaff).toBeGreaterThanOrEqual(1);
      expect(activeAdmins).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Ticket Workflow Fields & Relations", () => {
    it("persists ticket with itPriority, owner assignment, and status", async () => {
      const ticket = await prisma.ticket.findFirst({
        where: { ticketNumber: "TIC-20260901-0001" },
        include: {
          requester: true,
          owner: true,
          comments: true,
          internalNotes: true,
        },
      });

      expect(ticket).not.toBeNull();
      expect(ticket?.itPriority).toBe("HIGH");
      expect(ticket?.owner).not.toBeNull();
      expect(ticket?.owner?.email).toBe("sarah.johnson@toktick.it");
      expect(ticket?.comments.length).toBeGreaterThanOrEqual(1);
      expect(ticket?.internalNotes.length).toBeGreaterThanOrEqual(1);
    });

    it("supports unassigned tickets with null ownerId", async () => {
      const unassignedTicket = await prisma.ticket.findFirst({
        where: { ticketNumber: "TIC-20260901-0002" },
      });

      expect(unassignedTicket).not.toBeNull();
      expect(unassignedTicket?.ownerId).toBeNull();
    });

    it("supports problemAppearsResolved boolean flag", async () => {
      const resolvedTicket = await prisma.ticket.findFirst({
        where: { ticketNumber: "TIC-20260901-0004" },
      });

      expect(resolvedTicket).not.toBeNull();
      expect(resolvedTicket?.problemAppearsResolved).toBe(true);
    });
  });

  describe("Comments & Internal Notes", () => {
    it("links public comments and internal notes with author and ticket", async () => {
      const ticket = await prisma.ticket.findFirst({
        where: { ticketNumber: "TIC-20260901-0001" },
      });

      const comments = await prisma.comment.findMany({
        where: { ticketId: ticket!.id },
        include: { author: true },
      });
      const notes = await prisma.internalNote.findMany({
        where: { ticketId: ticket!.id },
        include: { author: true },
      });

      expect(comments.length).toBeGreaterThan(0);
      expect(comments[0].author).toBeDefined();
      expect(comments[0].body).toBeTruthy();

      expect(notes.length).toBeGreaterThan(0);
      expect(notes[0].author).toBeDefined();
      expect(notes[0].body).toBeTruthy();
    });
  });
});
