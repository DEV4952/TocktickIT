-- CreateEnum Role
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');
  END IF;
END $$;

-- AlterEnum TicketStatus
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'NEW';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'REOPENED';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- AlterTable users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT NOT NULL DEFAULT '$2a$10$rN7nNl5rM/vG2h3W8m2Gqu0Wf1gQ8Qy1aG1e0tJ5M9z.tQZ/k7qO6';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'REQUESTER';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "department" DROP NOT NULL;

-- AlterTable tickets
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "itPriority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "problemAppearsResolved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "ownerId" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tickets_ownerId_idx" ON "tickets"("ownerId");
CREATE INDEX IF NOT EXISTS "tickets_itPriority_idx" ON "tickets"("itPriority");

-- AddForeignKey Ticket Owner
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_ownerId_fkey') THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable comments
CREATE TABLE IF NOT EXISTS "comments" (
    "id" SERIAL NOT NULL,
    "body" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable internal_notes
CREATE TABLE IF NOT EXISTS "internal_notes" (
    "id" SERIAL NOT NULL,
    "body" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex comments
CREATE INDEX IF NOT EXISTS "comments_ticketId_idx" ON "comments"("ticketId");
CREATE INDEX IF NOT EXISTS "comments_authorId_idx" ON "comments"("authorId");

-- CreateIndex internal_notes
CREATE INDEX IF NOT EXISTS "internal_notes_ticketId_idx" ON "internal_notes"("ticketId");
CREATE INDEX IF NOT EXISTS "internal_notes_authorId_idx" ON "internal_notes"("authorId");

-- AddForeignKey comments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_ticketId_fkey') THEN
    ALTER TABLE "comments" ADD CONSTRAINT "comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_authorId_fkey') THEN
    ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey internal_notes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_notes_ticketId_fkey') THEN
    ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internal_notes_authorId_fkey') THEN
    ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
