import { PrismaClient } from "@prisma/client";

/**
 * Generates a unique, collision-resistant Ticket Number conforming to TIC-YYYYMMDD-XXXX
 */
export async function generateTicketNumber(prisma: PrismaClient): Promise<string> {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;
  const prefix = `TIC-${dateStr}-`;

  // Find the most recent ticket number for today to determine sequential number
  const latestToday = await prisma.ticket.findFirst({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      ticketNumber: "desc",
    },
    select: {
      ticketNumber: true,
    },
  });

  let nextSeq = 1;
  if (latestToday?.ticketNumber) {
    const parts = latestToday.ticketNumber.split("-");
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }
  }

  // Guarantee uniqueness
  let candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;
  let exists = await prisma.ticket.findUnique({ where: { ticketNumber: candidate } });
  while (exists) {
    nextSeq++;
    candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;
    exists = await prisma.ticket.findUnique({ where: { ticketNumber: candidate } });
  }

  return candidate;
}
