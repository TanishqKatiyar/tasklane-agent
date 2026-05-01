-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "userId" TEXT NOT NULL,
    "taskAssignedEmail" BOOLEAN NOT NULL DEFAULT true,
    "taskAssignedInApp" BOOLEAN NOT NULL DEFAULT true,
    "mentionEmail" BOOLEAN NOT NULL DEFAULT true,
    "mentionInApp" BOOLEAN NOT NULL DEFAULT true,
    "commentEmail" BOOLEAN NOT NULL DEFAULT false,
    "commentInApp" BOOLEAN NOT NULL DEFAULT true,
    "dueDateEmail" BOOLEAN NOT NULL DEFAULT true,
    "dueDateInApp" BOOLEAN NOT NULL DEFAULT true,
    "teamUpdateEmail" BOOLEAN NOT NULL DEFAULT false,
    "teamUpdateInApp" BOOLEAN NOT NULL DEFAULT true,
    "dailyDigest" BOOLEAN NOT NULL DEFAULT true,
    "digestHourUTC" INTEGER NOT NULL DEFAULT 8,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Mention" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "mentionedId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestSent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentDate" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigestSent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mention_mentionedId_readAt_idx" ON "Mention"("mentionedId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "DigestSent_userId_sentDate_key" ON "DigestSent"("userId", "sentDate");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_mentionedId_fkey" FOREIGN KEY ("mentionedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
