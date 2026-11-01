import { Router, Request, Response, NextFunction } from "express";
import { requireAuth, requireRole, SESSION_COOKIE_NAME, verifySessionToken } from "../utils/auth.js";
import { requesterDashboard, staffDashboard } from "../services/dashboard.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth, (req: Request, res: Response, next: NextFunction) => {
  // Like Actions Taken, dashboards require signed sessions, never Lab 2 identity headers.
  const token = req.cookies?.[SESSION_COOKIE_NAME] || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);
  const session = typeof token === "string" ? verifySessionToken(token) : null;
  if (!session || session.id !== req.user!.id) return res.status(401).json({ error: "UNAUTHORIZED", message: "A signed session is required." });
  if (!req.user!.isActive) return res.status(403).json({ error: "FORBIDDEN", message: "Inactive users cannot access dashboards." });
  next();
});
dashboardRouter.get("/requester", requireRole("REQUESTER"), async (req: Request, res: Response) => {
  try { return res.json(await requesterDashboard(req.user!.id)); }
  catch (error) {
    console.error("Failed to load requester dashboard:", error);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to load requester dashboard." });
  }
});
dashboardRouter.get("/staff", requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: Request, res: Response) => {
  try { return res.json(await staffDashboard(req.user!.id, req.user!.role === "ADMINISTRATOR")); }
  catch (error) {
    console.error("Failed to load staff dashboard:", error);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Failed to load staff dashboard." });
  }
});
