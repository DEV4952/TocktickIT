import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 — Authentication & Session Management APIs (Issue #4)", () => {
  const prisma = getPrisma();

  beforeEach(async () => {
    const defaultHash = bcrypt.hashSync("Password123!", 10);

    // Ensure alex.rivera has initial active password state
    await prisma.user.upsert({
      where: { email: "alex.rivera@toktick.it" },
      update: {
        passwordHash: defaultHash,
        mustChangePassword: false,
        isActive: true,
      },
      create: {
        name: "Alex Rivera",
        email: "alex.rivera@toktick.it",
        department: "Engineering",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
        passwordHash: defaultHash,
      },
    });

    // Ensure emily.davis has initial password state
    await prisma.user.upsert({
      where: { email: "emily.davis@toktick.it" },
      update: {
        passwordHash: defaultHash,
        mustChangePassword: true,
        isActive: true,
      },
      create: {
        name: "Emily Davis",
        email: "emily.davis@toktick.it",
        department: "Human Resources",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: true,
        passwordHash: defaultHash,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/auth/login", () => {
    it("API-01: logs in successfully with valid active credentials (AC-01)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "alex.rivera@toktick.it",
          password: "Password123!",
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("alex.rivera@toktick.it");
      expect(res.body.user.role).toBe("REQUESTER");
      expect(res.body.user.isActive).toBe(true);
      expect(res.body.user.mustChangePassword).toBe(false);
      expect(res.body.token).toBeDefined();
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("API-02: rejects login with incorrect password with 401 (BR-01)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "alex.rivera@toktick.it",
          password: "WrongPassword!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("INVALID_CREDENTIALS");
    });

    it("API-03: rejects login for inactive accounts with 403 (BR-01)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "jordan.taylor@toktick.it",
          password: "Password123!",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("ACCOUNT_INACTIVE");
    });

    it("API-04: flags mustChangePassword = true for users with initial passwords (AC-02)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "emily.davis@toktick.it",
          password: "Password123!",
        });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("emily.davis@toktick.it");
      expect(res.body.user.mustChangePassword).toBe(true);
    });
  });

  describe("GET /api/auth/me", () => {
    it("API-07: returns current user when authenticated with Bearer token (FR-03)", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "michael.brown@toktick.it",
          password: "Password123!",
        });

      const token = loginRes.body.token;

      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe("michael.brown@toktick.it");
      expect(meRes.body.user.role).toBe("IT_STAFF");
    });

    it("API-07b: returns current user when authenticated with cookie", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "john.smith@toktick.it",
          password: "Password123!",
        });

      const cookies = loginRes.headers["set-cookie"];

      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookies);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.role).toBe("ADMINISTRATOR");
    });

    it("API-07c: returns 401 when unauthenticated", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
    });
  });

  describe("POST /api/auth/change-password", () => {
    it("API-05: successfully updates password and clears mustChangePassword flag (AC-02)", async () => {
      const defaultHash = bcrypt.hashSync("Password123!", 10);
      const testUser = await prisma.user.upsert({
        where: { email: "pwchange.test@toktick.it" },
        update: {
          passwordHash: defaultHash,
          mustChangePassword: true,
          isActive: true,
        },
        create: {
          name: "Password Change Tester",
          email: "pwchange.test@toktick.it",
          role: "REQUESTER",
          isActive: true,
          mustChangePassword: true,
          passwordHash: defaultHash,
        },
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "pwchange.test@toktick.it",
          password: "Password123!",
        });

      const token = loginRes.body.token;

      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "Password123!",
          newPassword: "BrandNewSecure#2026",
          confirmPassword: "BrandNewSecure#2026",
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.user.mustChangePassword).toBe(false);

      // Verify login with new password
      const reLogin = await request(app)
        .post("/api/auth/login")
        .send({
          email: "pwchange.test@toktick.it",
          password: "BrandNewSecure#2026",
        });

      expect(reLogin.status).toBe(200);
      expect(reLogin.body.user.mustChangePassword).toBe(false);
    });

    it("API-06: rejects password change failing complexity requirements", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "alex.rivera@toktick.it",
          password: "Password123!",
        });

      const token = loginRes.body.token;

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "Password123!",
          newPassword: "short",
          confirmPassword: "short",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("BAD_REQUEST");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("API-08: clears session cookie on logout (FR-03)", async () => {
      const res = await request(app).post("/api/auth/logout");
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Logged out successfully");
    });
  });
});
