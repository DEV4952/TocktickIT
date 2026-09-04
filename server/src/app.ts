import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import { getPrisma } from "./prisma.js";

// Setup uploads directory
const uploadsDir = path.join(process.cwd(), "uploads", "attachments");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer storage and validation
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"];
    const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      const err = new Error("Unsupported file format. Allowed: JPG, PNG, WEBP, PDF, TXT");
      (err as any).code = "UNSUPPORTED_MEDIA_TYPE";
      cb(err as any, false);
    }
  },
});

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

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

// ---------------------------------------------------------------------------
// Issue 6 — Query Paginated Tickets (My Tickets)
// GET /api/tickets
// ---------------------------------------------------------------------------
const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
const VALID_SORT_FIELDS = ["createdAt", "updatedAt", "priority", "ticketNumber", "title"] as const;
const VALID_SORT_ORDERS = ["asc", "desc"] as const;
const ALLOWED_PAGE_LIMITS = [5, 10, 20, 50];

app.get("/api/tickets", async (req: Request, res: Response) => {
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
        message: "Requester does not exist",
      });
    }

    // 2. Parse & Validate Query Parameters
    const rawPage = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const page = !isNaN(rawPage) && rawPage >= 1 ? rawPage : 1;

    const rawLimit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
    const limit = !isNaN(rawLimit) ? rawLimit : 10;
    if (req.query.limit && !ALLOWED_PAGE_LIMITS.includes(limit)) {
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "Invalid limit parameter. Allowed values: 5, 10, 20, 50",
      });
    }

    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
    
    // Status filter
    let statusFilter: (typeof VALID_STATUSES)[number] | undefined = undefined;
    if (req.query.status && req.query.status !== "ALL") {
      const statusUpper = String(req.query.status).toUpperCase();
      if (!VALID_STATUSES.includes(statusUpper as any)) {
        return res.status(400).json({
          error: "BAD_REQUEST",
          message: "Invalid status parameter. Allowed values: OPEN, IN_PROGRESS, RESOLVED, CLOSED, ALL",
        });
      }
      statusFilter = statusUpper as (typeof VALID_STATUSES)[number];
    }

    // Priority filter
    let priorityFilter: (typeof VALID_PRIORITIES)[number] | undefined = undefined;
    if (req.query.priority && req.query.priority !== "ALL") {
      const priorityUpper = String(req.query.priority).toUpperCase();
      if (!VALID_PRIORITIES.includes(priorityUpper as any)) {
        return res.status(400).json({
          error: "BAD_REQUEST",
          message: "Invalid priority parameter. Allowed values: LOW, MEDIUM, HIGH, URGENT, ALL",
        });
      }
      priorityFilter = priorityUpper as (typeof VALID_PRIORITIES)[number];
    }

    // Category filter
    let categoryIdFilter: number | undefined = undefined;
    if (req.query.categoryId && req.query.categoryId !== "ALL") {
      const catIdParsed = parseInt(String(req.query.categoryId), 10);
      if (isNaN(catIdParsed) || catIdParsed <= 0) {
        return res.status(400).json({
          error: "BAD_REQUEST",
          message: "Invalid categoryId parameter. Must be a valid positive integer",
        });
      }
      categoryIdFilter = catIdParsed;
    }

    // Sort parameters
    const rawSortBy = req.query.sortBy ? String(req.query.sortBy) : "createdAt";
    if (!VALID_SORT_FIELDS.includes(rawSortBy as any)) {
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: `Invalid sortBy parameter. Allowed values: ${VALID_SORT_FIELDS.join(", ")}`,
      });
    }
    const sortBy = rawSortBy;

    const rawSortOrder = req.query.sortOrder ? String(req.query.sortOrder).toLowerCase() : "desc";
    if (!VALID_SORT_ORDERS.includes(rawSortOrder as any)) {
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "Invalid sortOrder parameter. Allowed values: asc, desc",
      });
    }
    const sortOrder = rawSortOrder as (typeof VALID_SORT_ORDERS)[number];

    // 3. Build Prisma Where Clause with STRICT OWNERSHIP ENFORCEMENT
    const whereClause: any = {
      requesterId: user.id, // Strictly scoped to active requester!
    };

    if (statusFilter) {
      whereClause.status = statusFilter;
    }

    if (priorityFilter) {
      whereClause.priority = priorityFilter;
    }

    if (categoryIdFilter) {
      whereClause.categoryId = categoryIdFilter;
    }

    if (search) {
      whereClause.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { relatedSystem: { contains: search, mode: "insensitive" } },
      ];
    }

    // 4. Query DB for matching tickets, pagination, and overall requester metrics
    const [total, tickets, statusMetrics] = await Promise.all([
      // Count matching filtered tickets
      prisma.ticket.count({ where: whereClause }),
      // Fetch paginated tickets
      prisma.ticket.findMany({
        where: whereClause,
        include: {
          category: {
            select: { id: true, name: true },
          },
          attachments: {
            where: { isDeleted: false },
            select: { id: true },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      // Aggregate metrics for this requester across all statuses
      prisma.ticket.groupBy({
        by: ["status"],
        where: { requesterId: user.id },
        _count: { status: true },
      }),
    ]);

    // Format metrics
    let totalAllTickets = 0;
    let openCount = 0;
    let inProgressCount = 0;
    let resolvedCount = 0;
    let closedCount = 0;

    for (const group of statusMetrics) {
      const count = group._count.status;
      totalAllTickets += count;
      if (group.status === "OPEN") openCount = count;
      else if (group.status === "IN_PROGRESS") inProgressCount = count;
      else if (group.status === "RESOLVED") resolvedCount = count;
      else if (group.status === "CLOSED") closedCount = count;
    }

    const totalPages = Math.ceil(total / limit) || 1;

    // Transform tickets response
    const transformedData = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      title: t.title,
      description: t.description,
      relatedSystem: t.relatedSystem,
      status: t.status,
      priority: t.priority,
      categoryId: t.categoryId,
      category: t.category,
      requesterId: t.requesterId,
      attachmentCount: t.attachments.length,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return res.status(200).json({
      data: transformedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      metrics: {
        total: totalAllTickets,
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        closed: closedCount,
      },
    });
  } catch (error) {
    console.error("Failed to fetch tickets:", error);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch tickets",
    });
  }
});

