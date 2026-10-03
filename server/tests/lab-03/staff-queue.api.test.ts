import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSessionToken } from "../../src/utils/auth.js";
import bcrypt from "bcryptjs";

describe("Lab 3 — IT Staff Ticket Queue & Operational Triage APIs (Issue #6)", () => {
  const prisma = getPrisma();

  let itStaffUser: any;
  let itStaffUser2: any;
  let adminUser: any;
  let requesterUser: any;

  let itStaffToken: string;
  let itStaffToken2: string;
  let adminToken: string;
  let requesterToken: string;

  let testCategory: any;
  let testTicket1: any;
  let testTicket2: any;

  beforeEach(async () => {
    itStaffUser = await prisma.user.upsert({
      where: { email: "staff.queue1@toktick.it" },
      update: { role: "IT_STAFF", isActive: true, mustChangePassword: false },
      create: {
        email: "staff.queue1@toktick.it",
        name: "Staff Queue User 1",
        department: "IT Support",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
        passwordHash: bcrypt.hashSync("Password123!", 10),
      },
    });

    itStaffUser2 = await prisma.user.upsert({
      where: { email: "staff.queue2@toktick.it" },
      update: { role: "IT_STAFF", isActive: true, mustChangePassword: false },
      create: {
        email: "staff.queue2@toktick.it",
        name: "Staff Queue User 2",
        department: "IT Operations",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
        passwordHash: bcrypt.hashSync("Password123!", 10),
      },
    });

    adminUser = await prisma.user.upsert({
      where: { email: "admin.queue@toktick.it" },
      update: { role: "ADMINISTRATOR", isActive: true, mustChangePassword: false },
      create: {
        email: "admin.queue@toktick.it",
        name: "Admin Queue User",
        department: "IT Leadership",
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
        passwordHash: bcrypt.hashSync("Password123!", 10),
      },
    });

    requesterUser = await prisma.user.upsert({
      where: { email: "requester.queue@toktick.it" },
      update: { role: "REQUESTER", isActive: true, mustChangePassword: false },
      create: {
        email: "requester.queue@toktick.it",
        name: "Requester Queue User",
        department: "Sales",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
        passwordHash: bcrypt.hashSync("Password123!", 10),
      },
    });

    itStaffToken = createSessionToken(itStaffUser);
    itStaffToken2 = createSessionToken(itStaffUser2);
    adminToken = createSessionToken(adminUser);
    requesterToken = createSessionToken(requesterUser);

    // Use existing seeded category without creating new ones to maintain 4 categories invariant
    testCategory = await prisma.category.findFirstOrThrow();

    // Clean up test tickets created in previous test runs
    await prisma.ticket.deleteMany({
      where: {
        ticketNumber: { in: ["TKT-QUEUE-001", "TKT-QUEUE-002", "TKT-QUEUE-003"] },
      },
    });

    // Create test ticket 1: Unassigned, status NEW, priority MEDIUM
    testTicket1 = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-QUEUE-001",
        title: "Test Queue Laptop Battery Issue",
        description: "Laptop battery drains within thirty minutes during video calls.",
        status: "NEW",
        priority: "MEDIUM",
        itPriority: "MEDIUM",
        categoryId: testCategory.id,
        requesterId: requesterUser.id,
        ownerId: null,
      },
    });

    // Create test ticket 2: Assigned to itStaffUser, status OPEN, priority HIGH
    testTicket2 = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-QUEUE-002",
        title: "VPN Connection Drops Frequently",
        description: "VPN client disconnects every 15 minutes across all departments.",
        status: "OPEN",
        priority: "HIGH",
        itPriority: "HIGH",
        categoryId: testCategory.id,
        requesterId: requesterUser.id,
        ownerId: itStaffUser.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.ticket.deleteMany({
      where: {
        ticketNumber: { in: ["TKT-QUEUE-001", "TKT-QUEUE-002", "TKT-QUEUE-003"] },
      },
    });
  });

  describe("GET /api/staff/tickets (FR-06)", () => {
    it("allows IT Staff to query the queue with pagination and counts", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("pagination");
      expect(res.body).toHaveProperty("counts");

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.counts).toHaveProperty("all");
      expect(res.body.counts).toHaveProperty("unassigned");
      expect(res.body.counts).toHaveProperty("myTickets");
      expect(res.body.counts).toHaveProperty("inProgress");
    });

    it("filters tickets by search substring (title/ticketNumber)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?search=Battery")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((t: any) => t.ticketNumber === "TKT-QUEUE-001")).toBe(true);
      expect(res.body.data.every((t: any) => t.ticketNumber !== "TKT-QUEUE-002")).toBe(true);
    });

    it("filters tickets by unassigned owner status", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?ownerId=unassigned")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.owner === null)).toBe(true);
      expect(res.body.data.some((t: any) => t.ticketNumber === "TKT-QUEUE-001")).toBe(true);
    });

    it("filters tickets by 'me' (current user tickets)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?ownerId=me")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.owner?.id === itStaffUser.id)).toBe(true);
      expect(res.body.data.some((t: any) => t.ticketNumber === "TKT-QUEUE-002")).toBe(true);
    });

    it("blocks Requesters from querying staff ticket queue with 403", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
    });
  });


});
