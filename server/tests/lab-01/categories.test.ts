import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/categories", () => {
  it("returns the four seeded categories", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(4);

    const names = res.body.map((c: { id: number; name: string }) => c.name);
    expect(names).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);

    res.body.forEach((item: { id: number; name: string }) => {
      expect(item).toHaveProperty("id");
      expect(typeof item.id).toBe("number");
    });
  });
});


