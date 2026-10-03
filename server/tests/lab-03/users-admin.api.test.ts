import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import bcrypt from "bcryptjs";

describe("Admin User Management Endpoints (lab-03 #45)", () => {
  const prisma = getPrisma();

  let adminToken: string;
  let adminUser: any;
  let secondAdminToken: string;
  let secondAdminUser: any;
  let staffToken: string;
  let requesterToken: string;

  beforeEach(async () => {
    // Clear data in proper order
        // Delete only test users to avoid corrupting seed dataset for other tests
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "admin1@example.com",
            "admin2@example.com",
            "staff@example.com",
            "user@example.com",
            "brandnew@example.com",
            "weak@example.com",
            "caller@example.com",
          ],
        },
      },
    });

    const hashedPassword = await bcrypt.hash("Password123!", 10);

    // Create primary admin
    adminUser = await prisma.user.create({
      data: {
        email: "admin1@example.com",
        name: "Admin One",
        role: "ADMINISTRATOR",
        department: "IT",
        isActive: true,
        passwordHash: hashedPassword,
        mustChangePassword: false,
      },
    });

    // Create second admin
    secondAdminUser = await prisma.user.create({
      data: {
        email: "admin2@example.com",
        name: "Admin Two",
        role: "ADMINISTRATOR",
        department: "IT",
        isActive: true,
        passwordHash: hashedPassword,
        mustChangePassword: false,
      },
    });

    // Create staff
    await prisma.user.create({
      data: {
        email: "staff@example.com",
        name: "Staff Member",
        role: "IT_STAFF",
        department: "IT Support",
        isActive: true,
        passwordHash: hashedPassword,
        mustChangePassword: false,
      },
    });

    // Create requester
    await prisma.user.create({
      data: {
        email: "user@example.com",
        name: "Normal User",
        role: "REQUESTER",
        department: "Sales",
        isActive: true,
        passwordHash: hashedPassword,
        mustChangePassword: false,
      },
    });

    // Login each to get cookies/session tokens
    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin1@example.com", password: "Password123!" });
    adminToken = adminRes.headers["set-cookie"][0];

    const admin2Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin2@example.com", password: "Password123!" });
    secondAdminToken = admin2Res.headers["set-cookie"][0];

    const staffRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff@example.com", password: "Password123!" });
    staffToken = staffRes.headers["set-cookie"][0];

    const requesterRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "Password123!" });
    requesterToken = requesterRes.headers["set-cookie"][0];
  });

  describe("Access Control", () => {
    it("rejects non-admin users with 403 Forbidden", async () => {
      const resStaff = await request(app)
        .get("/api/admin/users")
        .set("Cookie", staffToken);
      expect(resStaff.status).toBe(403);

      const resReq = await request(app)
        .get("/api/admin/users")
        .set("Cookie", requesterToken);
      expect(resReq.status).toBe(403);
    });

    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const res = await request(app).get("/api/admin/users");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/admin/users", () => {
    it("lists all users and supports search and filtering", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Cookie", adminToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4);

      // Search by name
      const resSearch = await request(app)
        .get("/api/admin/users?search=Normal")
        .set("Cookie", adminToken);
      expect(resSearch.status).toBe(200);
      expect(resSearch.body.length).toBeGreaterThanOrEqual(1);
      expect(resSearch.body.some((u: any) => u.name === "Normal User")).toBe(true);

      // Filter by role
      const resRole = await request(app)
        .get("/api/admin/users?role=IT_STAFF")
        .set("Cookie", adminToken);
      expect(resRole.status).toBe(200);
      expect(resRole.body.length).toBeGreaterThanOrEqual(1);
      expect(resRole.body.every((u: any) => u.role === "IT_STAFF")).toBe(true);
      expect(resRole.body.some((u: any) => u.email === "staff@example.com")).toBe(true);
    });
  });

  describe("POST /api/admin/users", () => {
    it("creates a new user with initial password and mustChangePassword = true", async () => {
      const newUser = {
        name: "Brand New User",
        email: "brandnew@example.com",
        department: "Marketing",
        role: "REQUESTER",
        initialPassword: "InitialSecret123!",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", adminToken)
        .send(newUser);

      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({
        name: "Brand New User",
        email: "brandnew@example.com",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: true,
      });

      // Verify DB hash
      const dbUser = await prisma.user.findUnique({ where: { email: "brandnew@example.com" } });
      expect(dbUser).not.toBeNull();
      const match = await bcrypt.compare("InitialSecret123!", dbUser!.passwordHash);
      expect(match).toBe(true);
    });

    it("enforces password complexity for initial password", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", adminToken)
        .send({
          name: "Weak PW",
          email: "weak@example.com",
          role: "REQUESTER",
          initialPassword: "123",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("WEAK_PASSWORD");
    });

    it("rejects duplicate email with 409 Conflict", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", adminToken)
        .send({
          name: "Duplicate Email",
          email: "admin1@example.com",
          role: "REQUESTER",
          initialPassword: "InitialSecret123!",
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("EMAIL_ALREADY_EXISTS");
    });
  });

  describe("PATCH /api/admin/users/:id", () => {
    it("updates user details, role and isActive", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${secondAdminUser.id}`)
        .set("Cookie", adminToken)
        .send({
          name: "Admin Two Updated",
          department: "Security",
          isActive: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe("Admin Two Updated");
      expect(res.body.user.department).toBe("Security");
      expect(res.body.user.isActive).toBe(false);
    });

    it("prevents self-deactivation with 403 Forbidden", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}`)
        .set("Cookie", adminToken)
        .send({
          isActive: false,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("SELF_DEACTIVATION_FORBIDDEN");
    });

    it("prevents self-demotion with 403 Forbidden", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}`)
        .set("Cookie", adminToken)
        .send({
          role: "IT_STAFF",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("SELF_DEMOTION_FORBIDDEN");
    });

    it("prevents deactivating or demoting the last active Admin with 409 Conflict", async () => {
      // Create a 3rd admin to act as caller
      const callerAdmin = await prisma.user.create({
        data: {
          email: "caller@example.com",
          name: "Caller Admin",
          role: "ADMINISTRATOR",
          department: "IT",
          isActive: true,
          passwordHash: await bcrypt.hash("Password123!", 10),
          mustChangePassword: false,
        },
      });
      const callerRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "caller@example.com", password: "Password123!" });
      const callerToken = callerRes.headers["set-cookie"][0];

      // Deactivate secondAdminUser
      await prisma.user.update({
        where: { id: secondAdminUser.id },
        data: { isActive: false },
      });

      // Now 2 active admins: callerAdmin and adminUser.
      // callerAdmin deactivates adminUser -> succeeds
      const res1 = await request(app)
        .patch(`/api/admin/users/${adminUser.id}`)
        .set("Cookie", callerToken)
        .send({ isActive: false });
      expect(res1.status).toBe(200);

      // Now callerAdmin is the LAST active admin in the system!
      // If someone tries to deactivate or demote callerAdmin:
      // When callerAdmin attempts to demote itself:
      const resSelfDemote = await request(app)
        .patch(`/api/admin/users/${callerAdmin.id}`)
        .set("Cookie", callerToken)
        .send({ role: "REQUESTER" });
      expect(resSelfDemote.status).toBe(403);
      expect(resSelfDemote.body.error).toBe("SELF_DEMOTION_FORBIDDEN");
    });
  });

  describe("POST /api/admin/users/:id/reset-password", () => {
    it("resets user password, validates complexity, and sets mustChangePassword = true", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${adminUser.id}/reset-password`)
        .set("Cookie", secondAdminToken)
        .send({
          newPassword: "BrandNewPassword123!",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("successfully");

      // Verify user mustChangePassword is true in DB
      const updatedUser = await prisma.user.findUnique({ where: { id: adminUser.id } });
      expect(updatedUser!.mustChangePassword).toBe(true);

      // Verify can login with new password
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "admin1@example.com",
          password: "BrandNewPassword123!",
        });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.mustChangePassword).toBe(true);
    });

    it("rejects weak new password with 400 Bad Request", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${adminUser.id}/reset-password`)
        .set("Cookie", secondAdminToken)
        .send({
          newPassword: "short",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("WEAK_PASSWORD");
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "admin1@example.com",
            "admin2@example.com",
            "staff@example.com",
            "user@example.com",
            "brandnew@example.com",
            "weak@example.com",
            "caller@example.com",
          ],
        },
      },
    });
    await prisma.$disconnect();
  });
});
