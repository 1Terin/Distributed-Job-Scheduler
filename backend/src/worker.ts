import prisma from "./db";
import { broadcast } from "./utils/broadcast";
import parser from "cron-parser";
import generateFailureSummary from "./utils/failureSummary";
import { incrementQueueStat } from "./utils/jobStats";

const LOCK_TTL_MS = 30000;
const SHARD_KEY = process.env.WORKER_SHARD_KEY || null;

let shuttingDown = false;
let activeWorkerId: string | null = null;
const runningJobs = new Set<string>();

async function registerWorker() {
  return prisma.worker.create({
    data: {
      name: process.env.WORKER_NAME || `worker-${Date.now()}`,
      host: process.env.WORKER_HOST || "localhost",
      version: "0.1.0",
    },
  });
}

async function heartbeat(workerId: string) {
  await prisma.heartbeat.create({
    data: { workerId, healthy: true, details: "Alive" },
  });
  await prisma.worker.update({ where: { id: workerId }, data: { lastSeenAt: new Date() } });

  // Renew locks for jobs this worker is executing
  const now = new Date();
  await prisma.job.updateMany({
    where: {
      lockOwner: workerId,
      status: { in: ["CLAIMED", "RUNNING"] },
    },
    data: {
      lockExpiresAt: new Date(now.getTime() + LOCK_TTL_MS),
      lastHeartbeatAt: now,
    },
  });
}

async function promoteScheduledJobs() {
  const now = new Date();
  const due = await prisma.job.findMany({
    where: { status: "SCHEDULED", availableAt: { lte: now } },
    select: { id: true },
  });
  if (due.length === 0) return;
  await prisma.job.updateMany({
    where: { id: { in: due.map((j) => j.id) } },
    data: { status: "QUEUED" },
  });
}

async function recoverExpiredLocks() {
  const now = new Date();
  await prisma.job.updateMany({
    where: {
      status: { in: ["CLAIMED", "RUNNING"] },
      lockExpiresAt: { lte: now },
    },
    data: {
      status: "QUEUED",
      lockOwner: null,
      lockExpiresAt: null,
      claimedById: null,
      claimedAt: null,
    },
  });
}

async function getQueueInFlight(queueId: string) {
  return prisma.job.count({
    where: { queueId, status: { in: ["CLAIMED", "RUNNING"] } },
  });
}

