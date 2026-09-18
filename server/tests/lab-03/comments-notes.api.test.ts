import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSessionToken } from "../../src/utils/auth.js";
import bcrypt from "bcryptjs";

describe("Lab 3 — Comments, Internal Notes & Requester Resolution (Issue #7)", () => {
  const prisma = getPrisma();

  let requesterUser: any;
  let otherRequesterUser: any;
  let itStaffUser: any;
  let adminUser: any;

  let requesterToken: string;
  let otherRequesterToken: string;
  let itStaffToken: string;
  let adminToken: string;

  let category: any;
  let ticket: any;

  beforeEach(async () => {
    // Setup Users
    requesterUser = await prisma.user.upsert({
      where: { email: "issue7.req1@toktick.it" },
      update: { role: "REQUESTER", isActive: true, mustChangePassword: false },
      create: {
        email: "issue7.req1@toktick.it",
        name: "Issue7 Requester One",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
        passwordHash: bcrypt.hashSync("Password123!", 10),
      },
    });

    otherRequesterUser = await prisma.user.upsert({
      where: { email: "issue7.req2@toktick.it" },
      update: { role: "REQUESTER", isActive: true, mustChangePassword: false },
      create: {
        email: "issue7.req2@toktick.it",
        name: "Issue7 Requester Two",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
        passwordHash: bcrypt.hashSync("Password123!", 10),
      },
    });

    itStaffUser = await prisma.user.upsert({
      where: { email: "issue7.staff@toktick.it" },
      update: { role: "IT_STAFF", isActive: true, mustChangePassword: false },
      create: {
        email: "issue7.staff@toktick.it",
        name: "Issue7 Staff",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
        passwordHash: bcrypt.hashSync("Password123!", 10),
      },
    });

    adminUser = await prisma.user.upsert({
      where: { email: "issue7.admin@toktick.it" },
      update: { role: "ADMINISTRATOR", isActive: true, mustChangePassword: false },
      create: {
        email: "issue7.admin@toktick.it",
        name: "Issue7 Admin",
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
        passwordHash: bcrypt.hashSync("Password123!", 10),
      },
    });

    requesterToken = createSessionToken(requesterUser);
    otherRequesterToken = createSessionToken(otherRequesterUser);
    itStaffToken = createSessionToken(itStaffUser);
    adminToken = createSessionToken(adminUser);

    category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({ data: { name: "Issue7 Category" } });
    }

    // Create a fresh test ticket owned by requesterUser
    ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TIC-700-${Date.now()}`,
        title: "Test Ticket for Issue 7 Communication",
        description: "Diagnosing comment and note threads.",
        status: "OPEN",
        priority: "MEDIUM",
        itPriority: "MEDIUM",
        problemAppearsResolved: false,
        categoryId: category.id,
        requesterId: requesterUser.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Public Comments (FR-10 / AC-10 / BR-10)", () => {
    it("allows the ticket requester to post a public comment", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ body: "Hello, this is a comment from the requester." });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.body).toBe("Hello, this is a comment from the requester.");
      expect(res.body.author.id).toBe(requesterUser.id);
      expect(res.body.author.role).toBe("REQUESTER");
    });

    it("allows IT Staff and Admin to post public comments on any ticket", async () => {
      const staffRes = await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ body: "IT Staff update: We are looking into this." });

      expect(staffRes.status).toBe(201);
      expect(staffRes.body.author.role).toBe("IT_STAFF");

      const adminRes = await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ body: "Admin note: Priority confirmed." });

      expect(adminRes.status).toBe(201);
      expect(adminRes.body.author.role).toBe("ADMINISTRATOR");
    });

    it("rejects empty or whitespace-only comment with 400 Bad Request", async () => {
      const emptyRes = await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ body: "" });

      expect(emptyRes.status).toBe(400);

      const whitespaceRes = await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ body: "   \n\t  " });

      expect(whitespaceRes.status).toBe(400);
    });

    it("rejects comments exceeding 2000 characters with 400 Bad Request", async () => {
      const longBody = "a".repeat(2001);
      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ body: longBody });

      expect(res.status).toBe(400);
    });

    it("blocks a foreign requester from posting or viewing comments on another user's ticket with 404", async () => {
      const postRes = await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set("Authorization", `Bearer ${otherRequesterToken}`)
        .send({ body: "Trying to comment on another user ticket" });

      expect(postRes.status).toBe(404);

      const getRes = await request(app)
        .get(`/api/tickets/${ticket.id}/comments`)
        .set("Authorization", `Bearer ${otherRequesterToken}`);

      expect(getRes.status).toBe(404);
    });

    it("returns comments ordered chronologically", async () => {
      await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ body: "Comment 1" });

      await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ body: "Comment 2" });

      const res = await request(app)
        .get(`/api/tickets/${ticket.id}/comments`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0].body).toBe("Comment 1");
      expect(res.body[1].body).toBe("Comment 2");
    });
  });

  describe("Internal Notes (FR-11 / BR-04)", () => {
    it("rejects Requester access to internal notes with 403 Forbidden", async () => {
      const getRes = await request(app)
        .get(`/api/tickets/${ticket.id}/notes`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(getRes.status).toBe(403);

      const postRes = await request(app)
        .post(`/api/tickets/${ticket.id}/notes`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ body: "Requester trying to write internal note" });

      expect(postRes.status).toBe(403);
    });

    it("allows IT Staff and Admin to create and view internal notes", async () => {
      const postRes = await request(app)
        .post(`/api/tickets/${ticket.id}/notes`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ body: "Confidential IT diagnostic findings." });

      expect(postRes.status).toBe(201);
      expect(postRes.body.body).toBe("Confidential IT diagnostic findings.");
      expect(postRes.body.author.role).toBe("IT_STAFF");

      const getRes = await request(app)
        .get(`/api/tickets/${ticket.id}/notes`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.some((n: any) => n.body.includes("Confidential IT diagnostic findings."))).toBe(true);
    });
  });

  describe("Requester Problem Appears Resolved (FR-05 / AC-09 / BR-05)", () => {
    it("allows ticket requester to submit resolve indication, setting flag and posting system comment", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/resolve-indication`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ comment: "Restarted laptop and problem is gone." });

      expect(res.status).toBe(200);
      expect(res.body.ticket.problemAppearsResolved).toBe(true);
      expect(res.body.ticket.status).toBe("OPEN"); // Status not automatically changed to RESOLVED

      // Verify comment was automatically posted
      const commentsRes = await request(app)
        .get(`/api/tickets/${ticket.id}/comments`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(commentsRes.status).toBe(200);
      expect(commentsRes.body.some((c: any) => c.body.includes("Restarted laptop and problem is gone."))).toBe(true);
    });

    it("blocks other requesters from submitting resolve indication on foreign ticket with 404", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/resolve-indication`)
        .set("Authorization", `Bearer ${otherRequesterToken}`)
        .send({});

      expect(res.status).toBe(404);
    });
  });
});
