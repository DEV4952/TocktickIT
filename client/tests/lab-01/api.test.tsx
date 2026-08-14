import { afterEach, describe, expect, it, vi } from "vitest";
import { checkSystem } from "../../src/api.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("checkSystem", () => {
  it("fetches /api/health and /api/categories and resolves online with categories", async () => {
    const mockCategories = [
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
      { id: 3, name: "Software" },
      { id: 4, name: "Network" },
    ];
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/health") {
        return Promise.resolve({ ok: true });
      }
      if (url === "/api/categories") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCategories),
        });
      }
      return Promise.reject(new Error("Unknown endpoint"));
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkSystem()).resolves.toEqual({
      online: true,
      categories: mockCategories,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/health");
    expect(fetchMock).toHaveBeenCalledWith("/api/categories");
  });

  it("throws when /api/health is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(checkSystem()).rejects.toThrow("Unable to connect to TokTickIT API");
  });

  it("throws when /api/categories is not ok", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/health") {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: false });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkSystem()).rejects.toThrow("Unable to load request categories.");
  });
});