// ---------------------------------------------------------------------------
// Issue 7 — Single Ticket Detail
// GET /api/tickets/:id
// ---------------------------------------------------------------------------
app.get("/api/tickets/:id", async (req: Request, res: Response) => {
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
    const idParam = req.params.id;

    // Support lookup by integer ID or TicketNumber (e.g. TIC-20260901-0001)
    const isNumericId = /^\d+$/.test(idParam);
    const whereQuery: any = isNumericId
      ? { id: parseInt(idParam, 10) }
      : { ticketNumber: idParam };

    const ticket = await prisma.ticket.findFirst({
      where: whereQuery,
      include: {
        category: {
          select: { id: true, name: true },
        },
        requester: {
          select: { id: true, name: true, email: true, department: true, avatarUrl: true },
        },
        attachments: {
          where: { isDeleted: false },
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            fileType: true,
            fileUrl: true,
            isDeleted: true,
            deletedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!ticket || ticket.requesterId !== requesterId) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Ticket not found or you do not have permission to view it.",
      });
    }

    return res.status(200).json({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      relatedSystem: ticket.relatedSystem,
      status: ticket.status,
      priority: ticket.priority,
      categoryId: ticket.categoryId,
      category: ticket.category,
      requesterId: ticket.requesterId,
      requester: ticket.requester,
      attachments: ticket.attachments,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch ticket detail:", error);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch ticket detail",
    });
  }
});

// ---------------------------------------------------------------------------
// Issue 7 — Get Ticket Attachment Metadata List
// GET /api/tickets/:id/attachments
// ---------------------------------------------------------------------------
app.get("/api/tickets/:id/attachments", async (req: Request, res: Response) => {
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
    const idParam = req.params.id;
    const isNumericId = /^\d+$/.test(idParam);
    const whereQuery: any = isNumericId
      ? { id: parseInt(idParam, 10) }
      : { ticketNumber: idParam };

    const ticket = await prisma.ticket.findFirst({
      where: whereQuery,
    });

    if (!ticket || ticket.requesterId !== requesterId) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Ticket not found or you do not have permission to view attachments for this ticket.",
      });
    }

    const attachments = await prisma.attachment.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        fileType: true,
        fileUrl: true,
        isDeleted: true,
        deletedAt: true,
        createdAt: true,
      },
    });

    return res.status(200).json(attachments);
  } catch (error) {
    console.error("Failed to fetch ticket attachments:", error);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch ticket attachments",
    });
  }
});

