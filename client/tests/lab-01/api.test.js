import { afterEach, describe, expect, it, vi } from "vitest";
import { checkSystem } from "../../src/api.js";
afterEach(() => {
    vi.restoreAllMocks();
});
describe("checkSystem", () => {
    it("fetches /api/health and resolves online", async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal("fetch", fetchMock);
        await expect(checkSystem()).resolves.toEqual({ online: true, categories: [] });
        expect(fetchMock).toHaveBeenCalledWith("/api/health");
    });
    it("throws when /api/health is not ok", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
        await expect(checkSystem()).rejects.toThrow("Health check failed");
    });
});
