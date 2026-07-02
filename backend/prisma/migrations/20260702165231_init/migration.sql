-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Queue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "concurrency" INTEGER NOT NULL DEFAULT 5,
    "retryPolicyId" TEXT NOT NULL,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Queue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Queue_retryPolicyId_fkey" FOREIGN KEY ("retryPolicyId") REFERENCES "RetryPolicy" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QueueStatistics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queueId" TEXT NOT NULL,
    "totalQueued" INTEGER NOT NULL DEFAULT 0,
    "totalCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "totalRetried" INTEGER NOT NULL DEFAULT 0,
    "totalDeadLetter" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QueueStatistics_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RetryPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "delaySeconds" INTEGER NOT NULL DEFAULT 30,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queueId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" DATETIME,
    "availableAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedById" TEXT,
    "claimedAt" DATETIME,
    "lastError" TEXT,
    "nextRetryAt" DATETIME,
    "lastHeartbeatAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Job_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "Worker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "workerId" TEXT,
    "attempt" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "durationMs" INTEGER,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobExecution_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobExecution_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Heartbeat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "healthy" BOOLEAN NOT NULL DEFAULT true,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Heartbeat_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeadLetter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "failedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeadLetter_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_organizationId_name_key" ON "Project"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Queue_projectId_idx" ON "Queue"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Queue_projectId_name_key" ON "Queue"("projectId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "QueueStatistics_queueId_key" ON "QueueStatistics"("queueId");

-- CreateIndex
CREATE INDEX "Job_queueId_status_availableAt_idx" ON "Job"("queueId", "status", "availableAt");

-- CreateIndex
CREATE INDEX "Job_projectId_status_idx" ON "Job"("projectId", "status");

-- CreateIndex
CREATE INDEX "JobExecution_jobId_idx" ON "JobExecution"("jobId");

-- CreateIndex
CREATE INDEX "JobExecution_workerId_idx" ON "JobExecution"("workerId");

-- CreateIndex
CREATE INDEX "Heartbeat_workerId_createdAt_idx" ON "Heartbeat"("workerId", "createdAt");

-- CreateIndex
CREATE INDEX "JobLog_jobId_createdAt_idx" ON "JobLog"("jobId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeadLetter_jobId_key" ON "DeadLetter"("jobId");
