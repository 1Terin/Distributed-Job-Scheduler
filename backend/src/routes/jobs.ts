import express from "express";
import prisma from "../db";
import { AuthRequest } from "../middleware/auth";
import { broadcast } from "../utils/broadcast";
import { assertJobAccess, assertQueueAccess, getOrgQueueIds, handleAccessError } from "../utils/orgAccess";
import { incrementQueueStat } from "../utils/jobStats";

const router = express.Router();

async function createJobRecord(
  item: {
    queueId: string;
    type: string;
    payload: unknown;
    priority?: number;
    scheduledAt?: string;
    maxAttempts?: number;
    recurringCron?: string;
    dependsOnIds?: string[];
  },
  organizationId: string
) {
  const { queueId, type, payload, priority, scheduledAt, maxAttempts, recurringCron, dependsOnIds } = item;
  if (!queueId || !type || payload === undefined) {
    throw new Error("MISSING_FIELDS");
  }

  const queue = await assertQueueAccess(queueId, organizationId);
  const now = new Date();

  if ((type === "DELAYED" || type === "SCHEDULED" || type === "RECURRING") && !scheduledAt && type !== "RECURRING") {
    throw new Error("SCHEDULED_AT_REQUIRED");
  }

  if (type === "RECURRING" && !recurringCron) {
    throw new Error("CRON_REQUIRED");
  }

  const availableAt =
    type === "DELAYED" || type === "SCHEDULED" || type === "RECURRING"
      ? new Date(scheduledAt || now.toISOString())
      : now;
  const resolvedMaxAttempts = maxAttempts ?? queue.retryPolicy.maxAttempts ?? 3;

  const job = await prisma.job.create({
    data: {
      queueId,
      projectId: queue.projectId,
      type,
      payload: JSON.stringify(payload),
      priority: priority ?? queue.priority,
      status: type === "SCHEDULED" || type === "RECURRING" ? "SCHEDULED" : "QUEUED",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : type === "RECURRING" ? now : null,
      recurringCron: recurringCron ?? null,
      availableAt,
      maxAttempts: resolvedMaxAttempts,
    },
  });

  if (Array.isArray(dependsOnIds) && dependsOnIds.length > 0) {
    await prisma.jobDependency.createMany({
      data: dependsOnIds.map((dependsOnId: string) => ({ jobId: job.id, dependsOnJobId: dependsOnId })),
    });
  }

  await incrementQueueStat(queueId, "totalQueued");
  broadcast({ type: "job_created", jobId: job.id, status: job.status, queueId });
  return job;
}

router.post("/", async (req: AuthRequest, res, next) => {
  try {
    if (Array.isArray(req.body)) {
      const items = req.body as any[];
      const created: any[] = [];
      const errors: { index: number; error: string }[] = [];

      for (let i = 0; i < items.length; i++) {
        try {
          const job = await createJobRecord(items[i], req.user!.organizationId);
          created.push(job);
        } catch (err: any) {
          errors.push({ index: i, error: err.message || "Failed to create job" });
        }
      }

      return res.status(201).json({ items: created, errors });
    }

    const job = await createJobRecord(req.body, req.user!.organizationId);
    res.status(201).json(job);
  } catch (error: any) {
    if (error.message === "MISSING_FIELDS") return res.status(400).json({ error: "Missing required fields" });
    if (error.message === "SCHEDULED_AT_REQUIRED") return res.status(400).json({ error: "scheduledAt is required for DELAYED/SCHEDULED jobs" });
    if (error.message === "CRON_REQUIRED") return res.status(400).json({ error: "recurringCron is required for RECURRING jobs" });
    const handled = handleAccessError(error, res);
    if (handled) return handled;
    next(error);
  }
});

router.get("/dead-letter", async (req: AuthRequest, res, next) => {
  try {
    const queueIds = await getOrgQueueIds(req.user!.organizationId);
    const { page = "1", limit = "20" } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const where = { job: { queueId: { in: queueIds } } };
    const [items, total] = await Promise.all([
      prisma.deadLetter.findMany({
        where,
        include: { job: { select: { id: true, type: true, queueId: true, lastError: true, failureSummary: true } } },
        orderBy: { failedAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.deadLetter.count({ where }),
    ]);

    res.json({ items, total, page: pageNum, limit: limitNum });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const { queueId, status, page = "1", limit = "20" } = req.query;
    const queueIds = await getOrgQueueIds(req.user!.organizationId);

    const where: any = { queueId: { in: queueIds } };
    if (queueId) {
      if (!queueIds.includes(String(queueId))) return res.status(404).json({ error: "Queue not found" });
      where.queueId = String(queueId);
    }
    if (status) where.status = String(status);

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: [{ priority: "desc" }, { availableAt: "asc" }, { createdAt: "desc" }],
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.job.count({ where }),
    ]);

    res.json({ items: jobs, total, page: pageNum, limit: limitNum });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req: AuthRequest, res, next) => {
  try {
    await assertJobAccess(req.params.id, req.user!.organizationId);
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        executions: { orderBy: { createdAt: "desc" } },
        logs: { orderBy: { createdAt: "desc" } },
        deadLetter: true,
        dependencies: { include: { dependsOnJob: { select: { id: true, status: true, type: true } } } },
      },
    });
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (error) {
    const handled = handleAccessError(error, res);
    if (handled) return handled;
    next(error);
  }
});

router.get("/:id/logs", async (req: AuthRequest, res, next) => {
  try {
    await assertJobAccess(req.params.id, req.user!.organizationId);
    const logs = await prisma.jobLog.findMany({
      where: { jobId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(logs);
  } catch (error) {
    const handled = handleAccessError(error, res);
    if (handled) return handled;
    next(error);
  }
});

router.post("/:id/retry", async (req: AuthRequest, res, next) => {
  try {
    const existing = await assertJobAccess(req.params.id, req.user!.organizationId);
    const job = await prisma.job.update({
      where: { id: existing.id },
      data: {
        status: "QUEUED",
        attempt: 0,
        lastError: null,
        failureSummary: null,
        nextRetryAt: null,
        availableAt: new Date(),
        lockOwner: null,
        lockExpiresAt: null,
        claimedById: null,
        claimedAt: null,
        deadLetter: { delete: true },
      },
    });
    await incrementQueueStat(job.queueId, "totalQueued");
    broadcast({ type: "job_retried", jobId: job.id, queueId: job.queueId });
    res.json(job);
  } catch (error) {
    const handled = handleAccessError(error, res);
    if (handled) return handled;
    next(error);
  }
});

router.post("/:id/cancel", async (req: AuthRequest, res, next) => {
  try {
    const existing = await assertJobAccess(req.params.id, req.user!.organizationId);
    const job = await prisma.job.update({
      where: { id: existing.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        lockOwner: null,
        lockExpiresAt: null,
        claimedById: null,
        claimedAt: null,
      },
    });
    broadcast({ type: "job_cancelled", jobId: job.id, queueId: job.queueId });
    res.json(job);
  } catch (error) {
    const handled = handleAccessError(error, res);
    if (handled) return handled;
    next(error);
  }
});

export default router;
