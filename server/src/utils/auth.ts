import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getPrisma } from "../prisma.js";

const AUTH_SECRET = process.env.AUTH_SECRET || "toktickit_lab3_auth_secret_key_2026";
export const SESSION_COOKIE_NAME = "toktick_session";

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  department: string | null;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
  mustChangePassword: boolean;
}

// Augment Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Generate a signed session token: <payload_base64>.<hmac_signature>
 */
export function createSessionToken(user: AuthenticatedUser): string {
  const payload = JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    issuedAt: Date.now(),
  });
  const encodedPayload = Buffer.from(payload).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

/**
 * Verify and decode a session token
 */
export function verifySessionToken(token: string): { id: number; email: string; role: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encodedPayload, signature] = parts;

    const expectedSignature = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(encodedPayload)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const decoded = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Validates password complexity:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 */
export function validatePasswordComplexity(password: string): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!password || password.length < 8) {
    reasons.push("Password must be at least 8 characters long.");
  }
  if (!/[A-Z]/.test(password)) {
    reasons.push("Password must contain at least one uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    reasons.push("Password must contain at least one lowercase letter.");
  }
  if (!/\d/.test(password)) {
    reasons.push("Password must contain at least one number.");
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    reasons.push("Password must contain at least one special character.");
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

/**
 * Authentication extraction middleware
 */
export async function authenticateSession(req: Request, _res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // 1. Check cookies
    if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
      token = req.cookies[SESSION_COOKIE_NAME];
    }

    // 2. Check Authorization Header (Bearer token)
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    // 3. Fallback for Lab 2 test compatibility (x-requester-id / x-user-id) if no token
    const devUserId = req.headers["x-user-id"] || req.headers["x-requester-id"];

    if (token) {
      const decoded = verifySessionToken(token);
      if (decoded) {
        const prisma = getPrisma();
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
        });

        if (user && user.isActive) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            department: user.department,
            role: user.role,
            isActive: user.isActive,
            mustChangePassword: user.mustChangePassword,
          };
        }
      }
    } else if (devUserId) {
      const userId = Number(devUserId);
      if (!isNaN(userId)) {
        const prisma = getPrisma();
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            department: user.department,
            role: user.role,
            isActive: user.isActive,
            mustChangePassword: user.mustChangePassword,
          };
        }
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Require valid authenticated user
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Authentication required to access this resource.",
    });
  }
  next();
}