// ---------------------------------------------------------------------------
// Issue 7 — Upload Attachment to Ticket
// POST /api/tickets/:id/attachments
// ---------------------------------------------------------------------------
app.post("/api/tickets/:id/attachments", (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, (err: any) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "FILE_TOO_LARGE",
          message: "File size must not exceed 5 MB.",
        });
      }
      if (err.code === "UNSUPPORTED_MEDIA_TYPE") {
        return res.status(415).json({
          error: "UNSUPPORTED_MEDIA_TYPE",
          message: "File format unsupported. Allowed formats: JPG, PNG, WEBP, PDF, TXT.",
        });
      }
      return res.status(400).json({
        error: "UPLOAD_ERROR",
        message: err.message || "Failed to upload file.",
      });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    const headerValue = req.headers["x-requester-id"];
    if (!headerValue) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Missing x-requester-id header",
      });
    }

    const requesterId = parseInt(Array.isArray(headerValue) ? headerValue[0] : headerValue, 10);
    if (isNaN(requesterId) || requesterId <= 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "Invalid x-requester-id header",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "NO_FILE",
        message: "Please attach a valid file in the 'file' field.",
      });
    }

    const prisma = getPrisma();
    const idParam = req.params.id;
    const isNumericId = /^\d+$/.test(idParam);
    const whereQuery: any = isNumericId
      ? { id: parseInt(idParam, 10) }
      : { ticketNumber: idParam };

    const ticket = await prisma.ticket.findFirst({
      where: whereQuery,
    });

    if (!ticket) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Ticket not found.",
      });
    }

    if (ticket.requesterId !== requesterId) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "You do not have permission to upload attachments to this ticket.",
      });
    }

    // Check Maximum Active Attachments per Ticket (Max: 5)
    const activeCount = await prisma.attachment.count({
      where: { ticketId: ticket.id, isDeleted: false },
    });

    if (activeCount >= 5) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: "MAX_ATTACHMENTS_EXCEEDED",
        message: "Maximum 5 active attachments allowed per ticket.",
      });
    }

    // Save attachment in database
    const attachment = await prisma.attachment.create({
      data: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype || "application/octet-stream",
        fileUrl: `/uploads/attachments/${req.file.filename}`,
        ticketId: ticket.id,
        isDeleted: false,
      },
    });

    return res.status(201).json(attachment);
  } catch (error) {
    console.error("Failed to save attachment:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to save attachment",
    });
  }
});

// ---------------------------------------------------------------------------
// Issue 7 — Pre-upload Attachment (Standalone)
// POST /api/attachments/upload
// ---------------------------------------------------------------------------
app.post("/api/attachments/upload", (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, (err: any) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "FILE_TOO_LARGE",
          message: "File size must not exceed 5 MB.",
        });
      }
      if (err.code === "UNSUPPORTED_MEDIA_TYPE") {
        return res.status(415).json({
          error: "UNSUPPORTED_MEDIA_TYPE",
          message: "File format unsupported. Allowed formats: JPG, PNG, WEBP, PDF, TXT.",
        });
      }
      return res.status(400).json({
        error: "UPLOAD_ERROR",
        message: err.message || "Failed to upload file.",
      });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    const headerValue = req.headers["x-requester-id"];
    if (!headerValue) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Missing x-requester-id header",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "NO_FILE",
        message: "No file uploaded.",
      });
    }

    return res.status(201).json({
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype || "application/octet-stream",
      fileUrl: `/uploads/attachments/${req.file.filename}`,
    });
  } catch (error) {
    console.error("Failed to upload attachment:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to upload attachment",
    });
  }
});

// ---------------------------------------------------------------------------
// Issue 7 — Download Active Attachment
// GET /api/attachments/:id/download
// ---------------------------------------------------------------------------
app.get("/api/attachments/:id/download", async (req: Request, res: Response) => {
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

    const attachmentId = parseInt(req.params.id, 10);
    if (isNaN(attachmentId) || attachmentId <= 0) {
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "Invalid attachment id",
      });
    }

    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Attachment not found.",
      });
    }

    // Enforce Ownership Isolation (FR-07.4 / AC-07.9)
    if (attachment.ticket && attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "You do not have permission to download this attachment.",
      });
    }

    // Enforce Soft-Removed Blocking (FR-07.4 / AC-07.8)
    if (attachment.isDeleted || attachment.deletedAt !== null) {
      return res.status(403).json({
        error: "ATTACHMENT_REMOVED",
        message: "This attachment has been removed and cannot be downloaded.",
      });
    }

    // Serve file
    const diskPath = path.join(process.cwd(), attachment.fileUrl.replace(/^\//, ""));
    if (fs.existsSync(diskPath)) {
      return res.download(diskPath, attachment.fileName);
    }

    // Fallback for mocked or seeded attachments
    res.setHeader("Content-Type", attachment.fileType);
    res.setHeader("Content-Disposition", `attachment; filename="${attachment.fileName}"`);
    return res.send(Buffer.from(`Diagnostic content for ${attachment.fileName}`));
  } catch (error) {
    console.error("Failed to download attachment:", error);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to download attachment",
    });
  }
});

// ---------------------------------------------------------------------------
// Issue 7 — Soft Remove Attachment
// DELETE /api/attachments/:id
// ---------------------------------------------------------------------------
app.delete("/api/attachments/:id", async (req: Request, res: Response) => {
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

    const attachmentId = parseInt(req.params.id, 10);
    if (isNaN(attachmentId) || attachmentId <= 0) {
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "Invalid attachment id",
      });
    }

    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Attachment not found.",
      });
    }

    // Enforce Ownership Isolation (FR-07.5 / AC-07.9)
    if (attachment.ticket && attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "You do not have permission to remove this attachment.",
      });
    }

    // Soft Remove (FR-07.5 / AC-07.7)
    const updated = await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return res.status(200).json({
      message: "Attachment soft-removed successfully.",
      attachment: updated,
    });
  } catch (error) {
    console.error("Failed to soft-remove attachment:", error);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to soft-remove attachment",
    });
  }
});

export default app;
