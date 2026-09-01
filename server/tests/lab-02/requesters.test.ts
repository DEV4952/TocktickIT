import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("Lab 2 — Development Requester Endpoints", () => {
  describe("GET /api/requesters", () => {
    it("returns only active development requesters and excludes inactive ones", async () => {
      const res = await request(app).get("/api/requesters");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4);

      // Verify every returned requester is active
      res.body.forEach((user: { id: number; name: string; email: string; department: string; isActive: boolean }) => {
        expect(user.isActive).toBe(true);
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("name");
        expect(user).toHaveProperty("email");
        expect(user).toHaveProperty("department");
      });

      // Verify inactive user Jordan Taylor is excluded
      const emails = res.body.map((u: { email: string }) => u.email);
      expect(emails).not.toContain("jordan.taylor@toktick.it");

      // Verify active users are present
      expect(emails).toContain("alex.rivera@toktick.it");
      expect(emails).toContain("samantha.chen@toktick.it");
      expect(emails).toContain("marcus.vance@toktick.it");
      expect(emails).toContain("elena.rostova@toktick.it");
    });
  });

  describe("GET /api/requesters/me", () => {
    it("returns the active requester profile when valid x-requester-id header is provided", async () => {
      // First get active requesters to get a valid ID
      const listRes = await request(app).get("/api/requesters");
      const alex = listRes.body.find((u: { email: string }) => u.email === "alex.rivera@toktick.it");
      expect(alex).toBeDefined();

      const res = await request(app)
        .get("/api/requesters/me")
        .set("x-requester-id", String(alex.id));

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(alex.id);
      expect(res.body.email).toBe("alex.rivera@toktick.it");
      expect(res.body.name).toBe("Alex Rivera");
      expect(res.body.department).toBe("Engineering");
    });

    it("returns 401 Unauthorized when x-requester-id header is missing", async () => {
      const res = await request(app).get("/api/requesters/me");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: "UNAUTHORIZED",
        message: "Missing x-requester-id header",
      });
    });

    it("returns 400 Bad Request when x-requester-id header is invalid", async () => {
      const res = await request(app)
        .get("/api/requesters/me")
        .set("x-requester-id", "invalid-id");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: "BAD_REQUEST",
        message: "Invalid x-requester-id header",
      });
    });

    it("returns 404 Not Found when requester id does not exist", async () => {
      const res = await request(app)
        .get("/api/requesters/me")
        .set("x-requester-id", "999999");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: "NOT_FOUND",
        message: "Requester not found",
      });
    });
  });
});
