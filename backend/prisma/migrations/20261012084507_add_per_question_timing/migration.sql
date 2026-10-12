-- AlterTable
ALTER TABLE "AttemptQuestion" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "timedOutAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ParticipantAnswer" ADD COLUMN     "isCorrect" BOOLEAN,
ADD COLUMN     "timeTakenMs" INTEGER,
ALTER COLUMN "answeredAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "AttemptQuestion_attemptId_position_idx" ON "AttemptQuestion"("attemptId", "position");
