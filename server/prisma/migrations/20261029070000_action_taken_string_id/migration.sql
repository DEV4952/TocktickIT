-- Forward-only correction: retain all existing actions and their identifiers.
-- Prisma generates CUIDs for new rows; legacy integer IDs become their text form.
ALTER TABLE "actions_taken" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "actions_taken" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "actions_taken" ALTER COLUMN "updatedAt" DROP DEFAULT;
