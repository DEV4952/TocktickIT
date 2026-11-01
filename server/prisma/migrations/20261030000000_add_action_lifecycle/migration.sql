BEGIN;
-- CreateEnum
CREATE TYPE "ActionTakenStatus" AS ENUM ('RECORDED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "actions_taken" ADD COLUMN     "assigneeId" INTEGER,
ADD COLUMN     "status" "ActionTakenStatus" NOT NULL DEFAULT 'RECORDED';

-- CreateTable
CREATE TABLE "action_taken_history" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "actorId" INTEGER NOT NULL,
    "event" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_taken_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "action_taken_history_actionId_createdAt_idx" ON "action_taken_history"("actionId", "createdAt");

-- CreateIndex
CREATE INDEX "action_taken_history_actorId_idx" ON "action_taken_history"("actorId");

-- CreateIndex
CREATE INDEX "actions_taken_assigneeId_idx" ON "actions_taken"("assigneeId");

-- CreateIndex
CREATE INDEX "actions_taken_status_idx" ON "actions_taken"("status");

-- AddForeignKey
ALTER TABLE "actions_taken" ADD CONSTRAINT "actions_taken_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_taken_history" ADD CONSTRAINT "action_taken_history_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "actions_taken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_taken_history" ADD CONSTRAINT "action_taken_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


COMMIT;
