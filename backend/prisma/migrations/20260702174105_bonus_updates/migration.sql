-- AlterTable
ALTER TABLE "Job" ADD COLUMN "failureSummary" TEXT;
ALTER TABLE "Job" ADD COLUMN "lockExpiresAt" DATETIME;
ALTER TABLE "Job" ADD COLUMN "lockOwner" TEXT;

-- CreateTable
CREATE TABLE "QueueRateWindow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queueId" TEXT NOT NULL,
    "windowStart" DATETIME NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QueueRateWindow_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queueId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventSubscription_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME
);

-- CreateTable
CREATE TABLE "JobDependency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "dependsOnJobId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobDependency_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobDependency_dependsOnJobId_fkey" FOREIGN KEY ("dependsOnJobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Queue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "concurrency" INTEGER NOT NULL DEFAULT 5,
    "retryPolicyId" TEXT NOT NULL,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 0,
    "shardKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Queue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Queue_retryPolicyId_fkey" FOREIGN KEY ("retryPolicyId") REFERENCES "RetryPolicy" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Queue" ("concurrency", "createdAt", "id", "name", "paused", "priority", "projectId", "retryPolicyId", "updatedAt") SELECT "concurrency", "createdAt", "id", "name", "paused", "priority", "projectId", "retryPolicyId", "updatedAt" FROM "Queue";
DROP TABLE "Queue";
ALTER TABLE "new_Queue" RENAME TO "Queue";
CREATE INDEX "Queue_projectId_idx" ON "Queue"("projectId");
CREATE UNIQUE INDEX "Queue_projectId_name_key" ON "Queue"("projectId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "QueueRateWindow_queueId_key" ON "QueueRateWindow"("queueId");

-- CreateIndex
CREATE UNIQUE INDEX "EventSubscription_queueId_eventType_key" ON "EventSubscription"("queueId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "JobDependency_jobId_dependsOnJobId_key" ON "JobDependency"("jobId", "dependsOnJobId");
