import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 — Ticket Creation API (POST /api/tickets)", () => {
  const prisma = getPrisma();

  afterAll(async () => {
    // Clean up test-created tickets
    await prisma.ticket.deleteMany({
      where: {
        title: {
          startsWith: "[TEST]",
        },
      },
    });
    await prisma.$disconnect();
  });

  describe("Successful Creation", () => {
    it("creates a ticket successfully with auto-generated ticketNumber and default status OPEN", async () => {
      const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });
      const networkCat = await prisma.category.findUnique({ where: { name: "Network" } });
      expect(alex).not.toBeNull();
      expect(networkCat).not.toBeNull();

      const payload = {
        title: "[TEST] Cannot connect to Wi-Fi in Meeting Room 3",
        description: "Wi-Fi signal drops intermittently when connecting from Room 3 on 5GHz band.",
        categoryId: networkCat!.id,
        relatedSystem: "Access Point AP-03",
        priority: "HIGH",
        attachments: [
          {
            fileName: "wifi-error.png",
            fileSize: 102400,
            fileType: "image/png",
            fileUrl: "/uploads/attachments/wifi-error.png",
          },
        ],
      };

      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", String(alex!.id))
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.ticketNumber).toMatch(/^TIC-\d{8}-\d{4}$/);
      expect(res.body.title).toBe(payload.title);
      expect(res.body.description).toBe(payload.description);
      expect(res.body.relatedSystem).toBe("Access Point AP-03");
      expect(res.body.status).toBe("OPEN");
      expect(res.body.priority).toBe("HIGH");
      expect(res.body.categoryId).toBe(networkCat!.id);
      expect(res.body.category).toEqual({
        id: networkCat!.id,
        name: "Network",
      });
      expect(res.body.requesterId).toBe(alex!.id);
      expect(res.body.requester.name).toBe("Alex Rivera");
      expect(res.body.attachments).toHaveLength(1);
      expect(res.body.attachments[0].fileName).toBe("wifi-error.png");
    });

    it("supports summary field as alias for title and defaults priority to MEDIUM", async () => {
      const samantha = await prisma.user.findUnique({ where: { email: "samantha.chen@toktick.it" } });
      const softwareCat = await prisma.category.findUnique({ where: { name: "Software" } });

      const payload = {
        summary: "[TEST] Install Adobe Photoshop License",
        description: "Need Adobe Photoshop installed for marketing campaign assets creation.",
        categoryId: softwareCat!.id,
      };

      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", String(samantha!.id))
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.title).toBe(payload.summary);
      expect(res.body.priority).toBe("MEDIUM");
      expect(res.body.status).toBe("OPEN");
      expect(res.body.attachments).toEqual([]);
    });
  });

  describe("Validation Failures (400 Bad Request)", () => {
    it("rejects when title is missing or shorter than 5 characters", async () => {
      const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });
      const networkCat = await prisma.category.findUnique({ where: { name: "Network" } });

      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", String(alex!.id))
        .send({
          title: "VPN", // Too short (< 5 chars)
          description: "This is a valid long description for the ticket.",
          categoryId: networkCat!.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "title" }),
        ])
      );
    });

    it("rejects when description is missing or shorter than 10 characters", async () => {
      const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });
      const networkCat = await prisma.category.findUnique({ where: { name: "Network" } });

      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", String(alex!.id))
        .send({
          title: "[TEST] Valid Title Here",
          description: "Short", // Too short (< 10 chars)
          categoryId: networkCat!.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "description" }),
        ])
      );
    });

    it("rejects when categoryId does not exist", async () => {
      const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });

      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", String(alex!.id))
        .send({
          title: "[TEST] Valid Title Here",
          description: "This is a valid long description for testing non-existent category.",
          categoryId: 999999, // Non-existent category
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "categoryId", issue: "Category ID does not exist" }),
        ])
      );
    });

    it("rejects when priority is invalid", async () => {
      const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });
      const networkCat = await prisma.category.findUnique({ where: { name: "Network" } });

      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", String(alex!.id))
        .send({
          title: "[TEST] Valid Title Here",
          description: "This is a valid long description for testing invalid priority.",
          categoryId: networkCat!.id,
          priority: "CRITICAL_SUPER_EMERGENCY", // Invalid enum
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "priority" }),
        ])
      );
    });

    it("rejects when attachments exceed 3 files or have invalid file type", async () => {
      const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });
      const networkCat = await prisma.category.findUnique({ where: { name: "Network" } });

      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", String(alex!.id))
        .send({
          title: "[TEST] Valid Title Here",
          description: "This is a valid long description with bad attachments.",
          categoryId: networkCat!.id,
          attachments: [
            { fileName: "file1.exe", fileSize: 100, fileType: "application/x-msdownload", fileUrl: "/file1.exe" },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });
  });

  describe("Authentication & Requester Constraints", () => {
    it("returns 401 Unauthorized when x-requester-id header is missing", async () => {
      const networkCat = await prisma.category.findUnique({ where: { name: "Network" } });

      const res = await request(app)
        .post("/api/tickets")
        .send({
          title: "[TEST] No Auth Ticket",
          description: "This request omits the x-requester-id header entirely.",
          categoryId: networkCat!.id,
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
    });

    it("returns 403 Forbidden when requester is inactive", async () => {
      const jordan = await prisma.user.findUnique({ where: { email: "jordan.taylor@toktick.it" } });
      const networkCat = await prisma.category.findUnique({ where: { name: "Network" } });
      expect(jordan?.isActive).toBe(false);

      const res = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", String(jordan!.id))
        .send({
          title: "[TEST] Inactive User Attempt",
          description: "An inactive requester trying to create a support ticket.",
          categoryId: networkCat!.id,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("USER_INACTIVE");
      expect(res.body.message).toMatch(/Inactive requesters cannot submit new tickets/i);
    });
  });

  describe("Duplicate Prevention (409 Conflict)", () => {
    it("rejects rapid duplicate submissions with identical title and requester", async () => {
      const marcus = await prisma.user.findUnique({ where: { email: "marcus.vance@toktick.it" } });
      const hardwareCat = await prisma.category.findUnique({ where: { name: "Hardware" } });

      const payload = {
        title: "[TEST] Rapid duplicate test ticket submission",
        description: "Checking that subsequent rapid clicks get blocked with 409 Conflict.",
        categoryId: hardwareCat!.id,
      };

      // First submit: 201 Created
      const res1 = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", String(marcus!.id))
        .send(payload);

      expect(res1.status).toBe(201);

      // Immediate second submit: 409 Conflict
      const res2 = await request(app)
        .post("/api/tickets")
        .set("x-requester-id", String(marcus!.id))
        .send(payload);

      expect(res2.status).toBe(409);
      expect(res2.body.error).toBe("DUPLICATE_SUBMISSION");
    });
  });
});
