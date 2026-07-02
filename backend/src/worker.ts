import prisma from "./db";
import { broadcast } from "./utils/broadcast";

const LOCK_TTL_MS = 30000;
const SHARD_KEY = process.env.WORKER_SHARD_KEY || null;

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
}

async function recoverExpiredLocks() {
  const now = new Date();
  await prisma.job.updateMany({
    where: {
      status: "CLAIMED",
      lockExpiresAt: { lte: now },
    },
    data: {
      status: "QUEUED",
      lockOwner: null,
      lockExpiresAt: null,
    },
  });
}

function generateFailureSummary(error: unknown, attempt: number, maxAttempts: number) {
  const message = typeof error === "string" ? error : error instanceof Error ? error.message : String(error);
  const rootCause = message.includes("timeout")
    ? "Timeout or request latency issue"
    : message.includes("network")
    ? "Network or external service failure"
    : message.includes("syntax")
    ? "Payload or handler formatting issue"
    : "Unexpected failure during job execution";
  const retryInfo = attempt >= maxAttempts ? "No further retries will be attempted." : `Retrying attempt ${attempt + 1} of ${maxAttempts} based on queue retry policy.`;
  return `${rootCause}: ${message}. ${retryInfo}`;
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
  });

  for (const candidate of candidates) {
    const claimed = await prisma.$transaction(async (tx) => {
      const queue = await tx.queue.findUnique({ where: { id: candidate.queueId } });
      if (!queue || queue.paused) return null;

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

        if (rateWindow.count >= queue.rateLimitPerMinute) {
          return null;
        }
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

      if (updateCount.count !== 1) {
        return null;
      }

      if (queue.rateLimitPerMinute > 0) {
        await tx.queueRateWindow.update({
          where: { queueId: queue.id },
          data: { count: { increment: 1 }, windowStart },
        });
      }

      return tx.job.findUnique({ where: { id: candidate.id } });
    });

    if (claimed) {
      broadcast({ type: "job_claimed", jobId: claimed.id, workerId, queueId: claimed.queueId });
      return claimed;
    }
  }

  return null;
}

async function executeJob(job: any) {
  const attemptNumber = job.attempt + 1;
  const startTime = new Date();
  await prisma.jobExecution.create({
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
      },
    });

    await prisma.jobExecution.updateMany({
      where: { jobId: job.id, status: "STARTED" },
      data: { status: "SUCCEEDED", finishedAt: new Date(), durationMs },
    });

    await prisma.queueStatistics.upsert({
      where: { queueId: job.queueId },
      create: {
        queueId: job.queueId,
        totalQueued: 0,
        totalCompleted: 1,
        totalFailed: 0,
        totalRetried: 0,
        totalDeadLetter: 0,
      },
      update: {
        totalCompleted: { increment: 1 },
      },
    });

    await prisma.jobLog.create({
      data: {
        jobId: job.id,
        message: "Job completed successfully.",
        level: "INFO",
      },
    });

    broadcast({ type: "job_completed", jobId: job.id, queueId: job.queueId });
  } catch (error: any) {
    const maxAttempts = job.maxAttempts ?? 3;
    const summary = generateFailureSummary(error, attemptNumber, maxAttempts);
    const nextRetry = new Date(Date.now() + 30000);
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
        lockOwner: null,
        lockExpiresAt: null,
      },
    });

    await prisma.jobExecution.updateMany({
      where: { jobId: job.id, status: "STARTED" },
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
      await prisma.deadLetter.create({
        data: {
          jobId: job.id,
          reason: String(error.message || error),
        },
      });
      await prisma.queueStatistics.upsert({
        where: { queueId: job.queueId },
        create: {
          queueId: job.queueId,
          totalQueued: 0,
          totalCompleted: 0,
          totalFailed: 1,
          totalRetried: 0,
          totalDeadLetter: 1,
        },
        update: {
          totalFailed: { increment: 1 },
          totalDeadLetter: { increment: 1 },
        },
      });
      broadcast({ type: "job_dead_letter", jobId: job.id, queueId: job.queueId });
    } else {
      await prisma.queueStatistics.upsert({
        where: { queueId: job.queueId },
        create: {
          queueId: job.queueId,
          totalQueued: 0,
          totalCompleted: 0,
          totalFailed: 0,
          totalRetried: 1,
          totalDeadLetter: 0,
        },
        update: {
          totalRetried: { increment: 1 },
        },
      });
      broadcast({ type: "job_requeued", jobId: job.id, queueId: job.queueId });
    }
  }
}

async function run() {
  const worker = await registerWorker();
  console.log(`Worker registered ${worker.id}`);

  process.on("SIGINT", async () => {
    console.log("Worker shutting down");
    process.exit(0);
  });

  while (true) {
    await heartbeat(worker.id);
    await recoverExpiredLocks();
    const job = await claimJob(worker.id);
    if (job) {
      await executeJob(job);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
