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

// ---------------------------------------------------------------------------
// Issue 4 — Ticket Creation Endpoint
// POST /api/tickets
// ---------------------------------------------------------------------------
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf", "text/plain"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

import { generateTicketNumber } from "./utils/ticketNumber.js";
import { TicketPriority } from "@prisma/client";

app.post("/api/tickets", async (req: Request, res: Response) => {
  try {
    // 1. Authenticate Requester Context
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
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Invalid ticket data",
        details: [{ field: "requesterId", issue: "Requester does not exist" }],
      });
    }

    // 2. Check Inactive Requester Constraint
    if (!user.isActive) {
      return res.status(403).json({
        error: "USER_INACTIVE",
        message: "Inactive requesters cannot submit new tickets.",
      });
    }

    // 3. Extract & Validate Fields
    const rawTitle = req.body.title ?? req.body.summary;
    const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
    const rawDescription = req.body.description;
    const description = typeof rawDescription === "string" ? rawDescription.trim() : "";
    const rawCategoryId = req.body.categoryId;
    const categoryId = typeof rawCategoryId === "number" ? rawCategoryId : parseInt(String(rawCategoryId), 10);
    const relatedSystem = req.body.relatedSystem ? String(req.body.relatedSystem).trim() : null;
    const rawPriority = req.body.priority ? String(req.body.priority).toUpperCase() : "MEDIUM";
    const rawAttachments = req.body.attachments;

    const validationErrors: Array<{ field: string; issue: string }> = [];

    // Title validation (5..150 characters)
    if (!title || title.length < 5 || title.length > 150) {
      validationErrors.push({
        field: "title",
        issue: "Title must be between 5 and 150 characters",
      });
    }

    // Description validation (10..2000 characters)
    if (!description || description.length < 10 || description.length > 2000) {
      validationErrors.push({
        field: "description",
        issue: "Description must be between 10 and 2000 characters",
      });
    }

    // Category ID validation
    if (isNaN(categoryId) || categoryId <= 0) {
      validationErrors.push({
        field: "categoryId",
        issue: "Category ID is required and must be a valid positive integer",
      });
    } else {
      const categoryExists = await prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!categoryExists) {
        validationErrors.push({
          field: "categoryId",
          issue: "Category ID does not exist",
        });
      }
    }

    // Priority validation
    if (!VALID_PRIORITIES.includes(rawPriority as any)) {
      validationErrors.push({
        field: "priority",
        issue: "Priority must be one of LOW, MEDIUM, HIGH, URGENT",
      });
    }

    // Attachments validation
    if (rawAttachments !== undefined && rawAttachments !== null) {
      if (!Array.isArray(rawAttachments)) {
        validationErrors.push({
          field: "attachments",
          issue: "Attachments must be an array",
        });
      } else if (rawAttachments.length > 3) {
        validationErrors.push({
          field: "attachments",
          issue: "A maximum of 3 attachments are permitted per ticket",
        });
      } else {
        for (let i = 0; i < rawAttachments.length; i++) {
          const att = rawAttachments[i];
          if (!att || typeof att !== "object") {
            validationErrors.push({
              field: `attachments[${i}]`,
              issue: "Attachment object is invalid",
            });
            continue;
          }
          if (!att.fileName || typeof att.fileName !== "string") {
            validationErrors.push({
              field: `attachments[${i}].fileName`,
              issue: "File name is required",
            });
          }
          if (typeof att.fileSize !== "number" || att.fileSize <= 0 || att.fileSize > MAX_FILE_SIZE) {
            validationErrors.push({
              field: `attachments[${i}].fileSize`,
              issue: "File size must not exceed 5 MB",
            });
          }
          if (!att.fileType || !ALLOWED_MIME_TYPES.includes(att.fileType)) {
            validationErrors.push({
              field: `attachments[${i}].fileType`,
              issue: "File type must be image/jpeg, image/png, application/pdf, or text/plain",
            });
          }
          if (!att.fileUrl || typeof att.fileUrl !== "string") {
            validationErrors.push({
              field: `attachments[${i}].fileUrl`,
              issue: "File URL is required",
            });
          }
        }
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Invalid ticket data",
        details: validationErrors,
      });
    }

    // 4. Duplicate Submission Prevention (BR-07: within 3 seconds)
    const recentDuplicate = await prisma.ticket.findFirst({
      where: {
        requesterId: user.id,
        title,
        createdAt: {
          gte: new Date(Date.now() - 3000),
        },
      },
    });

    if (recentDuplicate) {
      return res.status(409).json({
        error: "DUPLICATE_SUBMISSION",
        message: "A ticket with identical content was recently submitted. Please wait before retrying.",
      });
    }

    // 5. Generate Unique Ticket Number
    const ticketNumber = await generateTicketNumber(prisma);

    // 6. Create Ticket & Attachments in DB
    const newTicket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title,
        description,
        relatedSystem,
        status: "OPEN",
        priority: rawPriority as TicketPriority,
        categoryId,
        requesterId: user.id,
        attachments: Array.isArray(rawAttachments) && rawAttachments.length > 0
          ? {
              create: rawAttachments.map((att) => ({
                fileName: att.fileName,
                fileSize: att.fileSize,
                fileType: att.fileType,
                fileUrl: att.fileUrl,
                isDeleted: false,
              })),
            }
          : undefined,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        attachments: {
          where: { isDeleted: false },
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            fileType: true,
            fileUrl: true,
            createdAt: true,
          },
        },
      },
    });

    return res.status(201).json(newTicket);
  } catch (error) {
    console.error("Failed to create ticket:", error);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to create ticket",
    });
  }
});

export default app;
