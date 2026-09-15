import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSessionToken } from "../../src/utils/auth.js";
import bcrypt from "bcryptjs";

describe("Lab 3 — Role-Based Access Control (RBAC) & Authorization (Issue #5)", () => {
  const prisma = getPrisma();

  let requesterUser: any;
  let otherRequesterUser: any;
  let itStaffUser: any;
  let adminUser: any;
  let lockedUser: any;

  let requesterToken: string;
  let otherRequesterToken: string;
  let itStaffToken: string;
  let adminToken: string;
  let lockedToken: string;

  let testCategory: any;
  let otherUserTicket: any;

  beforeEach(async () => {
    // Create or find distinct users with various roles
    requesterUser = await prisma.user.upsert({
      where: { email: "rbac.requester1@toktick.it" },
      update: {
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        email: "rbac.requester1@toktick.it",
        name: "RBAC Requester One",
        department: "Engineering",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
        passwordHash: bcrypt.hashSync("Password123!", 10),
      },
    });

    otherRequesterUser = await prisma.user.upsert({
      where: { email: "rbac.requester2@toktick.it" },
      update: {
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        email: "rbac.requester2@toktick.it",
        name: "RBAC Requester Two",
        department: "Design",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
        passwordHash: bcrypt.hashSync("Password123!", 10),
      },
    });

    itStaffUser = await prisma.user.upsert({
      where: { email: "rbac.staff@toktick.it" },
      update: {
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        email: "rbac.staff@toktick.it",
        name: "RBAC IT Staff",
        department: "IT Support",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
        passwordHash: bcrypt.hashSync("Password123!", 10),
      },
    });

    adminUser = await prisma.user.upsert({
      where: { email: "rbac.admin@toktick.it" },
      update: {
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        email: "rbac.admin@toktick.it",
        name: "RBAC System Admin",
        department: "IT Infrastructure",
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
        passwordHash: bcrypt.hashSync("Password123!", 10),
      },
    });

    lockedUser = await prisma.user.upsert({
      where: { email: "rbac.locked@toktick.it" },
      update: {
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: true,
      },
      create: {
        email: "rbac.locked@toktick.it",
        name: "RBAC Locked User",
        department: "Sales",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: true,
        passwordHash: bcrypt.hashSync("Password123!", 10),
      },
    });

    requesterToken = createSessionToken(requesterUser);
    otherRequesterToken = createSessionToken(otherRequesterUser);
    itStaffToken = createSessionToken(itStaffUser);
    adminToken = createSessionToken(adminUser);
    lockedToken = createSessionToken(lockedUser);

    testCategory = await prisma.category.findFirst();
    if (!testCategory) {
      testCategory = await prisma.category.create({
        data: { name: "Hardware" },
      });
    }

    // Create a ticket owned by otherRequesterUser
    otherUserTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `RBAC-${Date.now()}`,
        title: "Confidential Hardware Request",
        description: "Confidential executive laptop replacement requested.",
        status: "OPEN",
        priority: "HIGH",
        categoryId: testCategory.id,
        requesterId: otherRequesterUser.id,
      },
    });
  });

  describe("Unauthenticated Access & Session Enforcement (BR-02)", () => {
    it("rejects ticket queries without authentication with HTTP 401", async () => {
      const res = await request(app).get("/api/tickets");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
    });

    it("rejects ticket creation without authentication with HTTP 401", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send({
          title: "Unauthorized Ticket Submission",
          description: "This should be rejected immediately by requireAuth.",
          categoryId: testCategory.id,
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
    });
  });

  describe("Mandatory First-Login Password Change Lock (BR-02)", () => {
    it("blocks business endpoints when mustChangePassword = true with HTTP 403 PASSWORD_CHANGE_REQUIRED", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("Authorization", `Bearer ${lockedToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("PASSWORD_CHANGE_REQUIRED");
    });
  });

  describe("Anti-Tampering on Ticket Creation (API-09 / AC-03 / BR-03)", () => {
    it("ignores client-injected requesterId in payload and binds authenticated session user", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({
          title: "Tamper Attempt Ticket",
          description: "Attempting to spoof ticket ownership to other user.",
          categoryId: testCategory.id,
          priority: "HIGH",
          requesterId: otherRequesterUser.id, // Injected foreign ID!
        });

      expect(res.status).toBe(201);
      expect(res.body.requesterId).toBe(requesterUser.id);
      expect(res.body.requester.id).toBe(requesterUser.id);
      expect(res.body.requester.email).toBe(requesterUser.email);
    });
  });

  describe("Requester Ownership Isolation (API-10 / AC-03 / BR-03)", () => {
    it("returns HTTP 404 when Requester attempts to view another user's ticket", async () => {
      const res = await request(app)
        .get(`/api/tickets/${otherUserTicket.id}`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    });

    it("allows IT Staff to view tickets owned by any requester", async () => {
      const res = await request(app)
        .get(`/api/tickets/${otherUserTicket.id}`)
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(otherUserTicket.id);
      expect(res.body.title).toBe("Confidential Hardware Request");
    });

    it("allows Administrator to view tickets owned by any requester", async () => {
      const res = await request(app)
        .get(`/api/tickets/${otherUserTicket.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(otherUserTicket.id);
    });
  });

  describe("Internal Notes Access Control (API-11 / AC-04 / BR-04)", () => {
    it("rejects Requester access to internal notes with HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .get(`/api/tickets/${otherUserTicket.id}/notes`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("allows IT Staff to post and retrieve internal notes", async () => {
      const postRes = await request(app)
        .post(`/api/tickets/${otherUserTicket.id}/notes`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          body: "Internal IT diagnosis: memory module needs replacement.",
        });

      expect(postRes.status).toBe(201);
      expect(postRes.body.body).toBe("Internal IT diagnosis: memory module needs replacement.");
      expect(postRes.body.author.role).toBe("IT_STAFF");

      const getRes = await request(app)
        .get(`/api/tickets/${otherUserTicket.id}/notes`)
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body)).toBe(true);
      expect(getRes.body.some((n: any) => n.body.includes("memory module"))).toBe(true);
    });
  });

  describe("Admin Endpoints Access Control (API-12 / FR-12 / BR-15)", () => {
    it("rejects Requester access to Admin User APIs with HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("rejects IT Staff access to Admin User APIs with HTTP 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("allows Administrator to access Admin User APIs with HTTP 200", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
