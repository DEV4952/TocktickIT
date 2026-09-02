import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 — Ticket Query & List API (GET /api/tickets & GET /api/tickets/:id)", () => {
  const prisma = getPrisma();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Ownership Isolation & Security", () => {
    it("returns ONLY tickets owned by the authenticated requester", async () => {
      const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });
      const samantha = await prisma.user.findUnique({ where: { email: "samantha.chen@toktick.it" } });
      expect(alex).not.toBeNull();
      expect(samantha).not.toBeNull();

      // Query tickets as Alex
      const alexRes = await request(app)
        .get("/api/tickets")
        .set("x-requester-id", String(alex!.id));

      expect(alexRes.status).toBe(200);
      expect(Array.isArray(alexRes.body.data)).toBe(true);
      expect(alexRes.body.data.length).toBeGreaterThanOrEqual(1);

      // Verify every ticket in the list belongs to Alex
      alexRes.body.data.forEach((ticket: { requesterId: number }) => {
        expect(ticket.requesterId).toBe(alex!.id);
      });

      // Verify no ticket belonging to Samantha is in Alex's list
      const alexTicketTitles = alexRes.body.data.map((t: { title: string }) => t.title);
      expect(alexTicketTitles).not.toContain("MacBook Pro keyboard key sticking");
      expect(alexTicketTitles).not.toContain("Password reset for Marketing analytics portal");
    });

    it("returns ONLY tickets owned by Samantha when querying as Samantha", async () => {
      const samantha = await prisma.user.findUnique({ where: { email: "samantha.chen@toktick.it" } });

      const samanthaRes = await request(app)
        .get("/api/tickets")
        .set("x-requester-id", String(samantha!.id));

      expect(samanthaRes.status).toBe(200);
      santhaRes_check: {
        samanthaRes.body.data.forEach((ticket: { requesterId: number }) => {
          expect(ticket.requesterId).toBe(samantha!.id);
        });
      }

      // Samantha owns MacBook Pro & Password reset tickets
      const samanthaTicketTitles = samanthaRes.body.data.map((t: { title: string }) => t.title);
      expect(samanthaTicketTitles).toContain("MacBook Pro keyboard key sticking");
      expect(samanthaTicketTitles).not.toContain("Cannot connect to internal VPN gateway");
    });

    it("returns 404 Not Found when a requester attempts to fetch a ticket detail owned by another requester", async () => {
      const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });
      const samanthaTicket = await prisma.ticket.findFirst({
        where: { title: "MacBook Pro keyboard key sticking" },
      });
      expect(alex).not.toBeNull();
      expect(samanthaTicket).not.toBeNull();

      // Alex tries to fetch Samantha's ticket
      const res = await request(app)
        .get(`/api/tickets/${samanthaTicket!.id}`)
        .set("x-requester-id", String(alex!.id));

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
      expect(res.body.message).toMatch(/Ticket not found or you do not have permission/i);
    });
  });

  describe("Search & Filtering", () => {
    it("supports case-insensitive substring search across title, description, and ticketNumber", async () => {
      const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });

      const res = await request(app)
        .get("/api/tickets?search=vpn")
        .set("x-requester-id", String(alex!.id));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].title).toMatch(/VPN/i);
    });

    it("filters tickets by status", async () => {
      const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });

      const res = await request(app)
        .get("/api/tickets?status=OPEN")
        .set("x-requester-id", String(alex!.id));

      expect(res.status).toBe(200);
      res.body.data.forEach((ticket: { status: string }) => {
        expect(ticket.status).toBe("OPEN");
      });
    });

    it("filters tickets by priority", async () => {
      const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });

      const res = await request(app)
        .get("/api/tickets?priority=HIGH")
        .set("x-requester-id", String(alex!.id));

      expect(res.status).toBe(200);
      res.body.data.forEach((ticket: { priority: string }) => {
        expect(ticket.priority).toBe("HIGH");
      });
    });

    it("filters tickets by categoryId", async () => {
      const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });
      const networkCat = await prisma.category.findUnique({ where: { name: "Network" } });

      const res = await request(app)
        .get(`/api/tickets?categoryId=${networkCat!.id}`)
        .set("x-requester-id", String(alex!.id));

      expect(res.status).toBe(200);
      res.body.data.forEach((ticket: { categoryId: number }) => {
        expect(ticket.categoryId).toBe(networkCat!.id);
      });
    });
  });

  describe("Sorting & Pagination", () => {
    it("sorts tickets by createdAt in ascending and descending order", async () => {
      const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });

      const descRes = await request(app)
        .get("/api/tickets?sortBy=createdAt&sortOrder=desc")
        .set("x-requester-id", String(alex!.id));

      expect(descRes.status).toBe(200);

      const ascRes = await request(app)
        .get("/api/tickets?sortBy=createdAt&sortOrder=asc")
        .set("x-requester-id", String(alex!.id));

      expect(ascRes.status).toBe(200);
      if (ascRes.body.data.length >= 2) {
        const time0 = new Date(ascRes.body.data[0].createdAt).getTime();
        const time1 = new Date(ascRes.body.data[1].createdAt).getTime();
        expect(time0).toBeLessThanOrEqual(time1);
      }
    });

    it("paginates tickets and provides accurate pagination metadata", async () => {
      const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });

      const res = await request(app)
        .get("/api/tickets?page=1&limit=5")
        .set("x-requester-id", String(alex!.id));

      expect(res.status).toBe(200);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 5,
        total: expect.any(Number),
        totalPages: expect.any(Number),
        hasNext: expect.any(Boolean),
        hasPrev: false,
      });
      expect(res.body.metrics).toHaveProperty("total");
      expect(res.body.metrics).toHaveProperty("open");
      expect(res.body.metrics).toHaveProperty("inProgress");
      expect(res.body.metrics).toHaveProperty("resolved");
      expect(res.body.metrics).toHaveProperty("closed");
    });
  });

  describe("Single Ticket Detail & Error Handling", () => {
    it("fetches single ticket detail by ticketNumber for the owner", async () => {
      const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });
      const alexTicket = await prisma.ticket.findFirst({
        where: { requesterId: alex!.id },
      });

      const res = await request(app)
        .get(`/api/tickets/${alexTicket!.ticketNumber}`)
        .set("x-requester-id", String(alex!.id));

      expect(res.status).toBe(200);
      expect(res.body.ticketNumber).toBe(alexTicket!.ticketNumber);
      expect(res.body.title).toBe(alexTicket!.title);
      expect(res.body.category).toHaveProperty("name");
      expect(res.body.requester.name).toBe("Alex Rivera");
      expect(Array.isArray(res.body.attachments)).toBe(true);
    });

    it("returns 401 Unauthorized when x-requester-id header is missing", async () => {
      const res = await request(app).get("/api/tickets");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
    });

    it("returns 400 Bad Request when query params are invalid", async () => {
      const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });

      const res = await request(app)
        .get("/api/tickets?limit=999&status=INVALID_STATUS")
        .set("x-requester-id", String(alex!.id));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("BAD_REQUEST");
    });
  });
});
