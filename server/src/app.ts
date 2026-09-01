import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// Add:  GET /api/categories
//   -> read categories from PostgreSQL via getPrisma().category.findMany(...)
//   -> return each { id, name } in a predictable (id) order
//   -> on failure, respond 500 with a safe message (no internal details)
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 — Development Requester Endpoints
// ---------------------------------------------------------------------------

// 1. GET /api/requesters — List active development requesters
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesters = await prisma.user.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    res.status(200).json(requesters);
  } catch (error) {
    res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch requesters",
    });
  }
});

// 2. GET /api/requesters/me — Get active requester profile from x-requester-id
app.get("/api/requesters/me", async (req: Request, res: Response) => {
  try {
    const headerValue = req.headers["x-requester-id"];

    if (!headerValue) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Missing x-requester-id header",
      });
    }

    const requesterId = parseInt(Array.isArray(headerValue) ? headerValue[0] : headerValue, 10);

    if (isNaN(requesterId) || requesterId <= 0) {
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "Invalid x-requester-id header",
      });
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: requesterId },
    });

    if (!user) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Requester not found",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch requester profile",
    });
  }
});

export default app;
