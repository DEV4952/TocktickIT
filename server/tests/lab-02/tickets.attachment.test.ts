import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 2 — Ticket Detail & Attachment API (Issue #7)", () => {
  const prisma = getPrisma();

  let requesterAId: number;
  let requesterBId: number;
  let categoryId: number;
  let ticketAId: number;
  let ticketANumber: string;
  let ticketBId: number;
  let ticketBNumber: string;

  beforeEach(async () => {
    // 1. Ensure test users exist
    const userA = await prisma.user.upsert({
      where: { email: "requester.a@toktick.it" },
      update: { isActive: true },
      create: {
        name: "Requester Alpha",
        email: "requester.a@toktick.it",
        department: "Marketing",
        isActive: true,
      },
    });
    requesterAId = userA.id;

    const userB = await prisma.user.upsert({
      where: { email: "requester.b@toktick.it" },
      update: { isActive: true },
      create: {
        name: "Requester Beta",
        email: "requester.b@toktick.it",
        department: "Sales",
        isActive: true,
      },
    });
    requesterBId = userB.id;

    // 2. Ensure test category exists
    const category = await prisma.category.upsert({
      where: { name: "Hardware" },
      update: {},
      create: { name: "Hardware" },
    });
    categoryId = category.id;

    // Clean existing test tickets & attachments for isolation
    await prisma.attachment.deleteMany({
      where: {
        ticket: {
          requesterId: { in: [requesterAId, requesterBId] },
        },
      },
    });
    await prisma.ticket.deleteMany({
      where: {
        requesterId: { in: [requesterAId, requesterBId] },
      },
    });

    // 3. Create Ticket for Requester A
    ticketANumber = `TIC-20260902-A${Date.now().toString().slice(-4)}`;
    const ticketA = await prisma.ticket.create({
      data: {
        ticketNumber: ticketANumber,
        title: "Alpha Laptop Screen Flickering",
        description: "Screen continuously flickers when connected to external monitor via HDMI.",
        relatedSystem: "Dell Latitude 5420",
        priority: "HIGH",
        status: "OPEN",
        categoryId,
        requesterId: requesterAId,
      },
    });
    ticketAId = ticketA.id;

    // 4. Create Ticket for Requester B
    ticketBNumber = `TIC-20260902-B${Date.now().toString().slice(-4)}`;
    const ticketB = await prisma.ticket.create({
      data: {
        ticketNumber: ticketBNumber,
        title: "Beta VPN Access Request",
        description: "Need VPN access for remote work starting next week.",
        priority: "MEDIUM",
        status: "OPEN",
        categoryId,
        requesterId: requesterBId,
      },
    });
    ticketBId = ticketB.id;
  });

  // ---------------------------------------------------------------------------
  // 1. GET /api/tickets/:id (Ticket Detail & Ownership)
  // ---------------------------------------------------------------------------
  describe("GET /api/tickets/:id (FR-07.1)", () => {
    it("AC-07.1: returns ticket details when accessed by owner requester", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketANumber}`)
        .set("x-requester-id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.body.ticketNumber).toBe(ticketANumber);
      expect(res.body.title).toBe("Alpha Laptop Screen Flickering");
      expect(res.body.requesterId).toBe(requesterAId);
      expect(res.body.category.name).toBe("Hardware");
      expect(Array.isArray(res.body.attachments)).toBe(true);
    });

    it("AC-07.2: rejects access when requester attempts to view another requester's ticket", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketANumber}`)
        .set("x-requester-id", String(requesterBId));

      expect([403, 404]).toContain(res.status);
      expect(res.body.ticketNumber).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. GET /api/tickets/:id/attachments (Attachment Metadata)
  // ---------------------------------------------------------------------------
  describe("GET /api/tickets/:id/attachments (FR-07.2)", () => {
    it("returns attachment metadata for owned ticket", async () => {
      // Seed an attachment
      await prisma.attachment.create({
        data: {
          fileName: "display_glitch.png",
          fileSize: 45000,
          fileType: "image/png",
          fileUrl: "/uploads/attachments/display_glitch.png",
          ticketId: ticketAId,
        },
      });

      const res = await request(app)
        .get(`/api/tickets/${ticketAId}/attachments`)
        .set("x-requester-id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].fileName).toBe("display_glitch.png");
      expect(res.body[0].fileSize).toBe(45000);
      expect(res.body[0].isDeleted).toBe(false);
    });

    it("rejects metadata retrieval when requested by non-owner", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketAId}/attachments`)
        .set("x-requester-id", String(requesterBId));

      expect([403, 404]).toContain(res.status);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. POST /api/tickets/:id/attachments (Upload Attachment)
  // ---------------------------------------------------------------------------
  describe("POST /api/tickets/:id/attachments (FR-07.3)", () => {
    it("AC-07.3: uploads valid JPG and PNG files successfully", async () => {
      const jpgBuffer = Buffer.from("fake-jpg-binary-data");
      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .set("x-requester-id", String(requesterAId))
        .attach("file", jpgBuffer, "screenshot.jpg");

      expect(res.status).toBe(201);
      expect(res.body.fileName).toBe("screenshot.jpg");
      expect(res.body.ticketId).toBe(ticketAId);
      expect(res.body.fileUrl).toContain("/uploads/attachments/");
    });

    it("AC-07.3: uploads valid PDF file successfully", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 simulated pdf data");
      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .set("x-requester-id", String(requesterAId))
        .attach("file", pdfBuffer, "crash_log.pdf");

      expect(res.status).toBe(201);
      expect(res.body.fileName).toBe("crash_log.pdf");
      expect(res.body.ticketId).toBe(ticketAId);
    });

    it("AC-07.4: rejects unsupported file types (e.g. .exe)", async () => {
      const exeBuffer = Buffer.from("MZ malicious exe simulation");
      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .set("x-requester-id", String(requesterAId))
        .attach("file", exeBuffer, "malware.exe");

      expect([400, 415]).toContain(res.status);
      expect(res.body.error).toBeDefined();
    });

    it("AC-07.4: rejects file exceeding maximum size (5 MB)", async () => {
      // 5.5 MB Buffer
      const bigBuffer = Buffer.alloc(5.5 * 1024 * 1024);
      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .set("x-requester-id", String(requesterAId))
        .attach("file", bigBuffer, "large_dump.png");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("FILE_TOO_LARGE");
    });

    it("AC-07.5: rejects upload when ticket already has 5 active attachments", async () => {
      // Pre-create 5 active attachments
      for (let i = 1; i <= 5; i++) {
        await prisma.attachment.create({
          data: {
            fileName: `att_${i}.png`,
            fileSize: 1000,
            fileType: "image/png",
            fileUrl: `/uploads/attachments/att_${i}.png`,
            ticketId: ticketAId,
            isDeleted: false,
          },
        });
      }

      const dummyFile = Buffer.from("extra file");
      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .set("x-requester-id", String(requesterAId))
        .attach("file", dummyFile, "att_6.png");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("MAX_ATTACHMENTS_EXCEEDED");
    });

    it("rejects attachment upload to another requester's ticket", async () => {
      const dummyFile = Buffer.from("hacker upload");
      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .set("x-requester-id", String(requesterBId))
        .attach("file", dummyFile, "hacked.png");

      expect([403, 404]).toContain(res.status);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. GET /api/attachments/:id/download & DELETE /api/attachments/:id
  // ---------------------------------------------------------------------------
  describe("Attachment Download & Soft Removal (FR-07.4 & FR-07.5)", () => {
    it("AC-07.6: downloads active attachment belonging to owned ticket", async () => {
      const attachment = await prisma.attachment.create({
        data: {
          fileName: "report.pdf",
          fileSize: 12000,
          fileType: "application/pdf",
          fileUrl: "/uploads/attachments/report.pdf",
          ticketId: ticketAId,
          isDeleted: false,
        },
      });

      const res = await request(app)
        .get(`/api/attachments/${attachment.id}/download`)
        .set("x-requester-id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.header["content-disposition"]).toContain("report.pdf");
    });

    it("AC-07.7: soft-removes attachment without deleting record", async () => {
      const attachment = await prisma.attachment.create({
        data: {
          fileName: "sensitive.png",
          fileSize: 8000,
          fileType: "image/png",
          fileUrl: "/uploads/attachments/sensitive.png",
          ticketId: ticketAId,
          isDeleted: false,
        },
      });

      const res = await request(app)
        .delete(`/api/attachments/${attachment.id}`)
        .set("x-requester-id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.body.attachment.isDeleted).toBe(true);

      // Verify DB record is retained with isDeleted = true
      const dbRecord = await prisma.attachment.findUnique({ where: { id: attachment.id } });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.isDeleted).toBe(true);
      expect(dbRecord?.deletedAt).not.toBeNull();
    });

    it("AC-07.8: blocks download of soft-removed attachment", async () => {
      const removedAtt = await prisma.attachment.create({
        data: {
          fileName: "removed.pdf",
          fileSize: 5000,
          fileType: "application/pdf",
          fileUrl: "/uploads/attachments/removed.pdf",
          ticketId: ticketAId,
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      const res = await request(app)
        .get(`/api/attachments/${removedAtt.id}/download`)
        .set("x-requester-id", String(requesterAId));

      expect([403, 410, 404]).toContain(res.status);
      expect(res.body.error).toBe("ATTACHMENT_REMOVED");
    });

    it("AC-07.9: rejects download and deletion when attempted by unauthorized requester", async () => {
      const attachmentA = await prisma.attachment.create({
        data: {
          fileName: "confidential_a.png",
          fileSize: 10000,
          fileType: "image/png",
          fileUrl: "/uploads/attachments/confidential_a.png",
          ticketId: ticketAId,
          isDeleted: false,
        },
      });

      // Requester B tries to download A's attachment
      const downloadRes = await request(app)
        .get(`/api/attachments/${attachmentA.id}/download`)
        .set("x-requester-id", String(requesterBId));
      expect([403, 404]).toContain(downloadRes.status);

      // Requester B tries to delete A's attachment
      const deleteRes = await request(app)
        .delete(`/api/attachments/${attachmentA.id}`)
        .set("x-requester-id", String(requesterBId));
      expect([403, 404]).toContain(deleteRes.status);
    });
  });
});
