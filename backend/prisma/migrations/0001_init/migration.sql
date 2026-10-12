-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "reviewEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publishedVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizVersion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizVersionQuestion" (
    "versionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "QuizVersionQuestion_pkey" PRIMARY KEY ("versionId","questionId")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "deadline" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "score" INTEGER,
    "correctCount" INTEGER,
    "incorrectCount" INTEGER,
    "unansweredCount" INTEGER,
    "questionOrder" TEXT[],

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptQuestion" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "optionOrder" TEXT[],

    CONSTRAINT "AttemptQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT,
    "answeredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_slug_key" ON "Quiz"("slug");

-- CreateIndex
CREATE INDEX "QuizVersion_quizId_isPublished_idx" ON "QuizVersion"("quizId", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "QuizVersion_quizId_version_key" ON "QuizVersion"("quizId", "version");

-- CreateIndex
CREATE INDEX "Option_questionId_idx" ON "Option"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizVersionQuestion_versionId_position_key" ON "QuizVersionQuestion"("versionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAttempt_token_key" ON "QuizAttempt"("token");

-- CreateIndex
CREATE INDEX "QuizAttempt_quizId_status_idx" ON "QuizAttempt"("quizId", "status");

-- CreateIndex
CREATE INDEX "QuizAttempt_participantId_idx" ON "QuizAttempt"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptQuestion_attemptId_questionId_key" ON "AttemptQuestion"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptQuestion_attemptId_position_key" ON "AttemptQuestion"("attemptId", "position");

-- CreateIndex
CREATE INDEX "ParticipantAnswer_attemptId_idx" ON "ParticipantAnswer"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantAnswer_attemptId_questionId_key" ON "ParticipantAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "QuizVersion" ADD CONSTRAINT "QuizVersion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizVersionQuestion" ADD CONSTRAINT "QuizVersionQuestion_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuizVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizVersionQuestion" ADD CONSTRAINT "QuizVersionQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuizVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptQuestion" ADD CONSTRAINT "AttemptQuestion_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptQuestion" ADD CONSTRAINT "AttemptQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantAnswer" ADD CONSTRAINT "ParticipantAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantAnswer" ADD CONSTRAINT "ParticipantAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantAnswer" ADD CONSTRAINT "ParticipantAnswer_attemptId_questionId_fkey" FOREIGN KEY ("attemptId", "questionId") REFERENCES "AttemptQuestion"("attemptId", "questionId") ON DELETE CASCADE ON UPDATE CASCADE;