async function claimJob(workerId: string) {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setSeconds(0, 0);
  windowStart.setMilliseconds(0);

  const shardFilter = SHARD_KEY
    ? { OR: [{ shardKey: SHARD_KEY }, { shardKey: null }] }
    : { shardKey: null };

  const candidates = await prisma.job.findMany({
    where: {
      status: "QUEUED",
      availableAt: { lte: now },
      queue: {
        paused: false,
        ...shardFilter,
      },
      OR: [
        { dependencies: { none: {} } },
        { dependencies: { every: { dependsOnJob: { status: "COMPLETED" } } } },
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 20,
    include: { queue: { include: { retryPolicy: true } } },
  });

  for (const candidate of candidates) {
    const inFlight = await getQueueInFlight(candidate.queueId);
    if (inFlight >= candidate.queue.concurrency) continue;

    const claimed = await prisma.$transaction(async (tx) => {
      const queue = await tx.queue.findUnique({ where: { id: candidate.queueId } });
      if (!queue || queue.paused) return null;

      const currentInFlight = await tx.job.count({
        where: { queueId: queue.id, status: { in: ["CLAIMED", "RUNNING"] } },
      });
      if (currentInFlight >= queue.concurrency) return null;

      if (queue.rateLimitPerMinute > 0) {
        let rateWindow = await tx.queueRateWindow.findUnique({ where: { queueId: queue.id } });
        if (!rateWindow) {
          rateWindow = await tx.queueRateWindow.create({
            data: { queueId: queue.id, windowStart, count: 0 },
          });
        } else if (rateWindow.windowStart.getTime() !== windowStart.getTime()) {
          rateWindow = await tx.queueRateWindow.update({
            where: { queueId: queue.id },
            data: { windowStart, count: 0 },
          });
        }
        if (rateWindow.count >= queue.rateLimitPerMinute) return null;
      }

      const updateCount = await tx.job.updateMany({
        where: { id: candidate.id, status: "QUEUED" },
        data: {
          status: "CLAIMED",
          claimedById: workerId,
          claimedAt: now,
          lockOwner: workerId,
          lockExpiresAt: new Date(now.getTime() + LOCK_TTL_MS),
          lastHeartbeatAt: now,
        },
      });

      if (updateCount.count !== 1) return null;

      if (queue.rateLimitPerMinute > 0) {
        await tx.queueRateWindow.update({
          where: { queueId: queue.id },
          data: { count: { increment: 1 }, windowStart },
        });
      }

      return tx.job.findUnique({
        where: { id: candidate.id },
        include: { queue: { include: { retryPolicy: true } } },
      });
    });

    if (claimed) {
      broadcast({ type: "job_claimed", jobId: claimed.id, workerId, queueId: claimed.queueId });
      return claimed;
    }
  }

  return null;
}

async function scheduleRecurring(job: any) {
  if (!job.recurringCron) return;
  try {
    const interval = parser.parseExpression(job.recurringCron, { utc: true });
    const next = interval.next().toDate();
    const newJob = await prisma.job.create({
      data: {
        queueId: job.queueId,
        projectId: job.projectId,
        type: job.type,
        payload: job.payload,
        priority: job.priority,
        status: "SCHEDULED",
        scheduledAt: next,
        recurringCron: job.recurringCron,
        availableAt: next,
        maxAttempts: job.maxAttempts ?? 3,
      },
    });
    await incrementQueueStat(job.queueId, "totalQueued");
    broadcast({ type: "job_created", jobId: newJob.id, status: newJob.status, queueId: job.queueId });
  } catch (err) {
    console.error("Failed to schedule next recurring job:", err);
  }
}

async function executeJob(job: any) {
  const attemptNumber = job.attempt + 1;
  runningJobs.add(job.id);

  await prisma.job.update({
    where: { id: job.id },
    data: { status: "RUNNING" },
  });
  broadcast({ type: "job_running", jobId: job.id, workerId: job.claimedById, queueId: job.queueId });

  const execution = await prisma.jobExecution.create({
    data: {
      jobId: job.id,
      workerId: job.claimedById,
      attempt: attemptNumber,
      status: "STARTED",
    },
  });

  await prisma.jobLog.create({
    data: {
      jobId: job.id,
      message: `Job execution started by worker ${job.claimedById}`,
      level: "INFO",
    },
  });

  const policy = job.queue?.retryPolicy;
  const maxAttempts = policy?.maxAttempts ?? job.maxAttempts ?? 3;

  try {
    const payload = job.payload ? JSON.parse(job.payload) : {};
    const durationMs = 1000 + Math.floor(Math.random() * 500);
    await new Promise((resolve) => setTimeout(resolve, durationMs));

    if (payload && payload.fail) {
      throw new Error(payload.failReason || "Simulated failure");
    }

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        lockOwner: null,
        lockExpiresAt: null,
        claimedById: null,
        claimedAt: null,
      },
    });

    await prisma.jobExecution.update({
      where: { id: execution.id },
      data: { status: "SUCCEEDED", finishedAt: new Date(), durationMs },
    });

    await incrementQueueStat(job.queueId, "totalCompleted");

    await prisma.jobLog.create({
      data: { jobId: job.id, message: "Job completed successfully.", level: "INFO" },
    });

    broadcast({ type: "job_completed", jobId: job.id, queueId: job.queueId });
    await scheduleRecurring(job);
  } catch (error: any) {
    const summary = await generateFailureSummary(error, attemptNumber, maxAttempts);
    const baseDelaySeconds = policy?.delaySeconds ?? 30;
    const strategy = policy?.strategy ?? "FIXED";

    let delaySeconds = baseDelaySeconds;
    if (strategy === "LINEAR") {
      delaySeconds = baseDelaySeconds * attemptNumber;
    } else if (strategy === "EXPONENTIAL") {
      delaySeconds = baseDelaySeconds * Math.pow(2, attemptNumber - 1);
    }

    const nextRetry = new Date(Date.now() + delaySeconds * 1000);
    const isRetryable = attemptNumber < maxAttempts;
    const newStatus = isRetryable ? "QUEUED" : "FAILED";

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: newStatus,
        attempt: attemptNumber,
        lastError: String(error.message || error),
        failureSummary: summary,
        nextRetryAt: isRetryable ? nextRetry : null,
        availableAt: isRetryable ? nextRetry : job.availableAt,
        lockOwner: null,
        lockExpiresAt: null,
        claimedById: null,
        claimedAt: null,
      },
    });

    await prisma.jobExecution.update({
      where: { id: execution.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        durationMs: 1000,
        error: String(error.message || error),
      },
    });

    await prisma.jobLog.create({
      data: {
        jobId: job.id,
        message: `Failure: ${String(error.message || error)}. ${summary}`,
        level: "ERROR",
      },
    });

    if (!isRetryable) {
      await prisma.deadLetter.upsert({
        where: { jobId: job.id },
        create: { jobId: job.id, reason: String(error.message || error) },
        update: { reason: String(error.message || error), failedAt: new Date() },
      });
      await incrementQueueStat(job.queueId, "totalFailed");
      await incrementQueueStat(job.queueId, "totalDeadLetter");
      broadcast({ type: "job_dead_letter", jobId: job.id, queueId: job.queueId });
    } else {
      await incrementQueueStat(job.queueId, "totalRetried");
      broadcast({ type: "job_requeued", jobId: job.id, queueId: job.queueId });
    }
  } finally {
    runningJobs.delete(job.id);
  }
}

async function releaseWorkerJobs(workerId: string) {
  await prisma.job.updateMany({
    where: {
      claimedById: workerId,
      status: { in: ["CLAIMED", "RUNNING"] },
    },
    data: {
      status: "QUEUED",
      lockOwner: null,
      lockExpiresAt: null,
      claimedById: null,
      claimedAt: null,
    },
  });
}

async function run() {
  const worker = await registerWorker();
  activeWorkerId = worker.id;
  console.log(`Worker registered ${worker.id}`);

  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("Worker shutting down gracefully...");
    while (runningJobs.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (activeWorkerId) await releaseWorkerJobs(activeWorkerId);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  const WORKER_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || "1");

  while (!shuttingDown) {
    await heartbeat(worker.id);
    await promoteScheduledJobs();
    await recoverExpiredLocks();

    const claimedJobs: any[] = [];
    for (let i = 0; i < WORKER_CONCURRENCY; i++) {
      const j = await claimJob(worker.id);
      if (j) claimedJobs.push(j);
      else break;
    }

    if (claimedJobs.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }

    await Promise.all(
      claimedJobs.map(async (job) => {
        try {
          await executeJob(job);
        } catch (err) {
          console.error("Error executing job:", err);
        }
      })
    );
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
